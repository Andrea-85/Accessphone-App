import { PrismaClient } from '@prisma/client';
import { enviarMensajeWhatsApp } from './whatsappService';

const prisma = new PrismaClient();

// 🕒 TAREA AUTOMÁTICA DE NOTIFICACIÓN DE COBRANZA
export const ejecutarProcesoCobranzaAutomatica = async () => {
    console.log("🔄 [CRON COBRANZA] Iniciando revisión de vencimientos de cartera...");

    try {
        const hoy = new Date();
        const dentroDeTresDias = new Date();
        dentroDeTresDias.setDate(hoy.getDate() + 3);

        // 1. Marcar automáticamente como VENCIDAS las cuentas que superaron la fecha límite
        await prisma.cartera.updateMany({
            where: {
                estado: "VIGENTE",
                fechaLimite: { lt: hoy }
            },
            data: { estado: "VENCIDO" }
        });

        // 2. Obtener cuentas vigentes próximas a vencer (próximos 3 días) o ya vencidas
        const cuentasPorNotificar = await prisma.cartera.findMany({
            where: {
                estado: { in: ["VIGENTE", "VENCIDO"] },
                saldoActual: { gt: 0 }
            },
            include: {
                cliente: true,
                venta: true
            }
        });

        if (cuentasPorNotificar.length === 0) {
            console.log("✅ [CRON COBRANZA] No hay cuentas con recordatorios pendientes hoy.");
            return { processed: 0 };
        }

        let notificacionesEnviadas = 0;

        for (const cuenta of cuentasPorNotificar) {
            const cliente = cuenta.cliente;
            const saldoNum = Number(cuenta.saldoActual);
            const esVencido = cuenta.estado === "VENCIDO";
            const fechaVencimiento = cuenta.fechaLimite ? new Date(cuenta.fechaLimite).toLocaleDateString('es-CO') : 'Inmediato';

            // Mensaje según estado de la factura
            const mensajeWA = esVencido
                ? `🚨 *AVISO DE MORA - ACCESSPHONE*

Hola, *${cliente.nombre}*. Esperamos que te encuentres muy bien.

Le recordamos que la factura **#${cuenta.ventaId}** por valor de *$${saldoNum.toLocaleString('es-CO')}* presenta un estado **VENCIDO** desde el ${fechaVencimiento}.

📌 Por favor, le solicitamos realizar el abono o cancelación del saldo a la brevedad para mantener habilitado su cupo de crédito preferencial.

🏦 *DATOS DE PAGO:*
• Bancolombia Ahorros: 541-987654-21
• Nequi / Daviplata: 3123456789
• Titular: Accessphone SAS

Si ya realizaste el pago en las últimas horas, por favor ignora este mensaje o envíanos el comprobante por este medio. ¡Muchas gracias! 🤝`
                : `⏰ *RECORDATORIO DE VENCIMIENTO - ACCESSPHONE*

Hola, *${cliente.nombre}*. Gusto en saludarte.

Te recordamos que tu factura **#${cuenta.ventaId}** por valor de *$${saldoNum.toLocaleString('es-CO')}* tiene fecha de vencimiento próxima para el **${fechaVencimiento}**.

 Le compartimos nuestros datos bancarios para su comodidad:
• Bancolombia Ahorros: 541-987654-21
• Nequi / Daviplata: 3123456789
• Titular: Accessphone SAS

Agradecemos tu constante compromiso y preferencia. 🤝`;

            const telefonoRaw = cliente.telefono.trim();
            const destinatario = telefonoRaw.startsWith('57') ? telefonoRaw : `57${telefonoRaw}`;

            const envio = await enviarMensajeWhatsApp(destinatario, mensajeWA);

            if (envio.success) {
                notificacionesEnviadas++;
                // Registrar recordatorio en historial de chat
                await (prisma as any).historialChat.create({
                    data: {
                        clienteId: cliente.id,
                        remitente: "ASISTENTE",
                        mensaje: mensajeWA
                    }
                });
            }
        }

        console.log(`✅ [CRON COBRANZA] Finalizado. Notificaciones enviadas: ${notificacionesEnviadas}/${cuentasPorNotificar.length}`);
        return { processed: notificacionesEnviadas, total: cuentasPorNotificar.length };

    } catch (error: any) {
        console.error("🚨 [CRON COBRANZA ERROR] - Falló el proceso de cobranza:", error.message);
        return { error: error.message };
    }
};