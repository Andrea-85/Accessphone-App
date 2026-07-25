'use client';

import { useState, useEffect } from 'react';

interface Proveedor {
  id: number;
  nombre: string;
  nit?: string;
  telefono?: string;
  email?: string;
  direccion?: string;
}

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [mostrarModal, setMostrarModal] = useState<boolean>(false);
  
  // Formulario
  const [nombre, setNombre] = useState('');
  const [nit, setNit] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarProveedores = async () => {
    try {
      const token = localStorage.getItem('accessphone_token');
      const res = await fetch('http://localhost:4000/api/proveedores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setProveedores(data.data);
    } catch (e) {
      console.error("Error al cargar proveedores:", e);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProveedores();
  }, []);

  const handleCrearProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return alert("El nombre es obligatorio.");

    try {
      setGuardando(true);
      const token = localStorage.getItem('accessphone_token');
      const res = await fetch('http://localhost:4000/api/proveedores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nombre, nit, telefono, email, direccion })
      });

      const data = await res.json();
      if (data.success) {
        setMostrarModal(false);
        setNombre(''); setNit(''); setTelefono(''); setEmail(''); setDireccion('');
        cargarProveedores();
      } else {
        alert(data.error || "Error al crear proveedor.");
      }
    } catch (e) {
      alert("Error de comunicación con el servidor.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-black text-zinc-900">🏭 Directorio de Proveedores</h1>
          <p className="text-sm text-zinc-500">Gestión de fabricantes, distribuidores e importadores mayoristas.</p>
        </div>
        <button
          onClick={() => setMostrarModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition shadow-sm cursor-pointer"
        >
          + Nuevo Proveedor
        </button>
      </div>

      {/* TABLA DE PROVEEDORES */}
      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 uppercase">
              <th className="p-4">Razón Social / Nombre</th>
              <th className="p-4">NIT / Identificación</th>
              <th className="p-4">Contacto (Tel/WhatsApp)</th>
              <th className="p-4">Correo Electrónico</th>
              <th className="p-4">Dirección</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-xs">
            {cargando ? (
              <tr><td colSpan={5} className="p-8 text-center text-zinc-400">Cargando directorio...</td></tr>
            ) : proveedores.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-zinc-400">No hay proveedores registrados aún.</td></tr>
            ) : (
              proveedores.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="p-4 font-bold text-zinc-800">{p.nombre}</td>
                  <td className="p-4 font-mono text-zinc-600">{p.nit || 'N/A'}</td>
                  <td className="p-4 text-zinc-600">{p.telefono || 'Sin registro'}</td>
                  <td className="p-4 text-zinc-600">{p.email || 'Sin registro'}</td>
                  <td className="p-4 text-zinc-500">{p.direccion || 'N/A'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR PROVEEDOR */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-md w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">Registrar Nuevo Proveedor</h3>
            <form onSubmit={handleCrearProveedor} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nombre / Razón Social *</label>
                <input
                  type="text" required value={nombre} onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Mayorista Tech China Ltd"
                  className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">NIT / RUT</label>
                  <input
                    type="text" value={nit} onChange={(e) => setNit(e.target.value)}
                    placeholder="900123456-1"
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-600 block mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="text" value={telefono} onChange={(e) => setTelefono(e.target.value)}
                    placeholder="3101234567"
                    className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Correo Electrónico</label>
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="ventas@proveedor.com"
                  className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Dirección / Bodega</label>
                <input
                  type="text" value={direccion} onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Calle 13 # 15-20, Bogotá"
                  className="w-full h-9 rounded-xl border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button" onClick={() => setMostrarModal(false)}
                  className="flex-1 h-10 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={guardando}
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                >
                  {guardando ? 'Guardando...' : 'Guardar Proveedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}