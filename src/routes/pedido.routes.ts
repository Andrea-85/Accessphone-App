import { Router } from 'express';
import { obtenerPedidosPendientes, marcarPedidoDespachado } from '../controllers/pedido.controller';

const router = Router();

router.get('/pendientes', obtenerPedidosPendientes);
router.put('/:id/despachar', marcarPedidoDespachado);

export default router;