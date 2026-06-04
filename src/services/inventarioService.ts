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
        
        // 1. Verificamos si ya existe el registro de stock
        const stockExistente = await tx.warehouseStock.findUnique({
            where: {
                warehouseId_varianteId: {
                    warehouseId: warehouseId,
                    varianteId: varianteId
                }
            }
        });

        // 2. Si no existe, lo creamos. Si existe, lo actualizamos.
        let stockActualizado;
        const factor = tipo === 'ENTRADA' ? cantidad : -cantidad;

        if (!stockExistente) {
            stockActualizado = await tx.warehouseStock.create({
                data: {
                    warehouseId: warehouseId,
                    varianteId: varianteId,
                    cantidad: cantidad // Cantidad inicial
                }
            });
        } else {
            stockActualizado = await tx.warehouseStock.update({
                where: {
                    warehouseId_varianteId: {
                        warehouseId: warehouseId,
                        varianteId: varianteId
                    }
                },
                data: {
                    cantidad: { increment: factor }
                }
            });
        }

        // 3. Registrar el movimiento para auditoría
        const movimiento = await tx.movimientosInventario.create({
            data: {
                varianteId: varianteId,
                cantidad: cantidad,
                tipoMovimiento: tipo,
                usuarioId: usuarioId
            }
        });

        return { stockActualizado, movimiento };
    });
};