import { Router } from 'express';
import { registrarUsuario, loginUsuario, obtenerUsuariosPorOrganizacion } from '../controllers/authController';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { validarToken } from '../middlewares/authMiddleware';

const router = Router();

router.post('/registro', async (req, res) => {
    try {
        const usuario = await registrarUsuario(req);
        res.status(201).json({ mensaje: "Usuario creado", id: usuario.id });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        // Pasamos el objeto 'req' completo para que el controlador extraiga los datos
        const resultado = await loginUsuario(req);
        res.json(resultado);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

router.get('/usuarios', validarToken, organizationMiddleware, async (req, res) => {
    try {
        const usuarios = await obtenerUsuariosPorOrganizacion(req);
        res.json(usuarios);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;