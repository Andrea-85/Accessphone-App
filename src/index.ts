console.log("Servidor cargando...");
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import productoRoutes from './routes/productoRoutes';
import clienteRoutes from './routes/clienteRoutes';
import ventaRoutes from './routes/ventaRoutes';
import authRoutes from './routes/authRoutes';
import categoriaRoutes from './routes/categoriaRoutes';
import reportesRoutes from './routes/reportesRoutes'; 
import { errorHandler } from './middlewares/errorMiddleware';
import { organizationMiddleware } from './middlewares/organizationMiddleware';
import { PrismaClient } from '@prisma/client';
import inventarioRoutes from './routes/inventarioRoutes';

const prisma = new PrismaClient();
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// 1. RUTAS PÚBLICAS (No necesitan seguridad)
app.use('/api/auth', authRoutes);

// 2. APLICAR SEGURIDAD A TODO LO DEMÁS
app.use(organizationMiddleware);
app.listen(3000, () => {
    console.log("¡SERVICIO ESCUCHANDO EN PUERTO 3000!");
});

// 3. RUTAS PROTEGIDAS (Ya pasan por la validación de organización)
app.use('/api/productos', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/clientes', clienteRoutes);
app.use('/api/ventas', ventaRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/reportes', reportesRoutes);

app.use(errorHandler); 

const poblarCategorias = async () => {
  // 1. Aseguramos que exista al menos una organización
  let org = await prisma.organization.findFirst({ where: { id: 1 } });
  if (!org) {
    org = await prisma.organization.create({
      data: { id: 1, nombre: 'Tienda Principal' }
    });
    console.log("--- ORGANIZACIÓN 1 CREADA ---");
  }

  // 2. Ahora sí poblamos las categorías
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

// Arrancar servidor UNA SOLA VEZ
app.listen(PORT, async () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  await poblarCategorias();
});