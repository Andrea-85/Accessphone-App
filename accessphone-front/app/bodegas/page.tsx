'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface Warehouse {
  id: number;
  nombre: string;
  direccion?: string;
  ciudad?: string;
}

export default function BodegasPage() {
  const [bodegas, setBodegas] = useState<Warehouse[]>([]);
  const [cargando, setCargando] = useState(true);
  
  // Campos de formulario libre
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('Bogotá');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const cargarBodegas = async () => {
    try {
      setCargando(true);
      const res = await api.get('/api/admin/warehouses');
      if (res.data?.success) setBodegas(res.data.data);
      else if (Array.isArray(res.data)) setBodegas(res.data);
    } catch (err) {
      console.error("Error al cargar bodegas:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarBodegas();
  }, []);

  const handleCrearBodega = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return alert("Por favor ingresa un nombre para la bodega.");

    try {
      setGuardando(true);
      await api.post('/api/admin/warehouses', {
        nombre,
        direccion,
        ciudad
      });

      setMensaje(`✅ Bodega "${nombre}" creada correctamente.`);
      setNombre('');
      setDireccion('');
      cargarBodegas();
      setTimeout(() => setMensaje(''), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error al registrar la bodega.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans select-none space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">Gestión de Bodegas y Sedes</h1>
        <p className="text-sm text-slate-500">Crea libremente las ubicaciones físicas donde se almacena o vende mercancía.</p>
      </header>

      {mensaje && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold rounded-xl text-sm">
          {mensaje}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* FORMULARIO DE BODEGA LIBRE */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Nueva Bodega / Punto</h2>
          
          <form onSubmit={handleCrearBodega} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Nombre de la Bodega *</label>
              <input
                type="text"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Bodega Central Calle 10 / Vitrina Local 102"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm font-semibold outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Dirección Físicas (Opcional)</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Ej: Cra 10 # 12-45"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1">Ciudad</label>
              <input
                type="text"
                value={ciudad}
                onChange={(e) => setCiudad(e.target.value)}
                placeholder="Bogotá"
                className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={guardando}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl text-sm transition cursor-pointer"
            >
              {guardando ? 'Guardando...' : '➕ Registrar Bodega'}
            </button>
          </form>
        </div>

        {/* TABLA DE BODEGAS REGISTRADAS */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-4">Bodegas de la Empresa</h2>

          {cargando ? (
            <p className="text-center py-8 text-slate-400 italic text-sm">Consultando ubicaciones...</p>
          ) : bodegas.length === 0 ? (
            <p className="text-center py-8 text-slate-400 italic text-sm">No hay bodegas registradas. Agrega la primera arriba.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {bodegas.map((b) => (
                <div key={b.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">🏭 {b.nombre}</p>
                    <p className="text-xs text-slate-400">{b.direccion || 'Sin dirección especificada'} - {b.ciudad || 'Bogotá'}</p>
                  </div>
                  <span className="text-xs font-mono font-bold bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md">
                    ID: #{b.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}