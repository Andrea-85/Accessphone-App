import { z } from "zod";

export const FacturaSchema = z.object({
  proveedor: z.string().optional(),
  fecha: z.string().optional(),
  total: z.number().optional(),
  items: z.array(z.object({
    varianteId: z.number().optional(), // También opcional por si la IA no encuentra el ID
    descripcion: z.string().optional(), // <-- Ahora es opcional
    cantidad: z.number(),
    precioUnitario: z.number().optional()
  }))
});

export type Factura = z.infer<typeof FacturaSchema>;