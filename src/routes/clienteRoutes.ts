import { Router } from 'express';
import { obtenerClientes, crearCliente } from '../controllers/clienteController.js';

const router = Router();

// Cambiamos '/clientes' por '/'
router.get('/', async (req, res) => {
    try {
        const clientes = await obtenerClientes();
        res.json(clientes);
    } catch (error) {
        res.status(500).json({ error: "Error al obtener clientes" });
    }
});

// Cambiamos '/clientes' por '/'
router.post('/', async (req, res) => {
    try {
        const nuevo = await crearCliente(req.body);
        res.status(201).json(nuevo);
    } catch (error) {
        res.status(400).json({ error: "Error al crear cliente" });
    }
});

export default router;