import { Router } from 'express';
import { validarToken, esAdmin } from '../middlewares/authMiddleware.js';
import { registrarVenta, obtenerVentas, obtenerTotalVentas, buscarVentasPorCliente, obtenerReporteEconomico } from '../controllers/ventaController.js';

const router = Router();

// 1. REGISTRO DE VENTA (POST) - Ahora es solo '/'
router.post('/', async (req, res) => {
    try {
        const resultado = await registrarVenta(req.body);
        res.status(201).json({ mensaje: "Venta realizada con éxito", detalle: resultado });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 2. REPORTE TOTAL DIARIO - Ahora es solo '/reporte'
router.get('/reporte', [validarToken, esAdmin], obtenerReporteEconomico);

// 3. BÚSQUEDA POR CLIENTE - Ahora es solo '/buscar-cliente'
router.get('/buscar-cliente', async (req, res) => {
    try {
        const { q } = req.query; 
        const historial = await buscarVentasPorCliente(String(q));
        res.json(historial);
    } catch (error) {
        res.status(500).json({ error: "Error al buscar el historial del cliente" });
    }
});

// 4. LISTADO GENERAL - Ahora es solo '/'
router.get('/', validarToken, async (req, res) => {
    try {
        const { clienteId } = req.query; 
        const ventas = await obtenerVentas(clienteId ? Number(clienteId) : undefined);
        res.json(ventas);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener ventas" });
    }
});

export default router;