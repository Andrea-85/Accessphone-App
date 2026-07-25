import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TransferenciaStock {
    varianteId: number;
    bodegaOrigenId: number;
    bodegaDestinoId: number;
    cantidad: number;
    usuarioId?: number;
}

// 📦 MOVER STOCK DE UNA BODEGA A OTRA CON CREACIÓN AUTOMÁTICA Y AUDITORÍA
export const transferirStockEntreBodegas = async ({
    varianteId,
    bodegaOrigenId,
    bodegaDestinoId,
    cantidad,
    usuarioId = 1
}: TransferenciaStock) => {
    try {
        if (cantidad <= 0) throw new Error("La cantidad a transferir debe ser mayor a cero.");
        if (bodegaOrigenId === bodegaDestinoId) throw new Error("Las bodegas de origen y destino deben ser diferentes.");

        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Verificar/Garantizar existencia de bodega destino
            let bodegaDestino = await (tx as any).warehouse.findUnique({ where: { id: bodegaDestinoId } });
            
            if (!bodegaDestino) {
                bodegaDestino = await (tx as any).warehouse.create({
                    data: {
                        id: bodegaDestinoId,
                        nombre: `Bodega / Local ${bodegaDestinoId}`,
                        organizationId: 1
                    }
                });
            }

            // 2. Verificar stock en Bodega Origen
            const stockOrigen = await tx.warehouseStock.findFirst({
                where: { varianteId, warehouseId: bodegaOrigenId }
            });

            if (!stockOrigen || stockOrigen.cantidad < cantidad) {
                throw new Error(`Stock insuficiente en bodega origen (ID ${bodegaOrigenId}). Disponible: ${stockOrigen?.cantidad || 0}`);
            }

            // 3. Descontar de Bodega Origen
            await tx.warehouseStock.update({
                where: { id: stockOrigen.id },
                data: { cantidad: { decrement: cantidad } }
            });

            // 4. Sumar o Crear registro en Bodega Destino
            const stockDestino = await tx.warehouseStock.findFirst({
                where: { varianteId, warehouseId: bodegaDestinoId }
            });

            if (stockDestino) {
                await tx.warehouseStock.update({
                    where: { id: stockDestino.id },
                    data: { cantidad: { increment: cantidad } }
                });
            } else {
                await tx.warehouseStock.create({
                    data: {
                        warehouseId: bodegaDestinoId,
                        varianteId,
                        cantidad
                    }
                });
            }

            // 5. Auditoría Kardex: Salida de Origen
            await tx.movimientosInventario.create({
                data: {
                    varianteId,
                    cantidad,
                    tipoMovimiento: "SALIDA",
                    justificacion: `TRANSFERENCIA_SALIDA_DESDE_BODEGA_${bodegaOrigenId}_HACIA_${bodegaDestinoId}`,
                    usuarioId
                }
            });

            // 6. Auditoría Kardex: Entrada en Destino
            await tx.movimientosInventario.create({
                data: {
                    varianteId,
                    cantidad,
                    tipoMovimiento: "ENTRADA",
                    justificacion: `TRANSFERENCIA_ENTRADA_A_BODEGA_${bodegaDestinoId}_DESDE_${bodegaOrigenId}`,
                    usuarioId
                }
            });

            return { varianteId, cantidad, bodegaOrigenId, bodegaDestinoId };
        });

        console.log(`✅ [BODEGA] Transferencia de ${cantidad} unidades completada.`);
        return { success: true, data: resultado };

    } catch (error: any) {
        console.error("🚨 [BODEGA ERROR] - Falló la transferencia:", error.message);
        return { success: false, error: error.message };
    }
};