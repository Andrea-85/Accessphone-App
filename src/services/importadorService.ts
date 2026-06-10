import * as XLSX from 'xlsx';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const importarInventarioExcel = async (buffer: Buffer, usuarioId: number) => {
    // 1. Convertir buffer a objeto de trabajo
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

    return await prisma.$transaction(async (tx) => {
        for (const fila of data as any[]) {
            // Ejemplo de campos esperados en Excel: varianteId, cantidadTotal, cantidadDefectuosa
            const { varianteId, cantidadTotal, cantidadDefectuosa, warehouseId } = fila;

            // 2. Registramos la entrada real (lo que sí sirve)
            const cantidadBuena = cantidadTotal - (cantidadDefectuosa || 0);

            // ... Aquí irá la lógica de registro de entrada ...
            
            // 3. Si hay cantidadDefectuosa > 0, registramos la MERMA_RECEPCION
            if (cantidadDefectuosa > 0) {
                await tx.movimientosInventario.create({
                    data: {
                        varianteId: Number(varianteId),
                        cantidad: Number(cantidadDefectuosa),
                        tipoMovimiento: "MERMA_RECEPCION",
                        usuarioId: usuarioId,
                        justificacion: "Reporte automático de importación: Mercancía defectuosa",
                        evidenciaUrl: null
                    }
                });
            }
        }
        return { success: true, message: "Importación procesada con éxito" };
    });
};