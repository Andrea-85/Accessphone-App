import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { obtenerMetricasGerenciales } from '../controllers/dashboardController';

const router = Router();

// 1. Primero validamos el token de manera obligatoria para este grupo de rutas
router.use(validarToken);

// 2. Aplicamos la seguridad de rol inmediatamente para el endpoint gerencial
// (Evitamos que organizationMiddleware borre req.user antes de validar el rol)
router.get('/gerencial', requireRole(['ADMIN']), organizationMiddleware, obtenerMetricasGerenciales);

export default router;