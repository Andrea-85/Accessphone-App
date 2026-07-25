import { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as InventarioService from '../services/inventarioService';
import { registrarVenta as registrarVentaServicio } from '../services/ventaService';
import { revertirLotesVenta } from '../services/ventaService';

const prisma = new PrismaClient();

export const registrarVenta = async (req: any, res: Response) => {
    try {
        // 1. Extraemos los nuevos campos: descuento y motivoDescuento
        const { clienteId, items, productos: itemsAlt, warehouseId, total, payments, descuento, motivoDescuento } = req.body;
        const productos = items || itemsAlt; 
        
        if (!productos || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ error: "El formato de productos es inválido o el carrito está vacío." });
        }
        if (!clienteId || !warehouseId || total === undefined) {
            return res.status(400).json({ error: "Faltan datos obligatorios (clienteId, warehouseId o total)." });
        }

        // Extracción segura de Organización y Usuario (Vendedor autenticado)
        const organizationId = Number(req.organizationId || req.user?.organizationId || 1);
        const usuarioId = Number(req.userId || req.user?.userId || 1);

        // Estructuramos el DTO limpio incluyendo la traza de auditoría de descuentos
        const datosVenta = {
            clienteId: Number(clienteId),
            total: Number(total),
            descuento: Number(descuento || 0),             // 👈 Nuevo: Monto en COP descontado
            motivoDescuento: motivoDescuento || null,      // 👈 Nuevo: Justificación ingresada en POS
            usuarioId,                                     // 👈 Auditoría: ID del cajero/vendedor
            items: productos.map((p: any) => ({
                productoId: Number(p.productoId),
                varianteId: Number(p.varianteId),
                cantidad: Number(p.cantidad),
                precioUnitario: Number(p.precioUnitario || p.precio_unitario || 0)
            })),
            payments: Array.isArray(payments) ? payments : []
        };

        console.log(`🛒 Orquestando venta por Usuario #${usuarioId} | Descuento: $${datosVenta.descuento} COP | Organización: ${organizationId}...`);
        
        // 1. Delegamos la transacción pesada y el control FIFO al servicio core
        const resultado = await registrarVentaServicio(datosVenta, organizationId, Number(warehouseId));

        // 2. ⚡ CORRECCIÓN DE STOCK GLOBAL: Sincronizar el campo stockActual en la tabla Variante
        for (const item of datosVenta.items) {
            try {
                await (prisma as any).variante.update({
                    where: { id: item.varianteId },
                    data: {
                        stockActual: {
                            decrement: item.cantidad
                        }
                    }
                });
            } catch (errStock) {
                console.warn(`⚠️ No se pudo decrementar stockActual en Variante #${item.varianteId}:`, errStock);
            }
        }

        // Retornamos la venta creada con sus respectivos detalles
        const ventaCompleta = await prisma.ventas.findUnique({
            where: { id: resultado.ventaId },
            include: { detalles: true }
        });

        return res.status(201).json({
            success: true,
            ventaId: resultado.ventaId,
            venta: ventaCompleta
        });

    } catch (error: any) {
        console.error(`🚨 Error al registrar venta en mostrador:`, error.message);
        return res.status(400).json({ error: error.message });
    }
};

export const cancelarVenta = async (req: any, res: Response) => {
    try {
        const { ventaId } = req.body;
        const organizationId = Number(req.organizationId || req.user?.organizationId || 1);
        const usuarioId = Number(req.userId || req.user?.userId || 1);

        const resultado = await prisma.$transaction(async (tx) => {
            const venta = await tx.ventas.findFirst({
                where: { id: Number(ventaId), organizationId },
                include: { detalles: true }
            });

            if (!venta || venta.estado !== "PENDIENTE") {
                throw new Error("La venta no existe o no se puede cancelar.");
            }

            // 1. ALGORITMO ROLLBACK FIFO: Reabrir las bolsas en LoteCompra usando la traza del Kardex
            await revertirLotesVenta(tx, venta.id);

            // 2. Restablecer el stock general de la bodega y auditar
            for (const detalle of venta.detalles) {
                const stockRecord = await tx.warehouseStock.findFirst({
                    where: { varianteId: detalle.varianteId, warehouse: { organizationId } }
                });

                if (stockRecord) {
                    await tx.warehouseStock.update({
                        where: { id: stockRecord.id },
                        data: { cantidad: { increment: detalle.cantidad } }
                    });

                    // Devolver también el stockTotal global
                    await (tx as any).variante.update({
                        where: { id: detalle.varianteId },
                        data: { stockTotal: { increment: detalle.cantidad } }
                    });

                    // Al cancelar reingresa la mercancía de forma global
                    await tx.movimientosInventario.create({
                        data: {
                            varianteId: detalle.varianteId,
                            cantidad: detalle.cantidad,
                            tipoMovimiento: "ENTRADA",
                            usuarioId: usuarioId,
                            justificacion: `Cancelación automática de Venta #${venta.id}`
                        }
                    });
                }
            }

            // 3. Marcar la venta como CANCELADA
            return await tx.ventas.update({
                where: { id: venta.id },
                data: { estado: "CANCELADA" },
                include: { detalles: true }
            });
        });

        return res.status(200).json(resultado);

    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const completarVenta = async (req: any, res: Response) => {
    try {
        const { ventaId } = req.body;
        const organizationId = Number(req.organizationId || req.user?.organizationId || 1);
        
        const venta = await prisma.ventas.findFirst({ where: { id: Number(ventaId), organizationId } });

        if (!venta) return res.status(404).json({ error: "Venta no encontrada." });
        if (venta.estado !== "PENDIENTE") return res.status(400).json({ error: `La venta ya se encuentra en estado: ${venta.estado}` });

        const ventaActualizada = await prisma.ventas.update({ 
            where: { id: venta.id }, 
            data: { estado: "COMPLETADA" } 
        });

        return res.status(200).json(ventaActualizada);
    } catch (error: any) {
        return res.status(400).json({ error: error.message });
    }
};

export const obtenerVentas = async (req: any, res: Response) => {
    try {
        const organizationId = Number(req.organizationId || req.user?.organizationId || 1);
        const { estado } = req.query;
        const filtros: any = { organizationId };
        if (estado) filtros.estado = String(estado);

        const ventas = await prisma.ventas.findMany({
            where: filtros,
            include: { detalles: true },
            orderBy: { fecha: 'desc' }
        });
        return res.json(ventas);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};

export const obtenerReporteEconomico = async (req: any, res: Response) => {
    return res.json({ message: "Reporte en construcción" });
};

export const buscarVentasPorCliente = async (req: any, res: Response) => { 
    return res.json({ message: "Pendiente de implementar" });
};

export const importar = async (req: any, res: Response) => {
    return res.json({ message: "Importación ejecutada" });
};

export const registrarMovimiento = async (req: any, res: Response) => {
    try {
        const { varianteId, cantidad, tipo, warehouseId } = req.body;
        const organizationId = Number(req.organizationId || req.user?.organizationId || 1);
        const resultado = await InventarioService.registrarMovimiento(
            organizationId,
            Number(varianteId),
            Number(cantidad),
            tipo,
            Number(req.user?.userId || 1),
            Number(warehouseId),
            "Movimiento manual desde controlador" 
        );
        return res.status(201).json(resultado);
    } catch (e: any) {
        return res.status(400).json({ error: e.message });
    }
};

export const obtenerPedidosPendientes = async (req: any, res: any): Promise<void> => {
  try {
    const organizationId = req.organizationId || req.user?.organizationId || 1; 

    const pedidos = await (prisma as any).venta.findMany({
      where: {
        organizationId,
        estado: 'PENDIENTE_PAGO',
        origen: 'WHATSAPP'
      },
      include: {
        items: true 
      },
      orderBy: {
        id: 'asc' 
      }
    });

    res.status(200).json(pedidos);
  } catch (error: any) {
    console.error("🚨 Error en obtenerPedidosPendientes:", error.message);
    res.status(500).json({ error: "No se pudo consultar la cola de despacho" });
  }
};