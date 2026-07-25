import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function procesarDespachoYStock(ventaId: number, usuarioId: number = 1) {
    // Ejecutamos todo dentro de una transacción robusta para evitar corrupción de datos
    return await prisma.$transaction(async (tx) => {
        
        // 1. Traer todos los productos y variantes que se compraron en esta venta
        const detalles = await tx.detalles_venta.findMany({
            where: { ventaId: ventaId }
        });

        if (detalles.length === 0) {
            throw new Error(`No se encontraron detalles para la venta #${ventaId}`);
        }

        // 2. Procesar cada artículo del pedido
        for (const articulo of detalles) {
            
            // Descontamos el stock en la bodega por defecto (ej: warehouseId = 1)
            // Usamos updateMany o update basado en la clave única compuesta [warehouseId, varianteId]
            await tx.warehouseStock.update({
                where: {
                    warehouseId_varianteId: {
                        warehouseId: 1, // Puedes cambiarlo por el ID dinámico de la bodega si manejas varias
                        varianteId: articulo.varianteId
                    }
                },
                data: {
                    cantidad: {
                        decrement: articulo.cantidad // Prisma resta de forma nativa directo en la BD
                    }
                }
            });

            // 3. Crear el historial de auditoría del movimiento en el almacén
            await tx.movimientosInventario.create({
                data: {
                    cantidad: articulo.cantidad,
                    usuarioId: usuarioId, // El ID del usuario o bot de IA que procesa
                    justificacion: `Despacho automático por venta mayorista #${ventaId}`,
                    varianteId: articulo.varianteId,
                    productosId: articulo.productoId,
                    tipoMovimiento: "SALIDA" // Ajusta al string o ENUM exacto que tengas en tu TipoMovimiento
                }
            });
        }

        // 4. Finalmente, cambiamos el estado de la venta para cerrar el flujo comercial
        await tx.ventas.update({
            where: { id: ventaId },
            data: { estado: "PAGADA" } // O el estado final que manejes en tu flujo de facturación
        });

        console.log(`📦 [INVENTARIO] Stock descontado y venta #${ventaId} marcada como PAGADA con éxito.`);
        return { success: true };
    });
}