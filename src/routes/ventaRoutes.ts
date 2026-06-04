import { Router } from 'express';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import * as Controller from '../controllers/ventaController';

const router = Router();

// Aplicamos el middleware DE ORGANIZACIÓN a todas las rutas.
// Este middleware DEBE encargarse de verificar el token y cargar el organizationId.
router.use(organizationMiddleware);

// 1. REGISTRO DE VENTA (Sin validarToken, ya está protegido por el middleware de arriba)
router.post('/', async (req, res) => {
    try {
        const resultado = await Controller.registrarVenta(req);
        res.status(201).json(resultado);
    } catch (e: any) { 
        console.error("Error en POST /api/ventas:", e); // Esto nos dirá si falla el controlador
        res.status(400).json({ error: e.message }); 
    }
});

// 2. REPORTE ECONÓMICO
router.get('/reporte', Controller.obtenerReporteEconomico);

// 3. BÚSQUEDA POR CLIENTE
router.get('/buscar-cliente', async (req, res) => {
    try {
        const resultado = await Controller.buscarVentasPorCliente(req);
        res.json(resultado);
    } catch (e) { res.status(500).json({ error: "Error al buscar cliente" }); }
});

// 4. LISTADO GENERAL
router.get('/', async (req, res) => {
    try {
        const resultado = await Controller.obtenerVentas(req);
        res.json(resultado);
    } catch (e) { res.status(500).json({ error: "Error al obtener ventas" }); }
});

export default router;