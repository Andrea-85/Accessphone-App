import { Request, Response, NextFunction } from 'express';

export const requireRole = (role: string) => {
    return (req: any, res: Response, next: NextFunction) => {
        // Asumiendo que el middleware de autenticación ya puso el usuario en req.user
        if (req.user && req.user.role === role) {
            next(); // Tiene permiso, puede continuar
        } else {
            res.status(403).json({ error: 'Acceso denegado: Se requiere rol de ' + role });
        }
    };
};