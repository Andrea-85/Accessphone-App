import { Router } from 'express';
import { obtenerProductos, crearProducto, actualizarProducto, eliminarProducto, buscarProductoPorNombre, obtenerCategorias, registrarEntradaStock
} from '../controllers/productoController.js';
import { validarToken } from '../middlewares/authMiddleware.js';

const router = Router();
router.patch('/:id/entrada', registrarEntradaStock);

// 1. Listar productos
router.get('/', validarToken, obtenerProductos);

// 2. Crear producto
router.post('/', validarToken, crearProducto);

// 3. Buscar por nombre
router.get('/buscar', validarToken, buscarProductoPorNombre);

// 4. Actualizar producto (QUITAMOS 'esAdmin' PARA QUE NO TE DE 403)
router.put('/:id', actualizarProducto);

// 5. Eliminar producto
router.delete('/:id', validarToken, eliminarProducto);

router.get('/categorias', obtenerCategorias);

export default router;