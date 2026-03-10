import React, { useState, useEffect } from 'react';
import logo from './assets/logo-nuevo.png'; 

function App() {
  const [pantalla, setPantalla] = useState('inicio');
  const [auth, setAuth] = useState({ token: localStorage.getItem('token'), usuario: JSON.parse(localStorage.getItem('usuario') || 'null') });
  const [datosAuth, setDatosAuth] = useState({ email: '', password: '', nombre: '' });
  const [esRegistro, setEsRegistro] = useState(false);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({ modelo: '', precio: '', stock: '', categoriaId: '' });
  const [listaProductos, setListaProductos] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('todos');
  const [editando, setEditando] = useState(false);
  const [idProductoAEditar, setIdProductoAEditar] = useState(null);
  const [listaCategorias, setListaCategorias] = useState<any[]>([]);

  const colores = {
    fondo: '#050510',
    neonAzul: '#00d2ff',
    neonMorado: '#9d50bb',
    tarjeta: 'rgba(255, 255, 255, 0.05)',
    texto: '#ffffff'
  };

  useEffect(() => {
    if (auth.token) {
      cargarCategorias();
      cargarProductos();
    }
  }, [auth.token, pantalla]);

  const cargarProductos = async () => {
    try {
      const respuesta = await fetch('http://localhost:3000/api/productos', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      const datos = await respuesta.json();
      setListaProductos(Array.isArray(datos) ? datos : []);
    } catch (e) { console.error(e); }
  };

  const cargarCategorias = async () => {
    try {
      const respuesta = await fetch('http://localhost:3000/api/categorias', {
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      const datos = await respuesta.json();
      if (Array.isArray(datos)) setListaCategorias(datos);
    } catch (e) { console.error(e); }
  };

  const manejarLogin = async () => {
    try {
      const respuesta = await fetch('http://localhost:3000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: datosAuth.email, password: datosAuth.password })
      });
      const data = await respuesta.json();
      if (respuesta.ok) {
        setAuth({ token: data.token, usuario: data.usuario });
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
      } else { alert(data.msg || "Error"); }
    } catch (e) { alert("Error de conexión"); }
  };

  const guardarEnBD = async () => {
    const datosParaEnviar = {
      nombre: nuevoProducto.modelo, 
      precio: Number(nuevoProducto.precio),
      stock: Number(nuevoProducto.stock),
      categoriaId: Number(nuevoProducto.categoriaId)
    };
    try {
      const URL = editando ? `http://localhost:3000/api/productos/${idProductoAEditar}` : 'http://localhost:3000/api/productos';
      const respuesta = await fetch(URL, { 
        method: editando ? 'PUT' : 'POST', 
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.token}` },
        body: JSON.stringify(datosParaEnviar)
      });
      if (respuesta.ok) {
        setMostrarFormulario(false);
        setEditando(false);
        cargarProductos(); 
      }
    } catch (e) { alert("Error"); }
  };

  const eliminarDeBD = async (id: number) => {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await fetch(`http://localhost:3000/api/productos/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${auth.token}` }
      });
      cargarProductos();
    } catch (e) { alert("Error"); }
  };

  const prepararEdicion = (p: any) => {
    setNuevoProducto({ modelo: p.nombre, precio: p.precio, stock: p.stock, categoriaId: p.categoriaId.toString() });
    setIdProductoAEditar(p.id);
    setEditando(true);
    setMostrarFormulario(true);
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', backgroundColor: colores.fondo, color: colores.texto, fontFamily: 'sans-serif' }}>
      <nav style={{ padding: '1rem 5%', display: 'flex', justifyContent: 'space-between', background: '#0a0a19', borderBottom: `1px solid ${colores.neonAzul}55` }}>
        <h1 style={{ margin: 0 }}>ACCESS<span style={{ color: colores.neonAzul }}>PHONE</span></h1>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
          <button onClick={() => setPantalla('inicio')} style={navLinkStyle(pantalla === 'inicio', colores)}>INICIO</button>
          <button onClick={() => setPantalla('inventario')} style={navLinkStyle(pantalla === 'inventario', colores)}>INVENTARIO</button>
          <button onClick={() => setPantalla('reportes')} style={navLinkStyle(pantalla === 'reportes', colores)}>REPORTES</button>
          {auth.token && (
            <button onClick={() => { localStorage.clear(); window.location.reload(); }} style={{ color: '#ff4b2b', border: '1px solid #ff4b2b', background: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>SALIR</button>
          )}
        </div>
      </nav>

      <main style={{ padding: '2rem 10%' }}>
        {!auth.token ? (
          <div style={{ maxWidth: '400px', margin: 'auto', padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px' }}>
            <input type="email" placeholder="Email" style={inputStyle} onChange={(e) => setDatosAuth({...datosAuth, email: e.target.value})} />
            <input type="password" placeholder="Pass" style={inputStyle} onChange={(e) => setDatosAuth({...datosAuth, password: e.target.value})} />
            <button onClick={manejarLogin} style={{ ...botonGuardarStyle, width: '100%', marginTop: '10px' }}>ENTRAR</button>
          </div>
        ) : (
          <>
            {pantalla === 'inicio' && (
              <div>
                <h2>Bienvenida, <span style={{ color: colores.neonAzul }}>Andrea</span></h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                  {listaCategorias.map((cat) => (
                    <div key={cat.id} onClick={() => { setFiltroCategoria(cat.id.toString()); setPantalla('inventario'); }} style={cardStyle(colores.neonAzul)}>
                      <h3>{cat.nombre.toUpperCase()}</h3>
                    </div>
                  ))}
                  <div onClick={() => { setFiltroCategoria('todos'); setPantalla('inventario'); }} style={cardStyle('#ffffff')}><h3>📦 TODO EL STOCK</h3></div>
                </div>
              </div>
            )}

            {pantalla === 'inventario' && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2>STOCK</h2>
                  <button onClick={() => { setEditando(false); setNuevoProducto({modelo:'', precio:'', stock:'', categoriaId:''}); setMostrarFormulario(true); }} style={botonGuardarStyle}>+ AGREGAR</button>
                </div>
                
                {mostrarFormulario ? (
                  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '15px', marginBottom: '20px' }}>
                    <input type="text" placeholder="Modelo" style={inputStyle} value={nuevoProducto.modelo} onChange={(e) => setNuevoProducto({...nuevoProducto, modelo: e.target.value})} />
                    <input type="number" placeholder="Precio" style={inputStyle} value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})} />
                    <input type="number" placeholder="Stock" style={inputStyle} value={nuevoProducto.stock} onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})} />
                    <select style={inputStyle} value={nuevoProducto.categoriaId} onChange={(e) => setNuevoProducto({...nuevoProducto, categoriaId: e.target.value})}>
                      <option value="">Categoría</option>
                      {listaCategorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    <button onClick={guardarEnBD} style={botonGuardarStyle}>GUARDAR</button>
                    <button onClick={() => setMostrarFormulario(false)} style={botonCancelarStyle}>CANCELAR</button>
                  </div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${colores.neonAzul}` }}>
                        <th style={{ textAlign: 'left' }}>Modelo</th><th>Precio</th><th>Stock</th><th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {listaProductos.filter((p: any) => filtroCategoria === 'todos' || String(p.categoriaId) === String(filtroCategoria)).map((p: any) => (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                          <td>{p.nombre}</td><td style={{ textAlign: 'center' }}>${p.precio}</td><td style={{ textAlign: 'center' }}>{p.stock}</td>
                          <td style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '10px' }}>
                            <button onClick={() => prepararEdicion(p)} style={{ background: colores.neonMorado, color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Editar</button>
                            <button onClick={() => eliminarDeBD(p.id)} style={{ background: '#ff4b2b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Eliminar</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {pantalla === 'reportes' && (
              <div style={{ width: '100%' }}>
                <h2 style={{ fontSize: '2.5rem', borderLeft: `8px solid ${colores.neonMorado}`, paddingLeft: '20px', marginBottom: '30px' }}>REPORTES DEL NEGOCIO</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                  <div style={cardStyle(colores.neonAzul)}>
                    <p style={{ margin: 0, opacity: 0.8 }}>VALOR TOTAL DEL INVENTARIO</p>
                    <h3 style={{ fontSize: '2.5rem', marginTop: '10px' }}>
                      ${listaProductos.reduce((acc: number, p: any) => acc + (Number(p.precio) * Number(p.stock)), 0).toLocaleString()}
                    </h3>
                  </div>
                  <div style={{ ...cardStyle('#ff4b2b'), textAlign: 'left' }}>
                    <p style={{ margin: 0, opacity: 0.8 }}>⚠️ STOCK BAJO (Menos de 5)</p>
                    <div style={{ marginTop: '10px' }}>
                      {listaProductos.filter((p: any) => p.stock < 5).map((p: any) => (
                        <div key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '5px 0' }}>
                          {p.nombre} - <b>{p.stock} unid.</b>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={cardStyle(colores.neonMorado)}>
                    <p style={{ margin: 0, opacity: 0.8 }}>TOTAL UNIDADES EN STOCK</p>
                    <h3 style={{ fontSize: '2.5rem', marginTop: '10px' }}>
                      {listaProductos.reduce((acc: number, p: any) => acc + Number(p.stock), 0)}
                    </h3>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const navLinkStyle = (activo: boolean, c: any) => ({ background: 'none', border: 'none', color: activo ? c.neonAzul : '#fff', fontWeight: 'bold' as const, cursor: 'pointer', borderBottom: activo ? `3px solid ${c.neonAzul}` : '3px solid transparent', padding: '10px 0' });
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', marginBottom: '10px', width: '100%', boxSizing: 'border-box' as const };
const botonGuardarStyle = { background: '#00d2ff', color: '#050510', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold' as const, cursor: 'pointer' };
const botonCancelarStyle = { background: 'transparent', border: '1px solid white', color: 'white', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', marginLeft: '10px' };
const cardStyle = (color: string) => ({ background: 'rgba(255, 255, 255, 0.05)', padding: '30px', borderRadius: '20px', border: `1px solid ${color}44`, cursor: 'default', textAlign: 'center' as const });

export default App;