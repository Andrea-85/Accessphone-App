'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, adminService } from '@/services/api'; 

interface Metricas {
  alertasStockCriticoCount: number;
  lotesInmovilizadosCount: number;
  ventasTotalesIA: number;
  pedidosPendientesDespacho: number;
  
  desgloseFinanciero?: {
    totalVentasGlobal: number;
    totalVentasPOS: number;
    ventasTotalesIA: number;
    totalEfectivo: number;
    totalBancosTransferencia: number;
    totalCarteraCreditos: number;
    totalAbonosCartera: number;
  };

  balanceFinancieroMermas: {
    totalDineroPerdido: number;
    mensajeFormat: string;
  };
  detallesStockMuerto: Array<{
    id: number;
    varianteId: number;
    cantidadActual: number;
    costoCompra: number;
    createdAt: string;
  }>;
  historialMermas: Array<{
    id: number;
    productoText: string;
    cantidad: number;
    tipo: string;
    estado: string;
    fecha: string;
  }>;
}

const formatoMoneda = (valor: number) =>
  valor.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function DashboardGerencialPage() {
  const [metricas, setMetricas] = useState<Metricas | null>(null);
  const [cargando, setCargando] = useState(true);
  const [descargandoExcel, setDescargandoExcel] = useState(false);
  const [error, setError] = useState('');
  
  // 🚀 ESTADOS PARA EL SALUDO DINÁMICO Y EL NOMBRE DE USUARIO
  const [nombreUsuario, setNombreUsuario] = useState('Usuario');
  const [saludoHora, setSaludoHora] = useState('Bienvenido');

  useEffect(() => {
    // 1. Obtener el nombre del usuario logueado
    const userRaw = localStorage.getItem('accessphone_user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        if (user?.nombre) {
          // Extraer el primer nombre para un trato más cercano
          const primerNombre = user.nombre.split(' ')[0];
          setNombreUsuario(primerNombre);
        }
      } catch (e) {
        console.error("Error leyendo usuario:", e);
      }
    }

    // 2. Determinar el saludo según la hora actual
    const horaActual = new Date().getHours();
    if (horaActual >= 6 && horaActual < 12) {
      setSaludoHora('¡Buenos días');
    } else if (horaActual >= 12 && horaActual < 19) {
      setSaludoHora('¡Buenas tardes');
    } else {
      setSaludoHora('¡Buenas noches');
    }

    // 3. Cargar datos del dashboard
    async function cargarDashboard() {
      try {
        setCargando(true);
        const respuesta = await api.get('/api/admin/dashboard/gerencial');
        if (respuesta.data && respuesta.data.success) {
          setMetricas(respuesta.data.data);
        }
      } catch (err: any) {
        console.error("Error al cargar analítica:", err);
        setError('Error al cargar métricas operativas.');
      } finally {
        setCargando(false);
      }
    }
    cargarDashboard();
  }, []);

  const handleExportarExcel = async () => {
    try {
      setDescargandoExcel(true);
      await adminService.descargarReporteVentasExcel();
    } catch (err: any) {
      console.error("Error al exportar Excel:", err);
      alert("No se pudo generar el reporte en Excel. Revisa la consola.");
    } finally {
      setDescargandoExcel(false);
    }
  };

  if (cargando) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-sm font-bold text-zinc-500 animate-pulse">Cargando analítica integrada...</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-800 p-6 font-sans select-none">
      <div className="max-w-7xl mx-auto">
        
        {/* Encabezado Principal con Saludo Dinámico */}
        <header className="mb-8 border-b border-zinc-200 pb-5 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              Inteligencia de Negocio Operativa
            </span>
            {/* 👈 AQUÍ EL SALUDO DINÁMICO */}
            <h1 className="text-3xl font-black tracking-tight text-zinc-900 mt-2">
              {saludoHora}, {nombreUsuario}!
            </h1>
            <p className="text-sm text-zinc-500 mt-1">Monitoreo global de ingresos, flujo de dinero, mermas e inventario.</p>
          </div>

          <button
            onClick={handleExportarExcel}
            disabled={descargandoExcel}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white font-bold text-xs px-4 py-2.5 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {descargandoExcel ? (
              <span>⏳ Generando Excel...</span>
            ) : (
              <>
                <span>📊</span>
                <span>Exportar Ventas (Excel)</span>
              </>
            )}
          </button>
        </header>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            {error}
          </div>
        )}

        {/* BLOQUE 1: RESUMEN FINANCIERO Y FLUJO DE DINERO */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 px-1">
            💰 Flujo de Dinero e Ingresos Consolidados
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white border-2 border-emerald-500/20 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 block">Total Ventas Globales</span>
                <span className="text-2xl font-black text-zinc-900 mt-2 block">
                  {formatoMoneda(metricas?.desgloseFinanciero?.totalVentasGlobal || 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Suma consolidada de todas las ventas facturadas en la plataforma.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-600 block">Ventas Punto Físico (POS)</span>
                <span className="text-2xl font-black text-zinc-900 mt-2 block">
                  {formatoMoneda(metricas?.desgloseFinanciero?.totalVentasPOS || 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Facturado directamente por los vendedores en el mostrador.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">Bancos / Transferencias</span>
                <span className="text-2xl font-black text-blue-600 mt-2 block">
                  {formatoMoneda(metricas?.desgloseFinanciero?.totalBancosTransferencia || 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Ingresos recibidos por Nequi, Daviplata o Cuenta Bancaria.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600 block">Abonos Recaudados</span>
                <span className="text-2xl font-black text-purple-600 mt-2 block">
                  {formatoMoneda(metricas?.desgloseFinanciero?.totalAbonosCartera || 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Dinero cobrado de clientes con créditos vigentes.
              </p>
            </div>

          </div>
        </section>

        {/* BLOQUE 2: INDICADORES OPERATIVOS Y RENDIMIENTO DE IA */}
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3 px-1">
            📦 Rendimiento Operativo y Agente IA
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 block">Vendido por IA (WhatsApp)</span>
                <span className="text-2xl font-black text-zinc-900 mt-2 block">
                  {formatoMoneda(metricas?.ventasTotalesIA || 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Ingresos cerrados de forma autónoma por la IA.
              </p>
            </div>

            {/* 🔗 CUADRO INTERACTIVO DE COLA DE DESPACHO */}
            <Link href="/pedidos?origen=WHATSAPP&estado=PENDIENTE_PAGO" className="block group">
              <div className="bg-white border-2 border-blue-500/30 hover:border-blue-500 rounded-xl p-5 shadow-sm flex flex-col justify-between transition-all cursor-pointer h-full">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 block">Cola de Despacho</span>
                    <span className="text-xs text-blue-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Ver órdenes →</span>
                  </div>
                  <span className="text-2xl font-black text-zinc-900 mt-2 block">
                    {metricas?.pedidosPendientesDespacho || 0} Órdenes
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                  Pedidos aprobados en espera de empaque en bodega. Clic para gestionar.
                </p>
              </div>
            </Link>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 block">Alertas de Quiebre</span>
                <span className="text-2xl font-black text-amber-600 mt-2 block">
                  {metricas?.alertasStockCriticoCount || 0} Variantes
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Modelos con menos de 15 unidades en stock.
              </p>
            </div>

            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-500 block">Déficit por Mermas</span>
                <span className="text-2xl font-black text-red-600 mt-2 block">
                  {formatoMoneda(metricas?.balanceFinancieroMermas?.totalDineroPerdido ?? 0)}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-4 border-t border-zinc-100 pt-2 font-medium">
                Capital perdido por daños informados en bodega.
              </p>
            </div>

          </div>
        </section>

        {/* SECCIÓN INFERIOR: AUDITORÍA Y SUGERENCIAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4 flex items-center justify-between">
              <span>Auditoría de Mermas Recientes</span>
              <span className="text-xs bg-zinc-100 px-2 py-0.5 text-zinc-500 rounded font-mono">
                Total: {metricas?.historialMermas?.length || 0}
              </span>
            </h2>
            <div className="overflow-x-auto max-h-64 overflow-y-auto border border-zinc-100 rounded-lg">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500 uppercase font-bold border-b border-zinc-200">
                    <th className="p-3">Producto</th>
                    <th className="p-3 text-center">Cant.</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {metricas?.historialMermas?.map((m) => (
                    <tr key={m.id} className="hover:bg-zinc-50/80 transition">
                      <td className="p-3 font-semibold text-zinc-700">{m.productoText}</td>
                      <td className="p-3 text-center font-bold font-mono text-zinc-900">{m.cantidad}</td>
                      <td className="p-3 text-zinc-500">{m.tipo.replace('_', ' ')}</td>
                      <td className="p-3 text-right">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          m.estado === 'aprobado' ? 'bg-emerald-100 text-emerald-800' : 
                          m.estado === 'pendiente' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-200 text-zinc-600'
                        }`}>
                          {m.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-4">Recomendaciones de Rotación (IA)</h2>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {!metricas?.detallesStockMuerto || metricas.detallesStockMuerto.length === 0 ? (
                <p className="text-xs text-zinc-400 font-medium italic">No hay lotes inmovilizados este mes. ¡Excelente rotación!</p>
              ) : (
                metricas.detallesStockMuerto.map((lote) => (
                  <div key={lote.id} className="p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 text-xs flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-zinc-900">Variante ID: #{lote.varianteId}</span>
                      <span className="bg-zinc-200 text-zinc-700 font-mono font-bold px-2 py-0.5 rounded">Lote #{lote.id}</span>
                    </div>
                    <p className="text-zinc-600">
                      Este lote ingresó el <span className="font-semibold text-zinc-800">{new Date(lote.createdAt).toLocaleDateString()}</span> y aún conserva <span className="font-black text-zinc-900">{lote.cantidadActual} unidades</span> con un costo de inversión de <span className="font-bold">{formatoMoneda(lote.costoCompra)}</span> cada una.
                    </p>
                    <div className="bg-white border border-zinc-200 p-2.5 rounded-lg text-zinc-700 font-medium shadow-sm">
                      💡 <strong>Sugerencia IA:</strong> Recomienda lanzar un broadcast masivo en el canal de WhatsApp a tus clientes mayoristas con un descuento del 15% o promoción de 3x2 en esta variante para recuperar la inversión líquida.
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

      </div>
    </main>
  );
}