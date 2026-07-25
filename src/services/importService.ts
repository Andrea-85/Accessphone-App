import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { registrarMovimiento } from './inventarioService';

export const importarInventarioExcel = async (buffer: Buffer, usuarioId: number) => {
    // 1. Convertir el archivo Excel a JSON en memoria
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    const resultados = { exitosos: 0, errores: [] as any[] };

    console.log(`📊 Iniciando importación masiva en lote para ${data.length} filas desde Excel...`);

    // 2. Iterar sobre las filas de forma atómica y aislada
    for (const fila of data as any[]) {
        try {
            const { varianteId, cantidadTotal, cantidadDefectuosa, warehouseId } = fila;
            
            const vId = Number(varianteId);
            const wId = Number(warehouseId);
            
            // Validaciones rápidas de sanidad de datos de entrada
            if (isNaN(vId) || isNaN(wId)) {
                throw new Error("El archivo contiene un formato inválido en varianteId o warehouseId.");
            }

            const total = Number(cantidadTotal) || 0;
            const defectuosa = Number(cantidadDefectuosa) || 0;
            const cantidadBuena = total - defectuosa;

            // Buscamos la variante para obtener la organización (Multi-tenant seguro)
            const varianteBD = await prisma.variante.findUnique({
                where: { id: vId },
                include: { producto: true }
            });

            if (!varianteBD || !varianteBD.producto) {
                throw new Error(`La variante con ID ${vId} no existe en el catálogo.`);
            }

            const orgId = varianteBD.producto.organizationId;

           // 3. Procesar Entrada de Mercancía en buen estado
            if (cantidadBuena > 0) {
                // 🛠️ INTELIGENCIA DE LOTES: Creamos el lote correspondiente a esta fila del Excel
                await prisma.loteCompra.create({
                    data: {
                        numeroLote: `LOTE-EXCEL-${Date.now()}-${Math.floor(Math.random() * 100)}`,
                        costoCompra: varianteBD.precio, // Tomamos el precio/costo base registrado
                        cantidadInicial: cantidadBuena,
                        cantidadActual: cantidadBuena,
                        varianteId: vId,
                        proveedorId: 1 // Proveedor genérico por defecto
                    }
                });

                await registrarMovimiento(
                    orgId,
                    vId,
                    cantidadBuena,
                    'ENTRADA',
                    usuarioId,
                    wId,
                    "Importación masiva: Mercancía en buen estado"
                );
            }

            // 4. Procesar Entrada de Merma Directa si existen productos defectuosos
            if (defectuosa > 0) {
                await registrarMovimiento(
                    orgId,
                    vId,
                    defectuosa,
                    'ENTRADA', // Entra al inventario general para registrarse en Kardex
                    usuarioId,
                    wId,
                    "Importación masiva: Mercancía defectuosa registrada en recepción"
                );
                
                // Nota de arquitectura: Si en tu regla de negocio la merma se debe descontar 
                // inmediatamente de la bodega física, puedes ejecutar un segundo movimiento de tipo 'SALIDA' aquí.
            }

            resultados.exitosos++;

        } catch (error: any) {
            // El pipeline nunca se detiene por filas corruptas o IDs inexistentes
            console.error(`⚠️ Fila omitida debido a error estructural:`, error.message);
            resultados.errores.push({ fila, error: error.message });
        }
    }

    return { 
        success: true, 
        message: "Importación finalizada de forma controlada", 
        reporte: resultados 
    };
};