import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const registrarVenta = async (datosVenta: any) => {
    const { clienteId, detalles } = datosVenta;

    return await prisma.$transaction(async (tx) => {
        let totalGeneral = 0;
        const detallesParaCrear = [];

        for (const item of detalles) {
            const prod = await tx.productos.findUnique({ where: { id: item.productoId } });
            
            if (!prod || prod.stock < item.cantidad) {
                throw new Error(`Producto con ID ${item.productoId} no disponible o sin stock insuficiente`);
            }

            const subtotal = Number(prod.precio) * item.cantidad;
            totalGeneral += subtotal;

            detallesParaCrear.push({
                productoId: item.productoId,
                cantidad: item.cantidad,
                precio_unitario: prod.precio
            });

            // Restar del stock
            await tx.productos.update({
                where: { id: item.productoId },
                data: { stock: prod.stock - item.cantidad }
            });
        }

        // Crear la venta y sus detalles
        return await tx.ventas.create({
            data: {
                clienteId: clienteId,
                total: totalGeneral,
                detalles: {
                    create: detallesParaCrear
                }
            },
            include: { detalles: true }
        });
    });
};

export const obtenerVentas = async (clienteId?: number) => {
    return await prisma.ventas.findMany({
        where: clienteId ? { clienteId } : {},
        select: {
            id: true,
            fecha: true,
            total: true,
            cliente: {
                select: {
                    nombre: true // Solo queremos el nombre
                }
            },
            detalles: {
                select: {
                    cantidad: true,
                    precio_unitario: true,
                    producto: {
                        select: {
                            nombre: true // Solo el nombre del producto
                        }
                    }
                }
            }
        },
        orderBy: { fecha: 'desc' }
    });
};
export const obtenerReporteEconomico = async (req: any, res: any) => {
    console.log("¡LLEGÓ UNA PETICIÓN AL REPORTE!");
    try {
        const { anio } = req.query;
        
        if (!anio) {
            return res.status(400).json({ error: "Debes proporcionar un año (?anio=2026)" });
        }

        const fechaInicio = new Date(`${anio}-01-01T00:00:00.000Z`);
        const fechaFin = new Date(`${anio}-12-31T23:59:59.999Z`);

        const ventas = await prisma.ventas.findMany({
            where: {
                fecha: { gte: fechaInicio, lte: fechaFin }
            },
            include: {
                detalles: {
                    include: { producto: true }
                }
            }
        });

        let ventasTotales = 0;
        let costoTotalMercancia = 0;

        ventas.forEach(venta => {
            ventasTotales += Number(venta.total);
            
            venta.detalles.forEach(detalle => {
                // Si el producto no tiene costo, usamos 0 para no romper el cálculo
                const costoUnitario = detalle.producto && detalle.producto.costo 
                    ? Number(detalle.producto.costo) 
                    : 0;
                
                costoTotalMercancia += costoUnitario * detalle.cantidad;
            });
        });

        return res.status(200).json({
            periodo: anio,
            ventasTotales,
            costoMercancia: costoTotalMercancia,
            gananciaNeta: ventasTotales - costoTotalMercancia,
            cantidadVentas: ventas.length
        });

    } catch (error: any) {
        console.error("Error detallado:", error);
        return res.status(500).json({ error: "Error interno al generar reporte" });
    }
};

export const buscarVentasPorCliente = async (termino: string) => {
    return await prisma.ventas.findMany({
        where: {
            cliente: {
                OR: [
                    { nombre: { contains: termino, mode: 'insensitive' } },
                    { cedula: { contains: termino } }
                ]
            }
        },
        include: {
            cliente: true,
            detalles: {
                include: { producto: true }
            }
        }
    });
};