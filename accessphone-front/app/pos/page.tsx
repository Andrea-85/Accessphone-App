'use client';

import React, { useState, useEffect, useRef } from 'react';
import { posService, ProductoPOS, api } from '@/services/api';
import TicketPOS from '@/components/TicketPOS';

interface ItemCarrito {
  varianteId: number;
  productoId: number;
  sku: string;
  descripcion: string;
  precioVenta: number;
  cantidad: number;
  stockTotal: number;
}

interface Cliente {
  id: number;
  nombre: string;
  telefono?: string;
  identificacion?: string;
}

export default function PosPage() {
  const [busqueda, setBusqueda] = useState('');
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoPOS[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [datosUltimaVenta, setDatosUltimaVenta] = useState<any>(null);
  const [mostrarTicket, setMostrarTicket] = useState(false);
  
  // 👤 GESTIÓN DE CLIENTE EN POS
  const [clienteId, setClienteId] = useState<number>(1);
  const [clienteNombre, setClienteNombre] = useState<string>('Cliente General (Mostrador)');
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [mostrarModalNuevoCliente, setMostrarModalNuevoCliente] = useState(false);

  // Formulario de nuevo cliente
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoTelefono, setNuevoTelefono] = useState('');
  const [guardandoCliente, setGuardandoCliente] = useState(false);

  const [metodoPago, setMetodoPago] = useState<'EFECTIVO' | 'TRANSFERENCIA' | 'CREDITO' | 'MIXTO'>('EFECTIVO');
  const [referenciaPago, setReferenciaPago] = useState('');
  
  // 🚀 NUEVOS ESTADOS PARA CÁLCULO DE CAMBIO Y PAGO MIXTO
  const [montoEfectivo, setMontoEfectivo] = useState<string>('');
  const [montoTransferencia, setMontoTransferencia] = useState<string>('');

  // 🏷️ CAMPOS DE AUDITORÍA Y DESCUENTO
  const [descuentoMonto, setDescuentoMonto] = useState<number>(0);
  const [motivoDescuento, setMotivoDescuento] = useState<string>('');
  
  const [procesando, setProcesando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState('');
  const [usuarioActual, setUsuarioActual] = useState<any>(null);

  // ⌨️ REFERENCIAS DE NAVEGACIÓN PARA ATAJOS DE TECLADO
  const inputBuscadorProductosRef = useRef<HTMLInputElement>(null);
  const inputBuscadorClientesRef = useRef<HTMLInputElement>(null);

  // Cargar datos del vendedor autenticado
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userRaw = localStorage.getItem('accessphone_user');
      if (userRaw) setUsuarioActual(JSON.parse(userRaw));
    }
  }, []);

  // ⚡ LISTENERS GLOBAL PARA ATAJOS DE TECLADO (F2, F4, Ctrl+Enter)
  useEffect(() => {
    const manejarAtajosTeclado = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        inputBuscadorClientesRef.current?.focus();
      }

      if (e.key === 'F4') {
        e.preventDefault();
        inputBuscadorProductosRef.current?.focus();
      }

      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault();
        handleFinalizarVenta();
      }
    };

    window.addEventListener('keydown', manejarAtajosTeclado);
    return () => window.removeEventListener('keydown', manejarAtajosTeclado);
  }, [carrito, clienteId, metodoPago, descuentoMonto, motivoDescuento, referenciaPago, montoEfectivo, montoTransferencia]);

  // 🔎 Búsqueda de Productos
  useEffect(() => {
    const buscar = async () => {
      if (busqueda.trim().length >= 2) {
        try {
          const res = await posService.buscarProductos(busqueda, 1);
          setProductosEncontrados(res || []);
        } catch (err) {
          console.error("Error al buscar productos:", err);
        }
      } else {
        setProductosEncontrados([]);
      }
    };
    const timeout = setTimeout(buscar, 300);
    return () => clearTimeout(timeout);
  }, [busqueda]);

  // 🔎 Búsqueda de Clientes para Venta / Crédito
  useEffect(() => {
    const buscarCliente = async () => {
      if (busquedaCliente.trim().length >= 2) {
        try {
          const res = await api.get(`/api/clientes?q=${busquedaCliente}`);
          const lista = res.data?.data || (Array.isArray(res.data) ? res.data : []);
          setClientesEncontrados(lista);
        } catch (err) {
          console.error("Error al buscar cliente:", err);
        }
      } else {
        setClientesEncontrados([]);
      }
    };
    const timeout = setTimeout(buscarCliente, 300);
    return () => clearTimeout(timeout);
  }, [busquedaCliente]);

  const agregarAlCarrito = (prod: ProductoPOS) => {
    setCarrito((prev) => {
      const existe = prev.find((item) => item.varianteId === prod.varianteId);
      if (existe) {
        return prev.map((item) =>
          item.varianteId === prod.varianteId ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [
        ...prev,
        {
          varianteId: prod.varianteId,
          productoId: prod.productoId,
          sku: prod.sku,
          descripcion: prod.descripcion,
          precioVenta: prod.precioVenta,
          cantidad: 1,
          stockTotal: prod.stockTotal,
        },
      ];
    });
    setBusqueda('');
    setProductosEncontrados([]);
  };

  const cambiarCantidad = (varianteId: number, cantidad: number) => {
    if (cantidad <= 0) {
      setCarrito((prev) => prev.filter((item) => item.varianteId !== varianteId));
    } else {
      setCarrito((prev) =>
        prev.map((item) => (item.varianteId === varianteId ? { ...item, cantidad } : item))
      );
    }
  };

  // ➕ Crear cliente directo desde POS
  const handleCrearClienteDirecto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre.trim()) return alert("El nombre del cliente es obligatorio.");

    try {
      setGuardandoCliente(true);
      const res = await api.post('/api/clientes', {
        nombre: nuevoNombre,
        telefono: nuevoTelefono || null
      });

      const clienteCreado = res.data?.data || res.data;
      setClienteId(clienteCreado.id);
      setClienteNombre(clienteCreado.nombre);
      setMostrarModalNuevoCliente(false);
      setNuevoNombre('');
      setNuevoTelefono('');
      alert(`✅ Cliente "${clienteCreado.nombre}" asignado correctamente.`);
    } catch (err: any) {
      alert("Error al registrar el cliente.");
    } finally {
      setGuardandoCliente(false);
    }
  };

  // 💰 Cálculos de la Venta
  const subtotalVenta = carrito.reduce((sum, item) => sum + item.precioVenta * item.cantidad, 0);
  const totalVentaConDescuento = Math.max(0, subtotalVenta - (Number(descuentoMonto) || 0));

  // 🧮 CÁLCULO EN VIVO DE CAMBIO Y SALDOS
  const valEfectivo = Number(montoEfectivo) || 0;
  const valTransferencia = Number(montoTransferencia) || 0;

  const totalIngresado = metodoPago === 'MIXTO' 
    ? (valEfectivo + valTransferencia)
    : (metodoPago === 'EFECTIVO' ? (valEfectivo > 0 ? valEfectivo : totalVentaConDescuento) : totalVentaConDescuento);

  const cambioDevolver = Math.max(0, totalIngresado - totalVentaConDescuento);
  const faltaPorPagar = Math.max(0, totalVentaConDescuento - totalIngresado);

  // 🚀 Procesar Venta
  const handleFinalizarVenta = async () => {
    if (carrito.length === 0) return alert('El carrito está vacío');
    
    if (metodoPago === 'CREDITO' && clienteId === 1) {
      return alert('⚠️ Para otorgar un CRÉDITO debes seleccionar o crear un cliente específico.');
    }

    if (descuentoMonto > 0 && !motivoDescuento.trim()) {
      return alert('⚠️ Por favor ingresa el motivo/justificación del descuento.');
    }

    if (metodoPago === 'MIXTO' && faltaPorPagar > 0) {
      return alert(`⚠️ Falta ingresar $${faltaPorPagar.toLocaleString('es-CO')} COP para completar la venta.`);
    }

    try {
      setProcesando(true);
      
      // Armar desglose de pagos
      const arrayPagos = [];
      if (metodoPago === 'MIXTO') {
        if (valEfectivo > 0) arrayPagos.push({ monto: valEfectivo, metodo: 'EFECTIVO' });
        if (valTransferencia > 0) arrayPagos.push({ monto: valTransferencia, metodo: 'TRANSFERENCIA', referencia: referenciaPago || null });
      } else {
        arrayPagos.push({
          monto: totalVentaConDescuento,
          metodo: metodoPago,
          referencia: referenciaPago || null,
        });
      }

      const resVenta = await posService.crearVenta({
        clienteId: Number(clienteId),
        warehouseId: 1,
        total: totalVentaConDescuento,
        descuento: Number(descuentoMonto) || 0,
        motivoDescuento: motivoDescuento || null,
        items: carrito.map((i) => ({
          productoId: i.productoId,
          varianteId: i.varianteId,
          cantidad: i.cantidad,
          precioUnitario: i.precioVenta,
        })),
        payments: arrayPagos,
      } as any);

      // Guardar datos para desplegar el ticket con desglose de cambio
      setDatosUltimaVenta({
        id: resVenta?.data?.id || resVenta?.id || undefined,
        clienteNombre,
        vendedorNombre: usuarioActual?.nombre || 'Vendedor',
        items: [...carrito],
        subtotal: subtotalVenta,
        descuento: Number(descuentoMonto) || 0,
        total: totalVentaConDescuento,
        metodoPago: metodoPago === 'MIXTO' ? 'PAGO MIXTO' : metodoPago,
        recibido: totalIngresado,
        cambio: cambioDevolver,
        fecha: new Date().toLocaleString('es-CO')
      });
      setMostrarTicket(true);

      setMensajeExito(`¡Venta procesada con éxito por ${usuarioActual?.nombre || 'Vendedor'}!`);
      setCarrito([]);
      setDescuentoMonto(0);
      setMotivoDescuento('');
      setReferenciaPago('');
      setMontoEfectivo('');
      setMontoTransferencia('');
      setClienteId(1);
      setClienteNombre('Cliente General (Mostrador)');
      setTimeout(() => setMensajeExito(''), 4000);
    } catch (err: any) {
      alert(err?.response?.data?.error || 'Error al procesar la venta');
    } finally {
      setProcesando(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 font-sans select-none">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMNA IZQUIERDA: BUSCADOR Y PRODUCTOS */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
            <div>
              <h1 className="text-xl font-black text-slate-900">Punto de Venta (POS)</h1>
              <p className="text-xs text-slate-500">Cajero en turno: <span className="font-bold text-emerald-600">{usuarioActual?.nombre || 'Usuario Autenticado'}</span></p>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 rounded">F2 Cliente</span>
              <span className="px-2 py-1 bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 rounded">F4 Producto</span>
              <span className="px-2 py-1 bg-emerald-100 border border-emerald-200 text-[10px] font-bold text-emerald-800 rounded">Ctrl+Enter Cobrar</span>
            </div>
          </div>

          {/* Buscador de Productos */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative">
            <input
              ref={inputBuscadorProductosRef}
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="🔍 Buscar producto por SKU o nombre... (Atajo: F4)"
              className="w-full h-12 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-500 transition"
            />

            {productosEncontrados.length > 0 && (
              <div className="absolute top-20 left-6 right-6 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100">
                {productosEncontrados.map((p) => (
                  <button
                    key={p.varianteId}
                    onClick={() => agregarAlCarrito(p)}
                    className="w-full p-3 text-left hover:bg-slate-50 flex justify-between items-center transition cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-sm text-slate-800">{p.descripcion}</p>
                      <p className="text-xs text-slate-400 font-mono">SKU: {p.sku} | Stock: {p.stockTotal}</p>
                    </div>
                    <span className="font-black text-emerald-600 text-sm">${p.precioVenta?.toLocaleString('es-CO')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {mensajeExito && (
            <div className="p-4 bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold rounded-xl text-center text-sm">
              🎉 {mensajeExito}
            </div>
          )}

          {/* Carrito */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Productos en la Orden</h2>
            {carrito.length === 0 ? (
              <div className="text-center py-12 text-slate-400 italic text-sm">Carrito vacío.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {carrito.map((item) => (
                  <div key={item.varianteId} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-bold text-sm text-slate-800">{item.descripcion}</p>
                      <p className="text-xs text-slate-400">${item.precioVenta?.toLocaleString('es-CO')} c/u</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => cambiarCantidad(item.varianteId, item.cantidad - 1)} className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer">-</button>
                      <span className="font-mono font-bold w-6 text-center text-sm">{item.cantidad}</span>
                      <button onClick={() => cambiarCantidad(item.varianteId, item.cantidad + 1)} className="w-8 h-8 rounded-lg bg-slate-100 font-bold text-slate-700 hover:bg-slate-200 cursor-pointer">+</button>
                    </div>
                    <p className="font-black text-slate-900 text-sm min-w-[80px] text-right">
                      ${(item.precioVenta * item.cantidad)?.toLocaleString('es-CO')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: CLIENTE, DESCUENTOS Y COBRO */}
        <div className="space-y-4">
          
          {/* SECCIÓN CLIENTE */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Cliente Asignado</span>
              <button 
                type="button" 
                onClick={() => setMostrarModalNuevoCliente(true)} 
                className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
              >
                + Crear Nuevo
              </button>
            </div>
            
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex justify-between items-center">
              <div>
                <p className="font-bold text-slate-900 text-sm">{clienteNombre}</p>
                <p className="text-[11px] text-slate-400 font-mono">ID: #{clienteId}</p>
              </div>
              {clienteId !== 1 && (
                <button 
                  onClick={() => { setClienteId(1); setClienteNombre('Cliente General (Mostrador)'); }} 
                  className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>

            {/* Buscador de cliente */}
            <div className="relative">
              <input
                ref={inputBuscadorClientesRef}
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="🔍 Buscar cliente... (Atajo: F2)"
                className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs outline-none focus:border-emerald-500"
              />
              {clientesEncontrados.length > 0 && (
                <div className="absolute top-10 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-40 overflow-y-auto divide-y divide-slate-100">
                  {clientesEncontrados.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setClienteId(c.id);
                        setClienteNombre(c.nombre);
                        setBusquedaCliente('');
                        setClientesEncontrados([]);
                      }}
                      className="w-full p-2 text-left hover:bg-slate-50 text-xs font-bold text-slate-800 flex justify-between cursor-pointer"
                    >
                      <span>{c.nombre}</span>
                      <span className="text-slate-400 font-mono">{c.telefono || 'Sin tel'}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* PANEL DE COBRO, PAGO MIXTO Y DEVOLUCIÓN */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              {descuentoMonto > 0 ? (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Subtotal Original</span>
                  <span className="text-lg font-bold text-amber-400/80 block line-through">
                    ${subtotalVenta?.toLocaleString('es-CO')} COP
                  </span>
                </div>
              ) : (
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Subtotal</span>
                  <span className="text-lg font-bold text-slate-200 block">
                    ${subtotalVenta?.toLocaleString('es-CO')} COP
                  </span>
                </div>
              )}

              {/* PANEL DE DESCUENTO */}
              <div className="mt-3 p-3 bg-slate-800/80 rounded-xl border border-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-amber-400">🏷️ Descuento (COP)</label>
                  <input
                    type="number"
                    min={0}
                    value={descuentoMonto || ''}
                    onChange={(e) => setDescuentoMonto(Number(e.target.value))}
                    placeholder="0"
                    className="w-28 h-8 rounded-lg bg-slate-900 border border-slate-600 px-2 text-right font-mono text-sm font-bold text-amber-400 outline-none focus:border-amber-400"
                  />
                </div>

                {descuentoMonto > 0 && (
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Justificación *</label>
                    <input
                      type="text"
                      value={motivoDescuento}
                      onChange={(e) => setMotivoDescuento(e.target.value)}
                      placeholder="Ej: Cliente VIP / Autorizado"
                      className="w-full h-8 rounded-lg bg-slate-900 border border-slate-600 px-2 text-xs text-white outline-none focus:border-amber-400"
                    />
                  </div>
                )}
              </div>

              <div className="mt-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 block mb-0.5">Total Neto a Cobrar</span>
                <span className="text-3xl font-black text-white block">
                  ${totalVentaConDescuento?.toLocaleString('es-CO')} COP
                </span>
              </div>
            </div>

            {/* SECCIÓN MÉTODOS DE PAGO Y CALCULADORA EN VIVO */}
            <div className="mt-4 space-y-3 border-t border-slate-800 pt-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 block mb-1 uppercase">Método de Pago</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['EFECTIVO', 'TRANSFERENCIA', 'CREDITO', 'MIXTO'] as const).map((met) => (
                    <button
                      key={met}
                      type="button"
                      onClick={() => { setMetodoPago(met); setMontoEfectivo(''); setMontoTransferencia(''); }}
                      className={`py-1.5 rounded-lg text-[10px] font-bold border transition cursor-pointer ${
                        metodoPago === met ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {met === 'EFECTIVO' ? '💵 Efectivo' : met === 'TRANSFERENCIA' ? '📲 Nequi' : met === 'CREDITO' ? '📝 Crédito' : '🔀 Mixto'}
                    </button>
                  ))}
                </div>
              </div>

              {/* SI SELECCIONA EFECTIVO */}
              {metodoPago === 'EFECTIVO' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Efectivo Entregado por el Cliente</label>
                  <input
                    type="number"
                    value={montoEfectivo}
                    onChange={(e) => setMontoEfectivo(e.target.value)}
                    placeholder={`Ej: ${totalVentaConDescuento}`}
                    className="w-full h-9 rounded-lg bg-slate-800 border border-slate-700 px-3 text-sm font-bold text-emerald-400 outline-none focus:border-emerald-500"
                  />
                </div>
              )}

              {/* SI SELECCIONA TRANSFERENCIA */}
              {metodoPago === 'TRANSFERENCIA' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">Comprobante Nequi / Bancolombia</label>
                  <input
                    type="text"
                    value={referenciaPago}
                    onChange={(e) => setReferenciaPago(e.target.value)}
                    placeholder="Ej: Nequi #8492"
                    className="w-full h-8 rounded-lg bg-slate-800 border border-slate-700 px-2 text-xs text-white outline-none"
                  />
                </div>
              )}

              {/* SI SELECCIONA PAGO MIXTO */}
              {metodoPago === 'MIXTO' && (
                <div className="space-y-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">💵 Monto Efectivo</label>
                    <input
                      type="number"
                      value={montoEfectivo}
                      onChange={(e) => setMontoEfectivo(e.target.value)}
                      placeholder="0"
                      className="w-full h-8 bg-slate-900 border border-slate-600 rounded-lg px-2 font-bold text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-0.5">🏦 Monto Transferencia</label>
                    <input
                      type="number"
                      value={montoTransferencia}
                      onChange={(e) => setMontoTransferencia(e.target.value)}
                      placeholder="0"
                      className="w-full h-8 bg-slate-900 border border-slate-600 rounded-lg px-2 font-bold text-white outline-none"
                    />
                  </div>
                  {valTransferencia > 0 && (
                    <input
                      type="text"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                      placeholder="Comprobante #"
                      className="w-full h-7 bg-slate-900 border border-slate-600 rounded-lg px-2 text-[10px] text-slate-300 outline-none"
                    />
                  )}
                </div>
              )}

              {/* 🟢 CALCULADORA EN VIVO DE CAMBIO / SALDO PENDIENTE */}
              <div className="bg-slate-800/90 p-2.5 rounded-xl border border-slate-700/80 text-xs font-bold space-y-1">
                <div className="flex justify-between text-slate-400">
                  <span>Monto Recibido:</span>
                  <span>${totalIngresado.toLocaleString('es-CO')}</span>
                </div>
                {faltaPorPagar > 0 && metodoPago === 'MIXTO' ? (
                  <div className="flex justify-between text-amber-400 font-bold">
                    <span>Falta por Pagar:</span>
                    <span>${faltaPorPagar.toLocaleString('es-CO')}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-emerald-400 text-sm font-black pt-1 border-t border-slate-700">
                    <span>DEVUELTA / CAMBIO:</span>
                    <span>${cambioDevolver.toLocaleString('es-CO')}</span>
                  </div>
                )}
              </div>

              <button
                onClick={handleFinalizarVenta}
                disabled={procesando || carrito.length === 0 || (metodoPago === 'MIXTO' && faltaPorPagar > 0)}
                className="w-full h-12 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black rounded-xl text-sm transition shadow-lg flex items-center justify-center cursor-pointer mt-2"
              >
                {procesando ? 'Procesando Venta...' : '✅ COMPLETAR VENTA (Ctrl+Enter)'}
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL CREAR CLIENTE */}
      {mostrarModalNuevoCliente && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base">Crear Cliente Mayorista</h3>
            <form onSubmit={handleCrearClienteDirecto} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  placeholder="Ej: Distribuidora Los Andes"
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Teléfono / WhatsApp</label>
                <input
                  type="text"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                  placeholder="3001234567"
                  className="w-full h-10 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMostrarModalNuevoCliente(false)}
                  className="flex-1 h-10 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardandoCliente}
                  className="flex-1 h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                >
                  {guardandoCliente ? 'Guardando...' : 'Guardar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPONENTE MODAL DE IMPRESIÓN Y TICKET */}
      {mostrarTicket && datosUltimaVenta && (
        <TicketPOS
          venta={datosUltimaVenta}
          onCerrar={() => {
            setMostrarTicket(false);
            setDatosUltimaVenta(null);
          }}
        />
      )}

    </div>
  );
}