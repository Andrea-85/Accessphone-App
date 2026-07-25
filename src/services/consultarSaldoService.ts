import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// 📊 CONSULTA DE SALDO Y ESTADO DE CUENTA PARA WHATSAPP
export const obtenerEstadoCuentaClienteWA = async (telefonoCliente: string): Promise<string> => {
    try {
        const telefonoLimpio = telefonoCliente.startsWith('57') ? telefonoCliente.substring(2) : telefonoCliente;

        // 1. Buscar al cliente por su número
        const cliente = await prisma.clientes.findFirst({
            where: { telefono: telefonoLimpio }
        });

        if (!cliente) {
            return `🤖 No encontramos una cuenta registrada con el número ${telefonoLimpio}. Si eres cliente mayorista nuevo, por favor indícanos tu nombre o NIT para registrarte.`;
        }

        // 2. Buscar cuentas pendientes en Cartera
        const cuentasPendientes = await prisma.cartera.findMany({
            where: {
                clienteId: cliente.id,
                estado: { in: ["VIGENTE", "VENCIDO"] }
            },
            include: {
                venta: { select: { id: true, total: true, fecha: true } }
            },
            orderBy: { fechaLimite: 'asc' }
        });

        // 3. Caso: Paz y Salvo
        if (cuentasPendientes.length === 0) {
            return `🤖 ¡Hola, *${cliente.nombre}*! 

✨ Te informamos que en este momento te encuentras a **PAZ Y SALVO** con Accessphone. No registras facturas pendientes de pago en nuestra cartera. ¡Gracias por tu excelente cumplimiento! 🤝`;
        }

        // 4. Caso: Deuda Pendiente
        let totalDeuda = 0;
        let desglose = "";

        cuentasPendientes.forEach((cuenta, index) => {
            const saldoNum = Number(cuenta.saldoActual);
            totalDeuda += saldoNum;
            const fechaLimiteStr = cuenta.fechaLimite ? new Date(cuenta.fechaLimite).toLocaleDateString('es-CO') : 'Sin fecha';
            const estadoIcono = cuenta.estado === "VENCIDO" ? "🔴 VENCIDA" : "🟡 VIGENTE";

            desglose += `\n${index + 1}. *Factura/Venta #${cuenta.ventaId}*
   • Saldo Pendiente: $${saldoNum.toLocaleString('es-CO')}
   • Estado: ${estadoIcono}
   • Vencimiento: ${fechaLimiteStr}\n`;
        });

        const respuesta = `📊 *ESTADO DE CUENTA Y CARTERA - ACCESSPHONE*

Hola, *${cliente.nombre}*. Este es el resumen actualizado de tu cartera:

💰 *DEUDA TOTAL PENDIENTE:* $${totalDeuda.toLocaleString('es-CO')}
📌 *Cuentas activas:* ${cuentasPendientes.length}

📝 *Desglose por Factura:*${desglose}
🏦 *DATOS PARA PAGO / ABONO:*
• Bancolombia Ahorros: 541-987654-21
• Nequi / Daviplata: 3123456789
• Titular: Accessphone SAS

Apenas realices tu abono o pago total, puedes enviarnos la foto del comprobante por este chat para registrarlo inmediatamente. ¡Gracias! 🤝`;

        return respuesta;

    } catch (error: any) {
        console.error("🚨 [CARTERA WA ERROR] - Error consultando saldo:", error.message);
        return `🤖 Ocurrió un inconveniente al consultar tu estado de cuenta. Un asesor revisará tu caso en breve.`;
    }
};