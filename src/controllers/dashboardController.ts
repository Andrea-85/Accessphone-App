import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export const obtenerMetricasGerenciales = async (req: Request, res: Response): Promise<any> => {
  try {
    const organizationId = Number(req.headers['x-organization-id'] || (req as any).organizationId || 1);
    
    const haceTreintaDias = new Date();
    haceTreintaDias.setDate(haceTreintaDias.getDate() - 30);

    console.log("DEBUG DASHBOARD - Procesando para OrgId:", organizationId);

    // ==========================================
    // 1. QUERY: STOCK CRÍTICO (Con manejo robusto de nulos)
    // ==========================================
    let stockCriticoCount = 0;
    try {
      const stockCritico = await (prisma.loteCompra as any).groupBy({
        by: ['varianteId'],
        where: { cantidadActual: { gt: 0 } },
        _sum: { cantidadActual: true },
        having: {
          cantidadActual: {
            _sum: { lt: 15 }
          }
        }
      });
      stockCriticoCount = stockCritico ? stockCritico.length : 0;
    } catch (e) {
      console.warn("⚠️ Advertencia al calcular Stock Crítico:", e);
    }

    // ==========================================
    // 2. QUERY: STOCK MUERTO
    // ==========================================
    let stockMuerto: any[] = [];
    try {
      stockMuerto = await prisma.loteCompra.findMany({
        where: {
          createdAt: { lt: haceTreintaDias },
          cantidadActual: { gt: 0 }
        },
        select: {
          id: true,
          varianteId: true,
          cantidadActual: true,
          costoCompra: true,
          createdAt: true
        },
        orderBy: { createdAt: 'asc' }
      }) || [];
    } catch (e) {
      console.warn("⚠️ Advertencia al calcular Stock Muerto:", e);
    }

    // ==========================================
    // 3. QUERY: HISTORIAL DE MERMAS Y BALANCE EN PLATA
    // ==========================================
    let mermas: any[] = [];
    let totalDineroPerdidoMermas = 0;
    try {
      mermas = await (prisma as any).reportes_novedad.findMany({
        where: { organizationId: organizationId },
        orderBy: { fecha: "desc" }
      }) || [];

      for (const merma of mermas) {
        if (merma.estado === 'aprobado') {
          const loteAsociado = await prisma.loteCompra.findFirst({
            where: { varianteId: merma.varianteId },
            select: { costoCompra: true }
          });

          const costoUnitario = loteAsociado?.costoCompra ? Number(loteAsociado.costoCompra) : 0;
          totalDineroPerdidoMermas += (merma.cantidad * costoUnitario);
        }
      }
    } catch (e) {
      console.warn("⚠️ Advertencia al calcular Mermas:", e);
    }

    // ==========================================
    // 4. MÉTRICAS DEL AGENTE DE IA Y LOGÍSTICA
    // ==========================================
    let ventasTotalesIA = 0;
    let pedidosPendientesDespacho = 0;

    try {
      const sugerenciasProcesadasIA = await prisma.sugerenciasAgente.findMany({
        where: {
          organizationId: organizationId,
          estado: { in: ['APROBADO', 'DESPACHADO'] }
        },
        include: {
          producto: true
        }
      }) || [];

      ventasTotalesIA = sugerenciasProcesadasIA.reduce((acumulado, sug) => {
        const precioProducto = sug.producto ? Number(sug.producto.precio) : 0;
        return acumulado + precioProducto;
      }, 0);

      pedidosPendientesDespacho = await prisma.sugerenciasAgente.count({
        where: {
          organizationId: organizationId,
          estado: 'APROBADO'
        }
      }) || 0;
    } catch (e) {
      console.warn("⚠️ Advertencia al calcular métricas de IA/Sugerencias:", e);
    }

    // ==========================================
    // 🚀 5. NUEVAS MÉTRICAS FINANCIERAS CONSOLIDADAS (POS, EFECTIVO, BANCOS, CARTERA)
    // ==========================================
    let totalVentasGlobal = 0;
    let totalVentasPOS = 0;
    let totalEfectivo = 0;
    let totalBancosTransferencia = 0;
    let totalCarteraCreditos = 0;
    let totalAbonosCartera = 0;

    try {
      // A. Consultar todas las ventas de la organización
      const ventas = await prisma.ventas.findMany({
        where: { organizationId: organizationId },
        include: { payments: true }
      }) || [];

      for (const v of ventas) {
        const montoVenta = Number(v.total || 0);
        totalVentasGlobal += montoVenta;
        
        // Asumimos que lo facturado fuera de la IA es POS/Mostrador
        totalVentasPOS += montoVenta;

        // B. Desglosar por método de pago real registrado
        for (const p of v.payments) {
          const montoPago = Number(p.monto || 0);
          if (p.metodo === 'EFECTIVO') {
            totalEfectivo += montoPago;
          } else if (['TRANSFERENCIA', 'TARJETA'].includes(p.metodo)) {
            totalBancosTransferencia += montoPago;
          } else if (p.metodo === 'CREDITO') {
            totalCarteraCreditos += montoPago;
          }
        }
      }

      // C. Consultar abonos recibidos en cartera
      const abonos = await prisma.abono.findMany({
        where: {
          cartera: { organizationId: organizationId }
        }
      }) || [];

      totalAbonosCartera = abonos.reduce((sum, a) => sum + Number(a.monto || 0), 0);

    } catch (e) {
      console.warn("⚠️ Advertencia al calcular desglose financiero:", e);
    }

    // ==========================================
    // RESPONSE SEGURO Y COMPLETO
    // ==========================================
    return res.status(200).json({
      success: true,
      data: {
        alertasStockCriticoCount: stockCriticoCount,
        lotesInmovilizadosCount: stockMuerto.length,
        detallesStockMuerto: stockMuerto,
        balanceFinancieroMermas: {
          totalDineroPerdido: totalDineroPerdidoMermas,
          mensajeFormat: `Camilo, has tenido un déficit acumulado por mermas aprobadas de $${totalDineroPerdidoMermas.toLocaleString('es-CO')} COP.`
        },
        historialMermas: mermas,
        
        // Resumen Financiero Completo
        desgloseFinanciero: {
          totalVentasGlobal,
          totalVentasPOS,
          ventasTotalesIA,
          totalEfectivo,
          totalBancosTransferencia,
          totalCarteraCreditos,
          totalAbonosCartera
        },

        ventasTotalesIA,
        pedidosPendientesDespacho
      }
    });

  } catch (error: any) {
    console.error("🚨 Error crítico en Dashboard:", error.message);
    return res.status(500).json({ error: "No se pudieron procesar las métricas de negocio." });
  }
};