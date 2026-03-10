import { Router } from 'express';
import { registrarUsuario, loginUsuario } from '../controllers/authController.js';

const router = Router();

router.post('/registro', async (req, res) => {
    try {
        const usuario = await registrarUsuario(req.body);
        res.status(201).json({ mensaje: "Usuario creado", id: usuario.id });
    } catch (error) {
        res.status(400).json({ error: "Error al registrar usuario" });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const resultado = await loginUsuario(email, password);
        res.json(resultado);
    } catch (error: any) {
        res.status(401).json({ error: error.message });
    }
});

export default router;