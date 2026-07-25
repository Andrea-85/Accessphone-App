'use client';

import { useState, useEffect } from 'react';
import { api } from '@/services/api';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'VENDEDOR' | 'BODEGUERO';
  createdAt?: string;
}

export default function GestionEmpleadosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Estados del formulario
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState<'ADMIN' | 'VENDEDOR' | 'BODEGUERO'>('VENDEDOR');
  const [guardando, setGuardando] = useState(false);

  const cargarEmpleados = async () => {
    try {
      setCargando(true);
      // Petición centralizada usando Axios
      const res = await api.get('/api/admin/empleados');
      if (res.data?.success) {
        setUsuarios(res.data.data);
      } else if (Array.isArray(res.data)) {
        setUsuarios(res.data);
      }
    } catch (err: any) {
      console.error("Error al cargar empleados:", err);
      setError(err?.response?.data?.error || 'No se pudieron cargar los empleados.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    setError('');

    try {
      await api.post('/api/admin/empleados', {
        nombre,
        email,
        password,
        rol,
        organizationId: 1
      });

      // Limpiar formulario y recargar
      setNombre('');
      setEmail('');
      setPassword('');
      setRol('VENDEDOR');
      await cargarEmpleados();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al registrar el empleado.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-800 p-6 font-sans select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <header>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Personal</h1>
          <p className="text-sm text-slate-500">Control de accesos, roles y usuarios de la sucursal.</p>
        </header>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-lg">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Formulario de Registro */}
          <section className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm h-fit">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600 mb-4">Registrar Nuevo Empleado</h2>
            <form onSubmit={handleCrearUsuario} className="space-y-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Nombre Completo</span>
                <input
                  type="text"
                  required
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-10 rounded border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                  placeholder="Ej: Carlos Mendoza"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Correo Electrónico</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                  placeholder="carlos@accessphone.com"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Contraseña Inicial</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-10 rounded border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                  placeholder="••••••••"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-500">Rol del Empleado</span>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className="h-10 rounded border border-slate-300 px-2 text-sm outline-none bg-white focus:border-emerald-500 font-medium"
                >
                  <option value="VENDEDOR">Vendedor (Acceso POS)</option>
                  <option value="BODEGUERO">Bodeguero (Acceso Novedades / Inventario)</option>
                  <option value="ADMIN">Administrador (Control Total)</option>
                </select>
              </label>

              <button
                type="submit"
                disabled={guardando}
                className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition disabled:opacity-50 mt-2 cursor-pointer"
              >
                {guardando ? 'Guardando...' : 'Crear Usuario'}
              </button>
            </form>
          </section>

          {/* Tabla de Usuarios Activos */}
          <section className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">Equipo Registrado</h2>
            </div>
            
            {cargando ? (
              <div className="p-8 text-center text-sm text-slate-400">Consultando base de datos segura...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-200 text-slate-400 font-bold text-xs uppercase">
                      <th className="p-4">Nombre</th>
                      <th className="p-4">Email</th>
                      <th className="p-4">Rol Asignado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50 transition">
                        <td className="p-4 font-bold text-slate-900">{u.nombre}</td>
                        <td className="p-4 text-slate-500">{u.email}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                            u.rol === 'ADMIN' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            u.rol === 'BODEGUERO' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {u.rol}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

        </div>
      </div>
    </main>
  );
}