import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const cargarInventarioMasivo = async (req: any) => {
    const { movimientos } = req.body; // Array de { productoId, cantidad, warehouseId }
    const organizationId = Number(req.organizationId);

    return await prisma.$transaction(async (tx) => {
        const resultados = [];

        for (const m of movimientos) {
            // Usamos upsert: si existe el stock en esa bodega, actualiza; si no, crea.
            const stock = await tx.warehouseStock.upsert({
                where: { 
                    warehouseId_varianteId: {
                        warehouseId: m.warehouseId,
                        varianteId: m.varianteId
                    }
                },
                update: { cantidad: { increment: m.cantidad } },
                create: { 
                    warehouseId: m.warehouseId,
                    varianteId: m.varianteId,
                    cantidad: m.cantidad 
                }
            });

            // Registro de auditoría para cada entrada
            await tx.movimientosInventario.create({
                data: {
                    varianteId: m.varianteId,
                    cantidad: m.cantidad,
                    tipoMovimiento: "ENTRADA",
                    usuarioId: Number(req.userId)
                }
            });
            resultados.push(stock);
        }
        return resultados;
    });
};