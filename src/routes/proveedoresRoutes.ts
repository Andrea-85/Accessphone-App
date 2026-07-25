import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware';
import { obtenerProveedores, crearProveedor } from '../controllers/proveedoresController';

const router = Router();

router.use(validarToken);

// /api/proveedores
router.get('/', obtenerProveedores);
router.post('/', crearProveedor);

export default router;