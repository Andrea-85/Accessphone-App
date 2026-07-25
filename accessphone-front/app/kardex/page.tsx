'use client';

import { useState } from 'react';

interface Movimiento {
  id: number;
  cantidad: number;
  tipoMovimiento: string;
  justificacion: string;
  createdAt: string;
  evidenciaUrl?: string;
  usuario: {
    nombre: string;
    email: string;
  };
}

export default function KardexPage() {
  const [varianteId, setVarianteId] = useState<string>('');
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const consultarKardex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!varianteId) return;

    setCargando(true);
    setError(null);

    try {
      const token = localStorage.getItem('accessphone_token');
      const res = await fetch(`http://localhost:4000/api/kardex/variante/${varianteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await res.json();

      if (data.success) {
        setMovimientos(data.data);
      } else {
        setError(data.error || 'No se pudo obtener el historial.');
      }
    } catch (err: any) {
      setError('Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-zinc-900">📊 Kardex de Inventario</h1>
        <p className="text-sm text-zinc-500">Historial inmutable y trazabilidad de movimientos de productos[cite: 1, 2].</p>
      </div>

      {/* FILTRO DE BÚSQUEDA */}
      <form onSubmit={consultarKardex} className="mb-8 bg-white p-4 rounded-xl border border-zinc-200 flex gap-4 items-end">
        <div className="flex-1">
          <label className="block text-xs font-bold text-zinc-600 mb-1">ID de la Variante / SKU</label>
          <input
            type="number"
            value={varianteId}
            onChange={(e) => setVarianteId(e.target.value)}
            placeholder="Ejemplo: 12"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={cargando}
          className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 transition-colors"
        >
          {cargando ? 'Buscando...' : 'Consultar Historial'}
        </button>
      </form>

      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase">
              <th className="p-4">Fecha y Hora</th>
              <th className="p-4">Tipo</th>
              <th className="p-4">Cantidad</th>
              <th className="p-4">Justificación</th>
              <th className="p-4">Responsable</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-xs">
            {movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-zinc-400">
                  Ingresa un ID de variante para desplegar su trazabilidad.
                </td>
              </tr>
            ) : (
              movimientos.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50">
                  <td className="p-4 text-zinc-600 font-mono">
                    {new Date(m.createdAt).toLocaleString('es-CO')}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      m.tipoMovimiento === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' :
                      m.tipoMovimiento === 'SALIDA' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {m.tipoMovimiento}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-zinc-800">{m.cantidad}</td>
                  <td className="p-4 text-zinc-600">{m.justificacion}</td>
                  <td className="p-4 text-zinc-500">{m.usuario?.nombre || 'Sistema'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}