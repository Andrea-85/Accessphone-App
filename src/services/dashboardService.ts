import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerMetricasDashboard = async (organizationId: number) => {
    try {
        const hoyInicio = new Date();
        hoyInicio.setHours(0, 0, 0, 0);

        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);

        // 1. Ventas del Día
        const ventasDia = await prisma.ventas.aggregate({
            _sum: { total: true },
            _count: { id: true },
            where: {
                organizationId,
                fecha: { gte: hoyInicio },
                estado: { not: "CANCELADO" }
            }
        });

        // 2. Ventas del Mes
        const ventasMes = await prisma.ventas.aggregate({
            _sum: { total: true },
            _count: { id: true },
            where: {
                organizationId,
                fecha: { gte: inicioMes },
                estado: { not: "CANCELADO" }
            }
        });

        // 3. Resumen de Cartera (Vigente vs Vencido)
        const carteraResumen = await prisma.cartera.groupBy({
            by: ['estado'],
            _sum: { saldoActual: true },
            _count: { id: true },
            where: { organizationId, estado: { in: ["VIGENTE", "VENCIDO"] } }
        });

        let saldoVigente = 0;
        let saldoVencido = 0;

        carteraResumen.forEach(group => {
            const monto = Number(group._sum.saldoActual || 0);
            if (group.estado === "VIGENTE") saldoVigente = monto;
            if (group.estado === "VENCIDO") saldoVencido = monto;
        });

        // 4. Abonos Recaudados en el Mes
        const abonosMes = await prisma.abono.aggregate({
            _sum: { monto: true },
            where: {
                cartera: { organizationId },
                fecha: { gte: inicioMes }
            }
        });

        // 5. Órdenes Pendientes de Despacho en Bodega
        const ordenesPendientesDespacho = await prisma.ventas.count({
            where: {
                organizationId,
                estado: "PAGADA"
            }
        });

        return {
            success: true,
            resumenVentas: {
                hoy: {
                    total: Number(ventasDia._sum.total || 0),
                    cantidadOrdenes: ventasDia._count.id
                },
                mesActual: {
                    total: Number(ventasMes._sum.total || 0),
                    cantidadOrdenes: ventasMes._count.id
                }
            },
            resumenCartera: {
                saldoVigente,
                saldoVencido,
                totalPorCobrar: saldoVigente + saldoVencido
            },
            recaudoMes: Number(abonosMes._sum.monto || 0),
            pendientesDespacho: ordenesPendientesDespacho
        };

    } catch (error: any) {
        console.error("🚨 [DASHBOARD ERROR] -", error.message);
        return { success: false, error: error.message };
    }
};