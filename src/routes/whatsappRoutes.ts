import { Router } from 'express';
import { recibirMensajeWhatsApp, verificarWebhookWhatsApp } from '../controllers/whatsappController';

const router = Router();

// 🔍 1. Petición GET: Meta la usa una sola vez para VALIDAR tu webhook
router.get('/webhook/:orgId', verificarWebhookWhatsApp);

// Exponemos el webhook. Pasamos el orgId por parámetro en la URL 
// para que el sistema sepa a cuál tienda/proveedor mayorista pertenece este flujo de chat.
router.post('/webhook/:orgId', recibirMensajeWhatsApp);

export default router;