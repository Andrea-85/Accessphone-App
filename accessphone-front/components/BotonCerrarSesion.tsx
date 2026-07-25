'use client';

import { useRouter } from 'next/navigation';

export default function BotonCerrarSesion() {
  const router = useRouter();

  const handleLogout = () => {
    // 1. Limpiar credenciales de localStorage
    localStorage.removeItem('accessphone_token');
    localStorage.removeItem('accessphone_user');

    // 2. Limpiar cookies de sesión
    document.cookie = 'accessphone_token=; path=/; max-age=0;';
    document.cookie = 'accessphone_user=; path=/; max-age=0;';

    // 3. Redirigir al inicio de sesión
    router.push('/login');
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full mt-3 px-3 py-2 rounded-lg text-xs font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 hover:text-rose-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
    >
      🚪 Cerrar Sesión
    </button>
  );
}