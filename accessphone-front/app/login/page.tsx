'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/services/api';

export default function LoginPage() {
  const router = useRouter();
  
  // Estados para el formulario
  const [organizationId, setOrganizationId] = useState<string>('1');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  
  // Estados operativos
  const [cargando, setCargando] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCargando(true);

    if (!email || !password) {
      setError('Por favor, ingrese su correo y contraseña.');
      setCargando(false);
      return;
    }

    try {
      // ⚡ Petición centralizada usando Axios `api`
      const res = await api.post('/api/auth/login', {
        email,
        password,
        organizationId: Number(organizationId || 1),
      });

      const result = res.data;

      // Guardado en cliente
      localStorage.setItem('accessphone_token', result.token);
      localStorage.setItem('accessphone_user', JSON.stringify(result.usuario));
      
      document.cookie = `accessphone_token=${result.token}; path=/; max-age=86400; SameSite=Strict`;
      document.cookie = `accessphone_user=${JSON.stringify(result.usuario)}; path=/; max-age=86400; SameSite=Strict`;

      // 🔀 Enrutamiento por Rol de Usuario
      const rolUsuario = result.usuario?.rol || 'VENDEDOR';

      if (rolUsuario === 'ADMIN') {
        router.push('/dashboard');
      } else if (rolUsuario === 'BODEGUERO') {
        router.push('/novedades');
      } else {
        router.push('/pos');
      }

    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || 'Error de autenticación.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 text-slate-800 p-4 flex items-center justify-center font-sans select-none">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6">
        
        {/* Encabezado */}
        <header className="text-center">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100">
            Accessphone v2.0
          </span>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-3">Iniciar Sesión</h1>
          <p className="text-xs text-slate-500 mt-1">Plataforma de Operaciones Mayoristas e Inventarios</p>
        </header>

        {/* Alerta de Error */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl animate-fadeIn text-center">
            ⚠️ {error}
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* Correo Electrónico */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Correo Electrónico</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 transition"
              placeholder="nombre@accessphone.com"
              disabled={cargando}
            />
          </label>

          {/* Contraseña */}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-600 uppercase">Contraseña</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-xl border border-slate-300 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 transition"
              placeholder="••••••••"
              disabled={cargando}
            />
          </label>

          {/* Botón de Envío */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm transition mt-2 shadow-sm disabled:opacity-50 flex items-center justify-center cursor-pointer"
          >
            {cargando ? 'Validando Credenciales...' : 'Ingresar al Sistema'}
          </button>

          {/* Soporte */}
          <div className="text-center pt-3 border-t border-slate-100">
            <a
              href={`https://wa.me/573000000000?text=Hola,%20necesito%20restablecer%20mi%20contraseña%20de%20Accessphone-App.%20Mi%20correo%20es:%20${email}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              ¿Olvidó su contraseña? <span className="text-emerald-600 hover:underline">Contactar a Soporte</span>
            </a>
          </div>

        </form>

      </div>
    </main>
  );
}