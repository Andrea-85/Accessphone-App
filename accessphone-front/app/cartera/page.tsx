'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface CuentaPendiente {
  id: number;
  clienteNombre: string;
  telefono: string;
  montoPendiente: number;
  diasMora: number;
}

export default function CarteraPage() {
  const [cartera, setCartera] = useState<CuentaPendiente[]>([]);
  const [loading, setLoading] = useState(true);
  const [cobrando, setCobrando] = useState(false);

  const cargarCartera = async () => {
    try {
      const res = await api.get('/api/cartera/pendientes');
      if (res.data?.success) setCartera(res.data.data);
      else if (Array.isArray(res.data)) setCartera(res.data);
    } catch (err) {
      console.error("Error cargando cartera:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarCartera();
  }, []);

  // 🔔 Disparar cobranza automática por WhatsApp a todos los deudores
  const handleCobranzaAutomatica = async () => {
    try {
      setCobrando(true);
      await api.post('/api/cartera/cobranza-automatica');
      alert("📲 Recordatorios de cobro enviados por WhatsApp exitosamente.");
    } catch (err) {
      alert("Error al ejecutar el proceso de cobranza.");
    } finally {
      setCobrando(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans select-none space-y-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Cartera y Cobranzas</h1>
          <p className="text-sm text-slate-500">Control de créditos otorgados y cobranza asistida por WhatsApp.</p>
        </div>

        <button
          onClick={handleCobranzaAutomatica}
          disabled={cobrando}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-sm flex items-center justify-center gap-2"
        >
          {cobrando ? 'Enviando Mensajes...' : '📲 Notificar Cobros por WhatsApp'}
        </button>
      </header>

      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Cuentas por Cobrar Pendientes</h2>

        {loading ? (
          <p className="text-center py-8 text-slate-400 italic text-sm">Cargando cartera...</p>
        ) : cartera.length === 0 ? (
          <p className="text-center py-8 text-slate-400 italic text-sm">No hay saldo pendiente por cobrar en este momento. ¡Al día!</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {cartera.map((item) => (
              <div key={item.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900">{item.clienteNombre}</h3>
                  <p className="text-xs text-slate-400 font-mono">Tel: {item.telefono} | Días de mora: <span className="text-rose-600 font-bold">{item.diasMora} días</span></p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-400">Monto Pendiente</p>
                  <p className="text-lg font-black text-rose-600">${item.montoPendiente?.toLocaleString('es-CO')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}