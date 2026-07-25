import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

export const importarProductosExcel = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No se subió ningún archivo Excel.' });
      return;
    }

    // Extraer organizationId del usuario autenticado (o valor por defecto 1)
    const userReq = (req as any).user;
    const organizationId = Number(userReq?.organizationId || 1);

    // Leer el buffer del archivo subido
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheetData: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!sheetData || sheetData.length === 0) {
      res.status(400).json({ success: false, error: 'El archivo Excel está vacío.' });
      return;
    }

    let creadosCount = 0;

    // Procesar fila por fila del Excel
    for (const fila of sheetData) {
      const nombre = fila.Nombre || fila.nombre;
      const sku = String(fila.SKU || fila.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
      const precio = Number(fila.Precio || fila.precio || 0);
      const costo = Number(fila.Costo || fila.costo || 0);
      const stock = Number(fila.Stock || fila.stock || 0);
      const nombreVar = fila.Variante || fila.variante || 'Estándar';

      if (!nombre) continue;

      // Crear producto con los campos exactos de tu modelo de Prisma
      await prisma.productos.create({
        data: {
          nombre,
          organizationId,
          precio,
          costo,
          variantes: {
            create: {
              sku,
              nombreVariante: String(nombreVar),
              precio,
              stockActual: stock,
            }
          }
        }
      });

      creadosCount++;
    }

    res.status(200).json({
      success: true,
      message: `¡Se importaron ${creadosCount} productos con éxito!`
    });

  } catch (error: any) {
    console.error("🚨 Error al importar Excel:", error.message);
    res.status(500).json({ success: false, error: "Error interno al procesar el archivo Excel." });
  }
};