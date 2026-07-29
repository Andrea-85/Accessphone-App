import { Router } from 'express';
import multer from 'multer';
import { extraerDatosFactura } from '../services/aiService';
import { validarToken } from '../middlewares/authMiddleware'; // Ajusta la ruta de importación según tu estructura
import { verificarPlanPremium } from '../middlewares/verificarPlanPremium'; // El middleware que creamos

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Blindado con Token + Plan Premium
router.post('/analizar-documento', validarToken, verificarPlanPremium, upload.single('archivo'), async (req: any, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se adjuntó archivo" });
        
        const datos = await extraerDatosFactura(req.file.buffer);
        res.json({ message: "Análisis completado", data: datos });
    } catch (error: any) {
        res.status(500).json({ error: "Error al procesar con IA", detalle: error.message });
    }
});

export default router;