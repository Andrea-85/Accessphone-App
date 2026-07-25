import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { realizarArqueoCajaDiario } from '../controllers/cajaController';

const router = Router();

router.use(validarToken);
router.use(organizationMiddleware);

// Endpoint para jalar el arqueo sugerido antes de cerrar la caja física
router.get('/arqueo-hoy', realizarArqueoCajaDiario);

export default router;