import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const verificarPlanPremium = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.userId;

        if (!userId) {
            return res.status(401).json({ error: "No autorizado. Usuario no identificado." });
        }

        // Buscamos al usuario y su organización relacionada en una sola consulta
        const usuario = await prisma.usuarios.findUnique({
            where: { id: userId },
            include: {
                organization: {
                    select: { id: true, plan: true, subscriptionStatus: true }
                }
            }
        });

        if (!usuario || !usuario.organization) {
            return res.status(404).json({ error: "Organización no encontrada para este usuario." });
        }

        const org = usuario.organization;

        // Validar si el plan es PREMIUM y si está activo
        if (org.plan !== 'PREMIUM' || org.subscriptionStatus !== 'ACTIVE') {
            return res.status(403).json({ 
                error: "Esta funcionalidad de automatización e IA requiere una suscripción activa al Plan Premium." 
            });
        }

        // Opcional: inyectamos el organizationId en el req por si el controlador lo necesita
        req.user.organizationId = org.id;

        next();
    } catch (error: any) {
        console.error("❌ [Plan Middleware] - Error validando el plan:", error.message);
        return res.status(500).json({ error: "Error interno validando la suscripción." });
    }
};