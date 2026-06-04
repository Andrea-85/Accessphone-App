import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { organizationMiddleware } from '../middlewares/organizationMiddleware'; // Importante
import { crearSubcategoria } from '../controllers/productoController';

const router = Router();
const prisma = new PrismaClient();

// Aplicamos el middleware a TODAS las rutas de categorías
router.use(organizationMiddleware);

// Ruta para crear categoría
router.post('/', async (req: any, res) => {
    try {
        const { nombre } = req.body;
        const organizationId = req.organizationId; // Obtenemos el ID del middleware

        const nueva = await prisma.categorias.create({ 
            data: { 
                nombre, 
                organizationId // ¡Esto era lo que faltaba!
            } 
        });
        res.json(nueva);
    } catch (error: any) {
        res.status(400).json({ error: "Error al crear categoría", detalle: error.message });
    }
});

// Ruta para ver categorías (filtradas por organización)
router.get('/', async (req: any, res) => {
    try {
        const lista = await prisma.categorias.findMany({
            where: { organizationId: req.organizationId }
        });
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: "No se pudieron obtener las categorías" });
    }
});

router.post('/:id/subcategorias', crearSubcategoria);

export default router;