import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/** Campos SaaS necesarios hasta que `prisma generate` refresque tipos tras migraciones. */
type OrganizationSubscriptionSlice = {
    subscriptionStatus: string;
    subscriptionExpires: Date | null;
    automaticLock: boolean;
    graceDays: number;
};

/** Último instante permitido antes del bloqueo: fin de vigencia + días de gracia. */
function deadlineWithGrace(subscriptionExpires: Date, graceDays: number): Date {
    const d = new Date(subscriptionExpires);
    d.setUTCDate(d.getUTCDate() + graceDays);
    return d;
}

/**
 * Colocar después de `validarToken`. Resuelve la organización del usuario autenticado
 * y bloquea el acceso si la suscripción está suspendida o vencida (con bloqueo automático).
 */
export const checkSubscription = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    const payload = (req as unknown as { usuario?: { id?: number } }).usuario;
    const userId = payload?.id;

    if (userId == null || !Number.isFinite(Number(userId))) {
        res.status(401).json({ error: 'Sesión inválida' });
        return;
    }

    try {
        const usuario = await prisma.usuarios.findUnique({
            where: { id: Number(userId) },
        });

        if (!usuario) {
            res.status(403).json({ error: 'Acceso denegado: usuario no encontrado' });
            return;
        }

        const orgRow = await prisma.organization.findUnique({
            where: { id: usuario.organizationId },
        });

        if (!orgRow) {
            res.status(403).json({ error: 'Acceso denegado: organización no encontrada' });
            return;
        }

        const org = orgRow as typeof orgRow & OrganizationSubscriptionSlice;

        if (org.subscriptionStatus === 'SUSPENDED') {
            res.status(403).json({ error: 'Acceso denocando: Suscripción vencida' });
            return;
        }

        if (org.automaticLock && org.subscriptionExpires != null) {
            const now = new Date();
            const lockAfter = deadlineWithGrace(org.subscriptionExpires, org.graceDays);
            if (now > lockAfter) {
                res.status(403).json({ error: 'Acceso denocando: Suscripción vencida' });
                return;
            }
        }

        next();
    } catch {
        res.status(500).json({ error: 'No se pudo verificar la suscripción' });
    }
};
