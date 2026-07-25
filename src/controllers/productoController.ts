import { Request, Response } from 'express';
import prisma from '../lib/prisma';

function parsePositiveInt(value: unknown): number | null {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.floor(n);
}

function organizacionReq(req: Request): number | null {
    const fromQuery = req.query.organizationId ?? req.headers['x-organization-id'];
    const raw = req.body?.organizationId ?? fromQuery;
    return parsePositiveInt(raw);
}

function bodegaReq(req: Request): number | null {
    const raw = req.body?.warehouseId ?? req.query.warehouseId;
    return parsePositiveInt(raw);
}

async function bodegaPerteneceOrganizacion(warehouseId: number, organizationId: number): Promise<boolean> {
    const w = await prisma.warehouse.findFirst({
        where: { id: warehouseId, organizationId },
    });
    return !!w;
}

export const obtenerProductos = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });

        const productos = await prisma.productos.findMany({
            where: { organizationId },
            include: {
                categoria: true,
                variantes: { include: { warehouseStocks: true } }
            },
            orderBy: { nombre: 'asc' },
        });
        res.json(productos);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

export const crearProducto = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        const warehouseId = bodegaReq(req);
        if (organizationId == null || warehouseId == null) return res.status(400).json({ error: 'Faltan datos' });

        const { nombre, precio, stock, categoriaId, subcategoriaId, imei } = req.body;
        if (!(await bodegaPerteneceOrganizacion(warehouseId, organizationId))) {
            return res.status(400).json({ error: 'Bodega inválida' });
        }

        const cantidadInicial = Math.max(0, Math.floor(Number(stock) || 0));

        const nuevo = await prisma.$transaction(async (tx) => {
            const p = await tx.productos.create({
                data: {
                    organizationId, nombre, precio: Number(precio), costo: Number(precio) * 0.7,
                    categoriaId: Number(categoriaId), subcategoriaId: subcategoriaId ? Number(subcategoriaId) : null,
                    imei: imei || null,
                },
            });
            await tx.warehouseStock.create({
                data: { warehouseId, varianteId: p.id, cantidad: cantidadInicial }
            });
            return p;
        });
        res.status(201).json(nuevo);
    } catch (error: any) {
        res.status(400).json({ error: 'Error al crear: ' + error.message });
    }
};

export const actualizarProducto = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });

        const { id } = req.params;
        const { nombre, precio, categoriaId, imei } = req.body;

        const actualizado = await prisma.productos.update({
            where: { id: Number(id) },
            data: { nombre, precio: Number(precio), categoriaId: Number(categoriaId), imei }
        });
        res.json(actualizado);
    } catch (error: any) {
        res.status(400).json({ error: 'Error al actualizar: ' + error.message });
    }
};

export const obtenerCategorias = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });
        const todas = await prisma.categorias.findMany({ where: { organizationId }, orderBy: { nombre: 'asc' } });
        res.json(todas);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener categorías' });
    }
};

export const eliminarProducto = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.productos.delete({ where: { id: Number(id) } });
        res.json({ msg: 'Eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar' });
    }
};

export const crearSubcategoria = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        const nueva = await prisma.subcategoria.create({
            data: { nombre, categoriaId: Number(id) },
        });
        res.status(201).json(nueva);
    } catch (error) {
        res.status(400).json({ error: 'No se pudo crear la subcategoría' });
    }
};