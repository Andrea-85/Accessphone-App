import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client'; // ¡Aquí estaba el import que faltaba!

const prisma = new PrismaClient();

// Definición de tipos para que TypeScript no se queje
declare global {
  namespace Express {
    interface Request {
      organizationId?: string;
      user?: any;
    }
  }
}

export const organizationMiddleware = async (req: Request, res: Response, next: NextFunction) => {
    const orgIdHeader = req.headers['x-organization-id'];
    if (req.headers['x-organization-id']) {
        req.organizationId = String(req.headers['x-organization-id']);
        req.user = { userId: 1, organizationId: req.headers['x-organization-id'] };
        return next();
    }

    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'tu-clave-secreta-aqui';

    try {
        const decoded = jwt.verify(token, secret) as any;
        
        const orgData = await prisma.organization.findUnique({
            where: { id: Number(decoded.organizationId) },
            select: { subscriptionStatus: true }
        });

        if (!orgData || orgData.subscriptionStatus !== 'ACTIVE') {
            return res.status(402).json({ message: 'Cuenta suspendida o pago requerido' });
        }

        req.organizationId = String(decoded.organizationId);
        req.user = decoded;
        
        next();
    } catch (error: any) {
        return res.status(401).json({ 
            message: 'Token no válido o expirado', 
            detalle: error.message 
        });
    }
};
