import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { 
  obtenerCategorias, 
  crearSubcategoria // <-- AGREGA ESTA LÍNEA AQUÍ
} from '../controllers/productoController';

const router = Router();
const prisma = new PrismaClient();

// Ruta para crear categoría
router.post('/', async (req, res) => {
    try {
        const { nombre } = req.body;
        // Intentamos crear la categoría
        const nueva = await prisma.categorias.create({ 
            data: { nombre } 
        });
        res.json(nueva);
    } catch (error: any) {
        // ESTO ES LO IMPORTANTE: Ahora el error saldrá en tu terminal negra de VS Code
        console.log("--- ERROR DETECTADO EN CATEGORÍAS ---");
        console.log(error); 
        console.log("-------------------------------------");
        
        res.status(400).json({ 
            error: "Error al crear categoría", 
            detalle: error.message 
        });
    }
});

// Ruta para ver todas las categorías (útil para saber los IDs)
router.get('/', async (req, res) => {
    try {
        const lista = await prisma.categorias.findMany();
        res.json(lista);
    } catch (error) {
        res.status(500).json({ error: "No se pudieron obtener las categorías" });
    }
});
// Ruta para crear una subcategoría nueva
router.post('/:id/subcategorias', crearSubcategoria);
export default router;