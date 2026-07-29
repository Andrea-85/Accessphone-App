'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { api } from '@/services/api';

export default function PedidosPage() {
  const searchParams = useSearchParams();
  const origen = searchParams.get('origen') || 'WHATSAPP';
  const estado = searchParams.get('estado') || 'PENDIENTE_PAGO';

  const [pedidos, setPedidos] = useState<any[]>([]);
  const [cargando,setCargando] = useState(true);

  useEffect(() => {
    async function cargarPedidos() {
      try {
        setCargando(true);
        // Llamamos al endpoint del backend que trae los pedidos filtrados
      const res = await api.get(`http://localhost:4000/api/ventas/whatsapp/pendientes?estado=${estado}`);
        if (res.data && res.data.success) {
          setPedidos(res.data.data);
        }
      } catch (err) {
        console.error("Error al cargar la cola de despacho:", err);
      } finally {
        setCargando(false);
      }
    }
    cargarPedidos();
  }, [estado]);

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-sm font-bold text-zinc-500 animate-pulse">Cargando cola de despacho...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-800 p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <span className="text-xs font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
            Módulo Logístico y Operativo
          </span>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 mt-2">Cola de Despacho ({origen})</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Órdenes filtradas por estado: <span className="font-bold text-zinc-700">{estado}</span>
          </p>
        </header>

        {pedidos.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border border-zinc-200 text-center text-zinc-400 font-medium">
            No hay órdenes pendientes bajo este criterio en la bodega.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold bg-zinc-100 text-zinc-700 px-2.5 py-1 rounded font-mono">
                      Orden #{pedido.id}
                    </span>
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                      ${Number(pedido.total || 0).toLocaleString('es-CO')} COP
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-2">
                    Registrado el: {new Date(pedido.fecha).toLocaleString()}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800">
                    {pedido.estado}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}