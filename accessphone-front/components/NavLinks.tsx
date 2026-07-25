'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NavLinks() {
  const [rol, setRol] = useState<string>('');
  const [cargando, setCargando] = useState<boolean>(true);

  useEffect(() => {
    const userRaw = localStorage.getItem('accessphone_user');
    if (userRaw) {
      try {
        const user = JSON.parse(userRaw);
        const rolDetectado = (user?.role || user?.rol || 'VENDEDOR').toUpperCase();
        setRol(rolDetectado);
      } catch (e) {
        console.error("Error al leer rol:", e);
      }
    }
    setCargando(false);
  }, []);

  if (cargando) {
    return <div className="text-xs text-zinc-400 p-2">Cargando menú...</div>;
  }

  const esAdmin = rol === 'ADMIN' || rol === 'SUPERVISOR';
  const esVendedor = rol === 'ADMIN' || rol === 'VENDEDOR' || rol === 'SUPERVISOR';
  const esBodeguero = rol === 'ADMIN' || rol === 'BODEGUERO' || rol === 'SUPERVISOR';

  return (
    <nav className="space-y-1.5 select-none text-xs">
      
      {/* 📊 SECCIÓN 1: GERENCIA Y DIRECCIÓN */}
      {esAdmin && (
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block pt-2 pb-1 px-1">
            Gerencia y Dirección
          </span>
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            📊 Dashboard Gerencial
          </Link>
          <Link 
            href="/agente" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            🤖 Monitor IA (WhatsApp)
          </Link>
          <Link 
            href="/proveedores" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            🏭 Proveedores
          </Link>
          <Link 
            href="/importador" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            📄 Carga Masiva (Excel)
          </Link>
          <Link 
            href="/dashboard/empleados" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            👥 Gestión de Empleados
          </Link>
        </div>
      )}

      {/* 🛒 SECCIÓN 2: VENTAS Y VITRINA */}
      {esVendedor && (
        <div className="space-y-1 pt-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block pb-1 px-1">
            Ventas y Vitrina
          </span>
          <Link 
            href="/pos" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 transition-colors"
          >
            🛒 Ventas de Mostrador (POS)
          </Link>
          <Link 
            href="/caja" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            💰 Arqueo y Cierre de Caja
          </Link>
          <Link 
            href="/cartera" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            📝 Cartera y Cobranzas
          </Link>
        </div>
      )}

      {/* 📦 SECCIÓN 3: BODEGA Y LOGÍSTICA */}
      {esBodeguero && (
        <div className="space-y-1 pt-2">
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block pb-1 px-1">
            Bodega y Logística
          </span>
          <Link 
            href="/inventario" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            📄 Recepción e Inventario
          </Link>
          <Link 
            href="/kardex" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            📈 Kardex de Inventario
          </Link>
          <Link 
            href="/despacho" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            🚚 Despachos de Órdenes
          </Link>
          <Link 
            href="/novedades" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
          >
            ⚠️ Mermas y Novedades
          </Link>
          {esAdmin && (
            <Link 
              href="/bodegas" 
              className="flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-zinc-700 hover:bg-zinc-200/70 transition-colors"
            >
              🏭 Gestión de Bodegas
            </Link>
          )}
        </div>
      )}

    </nav>
  );
}