import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface ItemEscala {
    cantidadMin: number;
    precioVenta: number;
}

interface ItemVariante {
    nombreVariante: string;
    sku?: string;
    precioBase: number;
    stockInicial: number;
    escalas?: ItemEscala[];
}

interface ItemProductoCarga {
    nombreProducto: string;
    precio?: number;
    costo?: number;
    categoriaId?: number;
    variantes: ItemVariante[];
}

// 🔧 FUNCIÓN AUXILIAR PARA REPARAR TODAS LAS SECUENCIAS DE AUTOINCREMENTO
const repararSecuenciasPrisma = async () => {
    const tablas = [
        { pascal: '"Productos"', min: 'productos' },
        { pascal: '"Variante"', min: 'variante' },
        { pascal: '"WarehouseStock"', min: 'warehousestock' },
        { pascal: '"EscalaPrecio"', min: 'escalaprecio' }
    ];

    for (const t of tablas) {
        try {
            await prisma.$executeRawUnsafe(`
                SELECT setval(pg_get_serial_sequence('${t.pascal}', 'id'), coalesce(max(id), 1)) FROM ${t.pascal};
            `);
        } catch (e) {
            try {
                await prisma.$executeRawUnsafe(`
                    SELECT setval(pg_get_serial_sequence('${t.min}', 'id'), coalesce(max(id), 1)) FROM ${t.min};
                `);
            } catch (ignored) {}
        }
    }
};

// 📦 CARGA MASIVA O ACTUALIZACIÓN DE PRODUCTOS, VARIANTES Y ESCALAS
export const cargarProductosMasivos = async (organizationId: number, productos: ItemProductoCarga[]) => {
    try {
        // Auto-reparar secuencias de todas las tablas implicadas antes de la transacción
        await repararSecuenciasPrisma();

        let procesados = 0;

        await prisma.$transaction(async (tx) => {
            for (const itemProd of productos) {
                const precioPadre = itemProd.precio || itemProd.variantes[0]?.precioBase || 0;
                const costoPadre = itemProd.costo || 0;

                // 1. Crear producto base
                const producto = await tx.productos.create({
                    data: {
                        nombre: itemProd.nombreProducto,
                        precio: precioPadre,
                        costo: costoPadre,
                        organization: { connect: { id: organizationId } },
                        categoria: { connect: { id: itemProd.categoriaId || 1 } }
                    }
                });

                // 2. Procesar sus variantes
                for (const itemVar of itemProd.variantes) {
                    const variante = await tx.variante.create({
                        data: {
                            productoId: producto.id,
                            nombreVariante: itemVar.nombreVariante,
                            sku: itemVar.sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            precio: itemVar.precioBase,
                            stockActual: itemVar.stockInicial
                        }
                    });

                    // Registramos stock inicial en la bodega principal
                    await tx.warehouseStock.create({
                        data: {
                            warehouseId: 1,
                            varianteId: variante.id,
                            cantidad: itemVar.stockInicial
                        }
                    });

                    // 3. Crear escalas de precio si existen
                    if (itemVar.escalas && itemVar.escalas.length > 0) {
                        for (const esc of itemVar.escalas) {
                            await (tx as any).escalaPrecio.create({
                                data: {
                                    varianteId: variante.id,
                                    cantidadMin: esc.cantidadMin,
                                    precioVenta: esc.precioVenta
                                }
                            });
                        }
                    }
                }
                procesados++;
            }
        });

        console.log(`✅ [CATÁLOGO] Carga masiva completada: ${procesados} productos procesados.`);
        return { success: true, productosProcesados: procesados };

    } catch (error: any) {
        console.error("🚨 [CATÁLOGO ERROR] - Falló la carga masiva:", error.message);
        return { success: false, error: error.message };
    }
};