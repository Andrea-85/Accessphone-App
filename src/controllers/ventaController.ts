import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const registrarVenta = async (req: any) => {
    const { clienteId, productos } = req.body;
    const organizationId = Number(req.organizationId);
    const usuarioId = Number(req.userId); // Asumiendo que viene en req

    return await prisma.$transaction(async (tx) => {
        // 1. Validar cliente
        const cliente = await tx.clientes.findUnique({ where: { id: clienteId } });
        if (!cliente) throw new Error(`Cliente con ID ${clienteId} no registrado.`);

        // 2. Pre-calcular total y validar stock antes de crear nada
        let totalVenta = 0;
        for (const p of productos) {
            const prod = await tx.productos.findUnique({ where: { id: p.productoId } });
            if (!prod) throw new Error(`Producto ${p.productoId} no encontrado`);
            totalVenta += Number(prod.precio) * p.cantidad;
        }

        // 3. Crear cabecera de la venta primero
        const nuevaVenta = await tx.ventas.create({
            data: { organizationId, clienteId, total: totalVenta, estado: "PENDIENTE" }
        });

        // 4. Procesar productos, stock y movimientos
        for (const p of productos) {
            const stockRecord = await tx.warehouseStock.findFirst({
                where: { varianteId: p.varianteId, warehouse: { organizationId } }
            });

            if (!stockRecord || stockRecord.cantidad < p.cantidad) {
                throw new Error(`Stock insuficiente para producto ID ${p.productoId}`);
            }

            // Descuento de stock
            await tx.warehouseStock.update({
                where: { id: stockRecord.id },
                data: { cantidad: { decrement: p.cantidad } }
            });

            // Registro en historial (usando los campos reales de tu modelo)
            await tx.movimientosInventario.create({
                data: {
                    varianteId: p.varianteId,
                    cantidad: -p.cantidad,
                    tipoMovimiento: "SALIDA", // O "VENTA" si tu lógica lo prefiere
                    usuarioId: usuarioId
                }
            });
        }

        // 5. Crear detalles de la venta vinculados a la venta recién creada
        const detallesData = productos.map((p: any) => ({
            ventaId: nuevaVenta.id,
            varianteId: p.varianteId,
            cantidad: p.cantidad,
            precio_unitario: 0 // Ajusta según tu modelo de detalles_venta
        }));

        await tx.detalles_venta.createMany({ data: detallesData });

        return await tx.ventas.findUnique({
            where: { id: nuevaVenta.id },
            include: { detalles: true }
        });
    });
};

export const cancelarVenta = async (req: any) => {
    const { ventaId } = req.body;
    const organizationId = Number(req.organizationId);
    const usuarioId = Number(req.userId);

    return await prisma.$transaction(async (tx) => {
        // 1. Obtener venta con sus detalles
        const venta = await tx.ventas.findFirst({
            where: { id: ventaId, organizationId },
            include: { detalles: true }
        });

        if (!venta || venta.estado !== "PENDIENTE") {
            throw new Error("La venta no existe o no se puede cancelar.");
        }

        // 2. Revertir inventario y registrar movimiento
        for (const detalle of venta.detalles) {
            // Regresar el stock
            const stockRecord = await tx.warehouseStock.findFirst({
                where: { varianteId: detalle.varianteId, warehouse: { organizationId } }
            });

            if (stockRecord) {
                await tx.warehouseStock.update({
                    where: { id: stockRecord.id },
                    data: { cantidad: { increment: detalle.cantidad } }
                });

                // Registrar entrada por cancelación
                await tx.movimientosInventario.create({
                    data: {
                        varianteId: detalle.varianteId,
                        cantidad: detalle.cantidad, // Valor positivo porque entra
                        tipoMovimiento: "ENTRADA",
                        usuarioId: usuarioId
                    }
                });
            }
        }

        // 3. Cambiar estado a CANCELADA
        return await tx.ventas.update({
            where: { id: ventaId },
            data: { estado: "CANCELADA" }
        });
    });
};

export const completarVenta = async (req: any) => {
    const { ventaId } = req.body;
    const organizationId = Number(req.organizationId);

    // Solo cambiamos el estado, el inventario ya fue gestionado al crear la venta
    return await prisma.ventas.update({
        where: { 
            id: ventaId,
            organizationId: organizationId 
        },
        data: { 
            estado: "COMPLETADA" 
        }
    });
};

// 2. LISTADO GENERAL
export const obtenerVentas = async (req: any) => {
    const organizationId = Number(req.organizationId);
    return await prisma.ventas.findMany({
        where: { organizationId },
        include: { detalles: true } // Para ver los productos de cada venta
    });
};

// 3. OBTENER REPORTE
export const obtenerReporteEconomico = async (req: any, res: any) => {
    // Aquí implementaremos lógica de sumatorias después
    res.json({ message: "Reporte en construcción" });
};

export const buscarVentasPorCliente = async (req: any) => { 
    // Por ahora, para que el servidor arranque, déjala así:
    return { message: "Pendiente de implementar" };
};