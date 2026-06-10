import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const registrarMovimiento = async (
    organizationId: number,
    varianteId: number,
    cantidad: number,
    tipo: 'ENTRADA' | 'SALIDA',
    usuarioId: number,
    warehouseId: number
) => {
    return await prisma.$transaction(async (tx) => {
        
        // 1. Validar que la bodega exista para esta org
        const bodega = await tx.warehouse.findFirst({
            where: { id: warehouseId, organizationId: organizationId }
        });
        if (!bodega) throw new Error("Bodega no encontrada");

        // 2. Validar que la variante exista
        const variante = await tx.variante.findUnique({
            where: { id: varianteId }
        });
        if (!variante) throw new Error("Variante no encontrada");

        // 3. Procesar stock
        const factor = tipo === 'ENTRADA' ? cantidad : -cantidad;
        const stock = await tx.warehouseStock.upsert({
            where: { warehouseId_varianteId: { warehouseId, varianteId } },
            update: { cantidad: { increment: factor } },
            create: { warehouseId, varianteId, cantidad: factor }
        });

        // 4. Registrar movimiento
        await tx.movimientosInventario.create({
            data: {
                varianteId,
                cantidad,
                tipoMovimiento: tipo,
                usuarioId,
                justificacion: "Movimiento automático"
            }
        });

        return stock;
    });
};