console.log("Servidor cargando...");
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import productoRoutes from './routes/productoRoutes';
import clienteRoutes from './routes/clienteRoutes';
import ventaRoutes from './routes/ventaRoutes';
import authRoutes from './routes/authRoutes';
import categoriaRoutes from './routes/categoriaRoutes';
import reportesRoutes from './routes/ReportesRoutes'; 
import inventarioRoutes from './routes/inventarioRoutes';
import carteraRoutes from './routes/carteraRoutes';
import whatsappRoutes from './routes/whatsappRoutes';
import { errorHandler } from './middlewares/errorMiddleware';
import { organizationMiddleware } from './middlewares/organizationMiddleware';
import novedadRouter from './routes/novedadRoutes';
import dashboardRouter from './routes/dashboardRoutes';
import cajaRouter from './routes/cajaRoutes';
import agenteRoutes from './routes/agente.routes';
import pedidoRoutes from './routes/pedido.routes';
import { adminRouter } from './routes/adminRoutes';
import kardexRoutes from './routes/kardexRoutes';
import importadorRoutes from './routes/importadorRoutes';
import proveedoresRoutes from './routes/proveedoresRoutes';
import multer from 'multer'; 
import { extraerDatosFactura } from "./services/aiService";
import { registrarFacturaEnInventario } from "./services/recepcionService";
import { despacharOrdenController } from './controllers/despachoController';
import { registrarAbono, obtenerCarteraPendiente } from './controllers/carteraController';
import { ejecutarProcesoCobranzaAutomatica } from './services/cobranzaCronService';
import { obtenerMetricasDashboard } from './services/dashboardService';
import { cargarProductosMasivos } from './services/productoService';
import { transferirStockEntreBodegas } from './services/bodegaService';
import { calcularSugerenciasReabastecimiento } from './services/reabastecimientoService';
import prisma from './lib/prisma';

const upload = multer({ storage: multer.memoryStorage() });
const app = express();
const PORT = 4000;

// Configuración de Middlewares globales
app.use(cors());
app.use(express.json());

app.get('/debug-token', (req, res) => {
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET || 'tu_clave_secreta_aqui';
    const token = jwt.sign({ userId: 1, role: 'ADMIN', organizationId: 1 }, secret, { expiresIn: '365d' });
    res.json({ token });
});

app.use('/api/whatsapp', whatsappRoutes);

// 1. RUTAS PÚBLICAS
app.use('/api/auth', authRoutes);


// 2. APLICAR SEGURIDAD CON EXCEPCIÓN GLOBAL
app.use((req, res, next) => {
    if (req.path.startsWith('/api/inventario/') || req.path === '/procesar-factura') {
        return next();
    }
    organizationMiddleware(req, res, next);
});

// 3. RUTAS PROTEGIDAS
app.use('/api/productos', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/cartera', carteraRoutes);
app.use('/api/agente', agenteRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/novedades', novedadRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/caja', cajaRouter);
app.use('/api/admin', adminRouter);
app.use('/api/kardex', kardexRoutes);
app.use('/api/importar', importadorRoutes);
app.use('/api/proveedores', proveedoresRoutes);

// 💳 RUTAS DE CARTERA Y COBRANZAS
app.post('/api/cartera/abono', registrarAbono);
app.get('/api/cartera/pendientes', obtenerCarteraPendiente);

// 🚚 RUTA DE DESPACHO DE BODEGA
app.post('/api/despacho', despacharOrdenController);

// Procesamiento de Facturas con IA
app.post('/procesar-factura', upload.single('archivo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send("No hay archivo");
    const datosFactura = await extraerDatosFactura(req.file.buffer);
    const resultado = await registrarFacturaEnInventario(datosFactura, 1, 1);
    
    res.json({ 
      mensaje: "Factura procesada e inventario actualizado exitosamente",
      data: datosFactura 
    });
  } catch (error: any) {
    console.error("Error en flujo de procesamiento:", error);
    res.status(500).json({ error: "Error al procesar", detalle: error.message });
  }
});

// 🔔 RUTA PARA DISPARAR COBRANZA AUTOMÁTICA POR WHATSAPP
app.post('/api/cartera/cobranza-automatica', async (req, res) => {
    const resultado = await ejecutarProcesoCobranzaAutomatica();
    return res.json({ success: true, resultado });
});

// 📦 RUTA DE CARGA MASIVA DE CATALOGO Y ESCALAS DE PRECIO
app.post('/api/admin/productos/carga-masiva', async (req, res) => {
    try {
        const orgId = Number(req.body.organizationId || req.organizationId || 1);
        const { productos } = req.body;

        if (!productos || !Array.isArray(productos)) {
            return res.status(400).json({ success: false, message: "Se requiere un arreglo 'productos'." });
        }

        const resultado = await cargarProductosMasivos(orgId, productos);
        return res.status(resultado.success ? 201 : 500).json(resultado);
    } catch (error: any) {
        return res.status(500).json({ success: false, error: error.message });
    }
});

// 🔄 RUTA DE TRANSFERENCIA ENTRE BODEGAS
app.post('/api/admin/bodega/transferir', async (req, res) => {
    const { varianteId, bodegaOrigenId, bodegaDestinoId, cantidad } = req.body;
    const resultado = await transferirStockEntreBodegas({
        varianteId: Number(varianteId),
        bodegaOrigenId: Number(bodegaOrigenId),
        bodegaDestinoId: Number(bodegaDestinoId),
        cantidad: Number(cantidad)
    });
    return res.status(resultado.success ? 200 : 400).json(resultado);
});

// Manejador de errores global
app.use(errorHandler); 

// Lógica de siembra/población de datos obligatorios
const poblarCategorias = async () => {
  let org = await prisma.organization.findFirst({ where: { id: 1 } });
  if (!org) {
    org = await prisma.organization.create({
      data: { id: 1, nombre: 'Tienda Principal' }
    });
    console.log("--- ORGANIZACIÓN 1 CREADA ---");
  }

  const count = await prisma.categorias.count();
  if (count === 0) {
    await prisma.categorias.createMany({
      data: [
        { nombre: 'Celulares', organizationId: 1 },
        { nombre: 'Cargadores', organizationId: 1 },
        { nombre: 'Audífonos', organizationId: 1 },
        { nombre: 'Estuches', organizationId: 1 }
      ]
    });
    console.log("--- CATEGORÍAS INICIALES CREADAS ---");
  }
};

// 🚀 UN SOLO .LISTEN CONTROLADO PARA TODO EL SISTEMA
app.listen(PORT, async () => {
  console.log(`✅ Servidor Express e Infraestructura corriendo en http://localhost:${PORT}`);
  await poblarCategorias();
});

// 📊 RUTA DE METRICAS Y DASHBOARD ADMINISTRATIVO
app.get('/api/admin/dashboard', async (req, res) => {
    const orgId = Number(req.query.organizationId || 1);
    const métricas = await obtenerMetricasDashboard(orgId);
    return res.json(métricas);
});

// 🔮 RUTA DE SUGERENCIAS DE REABASTECIMIENTO E INVENTARIO PREDICTIVO
app.get('/api/admin/inventario/reabastecimiento', async (req, res) => {
    const orgId = Number(req.query.organizationId || 1);
    const reporte = await calcularSugerenciasReabastecimiento(orgId);
    return res.json(reporte);
});