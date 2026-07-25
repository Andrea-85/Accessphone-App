import { PrismaClient } from '@prisma/client';
import { enviarMensajeWhatsApp } from './whatsappService';

const prisma = new PrismaClient();

interface DatosDespacho {
    ventaId: number;
    transportadora?: string;
    numeroGuia: string;
}

// 🚚 PROCESAR DESPACHO DE BODEGA Y NOTIFICAR AL CLIENTE MAYORISTA
export const registrarDespachoYNotificar = async ({
    ventaId,
    transportadora = "Interrapidísimo",
    numeroGuia
}: DatosDespacho) => {
    try {
        // 1. Buscar la venta y validar su existencia
        const venta = await prisma.ventas.findUnique({
            where: { id: ventaId },
            include: { cliente: true, detalles: true }
        });

        if (!venta) {
            console.error(`🚨 [DESPACHO] - No se encontró la venta #${ventaId}`);
            return { success: false, error: "Venta no encontrada" };
        }

        // 2. Transacción en BD: Actualizar estado, transportadora, guía y fecha de despacho
        const ventaActualizada = await prisma.ventas.update({
            where: { id: ventaId },
            data: {
                estado: "ENVIADA",
                transportadora: transportadora,
                numeroGuia: numeroGuia,
                fechaDespacho: new Date()
            }
        });

        console.log(`✅ [DESPACHO BD] - Venta #${ventaId} actualizada a ENVIADA con guía: ${numeroGuia}`);

        // 3. Redactar el mensaje de confirmación para el cliente
        const mensajeWhatsApp = `🚚 *¡NOTIFICACIÓN DE DESPACHO - ACCESSPHONE!*

Hola, *${venta.cliente.nombre}*. ¡Tu pedido ya va en camino a tu bodega! 📦💨

📋 *Resumen del Envío:*
• *Orden #:* ${venta.id}
• *Transportadora:* ${transportadora}
• *Nro. de Guía:* \`${numeroGuia}\`
• *Fecha de Salida:* ${new Date().toLocaleDateString('es-CO')}

🔎 Puedes rastrear el estado de tu paquete directamente en la plataforma o app de ${transportadora} con el número de guía proporcionado.

¡Muchas gracias por tu compra mayorista! Quedamos atentos a cualquier novedad. 🤝`;

       // 4. Enviar notificación por WhatsApp (Asegurando prefijo de país 57)
        const telefonoRaw = venta.cliente.telefono.trim();
        const destinatario = telefonoRaw.startsWith('57') ? telefonoRaw : `57${telefonoRaw}`;
        
        console.log(`📱 [DESPACHO WA] Intentando enviar notificación a: ${destinatario}`);
        const resultadoEnvio = await enviarMensajeWhatsApp(destinatario, mensajeWhatsApp);
        
        // 5. Registrar la notificación en el historial de chat
        await (prisma as any).historialChat.create({
            data: {
                clienteId: venta.cliente.id,
                remitente: "ASISTENTE",
                mensaje: mensajeWhatsApp
            }
        });

        return {
            success: true,
            ventaId: ventaActualizada.id,
            estado: ventaActualizada.estado,
            guia: ventaActualizada.numeroGuia,
            notificacionEnviada: resultadoEnvio.success
        };

    } catch (error: any) {
        console.error("🚨 [DESPACHO ERROR] - Falló el registro de despacho:", error.message);
        return { success: false, error: error.message };
    }
};