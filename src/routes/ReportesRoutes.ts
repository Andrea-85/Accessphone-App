import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// POST para crear reporte
router.post('/', async (req: Request, res: Response) => {
  try {
    const { empleado, producto, tipo, descripcion, foto_url } = req.body;

    if (!empleado || !producto || !tipo) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
    }

    const nuevoReporte = await prisma.reportes_novedad.create({
      data: {
        empleado,
        producto,
        tipo,
        descripcion,
        foto_url: foto_url || null
      }
    });

    res.status(201).json(nuevoReporte);
  } catch (error: any) {
    res.status(400).json({ error: "Error al guardar: " + error.message });
  }
});

// GET para obtener todos los reportes
router.get('/', async (req: Request, res: Response) => {
  try {
    const reportes = await prisma.reportes_novedad.findMany({
      orderBy: { fecha: 'desc' }
    });
    res.json(reportes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET para buscar reportes por producto
router.get('/buscar/:producto', async (req: Request, res: Response) => {
  try {
    // Forzamos la conversión a string simple
    const producto = String(req.params.producto); 
    
    const reportes = await prisma.reportes_novedad.findMany({
      where: {
        producto: {
          contains: producto, // Ahora TypeScript sabe que es un string
          mode: 'insensitive'
        }
      },
      orderBy: { fecha: 'desc' }
    });
    res.json(reportes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;