import { Request, Response, NextFunction } from 'express';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("--- ERROR DETECTADO ---");
    const status = err.status || 500;
    const mensaje = err.message || "Error interno del servidor";

    res.status(status).json({
        error: true,
        mensaje: mensaje
    });
};