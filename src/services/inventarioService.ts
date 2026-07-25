import prisma from '../lib/prisma';

export const registrarMovimiento = async (
    organizationId: number,
    varianteId: number,
    cantidad: number,
    tipo: 'ENTRADA' | 'SALIDA',
    usuarioId: number,
    warehouseId: number,
    justificacion: string
) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Validar existencia de la variante y obtener su costo actual
        const variante = await tx.variante.findFirst({ 
            where: { id: Number(varianteId) }
        });
        if (!variante) throw new Error("Variante no encontrada");

        // 2. Obtener el stock actual en esta bodega específica antes del movimiento
        const stockPrevio = await tx.warehouseStock.findUnique({
            where: { warehouseId_varianteId: { warehouseId, varianteId } }
        });
        
        const stockActualNum = stockPrevio ? stockPrevio.cantidad : 0;
        const costoActualNum = Number(variante.precio) || 0; // Usamos el valor base en BD

        // 3. ALGORITMO DE COSTO PROMEDIO PONDERADO (Solo aplica en ENTRADAS de mercancía)
        if (tipo === 'ENTRADA' && stockActualNum > 0) {
            // Si ya hay stock, calculamos el promedio ponderado usando los costos reales
            const costoNuevoFactura = costoActualNum; // O el precioUnitario si lo pasaras por parámetro
            const nuevoCostoPonderado = ((stockActualNum * costoActualNum) + (cantidad * costoNuevoFactura)) / (stockActualNum + cantidad);

            // Actualizamos el costo/precio en caliente en la variante
            await tx.variante.update({
                where: { id: varianteId },
                data: { precio: nuevoCostoPonderado }
            });
        }

        // 4. Determinar el factor de incremento/decremento de stock
        const factor = tipo === 'ENTRADA' ? cantidad : -cantidad;
        
        const stock = await tx.warehouseStock.upsert({
            where: { warehouseId_varianteId: { warehouseId, varianteId } },
            update: { cantidad: { increment: factor } },
            create: { warehouseId, varianteId, cantidad: factor }
        });

        // 5. Registro inmutable en el historial (Kardex)
        await tx.movimientosInventario.create({
            data: { varianteId, cantidad, tipoMovimiento: tipo, usuarioId, justificacion }
        });

        // 6. CONTROL RESILIENTE DE ALERTAS DE STOCK CRÍTICO
        const stockActualizado = await tx.warehouseStock.findUnique({
            where: { warehouseId_varianteId: { warehouseId, varianteId } }
        });

        // Validamos que stockMinimo no sea undefined/null antes de la comparación numérica
        const stockMinimoDefecto = stockActualizado?.stockMinimo ? stockActualizado.stockMinimo : 0;

        if (stockActualizado && stockActualizado.cantidad <= stockMinimoDefecto) {
            // El try/catch interno evita que si la tabla AlertasInventario no existe tras un reset, tumbe la inserción del producto
            try {
                const alertaExistente = await tx.alertasInventario.findFirst({
                    where: { varianteId, warehouseId, estado: 'PENDIENTE' }
                });
                if (!alertaExistente) {
                    await tx.alertasInventario.create({
                        data: { varianteId, warehouseId, mensaje: `Stock crítico detectado automáticamente`, estado: 'PENDIENTE' }
                    });
                }
            } catch (alertaError) {
                console.warn("⚠️ Tabla 'AlertasInventario' no detectada en la BD o falta ejecutar 'npx prisma db push'. Omitiendo alerta.");
            }
        }
        
        return stock;
    });
};