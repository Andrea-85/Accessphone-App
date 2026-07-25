'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';

type TipoNovedadUI = 'AVERIA_PROVEEDOR' | 'DANIO_LOCAL' | 'PERDIDA';

interface Warehouse {
  id: number;
  nombre: string;
}

export default function ReporteNovedadesPage() {
  // Datos del usuario extraídos de la sesión real
  const [usuarioActual, setUsuarioActual] = useState<any>(null);

  // Lista de Bodegas registradas
  const [bodegas, setBodegas] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | ''>('');

  const [varianteId, setVarianteId] = useState<number | ''>('');
  const [cantidad, setCantidad] = useState<number | ''>('');
  const [tipo, setTipo] = useState<TipoNovedadUI>('DANIO_LOCAL');
  const [descripcion, setDescripcion] = useState('');
  const [foto, setFoto] = useState<File | null>(null);
  
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');

  // 1. Cargar usuario en sesión y lista de bodegas
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userRaw = localStorage.getItem('accessphone_user');
      if (userRaw) setUsuarioActual(JSON.parse(userRaw));
    }

    const cargarBodegas = async () => {
      try {
        const res = await api.get('/api/admin/warehouses');
        const lista = res.data?.success ? res.data.data : Array.isArray(res.data) ? res.data : [];
        setBodegas(lista);
        if (lista.length > 0) setWarehouseId(lista[0].id);
      } catch (err) {
        console.error("Error al cargar bodegas para novedades:", err);
      }
    };

    cargarBodegas();
  }, []);

  const manejarCambioFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFoto(e.target.files[0]);
    }
  };

  const enviarReporte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianteId || !cantidad || cantidad <= 0 || !warehouseId) {
      setError('Por favor completa la bodega, ID de variante válido y la cantidad.');
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

      // Envío centralizado con Axios api
      await api.post('/api/novedades', {
        varianteId: Number(varianteId),
        cantidad: Number(cantidad),
        warehouseId: Number(warehouseId),
        tipo,
        descripcion,
        empleadoId: usuarioActual?.id || 1,
        empleadoText: usuarioActual?.nombre || 'Bodeguero Autenticado',
        productoText: `Variante ID #${varianteId}`,
        foto_url: foto ? `https://supabase.storage/mermas/${foto.name}` : null
      });

      setMensaje('✅ Novedad registrada con éxito. Stock descontado y en revisión gerencial.');
      setVarianteId('');
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

          {/* Fila de Datos Técnicos */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-600 uppercase">ID Variante Producto</span>
              <input
                type="number"
                min={1}
                required
                value={varianteId}
                onChange={(e) => setVarianteId(e.target.value === '' ? '' : Number(e.target.value))}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500"
                placeholder="Ej: 42"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-bold text-slate-600 uppercase">Cantidad Afectada</span>
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
          </div>

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