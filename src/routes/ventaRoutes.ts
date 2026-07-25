import { Router } from 'express';
import { validarToken } from '../middlewares/authMiddleware'; 
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import * as Controller from '../controllers/ventaController';

const router = Router();


// 1. Middlewares globales para la integridad del ecosistema SaaS
router.use(validarToken);          // Valida autenticación y sesión
router.use(organizationMiddleware); // Aísla los datos por Organización (Multi-tenant)


// 2. RUTAS DE FACTURACIÓN TRANSACCIONAL (POS)
// Registro de venta directa: Descuenta stock bajo algoritmo FIFO virtual
router.post('/', Controller.registrarVenta);

router.post('/cancelar', Controller.cancelarVenta);

router.post('/completar', Controller.completarVenta);

// 3. MOVIMIENTOS E IMPORTACIONES DE BODEGA
router.post('/importar', 
    requireRole(['ADMIN']), 
    Controller.importar
);

router.post('/movimiento', 
    requireRole(['ADMIN', 'BODEGUERO']), 
    Controller.registrarMovimiento
);

// 4. CONSULTAS Y REPORTES FINANCIEROS
router.get('/reporte', 
    requireRole(['ADMIN']), 
    Controller.obtenerReporteEconomico
);

router.get('/buscar-cliente', Controller.buscarVentasPorCliente);

router.get('/pedidos/pendientes', Controller.obtenerPedidosPendientes);

// Listar historial de ventas de la organización
router.get('/', Controller.obtenerVentas);

export default router;