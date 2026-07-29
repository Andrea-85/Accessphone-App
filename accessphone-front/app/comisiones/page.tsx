'use client';

import { useState, useEffect } from 'react';

export default function ReporteComisionesPage() {
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState<any | null>(null);

  useEffect(() => {
    async function cargarReporte() {
      try {
        const res = await fetch('/api/ventas/reporte/vendedores', {
          headers: {
            'x-organization-id': '1'
          }
        });
        const data = await res.json();
        if (data.success) {
          setVendedores(data.data);
        }
      } catch (error) {
        console.error("Error cargando comisiones:", error);
      } finally {
        setLoading(false);
      }
    }

    cargarReporte();
  }, []);

  if (loading) return <p className="p-6 text-gray-600">Calculando liquidación y auditoría...</p>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Liquidación de Nómina, Comisiones y Auditoría</h1>
      <p className="text-sm text-gray-500 mb-6">Consolidado de ventas por comercial y control de descuentos otorgados.</p>

      <div className="bg-white shadow rounded-lg overflow-hidden mb-6">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendedor</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad Ventas</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Descuentos</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Neto Vendido</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {vendedores.map((v, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{v.nombre}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{v.cantidadVentas}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-red-500">
                  -${Number(v.totalDescuentos || 0).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-green-600">
                  ${Number(v.totalVendido).toLocaleString('es-CO')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                  <button
                    onClick={() => setVendedorSeleccionado(v)}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700"
                  >
                    Auditar Descuentos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL / SECCIÓN DE DETALLE PARA AUDITORÍA */}
      {vendedorSeleccionado && (
        <div className="bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-inner">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-gray-800">
              Auditoría de Transacciones: <span className="text-blue-600">{vendedorSeleccionado.nombre}</span>
            </h2>
            <button
              onClick={() => setVendedorSeleccionado(null)}
              className="text-gray-500 hover:text-gray-700 text-sm font-bold"
            >
              ✕ Cerrar
            </button>
          </div>

          <div className="overflow-x-auto bg-white rounded shadow">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">ID Venta</th>
                  <th className="px-4 py-2 text-left">Fecha</th>
                  <th className="px-4 py-2 text-left">Cliente</th>
                  <th className="px-4 py-2 text-right">Total Venta</th>
                  <th className="px-4 py-2 text-right">Descuento</th>
                  <th className="px-4 py-2 text-left">Motivo / Justificación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {vendedorSeleccionado.ventasDetalle.map((det: any) => (
                  <tr key={det.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">#{det.id}</td>
                    <td className="px-4 py-2">{new Date(det.fecha).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2">{det.cliente}</td>
                    <td className="px-4 py-2 text-right">${Number(det.total).toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2 text-right font-semibold text-red-500">
                      -${Number(det.descuento || 0).toLocaleString('es-CO')}
                    </td>
                    <td className="px-4 py-2 text-gray-600 italic">
                      {det.motivoDescuento || 'Sin justificación registrada'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}