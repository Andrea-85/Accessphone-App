import { Request, Response } from 'express';
import { registrarDespachoYNotificar } from '../services/despachoService';

// Endpoint para que el bodeguero marque la guía (POST /api/despacho)
export const despacharOrdenController = async (req: Request, res: Response) => {
    try {
        const { ventaId, transportadora, numeroGuia } = req.body;

        if (!ventaId || !numeroGuia) {
            return res.status(400).json({
                success: false,
                message: "Se requiere el 'ventaId' y el 'numeroGuia'"
            });
        }

        const resultado = await registrarDespachoYNotificar({
            ventaId: Number(ventaId),
            transportadora,
            numeroGuia
        });

        if (!resultado.success) {
            return res.status(500).json(resultado);
        }

        return res.status(200).json({
            message: "Despacho procesado y cliente notificado por WhatsApp con éxito",
            data: resultado
        });

    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
};