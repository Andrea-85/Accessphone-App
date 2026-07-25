'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface ProductoInventario {
  id: number;
  nombre: string;
  sku: string;
  categoria: string;
  stockActual: number;
  precio: number;
}

export default function InventarioPage() {
  const [productos, setProductos] = useState<ProductoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para subir factura con IA
  const [archivo, setArchivo] = useState<File | null>(null);
  const [procesandoIA, setProcesandoIA] = useState(false);
  const [mensajeIA, setMensajeIA] = useState('');

  const cargarInventario = async () => {
    try {
      const res = await api.get('/api/productos');
      if (res.data?.success) setProductos(res.data.data);
      else if (Array.isArray(res.data)) setProductos(res.data);
    } catch (err) {
      console.error("Error cargando inventario:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarInventario();
  }, []);

  // 🤖 Enviar factura a procesamiento automático con IA
  const handleSubirFactura = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!archivo) return alert('Por favor selecciona una imagen o PDF de la factura.');

    const formData = new FormData();
    formData.append('archivo', archivo);

    try {
      setProcesandoIA(true);
      setMensajeIA('🤖 Procesando factura con IA y actualizando stock...');
      
      const res = await api.post('/procesar-factura', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMensajeIA(`✅ ${res.data.mensaje || 'Mercancía ingresada con éxito'}`);
      setArchivo(null);
      cargarInventario(); // Recargar la lista de stock
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Error al procesar la factura con IA');
      setMensajeIA('');
    } finally {
      setProcesandoIA(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans select-none space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Inventario y Recepción</h1>
          <p className="text-sm text-slate-500">Carga mercancía escaneando facturas con IA o consulta el stock general.</p>
        </div>
      </header>

      {/* 🧾 ZONA DE CARGA DE MERCANCÍA CON IA */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-md border border-slate-800">
        <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
          📄 Ingreso Automático de Mercancía (IA)
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          Sube la foto o PDF de la factura del proveedor. La IA leerá los ítems, cantidades y actualizará el inventario.
        </p>

        <form onSubmit={handleSubirFactura} className="flex flex-col md:flex-row items-center gap-4">
          <input
         type="file"
         accept="image/*,application/pdf"
         capture="environment" // 👈 Activa la cámara trasera en celulares y tablets
        onChange={(e) => setArchivo(e.target.files?.[0] || null)}
         className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-500 file:text-slate-950 hover:file:bg-emerald-400 cursor-pointer"
        />

          <button
            type="submit"
            disabled={procesandoIA || !archivo}
            className="w-full md:w-auto h-11 px-6 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition shadow-sm whitespace-nowrap cursor-pointer"
          >
            {procesandoIA ? 'Procesando...' : '📥 Procesar e Ingresar Stock'}
          </button>
        </form>

        {mensajeIA && (
          <p className="mt-3 text-xs font-bold text-emerald-400 animate-pulse">{mensajeIA}</p>
        )}
      </div>

      {/* 📦 TABLA DE PRODUCTOS EN STOCK */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Stock General de Productos</h2>
        
        {loading ? (
          <p className="text-center text-slate-400 py-8 italic text-sm">Cargando catálogo...</p>
        ) : productos.length === 0 ? (
          <p className="text-center text-slate-400 py-8 italic text-sm">No hay productos registrados en el inventario.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase font-bold text-slate-400">
                  <th className="py-3 px-2">SKU</th>
                  <th className="py-3 px-2">Producto</th>
                  <th className="py-3 px-2">Categoría</th>
                  <th className="py-3 px-2 text-right">Precio Mayor</th>
                  <th className="py-3 px-2 text-center">Stock Actual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-2 font-mono text-xs text-slate-500">{p.sku || `#${p.id}`}</td>
                    <td className="py-3 px-2 font-bold text-slate-900">{p.nombre}</td>
                    <td className="py-3 px-2 text-xs">{p.categoria || 'General'}</td>
                    <td className="py-3 px-2 text-right font-bold text-emerald-600">
                      ${p.precio?.toLocaleString('es-CO')}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                        (p.stockActual || 0) < 5 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {p.stockActual || 0} unid.
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}