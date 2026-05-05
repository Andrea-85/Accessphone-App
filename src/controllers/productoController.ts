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
        const { nombre, precio, stock, categoriaId, subcategoriaId, imei } = req.body;

        // ✅ Subcategoria con mayúscula
        let subcatId: number | null = null;
        if (subcategoriaId && subcategoriaId !== '' && subcategoriaId !== '0') {
            const subcatExiste = await prisma.Subcategoria.findUnique({
                where: { id: Number(subcategoriaId) }
            });
            if (subcatExiste) {
                subcatId = Number(subcategoriaId);
            } else {
                console.warn(`Subcategoría ${subcategoriaId} no existe, se ignora`);
            }
        }

        const nuevo = await prisma.productos.create({
            data: { 
                nombre, 
                precio: Number(precio), 
                costo: Number(precio) * 0.7, 
                stock: Number(stock), 
                categoriaId: Number(categoriaId),
                subcategoriaId: subcatId,
                imei: imei || null
            }
        });
        res.status(201).json(nuevo);
    } catch (error: any) {
        console.error("ERROR AL CREAR:", error.message);
        res.status(400).json({ error: "Error al crear: " + error.message });
    }
};

export const actualizarProducto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre, precio, stock, categoriaId, subcategoriaId, imei } = req.body;

        // ✅ Subcategoria con mayúscula
        let subcatId: number | null = null;
        if (subcategoriaId && subcategoriaId !== '' && subcategoriaId !== '0') {
            const subcatExiste = await prisma.Subcategoria.findUnique({
                where: { id: Number(subcategoriaId) }
            });
            if (subcatExiste) {
                subcatId = Number(subcategoriaId);
            }
        }

        const actualizado = await prisma.productos.update({
            where: { id: Number(id) },
            data: {
                nombre,
                precio: Number(precio),
                costo: Number(precio) * 0.7,
                stock: Number(stock),
                categoriaId: Number(categoriaId),
                subcategoriaId: subcatId,
                imei: imei || null
            }
        });
        res.json(actualizado);
    } catch (error: any) {
        console.error("ERROR AL ACTUALIZAR:", error.message);
        res.status(400).json({ error: "Error al actualizar: " + error.message });
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

// Esta función es para las ENTRADAS (sumar al stock existente)
export const registrarEntradaStock = async (req: any, res: any) => {
    try {
        const { id } = req.params; // El ID del producto
        const { cantidad } = req.body; // Cuántas unidades llegaron

        const productoActualizado = await prisma.productos.update({
            where: { id: Number(id) },
            data: {
                stock: {
                    increment: Number(cantidad) // Esto suma automáticamente en la base de datos
                }
            }
        });

        res.status(200).json({ 
            mensaje: "Entrada de stock registrada", 
            nuevoStock: productoActualizado.stock 
        });
    } catch (error: any) {
        res.status(500).json({ error: "Error al registrar entrada de mercancía" });
    }
};

export const crearSubcategoria = async (req: any, res: any) => {
    try {
        const { id } = req.params; // El ID de la categoría (Estuches)
        const { nombre } = req.body;
        const nueva = await prisma.subcategorias.create({
            data: {
                nombre,
                categoriaId: Number(id)
            }
        });
        res.status(201).json(nueva);
    } catch (error) {
        res.status(400).json({ error: "No se pudo crear la subcategoría" });
    }
};