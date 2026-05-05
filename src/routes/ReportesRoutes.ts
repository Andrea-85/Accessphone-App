// POST para crear reporte
router.post('/reportes', async (req: Request, res: Response) => {
  try {
    const { empleado, producto, tipo, descripcion, foto_url } = req.body;

    if (!empleado || !producto || !tipo) {
      return res.status(400).json({ error: "Faltan datos requeridos" });
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
    res.status(400).json({ error: "Error al guardar: " + error.message });
  }
});

// GET para obtener todos los reportes
router.get('/reportes', async (req: Request, res: Response) => {
  try {
    const reportes = await prisma.reportes_novedad.findMany({
      orderBy: { fecha: 'desc' }
    });
    res.json(reportes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// GET para buscar reportes por producto
router.get('/reportes/buscar/:producto', async (req: Request, res: Response) => {
  try {
    const { producto } = req.params;
    const reportes = await prisma.reportes_novedad.findMany({
      where: {
        producto: {
          contains: producto,
          mode: 'insensitive'
        }
      },
      orderBy: { fecha: 'desc' }
    });
    res.json(reportes);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});