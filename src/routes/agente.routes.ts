import { Router } from 'express';
import { obtenerConversacionesAgente, aprobarSugerenciaAgente } from '../controllers/agente.controller';

const router = Router();

// Endpoint que el frontend está llamando: GET /api/agente/conversaciones
router.get('/conversaciones', obtenerConversacionesAgente);

router.post('/conversaciones/:id/aprobar', aprobarSugerenciaAgente);

export default router;