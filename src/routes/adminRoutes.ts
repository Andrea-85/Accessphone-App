import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import ExcelJS from 'exceljs';
import { validarToken } from '../middlewares/authMiddleware';

const prisma = new PrismaClient();
export const adminRouter = Router();

// 🛡️ Aplicar guardia de seguridad JWT a TODAS las rutas administrativas
adminRouter.use(validarToken);

// 📊 1. DASHBOARD DE MÉTRICAS (Filtrado por Organización)
adminRouter.get('/dashboard', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;

        const hoy = new Date();
        const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

        const [ventasDia, ventasMes, carteraPendiente, atencionIA, atencionHumana] = await Promise.all([
            prisma.ventas.aggregate({
                where: { organizationId: activeOrgId, fecha: { gte: inicioDia }, estado: { not: 'ANULADA' } },
                _sum: { total: true },
                _count: true
            }),
            prisma.ventas.aggregate({
                where: { organizationId: activeOrgId, fecha: { gte: inicioMes }, estado: { not: 'ANULADA' } },
                _sum: { total: true }
            }),
            prisma.ventas.aggregate({
                where: { organizationId: activeOrgId, estado: 'PENDIENTE_PAGO' },
                _sum: { total: true },
                _count: true
            }),
            prisma.clientes.count({ where: { organizationId: activeOrgId, modoAtencion: 'IA' } }),
            prisma.clientes.count({ where: { organizationId: activeOrgId, modoAtencion: 'HUMANO' } })
        ]);

        res.json({
            success: true,
            timestamp: new Date(),
            metricas: {
                ventasHoy: {
                    total: Number(ventasDia._sum.total || 0),
                    cantidadOrdenes: ventasDia._count
                },
                ventasMes: {
                    total: Number(ventasMes._sum.total || 0)
                },
                carteraPendiente: {
                    montoTotal: Number(carteraPendiente._sum.total || 0),
                    facturasPorCobrar: carteraPendiente._count
                },
                operacionAgentes: {
                    atendidosPorIA: atencionIA,
                    enIntervencionHumana: atencionHumana
                }
            }
        });
    } catch (error: any) {
        console.error("🚨 [ERROR DASHBOARD]:", error.message);
        res.status(500).json({ success: false, error: "Error al generar métricas del sistema" });
    }
});

// 🔄 2. CONMUTADOR DE MODO DE ATENCIÓN (HUMANO / IA)
adminRouter.patch('/chat/:clienteId/modo', async (req: any, res: any) => {
    try {
        const { clienteId } = req.params;
        const { modo } = req.body;

        if (!['IA', 'HUMANO'].includes(modo)) {
            return res.status(400).json({ success: false, error: "El modo debe ser 'IA' o 'HUMANO'" });
        }

        const clienteActualizado = await prisma.clientes.update({
            where: { id: Number(clienteId) },
            data: { modoAtencion: modo }
        });

        console.log(`🔄 [CAMBIO MODO] Cliente #${clienteId} actualizado a modo: ${modo}`);

        res.json({
            success: true,
            clienteId: clienteActualizado.id,
            modoAtencion: clienteActualizado.modoAtencion
        });
    } catch (error: any) {
        console.error("🚨 [ERROR CAMBIO MODO]:", error.message);
        res.status(500).json({ success: false, error: "Error al actualizar el modo de atención" });
    }
});

// 📄 3. EXPORTAR REPORTE DE VENTAS EN EXCEL
adminRouter.get('/reportes/ventas-excel', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;

        const ventas = await (prisma.ventas as any).findMany({
            where: { organizationId: activeOrgId },
            include: {
                cliente: true,
                detalles: true
            },
            orderBy: { fecha: 'desc' }
        });

        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Reporte de Ventas');

        sheet.columns = [
            { header: 'N° Orden', key: 'id', width: 12 },
            { header: 'Fecha', key: 'fecha', width: 20 },
            { header: 'Cliente', key: 'cliente', width: 25 },
            { header: 'Teléfono', key: 'telefono', width: 15 },
            { header: 'Total ($)', key: 'total', width: 18 },
            { header: 'Estado', key: 'estado', width: 18 }
        ];

        sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFF' } };
        sheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '1E293B' }
        };

        ventas.forEach((venta: any) => {
            sheet.addRow({
                id: `#${venta.id}`,
                fecha: venta.fecha ? new Date(venta.fecha).toLocaleString('es-CO') : 'Sin fecha',
                cliente: venta.cliente?.nombre || 'Cliente General',
                telefono: venta.cliente?.telefono || 'N/A',
                total: Number(venta.total || 0),
                estado: venta.estado
            });
        });

        sheet.getColumn('total').numFmt = '"$"#,##0';

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=' + `Reporte_Ventas_${Date.now()}.xlsx`);

        await workbook.xlsx.write(res);
        res.end();

    } catch (error: any) {
        console.error("🚨 [ERROR REPORTE EXCEL]:", error.message);
        res.status(500).json({ success: false, error: "Error al generar archivo Excel" });
    }
});

// 📊 4. DASHBOARD GERENCIAL (Consumido por el Frontend)
adminRouter.get('/dashboard/gerencial', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;

        const [
            ventasIA,
            pendientesDespacho,
            alertasStock,
            mermasTotal,
            historialMermas,
            stockMuerto
        ] = await Promise.all([
            prisma.ventas.aggregate({
                where: { organizationId: activeOrgId, estado: { not: 'ANULADA' } },
                _sum: { total: true }
            }),
            prisma.ventas.count({
                where: { organizationId: activeOrgId, estado: 'PENDIENTE_PAGO' }
            }),
            (prisma as any).variante ? (prisma as any).variante.count().catch(() => 0) : 0,
            Promise.resolve({ _sum: { totalPerdido: 0 } }),
            Promise.resolve([]),
            Promise.resolve([])
        ]);

        res.json({
            success: true,
            data: {
                ventasTotalesIA: Number(ventasIA._sum.total || 0),
                pedidosPendientesDespacho: pendientesDespacho,
                alertasStockCriticoCount: alertasStock,
                lotesInmovilizadosCount: stockMuerto.length,
                balanceFinancieroMermas: {
                    totalDineroPerdido: Number(mermasTotal._sum.totalPerdido || 0),
                    mensajeFormat: "$0 COP"
                },
                detallesStockMuerto: stockMuerto,
                historialMermas: historialMermas
            }
        });
    } catch (error: any) {
        console.error("🚨 [ERROR DASHBOARD GERENCIAL]:", error.message);
        res.status(500).json({ success: false, error: "Error al cargar métricas gerenciales" });
    }
});

// 💬 5. MONITOR DE CONVERSACIONES DEL AGENTE (WhatsApp)
adminRouter.get('/agente/conversaciones', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;

        const clientes = await (prisma.clientes as any).findMany({
            where: { organizationId: activeOrgId },
            take: 20,
            orderBy: { id: 'desc' }
        });

        const conversaciones = clientes.map((c: any) => ({
            id: c.id,
            clienteNombre: c.nombre || 'Cliente WhatsApp',
            telefono: c.telefono || 'Sin número',
            ultimoMensaje: c.modoAtencion === 'HUMANO' ? 'Atención pausada por asesor' : 'Atendido por Agente IA',
            modoAtencion: c.modoAtencion || 'IA',
            estadoIA: c.modoAtencion === 'HUMANO' ? 'INTERVENCION_HUMANA' : 'RESPONDIDO'
        }));

        res.json({ success: true, data: conversaciones });
    } catch (error: any) {
        console.error("🚨 [ERROR CONVERSACIONES]:", error.message);
        res.status(500).json({ success: false, error: "Error al cargar conversaciones" });
    }
});

// 👥 6. OBTENER EMPLEADOS
adminRouter.get('/empleados', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;
        const tablaUsuarios = (prisma as any).usuarios || (prisma as any).usuario;
        
        const usuarios = await tablaUsuarios.findMany({
            where: { organizationId: activeOrgId },
            select: { id: true, nombre: true, email: true, rol: true, createdAt: true },
            orderBy: { id: 'desc' }
        });
        res.json({ success: true, data: usuarios });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ➕ 7. CREAR EMPLEADO
adminRouter.post('/empleados', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;
        const { nombre, email, password, rol } = req.body;
        const bcrypt = require('bcryptjs');
        const hashedPassword = await bcrypt.hash(password, 10);
        const tablaUsuarios = (prisma as any).usuarios || (prisma as any).usuario;

        const nuevoUsuario = await tablaUsuarios.create({
            data: {
                nombre,
                email,
                password: hashedPassword,
                rol: rol || 'VENDEDOR',
                organizationId: activeOrgId
            }
        });

        res.status(201).json({ success: true, data: nuevoUsuario });
    } catch (error: any) {
        res.status(400).json({ success: false, error: "Error al crear el empleado." });
    }
});

// 🏢 8. OBTENER TODAS LAS BODEGAS DE LA ORGANIZACIÓN
adminRouter.get('/warehouses', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;
        const warehouses = await (prisma as any).warehouse.findMany({
            where: { organizationId: activeOrgId },
            orderBy: { id: 'asc' }
        });
        res.json({ success: true, data: warehouses });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ➕ 9. CREAR NUEVA BODEGA (Nombre libre)
adminRouter.post('/warehouses', async (req: any, res: any) => {
    try {
        const activeOrgId = Number(req.user?.organizationId || req.organizationId) || 1;
        const { nombre, direccion, ciudad } = req.body;

        if (!nombre) {
            return res.status(400).json({ error: "El nombre de la bodega es obligatorio." });
        }

        const nuevaBodega = await (prisma as any).warehouse.create({
            data: {
                nombre,
                direccion: direccion || null,
                ciudad: ciudad || 'Bogotá',
                organizationId: activeOrgId
            }
        });

        res.status(201).json({ success: true, data: nuevaBodega });
    } catch (error: any) {
        res.status(400).json({ success: false, error: "Error al crear la bodega." });
    }
});