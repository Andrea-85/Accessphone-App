import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const crearPedido = async (organizationId: number, clienteId: number, productos: any[]) => {
    return await prisma.$transaction(async (tx) => {
        let total = 0;
        const detalles = [];

        for (const item of productos) {
            const producto = await tx.productos.findUnique({ where: { id: item.productoId } });
            if (!producto) throw new Error(`Producto ${item.productoId} no existe`);
            
            const subtotal = Number(producto.precio) * item.cantidad;
            total += subtotal;
            detalles.push({ productoId: item.productoId, cantidad: item.cantidad, precio_unitario: producto.precio });
        }

        return await tx.ventas.create({
            data: {
                organizationId,
                clienteId,
                total,
                estado: "PENDIENTE",
                detalles: { create: detalles }
            }
        });
    });
};