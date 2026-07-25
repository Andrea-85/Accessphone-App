import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerKardexPorVariante = async (req: Request, res: Response): Promise<void> => {
  try {
    const { varianteId } = req.params;

    if (!varianteId) {
      res.status(400).json({ success: false, error: "El ID de la variante es requerido." });
      return;
    }

    const movimientos = await prisma.movimientosInventario.findMany({
      where: {
        varianteId: Number(varianteId)
      },
      include: {
        variante: {
          include: {
            producto: true
          }
        },
        usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      data: movimientos
    });

  } catch (error: any) {
    console.error("🚨 Error al consultar el Kardex:", error.message);
    res.status(500).json({ success: false, error: "Error al cargar el historial del Kardex." });
  }
};