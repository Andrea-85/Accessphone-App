'use client';

import { useState } from 'react';

export default function ImportadorPage() {
  const [archivo, setArchivo] = useState<File | null>(null);
  const [cargando, setCargando] = useState<boolean>(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubirExcel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) return setError('Por favor selecciona un archivo Excel (.xlsx o .csv)[cite: 2].');

    setCargando(true);
    setMensaje(null);
    setError(null);

    try {
      const formData = new FormData();
       formData.append('archivo', archivo);

      const token = localStorage.getItem('accessphone_token');
      const res = await fetch('http://localhost:4000/api/importar/excel', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();

      if (data.success) {
        setMensaje(data.message);
        setArchivo(null);
      } else {
        setError(data.error || 'Error al procesar el archivo Excel[cite: 2].');
      }
    } catch (err) {
      setError('Error de comunicación con el servidor backend.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto font-sans">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-zinc-900">📄 Carga Masiva de Productos (Excel)</h1>
        <p className="text-sm text-zinc-500">Sube tu plantilla de Excel para importar cientos de productos en segundos[cite: 2].</p>
      </div>

      {/* GUÍA DE COLUMNAS REQUERIDAS */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
        <p className="font-bold">📌 Estructura recomendada de las columnas en tu Excel:</p>
        <div className="grid grid-cols-4 gap-2 font-mono bg-white p-2 rounded border border-amber-200 text-center text-[11px]">
          <span className="font-bold">Nombre</span>
          <span className="font-bold">SKU</span>
          <span className="font-bold">Precio</span>
          <span className="font-bold">Stock</span>
        </div>
      </div>

      {/* FORMULARIO DE DEPOSITAR ARCHIVO */}
      <form onSubmit={handleSubirExcel} className="bg-white p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-6">
        <div className="border-2 border-dashed border-zinc-300 rounded-xl p-8 text-center bg-zinc-50 hover:bg-zinc-100/50 transition-colors">
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            onChange={(e) => setArchivo(e.target.files?.[0] || null)}
            className="hidden"
            id="excel-input"
          />
          <label htmlFor="excel-input" className="cursor-pointer block space-y-2">
            <span className="text-3xl block">📁</span>
            <span className="text-sm font-bold text-zinc-700 block">
              {archivo ? archivo.name : 'Haz clic para seleccionar tu archivo Excel (.xlsx)'}
            </span>
            <span className="text-xs text-zinc-400 block">Soporta formatos .xlsx, .xls y .csv[cite: 2]</span>
          </label>
        </div>

        {mensaje && (
          <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl text-sm font-bold text-center">
            🎉 {mensaje}
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-sm font-bold text-center">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={cargando || !archivo}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition shadow-md cursor-pointer"
        >
          {cargando ? 'Procesando archivo...' : '🚀 IMPORTAR PRODUCTOS'}
        </button>
      </form>
    </div>
  );
}