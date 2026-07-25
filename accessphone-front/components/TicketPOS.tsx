'use client';

import React from 'react';

interface ItemVenta {
  descripcion: string;
  cantidad: number;
  precioVenta: number;
}

interface TicketPOSProps {
  venta: {
    id?: number;
    clienteNombre: string;
    vendedorNombre: string;
    items: ItemVenta[];
    subtotal: number;
    descuento: number;
    total: number;
    metodoPago: string;
    fecha?: string;
  };
  onCerrar: () => void;
}

export default function TicketPOS({ venta, onCerrar }: TicketPOSProps) {
  
  const manejarImpresion = () => {
    window.print();
  };

  const enviarWhatsApp = () => {
    let mensaje = `🧾 *COMPROBANTE DE VENTA*\n`;
    mensaje += `*Comercializadora Mayorista*\n`;
    mensaje += `----------------------------------------\n`;
    mensaje += `*Cliente:* ${venta.clienteNombre}\n`;
    mensaje += `*Atendido por:* ${venta.vendedorNombre}\n`;
    mensaje += `----------------------------------------\n`;
    venta.items.forEach(i => {
      mensaje += `• ${i.descripcion} x${i.cantidad} = $${(i.precioVenta * i.cantidad).toLocaleString('es-CO')}\n`;
    });
    mensaje += `----------------------------------------\n`;
    if (venta.descuento > 0) {
      mensaje += `*Descuento:* -$${venta.descuento.toLocaleString('es-CO')}\n`;
    }
    mensaje += `*TOTAL PAGADO:* $${venta.total.toLocaleString('es-CO')} COP\n`;
    mensaje += `*Método:* ${venta.metodoPago}\n\n`;
    mensaje += `¡Gracias por su compra! 🚀`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      
      {/* Estilos CSS especiales para ocultar la pantalla y dejar solo el ticket al imprimir */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #ticket-imprimible, #ticket-imprimible * {
            visibility: visible;
          }
          #ticket-imprimible {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            padding: 0;
            margin: 0;
            box-shadow: none;
            border: none;
          }
          .no-imprimir {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 font-mono text-xs select-none">
        
        {/* VISTA DEL TICKET (80mm) */}
        <div id="ticket-imprimible" className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-slate-900">
          <div className="text-center space-y-1">
            <h2 className="font-extrabold text-sm uppercase tracking-wider">AccessPhone Mayorista</h2>
            <p className="text-[10px] text-slate-500">NIT: 901.234.567-1</p>
            <p className="text-[10px] text-slate-500">Bogotá - Colombia</p>
            <div className="border-b border-dashed border-slate-300 my-2"></div>
            <p className="font-bold text-[11px]">TICKET DE VENTA #{venta.id || 'N/A'}</p>
            <p className="text-[10px] text-slate-400">{venta.fecha || new Date().toLocaleString('es-CO')}</p>
          </div>

          <div className="space-y-1 text-[10px]">
            <p><span className="font-bold">Cliente:</span> {venta.clienteNombre}</p>
            <p><span className="font-bold">Vendedor:</span> {venta.vendedorNombre}</p>
            <p><span className="font-bold">Pago:</span> {venta.metodoPago}</p>
          </div>

          <div className="border-b border-dashed border-slate-300 my-2"></div>

          {/* DETALLE DE PRODUCTOS */}
          <div className="space-y-1">
            {venta.items.map((item, index) => (
              <div key={index} className="flex justify-between items-start text-[11px]">
                <div className="flex-1 pr-2">
                  <p className="font-bold">{item.descripcion}</p>
                  <p className="text-[9px] text-slate-400">{item.cantidad} x ${item.precioVenta.toLocaleString('es-CO')}</p>
                </div>
                <span className="font-bold">${(item.cantidad * item.precioVenta).toLocaleString('es-CO')}</span>
              </div>
            ))}
          </div>

          <div className="border-b border-dashed border-slate-300 my-2"></div>

          {/* TOTALES */}
          <div className="space-y-1 text-right text-[11px]">
            {venta.descuento > 0 && (
              <p className="text-amber-600 font-bold">Descuento: -${venta.descuento.toLocaleString('es-CO')}</p>
            )}
            <p className="font-extrabold text-sm text-slate-900">TOTAL: ${venta.total.toLocaleString('es-CO')} COP</p>
          </div>

          <div className="border-b border-dashed border-slate-300 my-2"></div>
          
          <div className="text-center text-[9px] text-slate-400 space-y-1">
            <p>¡Gracias por su confianza!</p>
            <p>Conservar este ticket para reclamos o cambios.</p>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN (No salen en la impresora) */}
        <div className="no-imprimir space-y-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={manejarImpresion}
              className="h-10 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition"
            >
              🖨️ Imprimir POS
            </button>
            <button
              onClick={enviarWhatsApp}
              className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer transition"
            >
              📲 Enviar WhatsApp
            </button>
          </div>
          <button
            onClick={onCerrar}
            className="w-full h-9 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Cerrar Ventana
          </button>
        </div>

      </div>
    </div>
  );
}