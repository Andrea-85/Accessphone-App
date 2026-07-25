import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const calcularSugerenciasReabastecimiento = async (organizationId: number) => {
    try {
        const hace30Dias = new Date();
        hace30Dias.setDate(hace30Dias.getDate() - 30);

        // 1. Obtener todas las variantes con su producto base y stock en bodegas
        const variantes = await prisma.variante.findMany({
            where: {
                producto: { organizationId }
            },
            include: {
                producto: { select: { nombre: true } },
                warehouseStocks: true
            }
        });

        // 2. Obtener el volumen de ventas por variante en los últimos 30 días
        const ventasUltimoMes = await (prisma as any).detalles_venta.groupBy({
            by: ['varianteId'],
            _sum: { cantidad: true },
            where: {
                venta: {
                    organizationId,
                    fecha: { gte: hace30Dias },
                    estado: { not: "CANCELADO" }
                }
            }
        });

        // Crear mapa para búsqueda rápida
        const ventasMap = new Map<number, number>();
        if (Array.isArray(ventasUltimoMes)) {
            ventasUltimoMes.forEach((v: any) => {
                ventasMap.set(v.varianteId, v._sum?.cantidad || 0);
            });
        }

        // 3. Procesar cálculos predictivos por variante
        const reporteReabastecimiento = variantes.map((v: any) => {
            // Sumar stock disponible en todas las bodegas (o fallback a stockActual)
            const stockTotal = v.warehouseStocks && v.warehouseStocks.length > 0
                ? v.warehouseStocks.reduce((acc: number, ws: any) => acc + ws.cantidad, 0)
                : (v.stockActual || 0);

            const unidadesVendidasMes = ventasMap.get(v.id) || 0;
            const promedioDiario = Number((unidadesVendidasMes / 30).toFixed(2));

            // Días de autonomía
            const diasAutonomia = promedioDiario > 0 
                ? Math.floor(stockTotal / promedioDiario) 
                : (stockTotal > 0 ? 999 : 0);

            // Regla de alerta
            let estado = "OPTIMO";
            if (diasAutonomia <= 3 || (stockTotal === 0 && promedioDiario > 0)) {
                estado = "CRITICO";
            } else if (diasAutonomia <= 7) {
                estado = "REABASTECER";
            }

            // Sugerencia de compra para cubrir 30 días
            const stockObjetivo30Dias = Math.ceil(promedioDiario * 30);
            const sugerenciaCompra = Math.max(0, stockObjetivo30Dias - stockTotal);

            return {
                varianteId: v.id,
                producto: v.producto?.nombre || "Producto Base",
                variante: v.nombreVariante,
                sku: v.sku,
                stockTotal,
                unidadesVendidasUltimos30Dias: unidadesVendidasMes,
                promedioDiario,
                diasAutonomia,
                estado,
                sugerenciaCompra
            };
        });

        const alertasReabastecimiento = reporteReabastecimiento.filter((item: any) => item.estado !== "OPTIMO");

        return {
            success: true,
            totalVariantesAnalizadas: reporteReabastecimiento.length,
            requierenAtencion: alertasReabastecimiento.length,
            alertas: alertasReabastecimiento,
            reporteCompleto: reporteReabastecimiento
        };

    } catch (error: any) {
        console.error("🚨 [REABASTECIMIENTO ERROR] -", error.message);
        return { success: false, error: error.message };
    }
};