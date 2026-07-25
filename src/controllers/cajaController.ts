import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const realizarArqueoCajaDiario = async (req: Request, res: Response): Promise<void> => {
  try {
    const activeOrgId = Number((req as any).user?.organizationId || (req as any).organizationId) || 1;
    
    // Configurar el rango de tiempo de HOY (Desde las 00:00:00 hasta las 23:59:59)
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);
    
    const finHoy = new Date();
    finHoy.setHours(23, 59, 59, 999);

    // Mapeo seguro de modelos en Prisma
    const tablaVentas = (prisma as any).ventas || (prisma as any).venta;
    const tablaAbonos = (prisma as any).abonos || (prisma as any).abono;

    // 1. Obtener ventas del día con sus pagos asociados
    let ventasHoy: any[] = [];
    if (tablaVentas) {
      ventasHoy = await tablaVentas.findMany({
        where: {
          organizationId: activeOrgId,
          fecha: { gte: inicioHoy, lte: finHoy },
          estado: { not: 'ANULADA' }
        },
        select: {
          total: true,
          estado: true,
          payments: true
        }
      });
    }

    // 2. Obtener abonos de cartera recaudados hoy
    let abonosHoy: any[] = [];
    if (tablaAbonos) {
      try {
        abonosHoy = await tablaAbonos.findMany({
          where: {
            cartera: { organizationId: activeOrgId },
            fecha: { gte: inicioHoy, lte: finHoy }
          },
          select: {
            monto: true,
            metodoPago: true
          }
        });
      } catch (e) {
        console.log("ℹ️ No se encontraron abonos o la tabla no está vinculada aún.");
      }
    }

    // 3. Procesar la matemática del arqueo esperado
    let efectivoEsperado = 0;
    let transferenciaEsperada = 0;

    // Sumar ventas según los métodos en `payments` o por defecto en efectivo
    ventasHoy.forEach((v: any) => {
      const totalVenta = Number(v.total) || 0;
      
      if (v.payments && Array.isArray(v.payments) && v.payments.length > 0) {
        v.payments.forEach((p: any) => {
          const montoPago = Number(p.monto) || 0;
          if (p.metodo === 'TRANSFERENCIA') {
            transferenciaEsperada += montoPago;
          } else {
            efectivoEsperado += montoPago;
          }
        });
      } else {
        // Si no tiene pagos registrados explícitos, se asigna a efectivo
        efectivoEsperado += totalVenta;
      }
    });

    // Sumar abonos recaudados
    abonosHoy.forEach((a: any) => {
      const monto = Number(a.monto) || 0;
      if (a.metodoPago === 'TRANSFERENCIA') {
        transferenciaEsperada += monto;
      } else {
        efectivoEsperado += monto;
      }
    });

    const totalCalculadoSistema = efectivoEsperado + transferenciaEsperada;

    // 4. Entregar la respuesta al frontend
    res.status(200).json({
      success: true,
      data: {
        fecha: inicioHoy.toISOString().split('T')[0],
        efectivoEsperado,
        transferenciaEsperada,
        totalCalculadoSistema,
        mensajeAyuda: `El cajero debe tener $${efectivoEsperado.toLocaleString('es-CO')} en billetes físicos y $${transferenciaEsperada.toLocaleString('es-CO')} en transferencias bancarias.`
      }
    });

  } catch (error: any) {
    console.error("🚨 Error al procesar arqueo de caja diario:", error.message);
    res.status(500).json({ error: "No se pudo compilar el arqueo diario de caja." });
  }
};