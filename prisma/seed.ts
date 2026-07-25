import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt';

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  // 1. Crear Organización base (Aseguramos ID 1 para tus controladores por defecto)
  let org = await prisma.organization.findFirst({
    where: { nombre: 'Accessphone' }
  });

  if (!org) {
    org = await prisma.organization.create({ 
      data: { id: 1, nombre: 'Accessphone', slug: 'accessphone' } 
    });
  }

  // 2. Administrador
  await prisma.usuarios.upsert({
    where: { email: 'admin@accessphone.com' },
    update: {},
    create: { 
      nombre: 'Admin', 
      email: 'admin@accessphone.com',
      password: hashedPassword,
      organizationId: org.id 
    }
  });

  // 3. Crear Bodegas
  await prisma.warehouse.createMany({
    data: [
      { id: 1, nombre: 'Bodega Principal', organizationId: org.id },
      { id: 2, nombre: 'Local Ventas', organizationId: org.id }
    ],
    skipDuplicates: true
  });

  // 4. Crear Categoría Pantallas
  const catPantallas = await prisma.categorias.upsert({
    where: { organizationId_nombre: { organizationId: org.id, nombre: 'Pantallas' } },
    update: {},
    create: { nombre: 'Pantallas', organizationId: org.id },
  });

  // 5. Crear el Producto exacto para la prueba de IA
  const prod = await prisma.productos.create({
    data: { 
      id: 1,
      nombre: 'Pantallas Samsung', 
      precio: 145000, 
      costo: 90000, 
      organizationId: org.id,
      categoriaId: catPantallas.id
    }
  });

  // 6. Crear la Variante que procesará Gemini
  const variante = await prisma.variante.upsert({
    where: { sku: 'PAN-SAM-A15' },
    update: { nombreVariante: 'Pantalla Samsung A15 OLED' },
    create: { 
      id: 1,
      productoId: prod.id, 
      nombreVariante: 'Pantalla Samsung A15 OLED', 
      sku: 'PAN-SAM-A15', 
      precio: 145000,
      stockActual: 50
    }
  });

  // 7. Crear Stock físico en la Bodega Principal
  await prisma.warehouseStock.create({
    data: { 
      varianteId: variante.id, 
      warehouseId: 1,
      cantidad: 50 
    }
  });

  // 8. Crear Lote de Compra inicial FIFO (Indispensable para tu lógica de inventario por WhatsApp)
  await prisma.loteCompra.create({
    data: {
      id: 1,
      varianteId: variante.id,
      cantidadActual: 50,
      costoUnitario: 90000
    }
  });

  // 9. Registrar tu Cliente de desarrollo con el indicativo de Meta (57)
await prisma.clientes.upsert({
  where: { organizationId_cedula: { organizationId: org.id, cedula: '123456789' } },
  update: {
    telefono: '3027111672', 
    nombre: 'Andrea Mayorista'
  },
  create: { 
    nombre: 'Andrea Mayorista', 
    cedula: '123456789', 
    telefono: '3027111672', 
    organizationId: org.id 
  }
});

  console.log('✅ BASE DE DATOS SEMBRADA: Datos de pantallas, lotes FIFO y cliente Andrea cargados de forma limpia.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());