import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';

// Línea rápida de parche
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
    }
  }
}
const prisma = new PrismaClient();
const router = Router();

router.use(organizationMiddleware);

// 1. LISTAR PRODUCTOS
router.get('/', async (req: Request, res: Response) => {
  try {
    const productos = await prisma.productos.findMany({
      where: { organizationId: Number(req.organizationId) }
    });
    res.json(productos);
  } catch (error) {
    res.status(400).json({ error: 'Error al obtener productos' });
  }
});

// 2. CREAR PRODUCTO (Corregido)
router.post('/', async (req: Request, res: Response) => {
  try {
    // Agregamos 'costo' a la desestructuración
    const { nombre, precio, costo, categoriaId } = req.body;
    const nuevoProducto = await prisma.productos.create({
      data: {
        nombre,
        precio: Number(precio),
        costo: Number(costo), // <--- ¡AQUÍ ESTABA EL ERROR!
        categoria: { connect: { id: Number(categoriaId) } }, 
        organization: { connect: { id: Number(req.organizationId) } }
      }
    });
    res.status(201).json(nuevoProducto);
  } catch (error) {
    res.status(400).json({ error: 'Error al crear el producto' });
  }
});

// 3. ACTUALIZAR PRODUCTO (Corregido)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Agregamos 'costo' también aquí
    const { nombre, precio, costo, categoriaId } = req.body;
    const productoActualizado = await prisma.productos.update({
      where: { 
        id: Number(id),
        organizationId: Number(req.organizationId)
      },
      data: {
        nombre,
        precio: Number(precio),
        costo: Number(costo), // <--- Agregado también
        categoria: { connect: { id: Number(categoriaId) } }
      }
    });
    res.json(productoActualizado);
  } catch (error) {
    res.status(400).json({ error: 'Error al actualizar el producto' });
  }
});

// 4. ELIMINAR PRODUCTO
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productos.delete({
      where: { 
        id: Number(id),
        organizationId: Number(req.organizationId)
      }
    });
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (error) {
    res.status(400).json({ error: 'Error al eliminar el producto' });
  }
});

export default router;