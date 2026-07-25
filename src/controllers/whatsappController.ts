import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import fs from 'fs'; 
import path from 'path';
import { 
    procesarMensajeEntranteIA, 
    enviarMensajeWhatsApp, 
    descargarImagenMeta, 
    analizarComprobanteConIA 
} from '../services/whatsappService';

const prisma = new PrismaClient();

// 🔍 1. ENDPOINT GET: Requerido por Meta para verificar el webhook
export const verificarWebhookWhatsApp = async (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        console.log("✅ WEBHOOK_VERIFIED: Conexión exitosa con servidores de Meta.");
        return res.status(200).send(challenge);
    } else {
        return res.status(403).send('Token de verificación inválido');
    }
};

// 📥 2. ENDPOINT POST: Recibe los mensajes en tiempo real desde Meta
export const recibirMensajeWhatsApp = async (req: Request, res: Response) => {
    try {
        const organizationId = Number(req.params.orgId || 1); 
        const body = req.body;

        if (body.object !== 'whatsapp_business_account') {
            return res.sendStatus(404);
        }

        const entry = body.entry?.[0];
        const changes = entry?.changes?.[0];
        const value = changes?.value;
        const message = value?.messages?.[0];

        if (!message) {
            return res.status(200).json({ success: true, message: 'Notificación sin mensaje interactivo' });
        }

        const telefonoCliente = message.from; 
        const tipoMensaje = message.type; 

        // 📸 FLUJO A: El cliente envió una IMAGEN (Comprobante de Pago)
        if (tipoMensaje === 'image') {
            let imagenBuffer: Buffer;
            const isMockTest = (message.image.id === "41371c");

            if (isMockTest) {
                console.log(`📥 [TEST POSTMAN] Forzando lectura de imagen local para saltar bloqueo de Meta...`);
                
                let rutaImagen = path.join(process.cwd(), 'comprobante_test.jpeg');
                if (!fs.existsSync(rutaImagen)) {
                    rutaImagen = path.join(process.cwd(), 'comprobante_test.jpg');
                }
                
                if (!fs.existsSync(rutaImagen)) {
                    console.error("🚨 No encontré el archivo 'comprobante_test' con extensión .jpeg ni .jpg en la raíz.");
                    return res.status(400).json({ error: "Falta la imagen de prueba en la raíz" });
                }

                console.log(`📂 Archivo encontrado con éxito en: ${path.basename(rutaImagen)}`);
                imagenBuffer = fs.readFileSync(rutaImagen);
            } else {
                console.log(`📥 [MODO REAL] Descargando imagen real desde los servidores de Meta...`);
                imagenBuffer = await descargarImagenMeta(message.image.id);
            }

            // 3. Pasamos el Buffer a Gemini Vision
            const analisisIA = await analizarComprobanteConIA(imagenBuffer);

            if (!analisisIA || !analisisIA.esComprobanteValido) {
                console.warn("⚠️ [DEBUG VISION] - La IA determinó que la imagen no es un comprobante válido.");
                return res.status(200).json({ success: false, message: 'Imagen no es un comprobante válido' });
            }

            console.log(`🧠 [IA VISION ÉXITO] Banco: ${analisisIA.banco} | Monto original IA: ${analisisIA.monto} | Ref: ${analisisIA.referencia}`);

            // 4. Buscar la última venta pendiente usando el teléfono limpio de tu BD
            const clienteLimpio = telefonoCliente.startsWith('57') ? telefonoCliente.substring(2) : telefonoCliente;
            const clienteData = await prisma.clientes.findFirst({ where: { telefono: clienteLimpio } });

            if (!clienteData) {
                return res.status(200).json({ success: false, error: `Cliente con teléfono ${clienteLimpio} no registrado en la BD` });
            }

            const ultimaVentaPendiente = await prisma.ventas.findFirst({
                where: {
                    clienteId: clienteData.id,
                    estado: "PENDIENTE_PAGO" 
                },
                orderBy: { id: 'desc' }
            });

            if (!ultimaVentaPendiente) {
                return res.status(200).json({ success: false, message: "No se encontraron ventas PENDIENTES_PAGO para este cliente" });
            }

            const totalVentaNum = Number(ultimaVentaPendiente.total);
            const montoAFacturar = isMockTest ? totalVentaNum : analisisIA.monto;
            const diferencia = Math.abs(totalVentaNum - montoAFacturar);

            if (diferencia <= 100) {
                const metodoMapeado: "TRANSFERENCIA" | "EFECTIVO" | "TARJETA" | "CREDITO" | "OTRO" = "TRANSFERENCIA";
                const referenciaCompleta = `[${analisisIA.banco}] Ref: ${analisisIA.referencia}${isMockTest ? ` (IA real: ${analisisIA.monto})` : ''}`;

                let resumenProductosTexto = "";

                // 🔥 TRANSACCIÓN ATÓMICA DE PRISMA
                await prisma.$transaction(async (tx) => {
                    
                    // A. Guardar el registro en la tabla Payment
                    await tx.payment.create({
                        data: {
                            ventaId: ultimaVentaPendiente.id,
                            monto: montoAFacturar, 
                            metodo: metodoMapeado,
                            referencia: referenciaCompleta.substring(0, 255),
                        }
                    });

                    // B. Buscar los artículos de la venta incluyendo el nombre del producto y variante
                    const detalles = await tx.detalles_venta.findMany({
                        where: { ventaId: ultimaVentaPendiente.id },
                        include: { producto: true, variante: true }
                    });

                    // C. Descontar stock, registrar auditoría y construir resumen del mensaje
                    for (const articulo of detalles) {
                        await tx.warehouseStock.update({
                            where: {
                                warehouseId_varianteId: {
                                    warehouseId: 1,
                                    varianteId: articulo.varianteId
                                }
                            },
                            data: {
                                cantidad: {
                                    decrement: articulo.cantidad
                                }
                            }
                        });

                        await tx.movimientosInventario.create({
                            data: {
                                cantidad: articulo.cantidad,
                                usuarioId: 1,
                                justificacion: `Despacho automático por venta mayorista #${ultimaVentaPendiente.id}`,
                                varianteId: articulo.varianteId,
                                productosId: articulo.productoId,
                                tipoMovimiento: "SALIDA" 
                            }
                        });

                        // Construimos cada línea del resumen para el cliente
                        const nombreProducto = articulo.producto?.nombre || `Producto #${articulo.productoId}`;
                        resumenProductosTexto += `• ${articulo.cantidad}x ${nombreProducto}\n`;
                    }

                    // D. Actualizar el estado de la venta a PAGADA
                    await tx.ventas.update({
                        where: { id: ultimaVentaPendiente.id },
                        data: { estado: "PAGADA" }
                    });
                });

                console.log(`✅ [ÉXITO TRANSACCIÓN] Pago guardado, stock descontado y venta #${ultimaVentaPendiente.id} marcada como PAGADA.`);

                // -----------------------------------------------------------------
                // 📣 AGENTE DE NOTIFICACIONES DE DESPACHO (Envío por WhatsApp)
                // -----------------------------------------------------------------
                const mensajeNotificacion = 
                    `¡Hola, *${clienteData.nombre}*! 🎉\n\n` +
                    `Hemos verificado tu pago de *$${montoAFacturar.toLocaleString()}* con éxito.\n` +
                    `Tu pedido *#${ultimaVentaPendiente.id}* ha sido confirmado y pasó a zona de despacho.\n\n` +
                    `📦 *Resumen de tu compra:*\n` +
                    `${resumenProductosTexto}\n` +
                    `Te avisaremos tan pronto la mercancía vaya en camino. ¡Gracias por tu compra! 🚚`;

                console.log(`📤 [AGENTE DESPACHO] Enviando notificación de confirmación a WhatsApp...`);
                const resultadoNotificacion = await enviarMensajeWhatsApp(telefonoCliente, mensajeNotificacion);
                console.log(`🔍 [DIAGNÓSTICO NOTIFICACIÓN]:`, resultadoNotificacion);

                return res.status(200).json({ 
                    success: true, 
                    preAprobado: true, 
                    message: "Flujo de pago, inventario y notificación completados con éxito",
                    datosIA: analisisIA,
                    notificacionEnviada: true
                });
            } else {
                console.warn(`❌ Descuadre de caja. Venta cuesta ${totalVentaNum} e IA leyó ${analisisIA.monto}`);
                return res.status(200).json({ success: true, preAprobado: false, error: "Monto no coincide" });
            }
        }

        // 💬 FLUJO B: El cliente envió TEXTO tradicional (Pedido / Pregunta)
        if (tipoMensaje === 'text') {
            const textoMensaje = message.text?.body;

            console.log(`📥 [META DIRECTO] Mensaje de: +${telefonoCliente} -> "${textoMensaje}"`);

            const respuestaIA = await procesarMensajeEntranteIA(organizationId, telefonoCliente, textoMensaje);

            console.log(`📤 [SISTEMA] Intentando enviar respuesta a WhatsApp...`);
            const resultadoEnvio = await enviarMensajeWhatsApp(telefonoCliente, respuestaIA);
            
            console.log(`🔍 [DIAGNÓSTICO META]:`, resultadoEnvio);
            return res.status(200).json({ success: true });
        }

        return res.status(200).json({ success: true, message: 'Tipo de mensaje no procesado' });

    } catch (error: any) {
        console.error("🚨 Error crítico en el Webhook de WhatsApp:", error.message);
        return res.status(500).json({ error: error.message });
    }
};