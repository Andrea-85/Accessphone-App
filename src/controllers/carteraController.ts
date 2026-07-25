import { Response } from 'express';
import { PrismaClient, MetodoPago } from '@prisma/client';
import { enviarMensajeWhatsApp } from '../services/whatsappService';

const prisma = new PrismaClient();

export const registrarAbono = async (req: any, res: Response) => {
    try {
        const organizationId = Number(req.organizationId || 1);
        const usuarioId = Number(req.userId || req.user?.userId || 1);
        const { carteraId, monto, metodo, referencia } = req.body;

        if (!carteraId || !monto || Number(monto) <= 0 || !metodo) {
            return res.status(400).json({ error: "Datos de abono inválidos o monto debe ser mayor a cero." });
        }

        // Ejecutamos el abono dentro de una transacción para asegurar consistencia monetaria
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Verificar que la cuenta por cobrar exista y pertenezca a la organización
            const cuenta = await tx.cartera.findFirst({
                where: { id: Number(carteraId), organizationId },
                include: { cliente: true }
            });

            if (!cuenta) throw new Error("La cuenta por cobrar no existe.");
            if (cuenta.estado === "PAGADO") throw new Error("Esta cuenta ya se encuentra totalmente pagada.");

            const montoAbono = Number(monto);
            const saldoActual = Number(cuenta.saldoActual);

            if (montoAbono > saldoActual) {
                throw new Error(`El monto del abono ($${montoAbono}) supera el saldo pendiente ($${saldoActual}).`);
            }

            // 2. Calcular el nuevo saldo
            const nuevoSaldo = saldoActual - montoAbono;
            const nuevoEstado = nuevoSaldo === 0 ? "PAGADO" : cuenta.estado;

            // 3. Crear el registro del abono
            await tx.abono.create({
                data: {
                    carteraId: cuenta.id,
                    monto: montoAbono,
                    metodo: metodo as MetodoPago,
                    referencia: referencia || null,
                    usuarioId: usuarioId
                }
            });

            // 4. Actualizar la cuenta en Cartera con el nuevo saldo y estado
            const carteraActualizada = await tx.cartera.update({
                where: { id: cuenta.id },
                data: {
                    saldoActual: nuevoSaldo,
                    estado: nuevoEstado
                },
                include: { abonos: true, cliente: true }
            });

            return carteraActualizada;
        });

        // 📲 5. NOTIFICACIÓN AUTOMÁTICA POR WHATSAPP AL CLIENTE
        if (resultado.cliente?.telefono) {
            const saldoRestante = Number(resultado.saldoActual);
            const mensajeWA = `🧾 *RECIBO DE ABONO A CARTERA - ACCESSPHONE*

Hola, *${resultado.cliente.nombre}*. Hemos registrado tu abono con éxito.

💰 *Monto Abonado:* $${Number(monto).toLocaleString('es-CO')}
💳 *Método:* ${metodo}
📌 *Referencia:* ${referencia || 'N/A'}

📊 *ESTADO DE TU CUENTA:*
• *Saldo Restante:* $${saldoRestante.toLocaleString('es-CO')}
• *Estado:* ${saldoRestante === 0 ? '✅ PAZ Y SALVO' : '⚠️ VIGENTE CON SALDO PENDIENTE'}

¡Muchas gracias por mantener tu crédito al día! 🤝`;

            const telefonoRaw = resultado.cliente.telefono.trim();
            const destinatario = telefonoRaw.startsWith('57') ? telefonoRaw : `57${telefonoRaw}`;
            await enviarMensajeWhatsApp(destinatario, mensajeWA);
        }

        return res.status(201).json({
            success: true,
            message: Number(resultado.saldoActual) === 0 ? "¡Cuenta liquidada con éxito!" : "Abono registrado correctamente.",
            data: resultado
        });

    } catch (error: any) {
        console.error(`🚨 Error al registrar abono en cartera:`, error.message);
        return res.status(400).json({ error: error.message });
    }
};

// Listar todas las cuentas por cobrar pendientes de la organización (una sola declaración)
export const obtenerCarteraPendiente = async (req: any, res: Response) => {
    try {
        const organizationId = Number(req.organizationId || 1);

        const cuentas = await prisma.cartera.findMany({
            where: {
                organizationId,
                estado: { in: ["VIGENTE", "VENCIDO"] }
            },
            include: {
                cliente: { select: { nombre: true, telefono: true } },
                venta: { select: { total: true, fecha: true } }
            },
            orderBy: { fechaLimite: 'asc' }
        });

        return res.json(cuentas);
    } catch (error: any) {
        return res.status(500).json({ error: error.message });
    }
};