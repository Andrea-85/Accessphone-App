import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 1. GET /api/pedidos/pendientes
export const obtenerPedidosPendientes = async (req: Request, res: Response) => {
  try {
    const organizationId = Number(req.headers['x-organization-id']);

    if (!organizationId) {
      return res.status(400).json({ error: 'Falta el encabezado x-organization-id' });
    }

    // Buscamos las sugerencias de la IA que ya fueron APROBADAS en el paso anterior
    // pero que todavía no han sido despachadas por el bodeguero
    const pedidosLogistica = await prisma.sugerenciasAgente.findMany({
      where: {
        organizationId: organizationId,
        estado: 'APROBADO' // Lo que aprobó el comerciante en el monitor de IA
      },
      include: {
        producto: true
      },
      orderBy: {
        updatedAt: 'asc' // Prioridad a lo que lleva más tiempo esperando empaque
      }
    });

    // Mapeamos al formato estricto que espera la interfaz de tu DespachoPage
    const formatoDespacho = pedidosLogistica.map((p) => ({
      id: p.id,
      clienteNombre: `Pedido Mayorista #${p.id}`,
      origen: p.tipo === 'VENTA' ? 'WHATSAPP' : 'POS',
      total: p.producto ? Number(p.producto.precio) : 0,
      fecha: p.updatedAt.toLocaleTimeString('es-CO'),
      items: p.producto ? [
        {
          varianteId: p.productoId,
          nombre: p.producto.nombre,
          cantidad: 1, // Ajusta según la estructura de cantidades de tu negocio
          sku: p.producto.imei || `SKU-${p.productoId}` // Usa imei o sku según tu modelo
        }
      ] : []
    }));

    return res.status(200).json(formatoDespacho);
  } catch (error) {
    console.error('Error en cola de despacho:', error);
    return res.status(500).json({ error: 'Error al consultar la cola logística' });
  }
};

// 2. PUT /api/pedidos/:id/despachar
export const marcarPedidoDespachado = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organizationId = Number(req.headers['x-organization-id']);

    // Actualizamos el estado a FINALIZADO o DESPACHADO para sacarlo de la cola activa
    await prisma.sugerenciasAgente.update({
      where: {
        id: Number(id),
        organizationId: organizationId
      },
      data: {
        estado: 'DESPACHADO'
      }
    });

    return res.status(200).json({ mensaje: 'Mercancía despachada correctamente' });
  } catch (error) {
    console.error('Error al despachar pedido:', error);
    return res.status(500).json({ error: 'No se pudo procesar el despacho en el servidor' });
  }
};