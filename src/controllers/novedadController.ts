import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 1. REGISTRAR NOVEDAD (Empleado en bodega)
 */
export const registrarNovedad = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).organizationId || 1;
    const { empleadoId, varianteId, empleadoText, productoText, tipo, descripcion, foto_url, cantidad } = req.body;

    if (!varianteId || !cantidad || cantidad <= 0) {
      res.status(400).json({ error: "VarianteId y cantidad válida son requeridos." });
      return;
    }

    const nuevaNovedad = await (prisma as any).reportes_novedad.create({
      data: {
        organizationId: Number(organizationId || 1), 
    empleadoId: 104,
    varianteId: 1,
    empleadoText: "Andrés Mendoza (Bodega Central)",
    productoText: "Variante ID #1",
    tipo: "DANIO_LOCAL",
    descripcion: descripcion, // Asegúrate de que use la variable que viene del Front
    foto_url: foto_url,
    cantidad: Number(cantidad),
    estado: "pendiente"
  }
});

    res.status(201).json({ success: true, novedad: nuevaNovedad });
  } catch (error: any) {
    // 👇 AGREGA ESTAS DOS LÍNEAS DE DIAGNÓSTICO CRUDO:
    console.log("👇 ERROR COMPLETO DETECTADO:");
    console.error(error); 
    
    console.error("🚨 Error al registrar novedad:", error.message);
    res.status(500).json({ error: "No se pudo registrar la novedad operativa." });
  }
};

/**
 * 2. APROBAR NOVEDAD CON AJUSTE FIFO (Camilo o Administrador)
 */
export const aprobarNovedadFIFO = async (req: Request, res: Response): Promise<void> => {
  try {
    const organizationId = (req as any).organizationId || 1;
    const { id } = req.params; // ID del reporte de novedad

    // Buscar la novedad pendiente
    const novedad = await (prisma as any).reportes_novedad.findFirst({
      where: { id: Number(id), organizationId, estado: 'pendiente' }
    });

    if (!novedad) {
      res.status(404).json({ error: "El reporte de novedad no existe o ya fue procesado." });
      return;
    }

    let cantidadPorDescontar = novedad.cantidad;
    const varianteId = novedad.varianteId;

    // Ejecutar el descuento en transacción para asegurar consistencia FIFO estricta
    await prisma.$transaction(async (tx) => {
      
      // Buscar lotes con stock de esta variante, del más antiguo al más nuevo
      const lotes = await tx.loteCompra.findMany({
        where: { varianteId, cantidadActual: { gt: 0 } },
        orderBy: { id: 'asc' } // Criterio FIFO
      });

      let stockDisponibleTotal = lotes.reduce((acc, l) => acc + l.cantidadActual, 0);

      if (stockDisponibleTotal < cantidadPorDescontar) {
        throw new Error(`Stock insuficiente en lotes para cubrir la merma de ${cantidadPorDescontar} unidades.`);
      }

      // Consumir de los lotes aplicando FIFO
      for (const lote of lotes) {
        if (cantidadPorDescontar <= 0) break;

        if (lote.cantidadActual >= cantidadPorDescontar) {
          // El lote cubre toda la merma restante
          await tx.loteCompra.update({
            where: { id: lote.id },
            data: { cantidadActual: lote.cantidadActual - cantidadPorDescontar }
          });
          cantidadPorDescontar = 0;
        } else {
          // El lote se agota por completo, pasamos al siguiente
          cantidadPorDescontar -= lote.cantidadActual;
          await tx.loteCompra.update({
            where: { id: lote.id },
            data: { cantidadActual: 0 }
          });
        }
      }

      // Actualizar el estado del reporte a 'aprobado'
      await (tx as any).reportes_novedad.update({
        where: { id: novedad.id },
        data: { estado: 'aprobado' }
      });
    });

    res.status(200).json({ success: true, message: "Novedad aprobada e inventario ajustado bajo FIFO correctamente." });
  } catch (error: any) {
    console.error("🚨 Error al aprobar novedad FIFO:", error.message);
    res.status(500).json({ error: error.message || "Error interno al procesar el ajuste de inventario." });
  }
};