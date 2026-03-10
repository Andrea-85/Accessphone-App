import { z } from 'zod';

export const productoSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    precio: z.number().positive("El precio debe ser un número positivo"),
    costo: z.number().positive("El costo debe ser un número positivo"),
    stock: z.number().int().nonnegative("El stock no puede ser negativo"),
    categoriaId: z.number().int().optional()
});