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
        { nombre: 'Accesorios' }
      ]
    });
    console.log("--- CATEGORÍAS INICIALES CREADAS ---");
  }
};

// Ejecutar al iniciar
poblarCategorias();

app.listen(PORT, () => {
    console.log(`--- SERVIDOR CORRIENDO ---`);
    console.log(`Productos: http://localhost:${PORT}/api/productos`);
    console.log(`Ventas:    http://localhost:${PORT}/api/ventas/reporte`);
});