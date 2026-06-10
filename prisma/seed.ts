import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Crear Organización
  const org = await prisma.organization.upsert({
    where: { nombre: 'Accessphone' },
    update: {},
    create: { nombre: 'Accessphone' },
  });

  // 2. Crear Administrador (Usuarios)
  await prisma.usuarios.upsert({
    where: { email: 'admin@accessphone.com' },
    update: {},
    create: { 
      nombre: 'Admin', 
      email: 'admin@accessphone.com',
      password: 'password123', // Pon aquí la que tú quieras
      organizationId: org.id 
    }
  });

  // 3. Crear Bodegas
  await prisma.warehouse.createMany({
    data: [
      { nombre: 'Bodega Principal', organizationId: org.id },
      { nombre: 'Local Ventas', organizationId: org.id }
    ],
    skipDuplicates: true
  });

  // 4. Crear Categorías
  const catVidrios = await prisma.categorias.upsert({
    where: { organizationId_nombre: { organizationId: org.id, nombre: 'Vidrios' } },
    update: {},
    create: { nombre: 'Vidrios', organizationId: org.id },
  });

  // 5. Crear Subcategorías
  const tiposVidrios = ['Cerámico', 'Blindado', '5D', 'Mate', 'Privacidad'];
  for (const tipo of tiposVidrios) {
    await prisma.subcategoria.upsert({
      where: { categoriaId_nombre: { categoriaId: catVidrios.id, nombre: tipo } },
      update: {},
      create: { nombre: tipo, categoriaId: catVidrios.id }
    });
  }

  console.log('✅ BASE DE DATOS SEMBRADA: Organización, Admin, Bodegas y Categorías listos.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => await prisma.$disconnect());