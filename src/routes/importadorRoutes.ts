import { Router } from 'express';
import multer from 'multer';
import { validarToken } from '../middlewares/authMiddleware';
import { importarProductosExcel } from '../controllers/importadorController';

const upload = multer({ storage: multer.memoryStorage() });
const router = Router();

router.use(validarToken);

// POST: /api/importar/excel
router.post('/excel', upload.single('archivo'), importarProductosExcel);

export default router;