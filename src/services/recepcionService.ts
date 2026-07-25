import { PrismaClient } from '@prisma/client';
import stringSimilarity from 'string-similarity';

const prisma = new PrismaClient();

export async function registrarFacturaEnInventario(datos: any, organizationId: number, usuarioId: number) {
  // 1. Identificar productos nuevos y existentes
  const nombresItems = datos.items.map((i: any) => i.descripcion);
  const existentes = await prisma.variante.findMany({
    where: { nombreVariante: { in: nombresItems } }
  });

  const aCrear = datos.items.filter((i: any) => !existentes.find(e => e.nombreVariante === i.descripcion));

  // 2. Creación masiva (Bulk Create) de productos nuevos
  for (const item of aCrear) {
    const nuevoProd = await prisma.productos.create({
      data: {
        nombre: item.descripcion,
        organizationId,
        estado: 'ACTIVO',
        precio: item.precioUnitario || 0,
        costo: 0,
        categoriaId: 1,
        variantes: { create: { nombreVariante: item.descripcion, stockActual: 0, sku: `SKU-${Date.now()}`, precio: item.precioUnitario || 0 } }
      }
    });
  }

  // 3. Ejecutar movimientos de una sola vez fuera de una transacción larga
  // Si necesitas atomicidad total, usa un middleware o un procedure, 
  // pero para este volumen, el registro individual es suficiente si eliminamos el bucle transaccional.
  for (const item of datos.items) {
    const variante = await prisma.variante.findFirst({ where: { nombreVariante: item.descripcion } });
    if (variante) {
      await prisma.movimientosInventario.create({
        data: {
          cantidad: item.cantidad,
          tipoMovimiento: 'ENTRADA',
          justificacion: `Ingreso auto: ${datos.proveedor}`,
          usuarioId: usuarioId,
          varianteId: variante.id,
          productosId: variante.productoId
        }
      });
      await prisma.variante.update({
        where: { id: variante.id },
        data: { stockActual: { increment: item.cantidad } }
      });
    }
  }

  return { success: true };
}