import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { registrarMovimiento } from './inventarioService';

export const importarInventarioExcel = async (buffer: Buffer, usuarioId: number, orgId: number) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const resultados = { exitosos: 0, errores: [] as any[] };

    for (const fila of data) {
        try {
            // Normalizamos las llaves del Excel (quitando espacios y manejando mayúsculas/minúsculas)
            const filaLimpia: any = {};
            for (const key of Object.keys(fila)) {
                filaLimpia[key.trim().toLowerCase()] = fila[key];
            }

            const nombre = filaLimpia.nombre || filaLimpia.name;
            const sku = filaLimpia.sku;
            const precio = Number(filaLimpia.precio || filaLimpia.price) || 0;
            const stock = Number(filaLimpia.stock || filaLimpia.cantidad) || 0;

           // CASO A: Es el formato amigable de negocio (Con que tenga nombre, avanzamos)
            if (nombre) {
                // Aseguramos un SKU por defecto si el Excel lo deja vacio
                const skuFinal = sku && String(sku).trim() !== "" ? String(sku) : `SKU-AUTO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

                // Obtenemos o creamos por defecto la bodega principal respetando el orgId del tenant actual
                let bodega = await prisma.warehouse.findFirst({
                    where: { organizationId: orgId }
                });
                if (!bodega) {
                    bodega = await prisma.warehouse.create({
                        data: { nombre: "Bodega Principal", organizationId: orgId }
                    });
                }

                // 1. Creamos el producto base
                const nuevoProducto = await prisma.productos.create({
                    data: {
                        organizationId: orgId, // <-- Ajustado al tenant real
                        nombre: String(nombre),
                        precio: precio,
                        costo: precio * 0.4, // Estimado o base
                        estado: "ACTIVO"
                    }
                });

                // 2. Creamos la variante obligatoria para el POS usando el nombre real del producto
                const nuevaVariante = await prisma.variante.create({
                    data: {
                        productoId: nuevoProducto.id,
                        sku: skuFinal,
                        nombreVariante: String(nombre), // Nombre real para que el POS lo muestre bien
                        precio: precio,
                        stockActual: stock
                    }
                });

                // 3. Registramos el stock físico en la bodega
                await prisma.warehouseStock.upsert({
                    where: {
                        warehouseId_varianteId: {
                            warehouseId: bodega.id,
                            varianteId: nuevaVariante.id
                        }
                    },
                    update: { cantidad: { increment: stock } },
                    create: {
                        warehouseId: bodega.id,
                        varianteId: nuevaVariante.id,
                        cantidad: stock,
                        productosId: nuevoProducto.id
                    }
                });

                // 4. Dejamos rastro en el Kardex / Lotes
                await prisma.loteCompra.create({
                    data: {
                        numeroLote: `LOTE-${Date.now()}-${Math.floor(Math.random() * 100)}`,
                        costoCompra: precio * 0.4,
                        cantidadInicial: stock,
                        cantidadActual: stock,
                        varianteId: nuevaVariante.id,
                        proveedorId: 1
                    }
                });

                resultados.exitosos++;
                continue;
            }
            
            // CASO B: Formato técnico avanzado por ID (por si suben el formato de IDs antiguos)
            const { varianteId, cantidadTotal, warehouseId } = fila;
            const vId = Number(varianteId);
            const wId = Number(warehouseId);

            if (!isNaN(vId) && !isNaN(wId)) {
                const total = Number(cantidadTotal) || 0;
                const varianteBD = await prisma.variante.findUnique({
                    where: { id: vId },
                    include: { producto: true }
                });

                if (!varianteBD || !varianteBD.producto) {
                    throw new Error(`La variante con ID ${vId} no existe.`);
                }

                if (total > 0) {
                    await registrarMovimiento(
                        varianteBD.producto.organizationId,
                        vId,
                        total,
                        'ENTRADA',
                        usuarioId,
                        wId,
                        "Importación masiva técnica"
                    );
                }
                resultados.exitosos++;
                continue;
            }

            throw new Error("El archivo no coincide con las columnas requeridas (Nombre, SKU, Precio, Stock).");

        } catch (error: any) {
            resultados.errores.push({ fila, error: error.message });
        }
    }

    return { 
        success: true, 
        message: "Importación procesada correctamente", 
        reporte: resultados 
    };
};