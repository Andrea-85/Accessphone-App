import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import * as Controller from '../controllers/novedadController';

const router = Router();

// Protegemos el ecosistema con multi-tenant
router.use(validarToken);
router.use(organizationMiddleware);

// Rutas operativas
router.post('/', Controller.registrarNovedad); // Cualquier empleado logueado
router.post('/:id/aprobar', requireRole(['ADMIN']), Controller.aprobarNovedadFIFO); // Solo Camilo (ADMIN)

export default router;