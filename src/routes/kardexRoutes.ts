import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware';
import { obtenerKardexPorVariante } from '../controllers/kardexController';

const router = Router();

router.use(validarToken);

// GET: /api/kardex/variante/12
router.get('/variante/:varianteId', obtenerKardexPorVariante);

export default router;