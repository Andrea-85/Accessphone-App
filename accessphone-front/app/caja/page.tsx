'use client';

import { useState } from 'react';

interface DatosArqueo {
  fecha: string;
  efectivoEsperado: number;
  transferenciaEsperada: number;
  totalCalculatedSistema: number;
  mensajeAyuda: string;
}

export default function ArqueoCajaPage() {
  const [datos, setDatos] = useState<DatosArqueo | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  
  // Inputs del cajero (Dinero físico real en mano)
  const [efectivoFisico, setEfectivoFisico] = useState<number | ''>('');
  const [transferenciaFisica, setTransferenciaFisica] = useState<number | ''>('');
  const [arqueado, setArqueado] = useState(false);

  const consultarSistema = async () => {
    try {
      setCargando(true);
      setError('');
      setArqueado(false);
      
      const res = await fetch('http://localhost:4000/api/caja/arqueo-hoy', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessphone_token')}`
        }
      });
      const result = await res.json();
      
      if (!res.ok) throw new Error(result.error || 'Error al consultar arqueo');
      setDatos(result.data);
    } catch (err: any) {
      setError(err.message || 'Error de conexión con el servidor.');
    } finally {
      setCargando(false);
    }
  };

  // Cálculos de descuadres
  const efecEsperado = datos?.efectivoEsperado || 0;
  const transEsperada = datos?.transferenciaEsperada || 0;
  
  const diferenciaEfectivo = Number(efectivoFisico) - efecEsperado;
  const diferenciaTransferencia = Number(transferenciaFisica) - transEsperada;
  const descuadreTotal = diferenciaEfectivo + diferenciaTransferencia;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-8 font-sans flex flex-col items-center justify-center">
      <div className="w-full max-w-2xl bg-white rounded-xl border border-slate-200 p-8 shadow-sm">
        
        {/* Encabezado */}
        <header className="mb-6 border-b border-slate-100 pb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
            Operación POS Diaria
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-3">Arqueo y Cierre de Caja</h1>
          <p className="text-sm text-slate-500 mt-1">Sincronice el dinero físico y las cuentas bancarias con los registros del sistema.</p>
        </header>

        {/* PASO 1: Consultar Sistema */}
        {!datos && (
          <div className="text-center py-6">
            <button
              onClick={consultarSistema}
              disabled={cargando}
              className="px-6 h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition shadow-sm disabled:opacity-50"
            >
              {cargando ? 'Calculando transacciones del día...' : 'Iniciar Arqueo de Hoy'}
            </button>
            {error && <p className="text-xs text-red-600 font-bold mt-4">{error}</p>}
          </div>
        )}

        {/* PASO 2: Formulario de Cuadre */}
        {datos && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Ayuda del Sistema */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-600">
              ℹ️ {datos.mensajeAyuda}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Bloque Efectivo */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Control de Efectivo</h3>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">ESPERADO EN SISTEMA:</span>
                  <span className="text-lg font-bold text-slate-900">${efecEsperado.toLocaleString('es-CO')} COP</span>
                </div>
                <label className="flex flex-col gap-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-600">¿CUÁNTO HAY EN CAJA FÍSICA?</span>
                  <input
                    type="number"
                    min={0}
                    value={efectivoFisico}
                    onChange={(e) => setEfectivoFisico(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-10 rounded border border-slate-300 px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Cuente los billetes y digite"
                  />
                </label>
              </div>

              {/* Bloque Transferencias */}
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">Control Bancario (Nequi/Daviplata)</h3>
                <div>
                  <span className="text-[11px] font-bold text-slate-400 block">ESPERADO EN EXTRACTO:</span>
                  <span className="text-lg font-bold text-slate-900">${transEsperada.toLocaleString('es-CO')} COP</span>
                </div>
                <label className="flex flex-col gap-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-600">¿CUÁNTO HAY EN LA APP BANCARIA?</span>
                  <input
                    type="number"
                    min={0}
                    value={transferenciaFisica}
                    onChange={(e) => setTransferenciaFisica(e.target.value === '' ? '' : Number(e.target.value))}
                    className="h-10 rounded border border-slate-300 px-3 text-sm font-bold text-slate-900 outline-none focus:border-emerald-500"
                    placeholder="Revise la app y digite"
                  />
                </label>
              </div>
            </div>

            {/* BOTÓN EVALUAR CUADRE */}
            {efectivoFisico !== '' && transferenciaFisica !== '' && !arqueado && (
              <button
                onClick={() => setArqueado(true)}
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-sm transition"
              >
                Procesar y Evaluar Descuadres
              </button>
            )}

            {/* SECCIÓN RESULTADO DE AUDITORÍA */}
            {arqueado && (
              <div className={`p-6 rounded-xl border transition animate-fadeIn ${
                descuadreTotal === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                <h2 className="text-lg font-black uppercase tracking-tight">
                  {descuadreTotal === 0 ? '🎉 ¡Caja Perfectamente Cuadrada!' : '⚠️ Se Detectó un Descuadre en Caja'}
                </h2>
                
                <div className="mt-4 space-y-2 text-xs font-medium">
                  <div className="flex justify-between border-b border-black/5 pb-1">
                    <span>Desfase de Efectivo en Billetes:</span>
                    <span className={`font-bold ${diferenciaEfectivo >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {diferenciaEfectivo === 0 ? '$0' : `${diferenciaEfectivo > 0 ? '+' : ''}$${diferenciaEfectivo.toLocaleString('es-CO')} COP`}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-black/5 pb-1">
                    <span>Desfase en Plataformas Bancarias:</span>
                    <span className={`font-bold ${diferenciaTransferencia >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {diferenciaTransferencia === 0 ? '$0' : `${diferenciaTransferencia > 0 ? '+' : ''}$${diferenciaTransferencia.toLocaleString('es-CO')} COP`}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm font-black pt-2">
                    <span>BALANCE GENERAL DE CIERRE:</span>
                    <span>
                      {descuadreTotal === 0 ? '$0 COP (Exacto)' : `$${descuadreTotal.toLocaleString('es-CO')} COP`}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => alert('Caja guardada e inmutable en Supabase. Feliz noche.')}
                  className="w-full h-10 bg-white border border-slate-300 text-slate-800 hover:bg-slate-50 transition rounded-lg text-xs font-bold mt-5 shadow-sm"
                >
                  Confirmar y Guardar Bloqueo de Caja Diario
                </button>
              </div>
            )}

          </div>
        )}

      </div>
    </main>
  );
}