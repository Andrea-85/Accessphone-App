import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Inyectando stock inicial de prueba en PostgreSQL...');

  // 1. Buscamos la única variante que tienes (la pantalla Samsung A15)
  const variante = await prisma.variante.findFirst();

  if (!variante) {
    console.error('❌ No se encontró ninguna variante en la base de datos. ¡Primero debes tener la variante creada!');
    return;
  }

  console.log(`📦 Variante encontrada: ${variante.nombreVariante} (ID: ${variante.id})`);

  // 2. Buscamos o creamos la bodega amarrada a la organización 1
  let bodega = await prisma.warehouse.findFirst({
    where: { nombre: 'Bodega Principal Mayorista' }
  });

  if (!bodega) {
    bodega = await prisma.warehouse.create({
      data: {
        nombre: 'Bodega Principal Mayorista',
        organizationId: 1 // 🏢 El campo obligatorio que faltaba
      } as any
    });
  }

  console.log(`🏢 Bodega lista: ${bodega.nombre} (ID: ${bodega.id})`);

  // 3. Inyectamos o actualizamos el stock
  const stockExistente = await prisma.warehouseStock.findFirst({
    where: {
      warehouseId: bodega.id,
      varianteId: variante.id
    }
  });

  if (stockExistente) {
    await prisma.warehouseStock.update({
      where: { id: stockExistente.id },
      data: { cantidad: 50 }
    });
  } else {
    await prisma.warehouseStock.create({
      data: {
        warehouseId: bodega.id,
        varianteId: variante.id,
        cantidad: 50,
        stockMinimo: 10,
        stockMaximo: 100,
      }
    });
  }

  // 4. Inyectamos el lote de compra requerido por tu lógica FIFO
  await (prisma as any).loteCompra.create({
    data: {
      varianteId: variante.id,
      cantidadActual: 50,
      cantidadInicial: 50,
      costoUnitario: 100000,
    },
  });

  console.log('✅ ¡Stock y Lote de prueba inyectados con éxito absoluto en la base de datos!');
}

main()
  .catch((e) => {
    console.error('🚨 Error al inyectar datos:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });