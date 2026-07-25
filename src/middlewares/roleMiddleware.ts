import { Response, NextFunction } from 'express';

export const requireRole = (rolesPermitidos: string[]) => {
  return (req: any, res: Response, next: NextFunction) => {
    const usuarioRol = req.user?.role; 

    // IMPRESIÓN DE DIAGNÓSTICO EN CONSOLA
    console.log("👮 [Control de Acceso] - Rol del usuario:", usuarioRol, "| Roles requeridos:", rolesPermitidos);

    if (!usuarioRol) {
      return res.status(403).json({ 
        error: "Acceso denegado: Rol no especificado en la sesión." 
      });
    }

    // CORRECCIÓN: Normalizamos ambos a mayúsculas para evitar fallas por 'admin' vs 'ADMIN'
    const rolNormalizado = usuarioRol.trim().toUpperCase();
    const rolesPermitidosNormalizados = rolesPermitidos.map(r => r.trim().toUpperCase());

    if (!rolesPermitidosNormalizados.includes(rolNormalizado)) {
      return res.status(403).json({ 
        error: `Acceso denegado: Privilegios insuficientes. Se requiere uno de estos roles: [${rolesPermitidos.join(', ')}]` 
      });
    }

    next();
  };
};