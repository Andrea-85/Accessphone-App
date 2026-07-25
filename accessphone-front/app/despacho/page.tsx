'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api'; 

interface ItemPedido {
  varianteId: number;
  nombre: string;
  cantidad: number;
  sku: string;
}

interface PedidoDespacho {
  id: number;
  clienteNombre: string;
  origen: 'WHATSAPP' | 'POS';
  total: number;
  items: ItemPedido[];
  fecha: string;
}

const formatoMoneda = (valor: number) =>
  valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function DespachoPage() {
  const [pedidos, setPedidos] = useState<PedidoDespacho[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const cargarPedidosPendientes = async () => {
    try {
      setError('');
      const respuesta = await api.get('/api/pedidos/pendientes');
      setPedidos(respuesta.data);
    } catch (err: any) {
      console.error("Error consultando cola logistica:", err);
      setError('Error al conectar con la cola de despacho.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedidosPendientes();
    const interval = setInterval(cargarPedidosPendientes, 15000);
    return () => clearInterval(interval);
  }, []);

  const marcarComoDespachado = async (pedidoId: number) => {
    try {
      await api.put(`/api/pedidos/${pedidoId}/despachar`);
      setPedidos((prev) => prev.filter((p) => p.id !== pedidoId));
    } catch (err) {
      alert('No se pudo actualizar el estado del despacho en el servidor.');
    }
  };

  return (
    // CORRECCIÓN: Fondo claro y descansado (bg-zinc-50) con texto oscuro suave (text-zinc-800)
    <main className="min-h-screen bg-zinc-50 p-4 text-zinc-800 sm:p-6 select-none">
      
      {/* HEADER ERGONÓMICO */}
      <header className="mb-6 border-b border-zinc-200 pb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Módulo de Logística</p>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900">Cola de Despacho Express</h1>
          <p className="text-sm text-zinc-500">Pedidos consolidados por el Agente de IA y Ventas Físicas.</p>
        </div>
        <button 
          onClick={cargarPedidosPendientes}
          className="rounded-lg bg-white px-4 py-2 text-sm font-bold border border-zinc-300 text-zinc-700 hover:bg-zinc-100 transition shadow-sm"
        >
          🔄 Sincronizar Fila
        </button>
      </header>

      {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-600">{error}</div>}

      {cargando ? (
        <div className="text-center text-zinc-400 font-bold mt-12">Interrogando cola de empaque...</div>
      ) : pedidos.length === 0 ? (
        <div className="grid min-h-64 place-items-center rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-400">
          <div>
            <p className="text-lg font-bold text-zinc-700">Bodega al día 🚀</p>
            <p className="text-sm text-zinc-500 mt-1">No hay mercancía pendiente de empaque en este momento.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pedidos.map((pedido) => (
            // CORRECCIÓN: Tarjetas blancas con bordes sutiles y sombras suaves para evitar el contraste agresivo
            <div key={pedido.id} className="flex flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div>
                <div className="flex items-start justify-between border-b border-zinc-100 pb-3">
                  <div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-black ${
                      pedido.origen === 'WHATSAPP' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {pedido.origen}
                    </span>
                    <h2 className="mt-2 text-lg font-black text-zinc-900 truncate">{pedido.clienteNombre}</h2>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Orden ID</p>
                    <p className="font-mono font-bold text-zinc-600">#{pedido.id}</p>
                  </div>
                </div>

                {/* DETALLE DE MERCANCÍA */}
                <div className="py-4">
                  <p className="text-xs font-bold uppercase text-zinc-400 mb-2 tracking-wider">Productos a Empacar:</p>
                  <div className="grid gap-2">
                    {pedido.items.map((item, idx) => (
                      // CORRECCIÓN: Filas de productos en gris ultra-claro descansado
                      <div key={idx} className="flex items-center justify-between rounded-lg bg-zinc-50 px-3 py-2 border border-zinc-100">
                        <div>
                          <p className="text-sm font-bold text-zinc-800">{item.nombre}</p>
                          <p className="text-xs font-mono text-zinc-400">SKU: {item.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-emerald-600">x{item.cantidad}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ACCIÓN DE CIERRE */}
              <div className="border-t border-zinc-100 pt-3 mt-2 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs text-zinc-400">Valor Declarado</p>
                  <p className="text-base font-bold text-zinc-700">{formatoMoneda(pedido.total)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => marcarComoDespachado(pedido.id)}
                  // CORRECCIÓN: Botón con un esmeralda menos chillón y texto blanco para perfecta lectura clara
                  className="h-11 px-6 rounded-lg bg-emerald-600 font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-[0.98] transition flex items-center gap-2"
                >
                  📦 Empacado y Listo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}