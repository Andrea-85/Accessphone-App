import { PrismaClient, MetodoPago } from '@prisma/client';
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

export const validarStock = async (tx: any, varianteId: number, warehouseId: number, cantidadSolicitada: number) => {
    const stock = await tx.warehouseStock.findFirst({
        where: { warehouseId, varianteId }
    });

    if (!stock || stock.cantidad < cantidadSolicitada) {
        throw new Error(`Stock insuficiente. Disponible: ${stock?.cantidad || 0}`);
    }
    
    return true;
};

export async function registrarVenta(datos: any, organizationId: number, warehouseId: number) {
  return await prisma.$transaction(async (tx) => {
    
    // 1. Validar stock global de TODO antes de realizar mutaciones
    for (const item of datos.items) {
      await validarStock(tx, item.varianteId, warehouseId, item.cantidad);
    }

    // 2. Crear la venta principal (Nace completada porque el inventario sale inmediatamente)
    const nuevaVenta = await tx.ventas.create({
      data: {
        organizationId: organizationId,
        clienteId: datos.clienteId,
        total: datos.total,
        estado: "COMPLETADO"
      }
    });

    // 3. Procesar salida de inventario por ítem aplicando Algoritmo FIFO de Lotes
    for (const item of datos.items) {
      
      // A. Descontar del stock general de la bodega
      await tx.warehouseStock.update({
        where: { warehouseId_varianteId: { warehouseId, varianteId: item.varianteId } },
        data: { cantidad: { decrement: item.cantidad } }
      });

      // B. Registrar el detalle de la venta tradicional
      await tx.detalles_venta.create({
        data: {
          ventaId: nuevaVenta.id,
          productoId: item.productoId,
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          precio_unitario: item.precioUnitario
        }
      });

      // C. ALGORITMO FIFO: Buscar lotes con stock
      // 👇 AGREGA ESTA LÍNEA DE CONTROL AQUÍ:
      console.log(`🔍 [DEBUG FIFO] Buscando lotes para varianteId: ${item.varianteId} | Cantidad solicitada: ${item.cantidad}`);
      const lotesDisponibles = await tx.loteCompra.findMany({
        where: { varianteId: item.varianteId, cantidadActual: { gt: 0 } },
        orderBy: { createdAt: 'asc' }
      });

      let cantidadPorDescontar = item.cantidad;

      for (const lote of lotesDisponibles) {
        if (cantidadPorDescontar <= 0) break;

        // Calculamos cuánto extraer basándonos en el valor en memoria del lote
        const cantidadAExtraer = Math.min(lote.cantidadActual, cantidadPorDescontar);

        await tx.loteCompra.update({
          where: { id: lote.id },
          data: { cantidadActual: { decrement: cantidadAExtraer } }
        });

        // D. Registro de auditoría (Kardex) por Lote
        await tx.movimientosInventario.create({
          data: {
              varianteId: item.varianteId,
              cantidad: cantidadAExtraer,
              tipoMovimiento: 'SALIDA',
              usuarioId: datos.usuarioId || 1,
              justificacion: `Venta #${nuevaVenta.id} - Consumo Lote ID: ${lote.id} (Prov. ID: ${lote.proveedorId})`
          }
        });

        // Restamos de la variable de control
        cantidadPorDescontar -= cantidadAExtraer;
      }

      // CONTROL DE QUIEBRE: Si recorrió todos los lotes y todavía falta stock por descontar,
      // lanzamos un error explícito para tumbar la transacción ($transaction hace rollback automático)
      if (cantidadPorDescontar > 0) {
         throw new Error(`Error crítico: Los lotes de compra no tienen stock suficiente para cubrir las unidades solicitadas.`);
      }

      if (cantidadPorDescontar > 0) {
        await tx.movimientosInventario.create({
          data: {
              varianteId: item.varianteId,
              cantidad: cantidadPorDescontar,
              tipoMovimiento: 'SALIDA',
              usuarioId: datos.usuarioId,
              justificacion: `Venta #${nuevaVenta.id} - Salida general sin lote asociado`
          }
        });
      }
    }

    // 4. INTEGRACIÓN DE CARTERA: Procesar pagos y validar saldos fiados
    // Se espera que datos.payments sea un array, ej: [{ monto: 5000, metodo: "EFECTIVO" }, { monto: 10000, metodo: "CREDITO" }]
    let montoEfectivoUOtros = 0;
    let montoCreditoCartera = 0;

    if (datos.payments && Array.isArray(datos.payments)) {
        for (const p of datos.payments) {
            // Guardamos el registro del pago individual en la BD
            await tx.payment.create({
                data: {
                    ventaId: nuevaVenta.id,
                    monto: p.monto,
                    metodo: p.metodo as MetodoPago,
                    referencia: p.referencia || null
                }
            });

            if (p.metodo === 'CREDITO') {
                montoCreditoCartera += Number(p.monto);
            } else {
                montoEfectivoUOtros += Number(p.monto);
            }
        }
    }

    // Si hay un saldo financiado bajo el método CREDITO, abrimos la cuenta por cobrar automáticamente
    if (montoCreditoCartera > 0) {
        // Por defecto damos 30 días de plazo para pagar la mercancía al por mayor
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() + 30);

        await tx.cartera.create({
            data: {
                organizationId: organizationId,
                ventaId: nuevaVenta.id,
                clienteId: datos.clienteId,
                montoInicial: montoCreditoCartera,
                saldoActual: montoCreditoCartera,
                fechaLimite: fechaLimite,
                estado: "VIGENTE"
            }
        });
        console.log(`📌 Cuenta por cobrar creada exitosamente para el cliente ID ${datos.clienteId} por $${montoCreditoCartera}`);
    }

    return { success: true, ventaId: nuevaVenta.id };
  });
}

export async function revertirLotesVenta(tx: any, ventaId: number) {
  const movimientos = await tx.movimientosInventario.findMany({
    where: {
      justificacion: { contains: `Venta #${ventaId} - Consumo Lote ID:` },
      tipoMovimiento: 'SALIDA'
    }
  });

  for (const mov of movimientos) {
    const match = mov.justificacion.match(/Consumo Lote ID:\s*(\d+)/);
    if (match && match[1]) {
      const loteId = Number(match[1]);
      await tx.loteCompra.update({
        where: { id: loteId },
        data: { cantidadActual: { increment: Math.abs(mov.cantidad) } }
      });
    }
  }
}