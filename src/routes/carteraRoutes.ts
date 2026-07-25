import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { registrarAbono, obtenerCarteraPendiente } from '../controllers/carteraController';

const router = Router();

// Middlewares globales del ecosistema SaaS
router.use(validarToken);
router.use(organizationMiddleware);

// Endpoints de cobranza
router.get('/pendientes', obtenerCarteraPendiente); // Listar saldos fiados
router.post('/abonar', registrarAbono);             // Abonar dinero en mostrador

export default router;