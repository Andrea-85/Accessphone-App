import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import productoRoutes from './routes/productoRoutes.js';
import clienteRoutes from './routes/clienteRoutes.js';
import ventaRoutes from './routes/ventaRoutes.js';
import authRoutes from './routes/authRoutes.js';
import categoriaRoutes from './routes/categoriaRoutes.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();


const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// RUTAS ORGANIZADAS
app.use('/api/productos', productoRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use(errorHandler); 

// Función para poblar la base de datos automáticamente
const poblarCategorias = async () => {
  const count = await prisma.categorias.count();
  if (count === 0) {
    await prisma.categorias.createMany({
      data: [
        { nombre: 'Celulares' },
        { nombre: 'Cargadores' },
        { nombre: 'Audífonos' },
        { nombre: 'Estuches' }
      ]
    });
    console.log("--- CATEGORÍAS INICIALES CREADAS ---");
  }
};
// ✅ REPORTES DE NOVEDAD
app.post('/api/reportes', async (req: Request, res: Response) => {
  try {
    const { empleado, producto, tipo, descripcion, foto_url } = req.body;

    if (!empleado || !producto) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const nuevoReporte = await prisma.reportes_novedad.create({
      data: {
        empleado,
        producto,
        tipo,
        descripcion,
        foto_url: foto_url || null
      }
    });

    res.status(201).json(nuevoReporte);
  } catch (error: any) {
    console.error("ERROR AL CREAR REPORTE:", error.message);
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/reportes', async (req: Request, res: Response) => {
  try {
    const reportes = await prisma.reportes_novedad.findMany({
      orderBy: { fecha: 'desc' }
    });
    res.json(reportes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Asegúrate que esto esté al FINAL
app.listen(3000, () => {
  console.log("✅ Servidor escuchando en puerto 3000");
});

// Ejecutar al iniciar
poblarCategorias();

app.listen(PORT, () => {
    console.log(`--- SERVIDOR CORRIENDO ---`);
    console.log(`Productos: http://localhost:${PORT}/api/productos`);
    console.log(`Ventas:    http://localhost:${PORT}/api/ventas/reporte`);
});