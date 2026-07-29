import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import { registrarMovimiento } from '../services/inventarioService';
import { importarInventarioExcel } from '../services/importService';
import { organizationMiddleware } from '../middlewares/organizationMiddleware';
import { requireRole } from '../middlewares/roleMiddleware';
import { extraerDatosFactura } from '../services/aiService';
import * as Controller from '../controllers/inventarioController';
import stringSimilarity from 'string-similarity';

const prisma = new PrismaClient();
const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(organizationMiddleware);

const UMBRAL_SIMILITUD = 0.60;

// 🔍 ENDPOINT DE CONSULTA GENERAL DE VARIANTES (Requerido para el Buscador Inteligente de Novedades)
router.get('/', async (req: any, res: Response) => {
    try {
        const orgId = Number(req.organizationId);
        const variantes = await prisma.variante.findMany({
            where: { producto: { organizationId: orgId } },
            include: { 
                producto: { select: { nombre: true } } 
            },
            orderBy: { id: 'desc' }
        });

        return res.status(200).json({
            success: true,
            data: variantes
        });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error al consultar las variantes de inventario', detalle: error.message });
    }
});

// 1. Recepción de documento
router.post('/recepcion-documento', upload.single('archivo'), async (req: any, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se adjuntó archivo" });

        const orgId = Number(req.organizationId);
        const userId = Number(req.user.userId);

        let bodega = await prisma.warehouse.findFirst({
            where: { organizationId: orgId }
        });

        if (!bodega) {
            console.log(`⚠️ Base de datos limpia detectada. Auto-creando bodega principal para la organización ${orgId}...`);
            bodega = await prisma.warehouse.create({
                data: {
                    nombre: "Bodega Principal Bogotá",
                    organizationId: orgId
                }
            });
        }

        const warehouseIdReal = bodega.id;

        const archivoGuardado = await prisma.archivoPendiente.create({
            data: {
                nombre: req.file.originalname,
                nombreOriginal: req.file.originalname,
                mimeType: req.file.mimetype,
                contenido: Buffer.from(req.file.buffer),
                estado: 'PENDIENTE',
                organization: { connect: { id: orgId } }
            }
        });

        const datosExtraidos = await extraerDatosFactura(req.file.buffer);

        let variantesBD = await prisma.variante.findMany({
            where: { producto: { organizationId: orgId } },
            select: { id: true, nombreVariante: true, productoId: true, precio: true, sku: true, stockActual: true }
        });

        let nombresVariantes = variantesBD.map(v => v.nombreVariante);

        for (const item of datosExtraidos.items) {
            try {
                if (!item.descripcion || item.descripcion.trim() === "") continue;

                let mejorCoincidencia = null;
                let varianteEncontrada = null;
                
                if (nombresVariantes.length > 0 && variantesBD.length > 0) {
                    const matches = stringSimilarity.findBestMatch(item.descripcion, nombresVariantes);
                    mejorCoincidencia = matches.bestMatch;
                    
                    if (mejorCoincidencia && mejorCoincidencia.index >= 0 && mejorCoincidencia.index < variantesBD.length) {
                        varianteEncontrada = variantesBD[mejorCoincidencia.index];
                    }
                }

                if (varianteEncontrada && mejorCoincidencia && mejorCoincidencia.rating >= UMBRAL_SIMILITUD) {
                    await registrarMovimiento(
                        orgId,
                        varianteEncontrada.id,
                        item.cantidad,
                        'ENTRADA',
                        userId,
                        warehouseIdReal, 
                        `IA: Factura ${archivoGuardado.id} (Match ${(mejorCoincidencia.rating * 100).toFixed(0)}%)`
                    );
                } else {
                    const nuevoProducto = await prisma.productos.create({
                        data: {
                            nombre: item.descripcion,
                            precio: item.precioUnitario || 0,
                            costo: item.precioUnitario || 0,
                            organization: { connect: { id: orgId } }
                        }
                    });

                    const nuevaVariante = await prisma.variante.create({
                        data: {
                            nombreVariante: item.descripcion,
                            precio: item.precioUnitario || 0,
                            sku: `IA-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                            stockActual: item.cantidad,
                            producto: { connect: { id: nuevoProducto.id } }
                        }
                    });

                    await prisma.loteCompra.create({
                        data: {
                            numeroLote: `LOTE-IA-${Date.now()}`,
                            costoCompra: item.precioUnitario || 0,
                            cantidadInicial: item.cantidad,
                            cantidadActual: item.cantidad,
                            varianteId: nuevaVariante.id,
                            proveedorId: 1
                        }
                    });

                    await registrarMovimiento(
                        orgId,
                        nuevaVariante.id,
                        item.cantidad,
                        'ENTRADA',
                        userId,
                        warehouseIdReal,
                        `IA: Auto-creado desde Factura ${archivoGuardado.id}`
                    );

                    variantesBD.push({ 
                        id: nuevaVariante.id, 
                        nombreVariante: nuevaVariante.nombreVariante, 
                        productoId: nuevaVariante.productoId,
                        precio: nuevaVariante.precio,
                        sku: nuevaVariante.sku,
                        stockActual: nuevaVariante.stockActual
                    });
                    nombresVariantes.push(nuevaVariante.nombreVariante);
                }

            } catch (itemError: any) {
                console.error(`🚨 Error crítico en ítem "${item.descripcion}":`, itemError.message);
            }
        }

        await prisma.archivoPendiente.update({
            where: { id: archivoGuardado.id },
            data: { estado: 'PROCESADO' }
        });

        res.status(201).json({ message: "Documento procesado", datos: datosExtraidos });

    } catch (error: any) {
        res.status(500).json({ error: "Error procesando documento", detalle: error.message });
    }
});

router.get('/buscar', async (req: any, res: Response) => {
    try {
        const orgId = Number(req.organizationId);
        const query = (req.query.q || req.query.query || '').toString().trim();

        const variantes = await prisma.variante.findMany({
            where: {
                producto: { organizationId: orgId },
                OR: [
                    { nombreVariante: { contains: query, mode: 'insensitive' } },
                    { sku: { contains: query, mode: 'insensitive' } },
                    { producto: { nombre: { contains: query, mode: 'insensitive' } } }
                ]
            },
            include: {
                producto: true,
                warehouseStocks: true
            },
            take: 10
        });

        const resultadosFormateados = variantes.map((v: any) => {
            const stockTotal = v.warehouseStocks.length > 0 
                ? v.warehouseStocks.reduce((acc: number, curr: any) => acc + curr.cantidad, 0) 
                : v.stockActual;

            return {
                id: v.id,
                varianteId: v.id,
                nombre: v.producto?.nombre || v.nombreVariante,
                nombreVariante: v.nombreVariante,
                sku: v.sku,
                precio: v.precio,
                stock: stockTotal,
                cantidad: stockTotal
            };
        });

        return res.status(200).json(resultadosFormateados);
    } catch (error: any) {
        return res.status(500).json({ error: 'Error al buscar productos en el POS', detalle: error.message });
    }
});

// 2. Importación y Movimientos
router.post('/importar', requireRole(['ADMIN']), upload.single('archivo'), async (req: any, res: Response) => {
    try {
        if (!req.file) return res.status(400).json({ error: "No se subió archivo" });
        
        const orgId = Number(req.organizationId);
        const userId = Number(req.user.userId);

        const resultado = await importarInventarioExcel(req.file.buffer, userId, orgId);
        return res.status(200).json(resultado);
    } catch (error: any) {
        return res.status(500).json({ error: 'Error en importación', detalle: error.message });
    }
});

router.post('/movimiento', async (req: any, res: Response) => {
    try {
        const { varianteId, cantidad, tipo, warehouseId } = req.body;
        const resultado = await registrarMovimiento(
            Number(req.organizationId), Number(varianteId), Number(cantidad), tipo, Number(req.user.userId), Number(warehouseId), "Movimiento manual"
        );
        res.status(200).json({ message: 'Movimiento registrado', data: resultado });
    } catch (error: any) {
        res.status(500).json({ error: 'Error al registrar', detalle: error.message });
    }
});

router.post('/lotes', async (req: any, res: Response) => {
    try {
        const { varianteId, proveedorId, cantidadInicial, costoUnitario } = req.body;
        const orgId = Number(req.organizationId);

        if (!varianteId || !cantidadInicial || !costoUnitario) {
            return res.status(400).json({ error: "Faltan campos obligatorios" });
        }

        const nuevoLote = await prisma.loteCompra.create({
            data: {
                numeroLote: `LOTE-MANUAL-${Date.now()}`,
                varianteId: Number(varianteId),
                proveedorId: Number(proveedorId || 1),
                cantidadInicial: Number(cantidadInicial),
                cantidadActual: Number(cantidadInicial),
                costoCompra: Number(costoUnitario)
            }
        });

        let bodega = await prisma.warehouse.findFirst({ where: { organizationId: orgId } });
        if (bodega) {
            await prisma.warehouseStock.upsert({
                where: { warehouseId_varianteId: { warehouseId: bodega.id, varianteId: Number(varianteId) } },
                update: { cantidad: { increment: Number(cantidadInicial) } },
                create: { warehouseId: bodega.id, varianteId: Number(varianteId), cantidad: Number(cantidadInicial) }
            });
        }

        return res.status(201).json({ message: "Lote sembrado con éxito en el sistema FIFO", data: nuevoLote });
    } catch (error: any) {
        return res.status(500).json({ error: 'Error al registrar el lote FIFO', detalle: error.message });
    }
});

// 3. Stock y Archivos
router.get('/stock/:warehouseId', async (req: any, res: Response) => {
    try {
        const warehouseId = Number(req.params.warehouseId);
        const stock = await prisma.warehouseStock.findMany({
            where: { warehouseId, warehouse: { organizationId: Number(req.organizationId) } },
            include: { variante: { include: { producto: true } } }
        });
        res.json(stock);
    } catch (error) { 
        res.status(500).json({ error: 'Error al consultar stock' }); 
    }
});

router.get('/archivo/:id', requireRole(['ADMIN']), async (req: any, res: Response) => {
    try {
        const archivo = await prisma.archivoPendiente.findFirst({
            where: { id: Number(req.params.id), organizationId: Number(req.organizationId) }
        });
        if (!archivo) return res.status(404).json({ error: "No encontrado" });
        res.setHeader('Content-Type', archivo.mimeType);
        return res.send(archivo.contenido);
    } catch (error) { 
        return res.status(500).json({ error: 'Error' }); 
    }
});

router.get('/historial', async (req: any, res: any) => {
    try {
        const historial = await Controller.obtenerHistorialMovimientos(req);
        res.json(historial);
    } catch (e: any) { 
        res.status(500).json({ error: 'Error al consultar historial' }); 
    }
});

export default router;