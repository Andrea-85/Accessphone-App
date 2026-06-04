import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = "Accessphone_Secret_2026"; 

export const validarToken = (req: Request, res: Response, next: NextFunction) => {
    // 1. Buscamos el token en la cabecera de la petición
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Acceso denegado. No hay token." });
    }

    try {
        // 2. Verificamos si el token es real y no ha expirado
        const verificado = jwt.verify(token, SECRET_KEY) as { userId: number, role: string };
  req.user = {
            userId: verificado.userId,
            role: verificado.role // <--- Esto viene del JWT que generaste en el login
        };
        
        next();
    } catch (error) {
        res.status(400).json({ error: "Token no válido o expirado" });
    }
};

export const esAdmin = (req: any, res: Response, next: NextFunction) => {
    // Usamos 'req.user' para que coincida con lo que guardamos arriba
    // Y verificamos 'role' (no 'rol') para mantener consistencia
    if (req.user && req.user.role === 'ADMIN') { 
        next();
    } else {
        res.status(403).json({ error: "Acceso denegado. Solo para administradores." });
    }
};