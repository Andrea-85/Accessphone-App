'use client';

import { useState, useEffect, useRef } from 'react';
import { api } from '@/services/api';

type TipoNovedadUI = 'AVERIA_PROVEEDOR' | 'DANIO_LOCAL' | 'PERDIDA';

interface Warehouse {
  id: number;
  nombre: string;
}

interface VarianteProducto {
  id: number;
  sku?: string;
  stockActual?: number;
  producto?: {
    nombre: string;
  };
}

export default function ReporteNovedadesPage() {
  const [usuarioActual, setUsuarioActual] = useState<any>(null);
  const [bodegas, setBodegas] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');

  // Estados para el buscador avanzado
  const [variantes, setVariantes] = useState<VarianteProducto[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [varianteId, setVarianteId] = useState<number | ''>('');
  const [productoSeleccionadoTexto, setProductoSeleccionadoTexto] = useState('');
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const [cantidad, setCantidad] = useState<number | ''>('');
  const [tipo, setTipo] = useState<TipoNovedadUI>('DANIO_LOCAL');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  const contenedorRef = useRef<HTMLDivElement>(null);

  // 1. Cargar usuario, bodegas y variantes al iniciar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userRaw = localStorage.getItem('accessphone_user');
      if (userRaw) setUsuarioActual(JSON.parse(userRaw));
    }

    const cargarDatosIniciales = async () => {
      try {
        const resBodegas = await api.get('/api/admin/warehouses');
        const listaBodegas = resBodegas.data?.success ? resBodegas.data.data : Array.isArray(resBodegas.data) ? resBodegas.data : [];
        setBodegas(listaBodegas);
        if (listaBodegas.length > 0) setWarehouseId(listaBodegas[0].id);

        const resVariantes = await api.get('/api/inventario');
        const listaVariantes = resVariantes.data?.success ? resVariantes.data.data : Array.isArray(resVariantes.data) ? resVariantes.data : [];
        setVariantes(listaVariantes);
      } catch (err) {
        console.error("Error al cargar datos iniciales:", err);
      }
    };

    cargarDatosIniciales();

    // Cerrar sugerencias al hacer clic fuera del buscador
    const handleClickFuera = (e: MouseEvent) => {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setMostrarSugerencias(false);
      }
    };
    document.addEventListener('mousedown', handleClickFuera);
    return () => document.removeEventListener('mousedown', handleClickFuera);
  }, []);

  const manejarCambioFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(e.target.files[0]);
    }
  };

  // Filtrar variantes en tiempo real según lo que escriba el usuario (nombre o SKU)
  const variantesFiltradas = variantes.filter((v) => {
    const nombre = (v.producto?.nombre || '').toLowerCase();
    const sku = (v.sku || '').toLowerCase();
    const query = busqueda.toLowerCase();
    return nombre.includes(query) || sku.includes(query);
  });

  const seleccionarVariante = (v: VarianteProducto) => {
    setVarianteId(v.id);
    setProductoSeleccionadoTexto(`${v.producto?.nombre || 'Producto'} (SKU: ${v.sku || 'N/A'})`);
    setBusqueda('');
    setMostrarSugerencias(false);
  };

  const enviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianteId || !cantidad || cantidad <= 0 || !warehouseId) {
      setError('Por favor selecciona una bodega, un producto válido y la cantidad.');
      return;
    }
    if (!foto && tipo === 'AVERIA_PROVEEDOR') {
      setError('🚨 Es obligatorio subir una foto como evidencia para mermas de proveedor.');
      return;
    }

    try {
      setProcesando(true);
      setError('');
      setMensaje('');

      await api.post('/api/novedades', {
        varianteId: Number(varianteId),
        cantidad: Number(cantidad),
        warehouseId: Number(warehouseId),
        tipo,
        descripcion,
        empleadoId: usuarioActual?.id || 1,
        empleadoText: usuarioActual?.nombre || 'Bodeguero Autenticado',
        productoText: productoSeleccionadoTexto,
        foto_url: foto ? `https://supabase.storage/mermas/${foto.name}` : null
      });

      setMensaje('✅ Novedad registrada con éxito. Stock descontado y en revisión gerencial.');
      setVarianteId('');
      setProductoSeleccionadoTexto('');
      setCantidad('');
      setDescripcion('');
      setFoto(null);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Error de conexión con el servidor.');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center p-6 font-sans select-none">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        
        {/* Encabezado */}
        <header className="mb-6 border-b border-slate-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100">
            Control de Mermas y Averías
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-3">Registrar Novedad de Inventario</h1>
          <p className="text-sm text-slate-500 mt-1">
            Garantice la transparencia física del stock. Los ajustes requieren validación digital.
          </p>
        </header>

        {/* Info del Empleado Logueado */}
        <div className="mb-5 bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-xs flex items-center justify-between">
          <div>
            <span className="font-semibold text-amber-800 uppercase block">Reportado Por:</span>
            <span className="text-slate-700 font-bold text-sm mt-0.5 block">
              {usuarioActual?.nombre || 'Usuario Autenticado'}
            </span>
          </div>
          <span className="text-slate-500 font-mono bg-white border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-bold">
            ID: #{usuarioActual?.id || 1}
          </span>
        </div>

        <form onSubmit={enviarReporte} className="space-y-4">
          
          {/* Selector de Bodega Afectada */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Bodega / Ubicación Afectada *</span>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-indigo-500"
            >
              {bodegas.length === 0 ? (
                <option value={1}>Bodega Central (Por defecto)</option>
              ) : (
                bodegas.map((b) => (
                  <option key={b.id} value={b.id}>
                    🏭 {b.nombre}
                  </option>
                ))
              )}
            </select>
          </label>

          {/* BUSCADOR INTELIGENTE / AUTOCOMPLETE (Ideal para miles de productos) */}
          <div className="space-y-1.5 relative" ref={contenedorRef}>
            <span className="text-xs font-bold text-slate-600 uppercase">Buscar Producto / Variante *</span>
            
            {productoSeleccionadoTexto ? (
              <div className="flex items-center justify-between h-10 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-sm font-bold text-emerald-900">
                <span>✨ {productoSeleccionadoTexto}</span>
                <button
                  type="button"
                  onClick={() => { setVarianteId(''); setProductoSeleccionadoTexto(''); }}
                  className="text-xs text-red-600 hover:underline font-bold"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => {
                    setBusqueda(e.target.value);
                    setMostrarSugerencias(true);
                  }}
                  onFocus={() => setMostrarSugerencias(true)}
                  placeholder="Escribe el nombre o SKU para filtrar..."
                  className="w-full h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                />

                {/* Lista flotante de resultados filtrados */}
                {mostrarSugerencias && busqueda.trim() !== '' && (
                  <div className="absolute z-50 left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg">
                    {variantesFiltradas.length === 0 ? (
                      <div className="p-3 text-xs text-slate-400 text-center">No se encontraron productos con ese nombre o SKU.</div>
                    ) : (
                      variantesFiltradas.map((v) => (
                        <div
                          key={v.id}
                          onClick={() => seleccionarVariante(v)}
                          className="px-3 py-2 text-xs hover:bg-indigo-50 cursor-pointer border-b border-slate-100 last:border-none flex justify-between items-center"
                        >
                          <span className="font-bold text-slate-800">{v.producto?.nombre || 'Producto'} <span className="font-normal text-slate-500">(SKU: {v.sku || 'N/A'})</span></span>
                          <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">Stock: {v.stockActual ?? 0}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cantidad Afectada */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Cantidad Afectada *</span>
            <input
              type="number"
              min={1}
              required
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value === '' ? '' : Number(e.target.value))}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
              placeholder="Ej: 5"
            />
          </label>

          {/* Selector de Causa */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Origen o Tipo de Daño</span>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoNovedadUI)}
              className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
            >
              <option value="DANIO_LOCAL">🏢 Daño Físico en Local / Bodega</option>
              <option value="AVERIA_PROVEEDOR">📦 Avería en Contenedor Proveedor (Requiere Foto)</option>
              <option value="PERDIDA">🔍 Descuadrado / Faltante en Conteo</option>
            </select>
          </label>

          {/* Evidencia Fotográfica */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase flex items-center justify-between">
              <span>Captura de Evidencia (Foto)</span>
              {tipo === 'AVERIA_PROVEEDOR' && <span className="text-[10px] text-red-500 font-extrabold font-mono">OBLIGATORIO</span>}
            </span>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 hover:bg-slate-100/70 transition flex flex-col items-center justify-center cursor-pointer relative">
              <input 
                type="file" 
                accept="image/*"
                onChange={manejarCambioFoto}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <span className="text-xs text-slate-500 font-medium text-center">
                {foto ? `📸 Evidencia cargada: ${foto.name}` : 'Haga clic para tomar foto o seleccionar archivo'}
              </span>
            </div>
          </label>

          {/* Justificación */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Descripción de la Novedad</span>
            <textarea
              required
              rows={3}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 outline-none focus:border-indigo-500 resize-none"
              placeholder="Explique claramente qué pasó con el lote..."
            />
          </label>

          {/* Estado */}
          {mensaje && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-bold text-emerald-800">{mensaje}</div>}
          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-800">{error}</div>}

          {/* Botón */}
          <button
            type="submit"
            disabled={procesando}
            className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 transition rounded-xl text-sm font-bold text-white shadow-sm disabled:opacity-40 cursor-pointer mt-2"
          >
            {procesando ? 'Procesando en Servidor...' : 'Guardar y Enviar a Revisión Gerencial'}
          </button>
        </form>
      </div>
    </main>
  );
}