import { Router } from 'express';
import multer from 'multer';
import { extraerDatosFactura } from '../services/aiService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/analizar-documento', upload.single('archivo'), async (req: any, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se adjuntó archivo" });
        
        const datos = await extraerDatosFactura(req.file.buffer);
        res.json({ message: "Análisis completado", data: datos });
    } catch (error: any) {
        res.status(500).json({ error: "Error al procesar con IA", detalle: error.message });
    }
});

export default router;