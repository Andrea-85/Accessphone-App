import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET: Obtener todos los proveedores de la organización
export const obtenerProveedores = async (req: Request, res: Response): Promise<void> => {
  try {
    const userReq = (req as any).user;
    const organizationId = Number(userReq?.organizationId || 1);

    const proveedores = await prisma.proveedores.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ success: true, data: proveedores });
  } catch (error: any) {
    console.error("🚨 Error al obtener proveedores:", error.message);
    res.status(500).json({ success: false, error: "Error al cargar proveedores." });
  }
};

// POST: Crear un nuevo proveedor
export const crearProveedor = async (req: Request, res: Response): Promise<void> => {
  try {
    const userReq = (req as any).user;
    const organizationId = Number(userReq?.organizationId || 1);
    const { nombre, nit, telefono, email, direccion } = req.body;

    if (!nombre) {
      res.status(400).json({ success: false, error: "El nombre o razón social es obligatorio." });
      return;
    }

    const nuevoProveedor = await prisma.proveedores.create({
      data: {
        nombre,
        nit: nit || null,
        telefono: telefono || null,
        email: email || null,
        direccion: direccion || null,
        organizationId
      }
    });

    res.status(201).json({ success: true, data: nuevoProveedor });
  } catch (error: any) {
    console.error("🚨 Error al crear proveedor:", error.message);
    res.status(500).json({ success: false, error: "Error al guardar el proveedor." });
  }
};