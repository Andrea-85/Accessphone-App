'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { posService, ProductoPOS } from '../services/api';
import { useKeyboardShortcut } from '../hooks/useKeyboardShortcut';

interface ItemCarrito {
  varianteId: number;
  productoId: number;
  sku: string;
  nombre: string;
  cantidad: number;
  precio: number;
  stock: number;
}

type MetodoPagoUI = 'EFECTIVO' | 'TRANSFERENCIA' | 'CARTERA';

const formatoMoneda = (valor: number) =>
  valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function PosPage() {
  const router = useRouter();
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState<ProductoPOS[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [metodoPago, setMetodoPago] = useState<MetodoPagoUI>('EFECTIVO');
  const [clienteId, setClienteId] = useState<number | ''>(1);
  const [warehouseId, setWarehouseId] = useState<number | ''>(1);
  const [buscando, setBuscando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // Cálculo optimizado del total en memoria
  const totalGeneral = useMemo(
    () => carrito.reduce((acc, item) => acc + item.precio * item.cantidad, 0),
    [carrito],
  );

  // Inyección de productos al carrito controlando topes de stock por lote
  const agregarAlCarrito = useCallback((producto: ProductoPOS) => {
    if (producto.stockTotal <= 0) {
      setError('Este producto no tiene stock disponible en la bodega seleccionada.');
      return;
    }

    setMensaje('');
    setError('');
    setCarrito((prev) => {
      const existe = prev.find((item) => item.varianteId === producto.varianteId);
      if (existe) {
        return prev.map((item) =>
          item.varianteId === producto.varianteId
            ? { ...item, cantidad: Math.min(item.cantidad + 1, item.stock) }
            : item,
        );
      }

      return [
        ...prev,
        {
          varianteId: producto.varianteId,
          productoId: producto.productoId,
          sku: producto.sku,
          nombre: producto.descripcion,
          cantidad: 1,
          precio: producto.precioVenta,
          stock: producto.stockTotal,
        },
      ];
    });
    setBusqueda('');
    setResultados([]);
  }, []);

  // Blindaje de sesión: Ruta protegida en Frontend
  useEffect(() => {
    const token = localStorage.getItem('accessphone_token');
    if (!token) router.push('/login');
  }, [router]);

  // Motor de Debounce: Evita re-peticiones inútiles al inventario mientras se escribe
  useEffect(() => {
    const termino = busqueda.trim();
    if (termino.length < 2) return;

    const timer = window.setTimeout(async () => {
      try {
        setBuscando(true);
        setError('');
        const idBodega = warehouseId || 1;
        const data = await posService.buscarProductos(termino, idBodega);
        setResultados(data);
      } catch (err: unknown) {
        setResultados([]);
        setError(err instanceof Error ? err.message : 'No se pudo buscar inventario.');
      } finally {
        setBuscando(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [busqueda, warehouseId]);

  // 2. Control de Selección Rápida en Resultados (Flechas / Enter directo)
  useEffect(() => {
    const manejarFocoBuscador = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault(); // Evita que el navegador haga otra acción
        const input = document.getElementById('busqueda-pos');
        input?.focus();
      }
    };

    window.addEventListener('keydown', manejarFocoBuscador);
    return () => window.removeEventListener('keydown', manejarFocoBuscador);
  }, []);

  // 3. Atajo Ctrl + Enter: Cierre de Factura Inmediato (El botón verde sin soltar el teclado)
  useEffect(() => {
    const manejarCierreFactura = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        if (carrito.length > 0 && !procesando && totalGeneral > 0) {
          e.preventDefault();
          registrarFacturaPOS();
        }
      }
    };

    window.addEventListener('keydown', manejarCierreFactura);
    return () => window.removeEventListener('keydown', manejarCierreFactura);
  }, [carrito, procesando, totalGeneral]);

  // 4. Controladores de cantidades en la lista de despacho
  const cambiarCantidad = (varianteId: number, cantidad: number) => {
    setCarrito((prev) =>
      prev
        .map((item) =>
          item.varianteId === varianteId
            ? { ...item, cantidad: Math.max(1, Math.min(cantidad, item.stock)) }
            : item,
        )
        .filter((item) => item.cantidad > 0),
    );
  };

  const quitarItem = (varianteId: number) => {
    setCarrito((prev) => prev.filter((item) => item.varianteId !== varianteId));
  };

  // Cierre de Venta con Transaccionalidad Segura
  const registrarFacturaPOS = async () => {
    if (procesando || carrito.length === 0) return;

    try {
      setProcesando(true);
      setMensaje('');
      setError('');

      const metodoBaseDatos = metodoPago === 'CARTERA' ? 'CREDITO' : metodoPago;
      const resultado = await posService.crearVenta({
        clienteId: clienteId || 1,
        warehouseId: warehouseId || 1,
        total: totalGeneral,
        items: carrito.map((item) => ({
          productoId: item.productoId,
          varianteId: item.varianteId,
          cantidad: item.cantidad,
          precioUnitario: item.precio,
        })),
        payments: [
          {
            monto: totalGeneral,
            metodo: metodoBaseDatos,
            referencia: metodoPago === 'TRANSFERENCIA' ? `POS-${Date.now()}` : null,
          },
        ],
      });

      setMensaje(`Venta #${resultado.ventaId || resultado.venta?.id || resultado.id} registrada con éxito.`);
      setCarrito([]);
      setMetodoPago('EFECTIVO');
    } catch (err: unknown) {
      const apiError = err as { response?: { data?: { error?: string; message?: string } }; message?: string };
      setError(apiError.response?.data?.error || apiError.response?.data?.message || apiError.message || 'No se pudo registrar la venta.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-100 text-zinc-950 select-none">
      <section className="grid min-h-screen grid-cols-1 lg:grid-cols-[1fr_420px]">
        
        {/* PANEL IZQUIERDO: BUSCADOR Y CATÁLOGO DE VARIANTES */}
        <div className="flex flex-col gap-5 p-4 sm:p-6">
          <header className="flex flex-col gap-4 border-b border-zinc-200 pb-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Accessphone</p>
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Punto de Venta</h1>
              <p className="text-sm text-zinc-500">Módulo transaccional con asignación FIFO y control de Cartera.</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500">Cliente ID</span>
                <input
                  type="number"
                  min={1}
                  disabled={procesando}
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-10 w-28 rounded border border-zinc-300 bg-white px-3 font-semibold outline-none focus:border-blue-600 disabled:opacity-50"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-bold uppercase text-zinc-500">Bodega ID</span>
                <input
                  type="number"
                  min={1}
                  disabled={procesando}
                  value={warehouseId}
                  onChange={(e) => setWarehouseId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="h-10 w-28 rounded border border-zinc-300 bg-white px-3 font-semibold outline-none focus:border-blue-600 disabled:opacity-50"
                />
              </label>
            </div>
          </header>

          <div className="grid gap-3">
            <label htmlFor="busqueda-pos" className="text-xs font-bold uppercase text-zinc-500">
              Buscar por nombre, SKU o accesorio variante
            </label>
            <input
              id="busqueda-pos"
              type="search"
              autoFocus
              disabled={procesando}
              value={busqueda}
              onChange={(e) => {
                const valor = e.target.value;
                setBusqueda(valor);
                if (valor.trim().length < 2) setResultados([]);
              }}
              placeholder="Ej: vidrio, cargador, VID-CER-IP15"
              className="h-12 rounded border border-zinc-300 bg-white px-4 text-base font-semibold shadow-sm outline-none focus:border-blue-600 disabled:opacity-50"
            />
          </div>

          {mensaje && <div className="rounded border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">{mensaje}</div>}
          {error && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700">{error}</div>}

          <div className="grid flex-1 content-start gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black uppercase text-zinc-600">Resultados de Inventario</h2>
              <span className="text-xs font-semibold text-zinc-500">{buscando ? 'Consultando bodega...' : `${resultados.length} variantes encontradas`}</span>
            </div>

            {resultados.length === 0 ? (
              <div className="grid min-h-64 place-items-center rounded border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
                Escribe al menos 2 caracteres para interrogar al stock FIFO en tiempo real.
              </div>
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {resultados.map((producto) => (
                  <button
                    key={producto.varianteId}
                    type="button"
                    onClick={() => agregarAlCarrito(producto)}
                    disabled={producto.stockTotal <= 0 || procesando}
                    className="min-h-36 rounded border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-55"
                  >
                    <span className="text-xs font-bold uppercase text-blue-700">{producto.sku || `VAR-${producto.varianteId}`}</span>
                    <h3 className="mt-2 line-clamp-2 text-base font-black">{producto.descripcion}</h3>
                    <div className="mt-4 flex items-end justify-between gap-3">
                      <p className="text-xl font-black">{formatoMoneda(producto.precioVenta)}</p>
                      <p className="rounded bg-zinc-100 px-2 py-1 text-xs font-bold text-zinc-700">Lote: {producto.stockTotal} u.</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <footer className="flex gap-4 text-xs font-mono text-zinc-400 border-t border-zinc-200 pt-3">
            <div><span className="bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-700 font-bold mr-1">F2</span> Enfocar Buscador</div>
            <div><span className="bg-zinc-200 px-1.5 py-0.5 rounded text-zinc-700 font-bold mr-1">Enter</span> Agregar Variante Directa</div>
          </footer>
        </div>

        {/* PANEL DERECHO: LISTA DE FACTURACIÓN Y PASARELA */}
        <aside className="flex min-h-[540px] flex-col border-l border-zinc-200 bg-white p-4 shadow-xl sm:p-6">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
            <div>
              <h2 className="text-xl font-black">Despacho de Venta</h2>
              <p className="text-sm text-zinc-500">{carrito.length} líneas cargadas</p>
            </div>
            <button
              type="button"
              onClick={() => setCarrito([])}
              disabled={carrito.length === 0 || procesando}
              className="rounded border border-zinc-300 px-3 py-2 text-sm font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
            >
              Limpiar Todo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {carrito.length === 0 ? (
              <div className="grid h-full place-items-center text-center text-sm text-zinc-400">
                El carrito de despacho está vacío.
              </div>
            ) : (
              <div className="grid gap-3">
                {carrito.map((item) => (
                  <div key={item.varianteId} className="rounded border border-zinc-200 bg-zinc-50/50 p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="w-2/3">
                        <p className="text-sm font-black truncate">{item.nombre}</p>
                        <p className="mt-1 text-xs font-semibold text-zinc-500">SKU: {item.sku} • Stock Bodega: {item.stock} u.</p>
                      </div>
                      <button
                        type="button"
                        disabled={procesando}
                        onClick={() => quitarItem(item.varianteId)}
                        className="rounded border border-zinc-300 bg-white px-2 py-1 text-xs font-bold text-zinc-600 transition hover:bg-zinc-100 disabled:opacity-50"
                      >
                        Quitar
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <input
                        type="number"
                        min={1}
                        max={item.stock}
                        disabled={procesando}
                        value={item.cantidad}
                        onChange={(e) => cambiarCantidad(item.varianteId, Number(e.target.value) || 1)}
                        className="h-9 w-20 rounded border border-zinc-300 bg-white px-2 text-center font-bold outline-none focus:border-blue-600 disabled:opacity-50"
                      />
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">{formatoMoneda(item.precio)} c/u</p>
                        <p className="font-black text-zinc-900">{formatoMoneda(item.precio * item.cantidad)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LIQUIDACIÓN FINANCIERA */}
          <div className="border-t border-zinc-200 pt-4">
            <div className="mb-4 grid gap-2">
              <p className="text-xs font-bold uppercase text-zinc-500">Método de Asignación Contable</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['EFECTIVO', '💵 Caja'],
                  ['TRANSFERENCIA', '🏦 Banco'],
                  ['CARTERA', '📈 Crédito'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    disabled={procesando}
                    onClick={() => setMetodoPago(id as MetodoPagoUI)}
                    className={`rounded border px-2 py-2.5 text-xs font-black transition ${
                      metodoPago === id 
                        ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm' 
                        : 'border-zinc-300 text-zinc-700 hover:bg-zinc-50'
                    } disabled:opacity-50`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between text-2xl font-black border-t border-dashed pt-3 text-zinc-900">
              <span>Total Neto:</span>
              <span className="text-blue-700">{formatoMoneda(totalGeneral)}</span>
            </div>

            <button
              type="button"
              onClick={registrarFacturaPOS}
              disabled={carrito.length === 0 || procesando || totalGeneral <= 0}
              className={`mt-4 h-12 w-full rounded font-black text-white shadow-md transition ${
                procesando 
                  ? 'bg-zinc-400 cursor-not-allowed' 
                  : 'bg-green-600 hover:bg-green-700 active:scale-[0.98]'
              } disabled:bg-zinc-300 disabled:cursor-not-allowed disabled:shadow-none`}
            >
              {procesando ? 'Procesando Algoritmo FIFO...' : 'Confirmar Factura'}
            </button>
          </div>
        </aside>

      </section>
    </main>
  );
}