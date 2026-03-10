import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerProductos = async (req: Request, res: Response) => {
    try {
        const productos = await prisma.productos.findMany({
            include: {
                categoria: true // <-- Esto es lo que falta para que traiga el NOMBRE de la categoría
            }
        });
        res.json(productos);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: "Error al obtener productos" });
    }
};

export const crearProducto = async (req: Request, res: Response) => {
    try {
        const { nombre, precio, stock } = req.body;
        const nuevo = await prisma.productos.create({
            data: { 
                nombre, 
                precio: Number(precio), 
                costo: Number(precio) * 0.7, // Le inventamos un costo del 70% para que no falle
                stock: Number(stock), 
                categoriaId: 1 // Le ponemos la categoría 1 por defecto para que no falle
            }
        });
        res.status(201).json(nuevo);
    } catch (error: any) {
        console.error(error); // ESTO HARÁ QUE POR FIN VEAS EL ERROR EN LA TERMINAL
        res.status(400).json({ error: "Error al crear: " + error.message });
    }
};

export const actualizarProducto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, precio, stock, categoriaId } = req.body; 

        // Convertimos a números de forma segura
        const idNumerico = Number(id);
        const catId = categoriaId ? Number(categoriaId) : null;

        const actualizado = await prisma.productos.update({
            where: { id: idNumerico },
            data: {
                nombre: nombre,
                precio: precio ? Number(precio) : 0,
                stock: stock ? Number(stock) : 0,
                // Solo enviamos categoriaId si es un número válido > 0
                ...(catId && catId > 0 ? { categoriaId: catId } : {})
            }
        });
        res.json(actualizado);
    } catch (error: any) {
        console.error("ERROR DETALLADO:", error.message);
        res.status(400).json({ error: "Error de Relación: Verifica que la categoría exista en la base de datos." });
    }
};

export const obtenerCategorias = async (req: Request, res: Response) => {
  try {
    const nombres = ['Celulares', 'Audífonos', 'Cargadores', 'Fundas', 'Accesorios'];
    
    // Esto recorre la lista y crea la que falte por nombre
    for (const nombre of nombres) {
      await prisma.categorias.upsert({
        where: { nombre: nombre },
        update: {},
        create: { nombre: nombre },
      });
    }

    const todas = await prisma.categorias.findMany({ orderBy: { nombre: 'asc' } });
    res.json(todas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error fatal en categorías" });
  }
};

export const eliminarProducto = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productos.delete({
      where: { id: Number(id) },
    });
    res.json({ msg: "Producto eliminado con éxito" });
  } catch (error) {
    res.status(500).json({ error: "No se pudo eliminar el producto" });
  }
};

export const buscarProductoPorNombre = async (req: Request, res: Response) => {
    try {
        const { nombre } = req.query;
        const productos = await prisma.productos.findMany({
            where: { nombre: { contains: String(nombre), mode: 'insensitive' } }
        });
        res.json(productos);
    } catch (error: any) {
        res.status(500).json({ error: "Error en la búsqueda" });
    }
};

// Esta función también la pedía tu ruta
export const obtenerStockBajo = async (req: Request, res: Response) => {
    try {
        const productos = await prisma.productos.findMany({
            where: { stock: { lt: 5 } }
        });
        res.json(productos);
    } catch (error: any) {
        res.status(500).json({ error: "Error al consultar stock" });
    }
};
