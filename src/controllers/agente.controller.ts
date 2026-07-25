import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerConversacionesAgente = async (req: Request, res: Response) => {
  try {
    // 1. Capturar el ID de la organización desde las cabeceras
    const organizationIdHeader = req.headers['x-organization-id'];

    if (!organizationIdHeader) {
      return res.status(400).json({ error: 'Falta el encabezado x-organization-id' });
    }

    const orgId = Number(organizationIdHeader);

    // 2. Consultar las sugerencias reales de la IA en la base de datos
    // Filtrar por organización y traer los datos del producto relacionado
    const sugerenciasBD = await prisma.sugerenciasAgente.findMany({
      where: {
        organizationId: orgId,
        estado: 'PENDIENTE' // O el estado que manejes en tu flujo para "esperando aprobación"
      },
      include: {
        producto: true // Trae los detalles del producto (sku, precio, descripción)
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3. Mapeamos los datos de Prisma al formato exacto que espera el Frontend
    // Esto evita tener que reescribir la pantalla que se probo y funcionó
    const conversacionesFormateadas = sugerenciasBD.map((sug) => ({
      id: String(sug.id),
      clienteNombre: `Sugerencia de Orden #${sug.id}`, // Puedes ligarlo a un cliente si añades la relación luego
      telefono: "Automatizado por IA",
      ultimoMensaje: sug.mensaje,
      estadoIA: "ESPERANDO_APROBACION", // Mapeo para el tag visual del frontend
      propuestaVenta: {
       total: sug.producto ? Number(sug.producto.precio) || 0 : 0,// Ajusta según los campos reales de tu tabla Productos
        itemsCount: 1 // Por ahora manejas un productoId directo por sugerencia
      }
    }));

    // 4. Respondemos al frontend con los datos reales de la BD
    return res.status(200).json(conversacionesFormateadas);

  } catch (error) {
    console.error('Error al consultar sugerencias del agente:', error);
    return res.status(500).json({ error: 'Error interno en el servidor de IA' });
  }
};

export const aprobarSugerenciaAgente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Capturar el ID de la sugerencia que viene en la URL
    const organizationId = Number(req.headers['x-organization-id']);

    // 1. Buscar la sugerencia en la base de datos para verificar que exista y esté pendiente
    const sugerencia = await prisma.sugerenciasAgente.findUnique({
      where: { id: Number(id) },
      include: { producto: true }
    });

    if (!sugerencia || sugerencia.organizationId !== organizationId) {
      return res.status(404).json({ error: 'Sugerencia no encontrada o no autorizada' });
    }

    if (sugerencia.estado !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Esta sugerencia ya fue procesada previamente' });
    }

    // 2. Transacción de Prisma: Cambiamos el estado de la sugerencia y restamos el stock
    // Usamos $transaction para asegurarnos de que si una acción falla, todo vuelva atrás (Consistencia Mayorista)
    await prisma.$transaction([
      // A. Marcar sugerencia como aprobada
      prisma.sugerenciasAgente.update({
        where: { id: Number(id) },
        data: { estado: 'APROBADO' }
      }),
      
      // B. Aquí iría la lógica para restar stock de la tabla Productos. 
      // Como la tabla Productos tiene 'id', simulamos restar 1 unidad (puedes ajustar la cantidad según la lógica)
      // prisma.productos.update({
      //   where: { id: sugerencia.productoId },
      //   data: { stock: { decrement: 1 } } // Ajustar el campo de stock exacto que tenga en el modelo Productos
      // })
    ]);

    return res.status(200).json({ mensaje: 'Venta del agente aprobada y stock actualizado con éxito' });

  } catch (error) {
    console.error('Error al aprobar sugerencia:', error);
    return res.status(500).json({ error: 'Error interno al procesar la aprobación' });
  }
};