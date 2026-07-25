import { PrismaClient } from '@prisma/client';
import { enviarMensajeWhatsApp } from './whatsappService';

const prisma = new PrismaClient();

interface DatosAbono {
    clienteId: number;
    montoAbono: number;
    metodoPago: string; // "Nequi", "Bancolombia", "Efectivo"
    comprobanteRef?: string;
}

// 💰 REGISTRAR ABONO A CARTERA Y NOTIFICAR SALDO PENDIENTE
export const registrarAbonoCartera = async ({
    clienteId,
    montoAbono,
    metodoPago,
    comprobanteRef = "SN"
}: DatosAbono) => {
    try {
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Obtener la cartera activa del cliente
            const cartera = await tx.cartera.findFirst({
                where: { clienteId: clienteId, estado: { in: ["PENDIENTE", "PARCIAL"] } },
                include: { cliente: true }
            });

            if (!cartera) {
                throw new Error("El cliente no tiene cuentas por cobrar pendientes.");
            }

            const nuevoSaldo = Number(cartera.saldoPendiente) - montoAbono;
            const nuevoEstado = nuevoSaldo <= 0 ? "PAGADO" : "PARCIAL";

            // 2. Actualizar el saldo de la cartera
            const carteraActualizada = await tx.cartera.update({
                where: { id: cartera.id },
                data: {
                    saldoPendiente: nuevoSaldo < 0 ? 0 : nuevoSaldo,
                    estado: nuevoEstado
                }
            });

            // 3. Registrar el pago en la tabla Payment
            await tx.payment.create({
                data: {
                    carteraId: cartera.id,
                    monto: montoAbono,
                    metodoPago: metodoPago,
                    referencia: comprobanteRef
                }
            });

            return { carteraActualizada, cliente: cartera.cliente, nuevoSaldo };
        });

        // 4. Redactar notificación de estado de cuenta para WhatsApp
        const mensajeWA = `🧾 *COMPROBANTE DE RECIBO DE ABONO - ACCESSPHONE*

Hola, *${resultado.cliente.nombre}*. Hemos registrado tu abono con éxito.

💰 *Monto Abonado:* $${montoAbono.toLocaleString('es-CO')}
💳 *Método:* ${metodoPago}
📌 *Referencia:* ${comprobanteRef}

📊 *ESTADO DE TU CUENTA:*
• *Saldo Restante Pendiente:* $${(resultado.nuevoSaldo < 0 ? 0 : resultado.nuevoSaldo).toLocaleString('es-CO')}
• *Estado de Cartera:* ${resultado.nuevoSaldo <= 0 ? '✅ PAZ Y SALVO' : '⚠️ SALDO PENDIENTE'}

¡Muchas gracias por mantener tu crédito al día! 🤝`;

        const telefono = resultado.cliente.telefono;
        const destinatario = telefono.startsWith('57') ? telefono : `57${telefono}`;
        await enviarMensajeWhatsApp(destinatario, mensajeWA);

        console.log(`✅ [CARTERA] Abono registrado a Cliente #${clienteId}. Saldo restante: ${resultado.nuevoSaldo}`);
        return { success: true, data: resultado };

    } catch (error: any) {
        console.error("🚨 [CARTERA ERROR] -", error.message);
        return { success: false, error: error.message };
    }
};