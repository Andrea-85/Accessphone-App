import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const buscarProductosPOS = async (req: any, res: Response) => {
    try {
        const orgId = Number(req.organizationId);
        const { q, warehouseId } = req.query;

        if (!q || String(q).trim() === "") {
            return res.json([]);
        }

        const termino = String(q).trim();
        const warehouseIdFiltro = warehouseId ? Number(warehouseId) : undefined;

        // Búsqueda insensible a mayúsculas/minúsculas en base de datos
        const resultados = await prisma.variante.findMany({
            where: {
                producto: {
                    organizationId: orgId // Multi-tenant estricto
                },
                OR: [
                    { sku: { contains: termino, mode: 'insensitive' } },
                    { nombreVariante: { contains: termino, mode: 'insensitive' } },
                    { producto: { nombre: { contains: termino, mode: 'insensitive' } } }
                ]
            },
            include: {
                producto: {
                    select: {
                        nombre: true,
                        costo: true
                    }
                },
                warehouseStocks: {
                    where: {
                        warehouse: { organizationId: orgId },
                        ...(warehouseIdFiltro ? { warehouseId: warehouseIdFiltro } : {})
                    },
                    select: {
                        cantidad: true,
                        warehouseId: true
                    }
                }
            },
            take: 10 // Limitamos a los 10 mejores resultados para máxima velocidad
        });

        // Formateamos la respuesta limpia para el POS en el mostrador
        const productosFormateados = resultados.map(v => ({
            varianteId: v.id,
            productoId: v.productoId,
            sku: v.sku,
            descripcion: v.nombreVariante,
            precioVenta: Number(v.precio),
            stockTotal: v.warehouseStocks.reduce((acc, s) => acc + s.cantidad, 0)
        }));

        return res.json(productosFormateados);

    } catch (error: any) {
        return res.status(500).json({ error: 'Error en la búsqueda rápida', detalle: error.message });
    }
};

export const obtenerStockActual = async (req: any) => {
    const organizationId = Number(req.organizationId);

    // Buscamos el stock y traemos la información de la variante y producto asociado
    return await prisma.warehouseStock.findMany({
        where: { warehouse: { organizationId } },
        include: {
            variante: {
                include: { producto: true }
            }
        }
    });
};

export const obtenerStockPorBodega = async (req: any) => {
    const warehouseId = Number(req.params.warehouseId);
    const organizationId = Number(req.organizationId);

    // Consultamos el stock y traemos el nombre del producto para que sea legible
    return await prisma.warehouseStock.findMany({
        where: { 
            warehouseId, 
            warehouse: { organizationId } 
        },
        include: { 
            variante: { 
                include: { producto: true } 
            } 
        }
    });
};

export const obtenerHistorialMovimientos = async (req: any) => {
    const organizationId = Number(req.organizationId);
    // Podemos filtrar por variante si la pasamos en la URL
    const { varianteId } = req.query;

    const filtros: any = {
        variante: {
            producto: { organizationId } // Aseguramos que solo vea lo de su organización
        }
    };

    if (varianteId) filtros.varianteId = Number(varianteId);

    return await prisma.movimientosInventario.findMany({
        where: filtros,
        include: { 
            usuario: { select: { nombre: true } }, 
            variante: { include: { producto: true } } 
        },
        orderBy: { createdAt: 'desc' } // Lo más reciente arriba
    });
};

export const cargarInventarioMasivo = async (req: any, organizationId: number, userId: number) => {
    const { movimientos } = req.body; // Array de { productoId, cantidad, warehouseId }

    return await prisma.$transaction(async (tx) => {
        const resultados = [];

        for (const m of movimientos) {
            // Usamos upsert: si existe el stock en esa bodega, actualiza; si no, crea.
            const stock = await tx.warehouseStock.upsert({
                where: { 
                    warehouseId_varianteId: {
                        warehouseId: m.warehouseId,
                        varianteId: m.varianteId
                    }
                },
                update: { cantidad: { increment: m.cantidad } },
                create: { 
                    warehouseId: m.warehouseId,
                    varianteId: m.varianteId,
                    cantidad: m.cantidad 
                }
            });

            // Registro de auditoría para cada entrada
            await tx.movimientosInventario.create({
                data: {
                    varianteId: Number(m.varianteId), 
                    cantidad: Number(m.cantidad),
                    tipoMovimiento: "ENTRADA",
                    usuarioId: Number(req.usuarioId || 1),
                    // ESTOS SON OBLIGATORIOS POR EL ESQUEMA NUEVO
                    justificacion: "Ingreso de inventario desde controlador", 
                    evidenciaUrl: null
                }
            });
            resultados.push(stock);
        }
        return resultados;
    });
};
