import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { registrarMovimiento } from '../services/inventarioService';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { cargarInventarioMasivo } from '../controllers/inventarioController';
import { requireRole } from '../middlewares/roleMiddleware';

const prisma = new PrismaClient();
const router = Router();

// Aplicamos el middleware que ya blindamos antes
router.use(organizationMiddleware);

router.post('/movimiento', async (req: Request, res: Response) => {
    try {
        const { productoId, cantidad, tipo, warehouseId } = req.body;
        const usuarioId = req.user.userId; 
        const orgId = req.organizationId;

        const resultado = await registrarMovimiento(
            Number(orgId),
            Number(productoId),
            Number(cantidad),
            tipo,
            Number(usuarioId),
            Number(warehouseId)
        );

        res.status(200).json({ message: 'Movimiento registrado con éxito', data: resultado });
    } catch (error) {
        // --- AQUÍ ESTÁ EL TRUCO PARA DEPURAR ---
        console.error("DETALLE DEL ERROR:", error); 
        res.status(500).json({ error: 'Error al registrar el movimiento', detalle: error });
    }
});

// CONSULTAR STOCK DE UNA BODEGA
router.get('/stock/:warehouseId', async (req: Request, res: Response) => {
    try {
        const { warehouseId } = req.params;
        const orgId = req.organizationId;

        const stock = await prisma.warehouseStock.findMany({
            where: { 
                warehouseId: Number(warehouseId),
                // Aseguramos que solo vea stock de su organización
                warehouse: { organizationId: Number(orgId) }
            },
            include: {
                productos: true // Traemos el detalle del producto para mostrar su nombre
            }
        });

        res.json(stock);
    } catch (error) {
        res.status(500).json({ error: 'Error al consultar el stock' });
    }
});

router.post('/carga-masiva', async (req: Request, res: Response) => {
    try {
        // Pasamos el organizationId que viene del middleware
        req.body.organizationId = req.organizationId;
        req.body.userId = req.user.userId;
        
        const resultado = await cargarInventarioMasivo(req);
        res.status(201).json({ message: 'Inventario cargado masivamente', data: resultado });
    } catch (error: any) {
        console.error("ERROR EN CARGA MASIVA:", error);
        res.status(500).json({ error: 'Fallo en la carga masiva', detalle: error.message });
    }
});

// Solo los ADMIN pueden cargar inventario masivo
router.post('/carga-masiva', requireRole('ADMIN'), async (req: Request, res: Response) => {
    // ... tu lógica de carga masiva que ya tenemos ...
});

export default router;