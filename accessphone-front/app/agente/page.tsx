'use client';

import React, { useState, useEffect } from 'react';
import { api, adminService } from '@/services/api';

interface ConversacionAgente {
  id: number;
  clienteNombre: string;
  telefono: string;
  ultimoMensaje: string;
  modoAtencion: 'IA' | 'HUMANO';
  estadoIA: 'PROCESANDO' | 'ESPERANDO_APROBACION' | 'RESPONDIDO' | 'INTERVENCION_HUMANA';
  propuestaVenta?: {
    total: number;
    itemsCount: number;
  };
}

export default function AgenteMonitoreoPage() {
  const [conversaciones, setConversaciones] = useState<ConversacionAgente[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar las conversaciones activas del agente de WhatsApp
  const cargarChats = async () => {
    try {
      const respuesta = await api.get('/api/admin/agente/conversaciones');
      if (respuesta.data && respuesta.data.success) {
        setConversaciones(respuesta.data.data);
      }
    } catch (error) {
      console.error("Error cargando logs del agente:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarChats();
    // Polling en tiempo real cada 5 segundos
    const intervalo = setInterval(cargarChats, 5000); 
    return () => clearInterval(intervalo);
  }, []);

  // Función Human-in-the-Loop: Cambiar entre IA y Asesor Humano
  const handleCambiarModoAtencion = async (clienteId: number, modoActual: 'IA' | 'HUMANO') => {
    const nuevoModo = modoActual === 'IA' ? 'HUMANO' : 'IA';
    try {
      await adminService.cambiarModoAtencion(clienteId, nuevoModo);
      // Actualizamos inmediatamente el estado local
      setConversaciones(prev =>
        prev.map(c => c.id === clienteId ? { ...c, modoAtencion: nuevoModo } : c)
      );
    } catch (error) {
      alert("Error al actualizar el modo de atención");
    }
  };

  const aprobarPropuestaVenta = async (id: number) => {
    try {
      await api.post(`/api/agente/conversaciones/${id}/aprobar`);
      alert("Venta aprobada y procesada en el inventario mayorista");
      cargarChats();
    } catch (error) {
      alert("Error al aprobar la venta del agente");
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500 font-medium animate-pulse">Cargando monitor del agente...</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto font-sans select-none">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900">Monitor del Agente de WhatsApp</h1>
        <p className="text-sm text-zinc-500 mt-1">Supervisa en tiempo real las interacciones de la IA y toma el control cuando sea necesario.</p>
      </header>

      <div className="grid gap-4">
        {conversaciones.length === 0 ? (
          <div className="p-8 text-center bg-white border border-zinc-200 rounded-xl">
            <p className="text-zinc-400 italic text-sm">No hay clientes ni interacciones activas en este momento.</p>
          </div>
        ) : (
          conversaciones.map((chat) => (
            <div key={chat.id} className="p-4 border border-zinc-200 rounded-xl shadow-sm bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold text-lg text-zinc-900">{chat.clienteNombre}</h3>
                  <span className="text-xs text-zinc-500 font-mono">({chat.telefono})</span>
                  
                  {/* Badge de Estado */}
                  <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full ${
                    chat.modoAtencion === 'HUMANO' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                    chat.estadoIA === 'ESPERANDO_APROBACION' ? 'bg-purple-100 text-purple-800' :
                    'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {chat.modoAtencion === 'HUMANO' ? '👤 Atendiendo Asesor' : '🤖 Agente IA Activo'}
                  </span>
                </div>
                <p className="text-sm text-zinc-600 mt-1 italic">"{chat.ultimoMensaje}"</p>
              </div>

              {/* Botón de Control Human-in-the-Loop */}
              <div className="flex items-center gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-zinc-100">
                <button
                  onClick={() => handleCambiarModoAtencion(chat.id, chat.modoAtencion)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                    chat.modoAtencion === 'IA'
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {chat.modoAtencion === 'IA' ? '⏸️ Pausar IA (Tomar Chat)' : '▶️ Devolver a IA'}
                </button>

                {/* Si hay una propuesta de venta por aprobar */}
                {chat.estadoIA === 'ESPERANDO_APROBACION' && chat.propuestaVenta && (
                  <button
                    onClick={() => aprobarPropuestaVenta(chat.id)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-bold text-xs transition-colors"
                  >
                    Aprobar Venta (${chat.propuestaVenta.total.toLocaleString('es-CO')})
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}