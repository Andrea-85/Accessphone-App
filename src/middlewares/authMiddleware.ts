import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || "Accessphone_Secret_2026";

export const validarToken = (req: Request, res: Response, next: NextFunction) => {
    // 1. Buscamos el token en la cabecera
    const authHeader = req.header('Authorization') || req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '');

    console.log("✈️ [Auth Middleware] - Intentando validar token. ¿Existe token?:", !!token);

    if (!token) {
        console.error("❌ [Auth Middleware] - No se encontró token en los headers.");
        return res.status(401).json({ error: "Acceso denegado. No hay token." });
    }

    try {
        // 2. Verificamos y decodificamos
        const verificado = jwt.verify(token, SECRET_KEY) as any;
        
        console.log("🔑 [Auth Middleware] - Contenido decodificado exitosamente:", verificado);

        // Mapeo seguro contra español/inglés
        req.user = {
            userId: verificado.userId,
            role: verificado.role || verificado.rol
        };
        
        console.log("👤 [Auth Middleware] - req.user establecido como:", req.user);
        
        next();
    } catch (error: any) {
        console.error("❌ [Auth Middleware] - Error de verificación del token:", error.message);
        return res.status(400).json({ error: "Token no válido o expirado" });
    }
};