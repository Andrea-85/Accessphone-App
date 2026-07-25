import axios from 'axios';

// 1. Configuración base adaptable a entornos (Local vs Producción)
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_URL,
  timeout: 15000, // Evita huelgas de peticiones colgadas en alto tráfico
});

// 2. Interceptor Centralizado: Inyecta cabeceras automáticamente en CADA petición
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessphone_token');
    const userRaw = localStorage.getItem('accessphone_user');
    let organizationId = '1';

    try {
      const user = userRaw ? JSON.parse(userRaw) : null;
      organizationId = String(user?.organizationId || organizationId);
    } catch {
      organizationId = '1';
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers['x-organization-id'] = organizationId;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 3. Tipados e Interfaces
export interface ProductoPOS {
  varianteId: number;
  productoId: number;
  sku: string;
  descripcion: string;
  precioVenta: number;
  stockTotal: number;
}

// 4. Servicios del POS (Ahora limpios de la lógica de cabeceras)
export const posService = {
  login: async (credenciales: { email: string; password: string; organizationId: number }) => {
    // El login no suele requerir token previo, el interceptor simplemente no lo enviará si no existe
    const respuesta = await api.post('/api/auth/login', credenciales);
    return respuesta.data;
  },

  buscarProductos: async (q: string, warehouseId: number) => {
    const respuesta = await api.get<ProductoPOS[]>('/api/inventario/buscar', {
      params: { q, warehouseId },
    });
    return respuesta.data;
  },

  crearVenta: async (datosVenta: {
    clienteId: number;
    warehouseId: number;
    total: number;
    items: Array<{
      productoId: number;
      varianteId: number;
      cantidad: number;
      precioUnitario: number;
    }>;
    payments: Array<{
      monto: number;
      metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO';
      referencia: string | null;
    }>;
  }) => {
    const respuesta = await api.post('/api/ventas', datosVenta);
    return respuesta.data;
  },
};

// 5. Servicios de Administración (Dashboard, Exportación y Agentes)
export const adminService = {
  // Obtener Métricas del Dashboard
  obtenerDashboard: async () => {
    const respuesta = await api.get('/api/admin/dashboard');
    return respuesta.data;
  },

  // Cambiar Modo de Atención del Cliente (IA <-> HUMANO)
  cambiarModoAtencion: async (clienteId: number, modo: 'IA' | 'HUMANO') => {
    const respuesta = await api.patch(`/api/admin/chat/${clienteId}/modo`, { modo });
    return respuesta.data;
  },

  // Descargar Reporte de Ventas en Excel
  descargarReporteVentasExcel: async () => {
    const respuesta = await api.get('/api/admin/reportes/ventas-excel', {
      responseType: 'blob', // 👈 Indispensable para manejar descargas de archivos binarios en Next.js
    });

    // Disparar la descarga automática en el navegador
    const url = window.URL.createObjectURL(new Blob([respuesta.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Reporte_Ventas_${Date.now()}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },
};