import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  // 1. Creamos la categoría principal
  const catVidrios = await prisma.categorias.upsert({
    where: { nombre: 'Vidrios' },
    update: {},
    create: { nombre: 'Vidrios' },
  });

  // 2. Creamos las subcategorías para Vidrios
  const tiposVidrios = ['Cerámico', 'Blindado', '5D', 'Mate', 'Privacidad'];

  for (const tipo of tiposVidrios) {
    await prisma.subcategoria.upsert({
      where: { id: 0 }, // Esto es solo referencial para el upsert
      update: {},
      create: {
        nombre: tipo,
        categoriaId: catVidrios.id
      }
    });
  }

  console.log('--- DATOS DE VIDRIOS CARGADOS CON ÉXITO ---');
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());