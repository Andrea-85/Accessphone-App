import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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
        if (organizationId == null) {
            return res.status(400).json({ error: 'Falta organizationId (query o cuerpo)' });
        }

        const productos = await prisma.productos.findMany({
            where: { organizationId },
            include: {
                categoria: true,
                warehouseStocks: true,
            },
            orderBy: { nombre: 'asc' },
        });
        res.json(productos);
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener productos' });
    }
};

export const crearProducto = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        const warehouseId = bodegaReq(req);
        if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });
        if (warehouseId == null) return res.status(400).json({ error: 'Falta warehouseId para registrar el stock' });

        const { nombre, precio, stock, categoriaId, subcategoriaId, imei } = req.body;

        if (!(await bodegaPerteneceOrganizacion(warehouseId, organizationId))) {
            return res.status(400).json({ error: 'La bodega no existe en esta organización' });
        }

        const catNum = Number(categoriaId);
        let categoriaIdFinal: number | null = Number.isFinite(catNum) && catNum > 0 ? catNum : null;
        if (categoriaIdFinal != null) {
            const catOk = await prisma.categorias.findFirst({
                where: { id: categoriaIdFinal, organizationId },
            });
            if (!catOk) return res.status(400).json({ error: 'Categoría inválida para esta organización' });
        }

        let subcatId: number | null = null;
        if (subcategoriaId !== undefined && subcategoriaId !== '' && subcategoriaId !== '0') {
            const sub = await prisma.subcategoria.findFirst({
                where: { id: Number(subcategoriaId) },
                include: { categoria: true },
            });
            if (sub && sub.categoria.organizationId === organizationId) {
                subcatId = sub.id;
            } else {
                console.warn(`Subcategoría ${subcategoriaId} no existe o no pertenece a la org, se ignora`);
            }
        }

        const cantidadInicial = Math.max(0, Math.floor(Number(stock) || 0));

        const nuevo = await prisma.$transaction(async (tx) => {
            const p = await tx.productos.create({
                data: {
                    organizationId,
                    nombre,
                    precio: Number(precio),
                    costo: Number(precio) * 0.7,
                    categoriaId: categoriaIdFinal,
                    subcategoriaId: subcatId,
                    imei: imei || null,
                },
            });

            await tx.warehouseStock.upsert({
                where: {
                    warehouseId_varianteId: {
                        warehouseId,
                        varianteId: p.id,
                    },
                },
                update: { cantidad: cantidadInicial },
                create: {
                    warehouseId,
                    varianteId: p.id,
                    cantidad: cantidadInicial,
                },
            });

            return tx.productos.findUnique({
                where: { id: p.id },
                include: { categoria: true, warehouseStocks: true },
            });
        });

        res.status(201).json(nuevo);
    } catch (error: any) {
        console.error('ERROR AL CREAR:', error.message);
        res.status(400).json({ error: 'Error al crear: ' + error.message });
    }
};

export const actualizarProducto = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });

        const { id } = req.params;
        const { nombre, precio, stock, categoriaId, subcategoriaId, imei, warehouseId: whBody } = req.body;
        const warehouseId = parsePositiveInt(whBody) ?? bodegaReq(req);

        const existente = await prisma.productos.findFirst({
            where: { id: Number(id), organizationId },
        });
        if (!existente) {
            return res.status(404).json({ error: 'Producto no encontrado en esta organización' });
        }

        const catNum = Number(categoriaId);
        let categoriaIdFinal: number | null = Number.isFinite(catNum) && catNum > 0 ? catNum : null;
        if (categoriaIdFinal != null) {
            const catOk = await prisma.categorias.findFirst({
                where: { id: categoriaIdFinal, organizationId },
            });
            if (!catOk) return res.status(400).json({ error: 'Categoría inválida para esta organización' });
        }

        let subcatId: number | null = null;
        if (subcategoriaId !== undefined && subcategoriaId !== '' && subcategoriaId !== '0') {
            const sub = await prisma.subcategoria.findFirst({
                where: { id: Number(subcategoriaId) },
                include: { categoria: true },
            });
            if (sub && sub.categoria.organizationId === organizationId) {
                subcatId = sub.id;
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.productos.update({
                where: { id: existente.id },
                data: {
                    nombre,
                    precio: Number(precio),
                    costo: Number(precio) * 0.7,
                    categoriaId: categoriaIdFinal,
                    subcategoriaId: subcatId,
                    imei: imei || null,
                },
            });

            if (stock !== undefined && warehouseId != null) {
                if (!(await bodegaPerteneceOrganizacion(warehouseId, organizationId))) {
                    throw new Error('La bodega no existe en esta organización');
                }
                const c = Math.max(0, Math.floor(Number(stock)));
                await tx.warehouseStock.upsert({
                    where: {
                        warehouseId_varianteId: {
                            warehouseId,
                            varianteId: existente.id,
                        },
                    },
                    update: { cantidad: c },
                    create: {
                        warehouseId,
                        varianteId: existente.id,
                        cantidad: c,
                    },
                });
            }
        });

        const actualizado = await prisma.productos.findUnique({
            where: { id: existente.id },
            include: { categoria: true, warehouseStocks: true },
        });
        res.json(actualizado);
    } catch (error: any) {
        console.error('ERROR AL ACTUALIZAR:', error.message);
        res.status(400).json({ error: 'Error al actualizar: ' + error.message });
    }
};

export const obtenerCategorias = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) {
            return res.status(400).json({ error: 'Falta organizationId' });
        }

        const nombres = ['Celulares', 'Audífonos', 'Cargadores', 'Fundas', 'Accesorios'];

        for (const nombre of nombres) {
            await prisma.categorias.upsert({
                where: {
                    organizationId_nombre: {
                        organizationId,
                        nombre,
                    },
                },
                update: {},
                create: {
                    organizationId,
                    nombre,
                },
            });
        }

        const todas = await prisma.categorias.findMany({
            where: { organizationId },
            orderBy: { nombre: 'asc' },
        });
        res.json(todas);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error fatal en categorías' });
    }
};

export const eliminarProducto = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) {
            return res.status(400).json({ error: 'Falta organizationId' });
        }
        const { id } = req.params;

        const r = await prisma.productos.deleteMany({
            where: { id: Number(id), organizationId },
        });

        if (r.count === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        res.json({ msg: 'Producto eliminado con éxito' });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo eliminar el producto' });
    }
};

export const buscarProductoPorNombre = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) {
            return res.status(400).json({ error: 'Falta organizationId' });
        }
        const { nombre } = req.query;
        const productos = await prisma.productos.findMany({
            where: {
                organizationId,
                nombre: { contains: String(nombre), mode: 'insensitive' },
            },
            include: { categoria: true, warehouseStocks: true },
        });
        res.json(productos);
    } catch (error: any) {
        res.status(500).json({ error: 'Error en la búsqueda' });
    }
};

export const obtenerStockBajo = async (req: Request, res: Response) => {
    try {
        const organizationId = organizacionReq(req);
        if (organizationId == null) {
            return res.status(400).json({ error: 'Falta organizationId' });
        }

        const productos = await prisma.productos.findMany({
            where: { organizationId },
            include: { warehouseStocks: true },
        });

        const suma = (p: (typeof productos)[0]) =>
            p.warehouseStocks.reduce((acc, ws) => acc + ws.cantidad, 0);

        const bajo = productos.filter((p) => suma(p) < 5);
        res.json(bajo);
    } catch (error: any) {
        res.status(500).json({ error: 'Error al consultar stock' });
    }
};

/** Suma entrada de mercancía en una bodega concreta. */
export const registrarEntradaStock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const organizationId = organizacionReq(req);
        const warehouseId = bodegaReq(req);
        const cantidadRaw = Number(req.body?.cantidad);

        if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });
        if (warehouseId == null) return res.status(400).json({ error: 'Falta warehouseId' });
        if (!Number.isFinite(cantidadRaw) || cantidadRaw <= 0) {
            return res.status(400).json({ error: 'cantidad debe ser un número positivo' });
        }

        if (!(await bodegaPerteneceOrganizacion(warehouseId, organizationId))) {
            return res.status(400).json({ error: 'La bodega no existe en esta organización' });
        }

        const prod = await prisma.productos.findFirst({
            where: { id: Number(id), organizationId },
        });
        if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

        const actualizado = await prisma.warehouseStock.upsert({
            where: {
                warehouseId_varianteId: {
                    warehouseId,
                    varianteId: prod.id,
                },
            },
            update: { cantidad: { increment: Math.floor(cantidadRaw) } },
            create: {
                warehouseId,
                varianteId: prod.id,
                cantidad: Math.floor(cantidadRaw),
            },
        });

        res.status(200).json({
            mensaje: 'Entrada de stock registrada',
            warehouseStock: actualizado,
        });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar entrada de mercancía' });
    }
};

/** Descuenta stock en una bodega (ventas / salidas). */
export const registrarSalidaStock = async (req: Request, res: Response) => {
    const { id } = req.params;
    const organizationId = organizacionReq(req);
    const warehouseId = bodegaReq(req);
    const cantidadRaw = Number(req.body?.cantidad);

    if (organizationId == null) return res.status(400).json({ error: 'Falta organizationId' });
    if (warehouseId == null) return res.status(400).json({ error: 'Falta warehouseId' });
    if (!Number.isFinite(cantidadRaw) || cantidadRaw <= 0) {
        return res.status(400).json({ error: 'cantidad debe ser un número positivo' });
    }

    if (!(await bodegaPerteneceOrganizacion(warehouseId, organizationId))) {
        return res.status(400).json({ error: 'La bodega no existe en esta organización' });
    }

    const prod = await prisma.productos.findFirst({
        where: { id: Number(id), organizationId },
    });
    if (!prod) return res.status(404).json({ error: 'Producto no encontrado' });

    const q = Math.floor(cantidadRaw);

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            const fila = await tx.warehouseStock.findUnique({
                where: {
                    warehouseId_varianteId: {
                        warehouseId,
                        varianteId: prod.id,
                    },
                },
            });

            const actual = fila?.cantidad ?? 0;
            if (actual < q) {
                throw new Error(`Stock insuficiente en bodega (disponible: ${actual})`);
            }

            return tx.warehouseStock.update({
                where: {
                    warehouseId_varianteId: {
                        warehouseId,
                        varianteId: prod.id,
                    },
                },
                data: {
                    cantidad: { decrement: q },
                },
            });
        });

        res.status(200).json({
            mensaje: 'Salida registrada',
            warehouseStock: resultado,
        });
    } catch (inner: unknown) {
        const msg = inner instanceof Error ? inner.message : 'Error al registrar salida';
        res.status(msg.includes('insuficiente') ? 400 : 500).json({ error: msg });
    }
};

export const crearSubcategoria = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;

        const organizationId = organizacionReq(req);
        if (organizationId == null) {
            return res.status(400).json({ error: 'Falta organizationId' });
        }

        const cat = await prisma.categorias.findFirst({
            where: { id: Number(id), organizationId },
        });
        if (!cat) {
            return res.status(404).json({ error: 'Categoría no encontrada en esta organización' });
        }

        const nueva = await prisma.subcategoria.create({
            data: {
                nombre,
                categoriaId: Number(id),
            },
        });
        res.status(201).json(nueva);
    } catch (error) {
        res.status(400).json({ error: 'No se pudo crear la subcategoría' });
    }
};
