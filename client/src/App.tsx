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
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>("");
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState(""); // Para guardar lo que escribes en la lupa

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
        body: JSON.stringify({ email: datosAuth.email, passwordPlana: datosAuth.password })
      });
      const data = await respuesta.json();
      if (respuesta.ok) {
        setAuth({ token: data.token, usuario: data.usuario });
        localStorage.setItem('token', data.token);
        localStorage.setItem('usuario', JSON.stringify(data.usuario));
      } else { alert(data.msg || "Error"); }
    } catch (e) { alert("Error de conexión"); }
  };

  const manejarRegistro = async () => {
    try {
        const respuesta = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                nombre: datosAuth.nombre, 
                email: datosAuth.email, 
                password: datosAuth.password 
            })
        });
        const data = await respuesta.json();
        
        if (respuesta.ok) {
            alert("¡Registro exitoso! Ahora puedes entrar con tu correo.");
            setEsRegistro(false); // Volvemos a la pantalla de Login
        } else {
            alert(data.msg || "Error al registrar");
        }
    } catch (e) {
        alert("Error de conexión al registrar");
    }
};

  const guardarEnBD = async () => {
    const datosParaEnviar = {
      nombre: nuevoProducto.modelo, 
      precio: Number(nuevoProducto.precio),
      stock: Number(nuevoProducto.stock),
      categoriaId: Number(nuevoProducto.categoriaId),
      subcategoriaId: nuevoProducto.subcategoriaId ? Number(nuevoProducto.subcategoriaId) : null
    };
    if (!datosParaEnviar.nombre || !datosParaEnviar.categoriaId) {
    alert("Por favor completa el modelo y la categoría");
    return;
  }
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
        alert("¡Guardado con éxito!");
      } else {
        const errorData = await respuesta.json();
      console.log("DATOS ENVIADOS:", datosParaEnviar);
        console.log("ERROR DEL SERVIDOR:", errorData);
      alert("El servidor rechazó los datos. Revisa la consola.");
    }
    } catch (e) { 
    alert("Error de conexión con el servidor"); 
  }
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

  const manejarEntradaStock = async (id: number) => {
    const cantidad = prompt("¿Cuántas unidades nuevas llegaron de este repuesto?");
    if (!cantidad || isNaN(Number(cantidad))) return;

    try {
      const respuesta = await fetch(`http://localhost:3000/api/productos/${id}/entrada`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}` 
        },
        body: JSON.stringify({ cantidad: Number(cantidad) })
      });

      if (respuesta.ok) {
        alert("✅ Stock actualizado correctamente");
        cargarProductos(); // Esto refresca la tabla automáticamente
      } else {
        alert("❌ Error al actualizar");
      }
    } catch (e) {
      console.error(e);
      alert("Error de conexión");
    }
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
  <div style={{ maxWidth: '400px', margin: 'auto', textAlign: 'center' }}>
    {/* LOGO ENTRADA */}
    <h1 style={{ fontSize: '3.5rem', fontWeight: 'bold', color: 'white', marginBottom: '2rem', letterSpacing: '-2px' }}>
      ACCESS<span style={{ color: colores.neonAzul }}>PHONE</span>
    </h1>

    <div style={{ padding: '2rem', background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: `1px solid ${colores.neonAzul}33` }}>
      {/* Si es registro, mostramos campo de nombre */}
      {esRegistro && (
        <input type="text" placeholder="Nombre completo" style={inputStyle} onChange={(e) => setDatosAuth({...datosAuth, nombre: e.target.value})} />
      )}
      
      <input type="email" placeholder="Correo electrónico" style={inputStyle} onChange={(e) => setDatosAuth({...datosAuth, email: e.target.value})} />
      <input type="password" placeholder="Contraseña" style={inputStyle} onChange={(e) => setDatosAuth({...datosAuth, password: e.target.value})} />
      
      <button 
        onClick={esRegistro ? manejarRegistro : manejarLogin}
        style={{ ...botonGuardarStyle, width: '100%', marginTop: '10px' }}
      >
        {esRegistro ? 'CREAR CUENTA' : 'ENTRAR'}
      </button>

      {/* BOTÓN PARA TU COMPAÑERA */}
      <p style={{ marginTop: '20px', fontSize: '14px', color: 'rgba(255,255,255,0.6)' }}>
        {esRegistro ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?'} 
        <span 
          onClick={() => setEsRegistro(!esRegistro)} 
          style={{ color: colores.neonAzul, cursor: 'pointer', marginLeft: '5px', fontWeight: 'bold' }}
        >
          {esRegistro ? 'Inicia sesión' : 'Regístrala aquí'}
        </span>
      </p>
    </div>
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
                 <h2>STOCK {filtroCategoria !== 'todos' && ` - ${listaCategorias.find(c => String(c.id) === String(filtroCategoria))?.nombre.toUpperCase()}`}</h2>
                  {/* LUPA DE BÚSQUEDA */}
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    background: 'rgba(255,255,255,0.05)', 
    padding: '8px 15px', 
    borderRadius: '10px', 
    border: `1px solid ${colores.neonAzul}`, 
    flex: 1,
    maxWidth: '400px' 
  }}>
    <span style={{ marginRight: '10px' }}>🔍</span>
    <input 
      type="text" 
      placeholder="Buscar por modelo (ej: iPhone 11)..." 
      value={busqueda}
      onChange={(e) => setBusqueda(e.target.value)}
      style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%' }}
    />
  </div>
                  <button onClick={() => { setEditando(false); setNuevoProducto({modelo:'', precio:'', stock:'', categoriaId:''}); setMostrarFormulario(true); }} style={botonGuardarStyle}>+ AGREGAR</button>
                </div>
                
                {mostrarFormulario ? (
  <div style={{ background: 'rgba(255,255,255,0.05)', padding: '2rem', borderRadius: '15px', marginBottom: '20px' }}>
    <input type="text" placeholder="Modelo" style={inputStyle} value={nuevoProducto.modelo} onChange={(e) => setNuevoProducto({...nuevoProducto, modelo: e.target.value})} />
    <input type="number" placeholder="Precio" style={inputStyle} value={nuevoProducto.precio} onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})} />
    <input type="number" placeholder="Stock" style={inputStyle} value={nuevoProducto.stock} onChange={(e) => setNuevoProducto({...nuevoProducto, stock: e.target.value})} />
    
    {/* SELECTOR DE CATEGORÍA */}
    <select 
      style={inputStyle} 
      value={nuevoProducto.categoriaId} 
      onChange={(e) => {
        const idSeleccionado = e.target.value;
        const catEncontrada = listaCategorias.find(c => String(c.id) === String(idSeleccionado));
        
        setNuevoProducto({
          ...nuevoProducto, 
          categoriaId: idSeleccionado,
          // Limpiamos subcategoría si no es Vidrio ni Estuche para que no se crucen los datos
          subcategoriaId: (catEncontrada?.nombre === 'Vidrios' || catEncontrada?.nombre === 'Estuches') 
            ? nuevoProducto.subcategoriaId 
            : null 
        });
      }}
    >
      <option value="">Categoría</option>
      {listaCategorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
    </select>

    {/* SELECTOR DINÁMICO PARA VIDRIOS O ESTUCHES */}
    {(() => {
     const catNombreRaw = listaCategorias.find(c => String(c.id) === String(nuevoProducto.categoriaId))?.nombre || "";
  const catNombre = catNombreRaw.toUpperCase();
      if (catNombre === 'Vidrios' || catNombre === 'Estuches') {
        return (
          <select 
            style={{...inputStyle, border: `1px solid ${colores.neonAzul}`, marginTop: '5px'}} 
            value={nuevoProducto.subcategoriaId || ""}
            onChange={(e) => setNuevoProducto({...nuevoProducto, subcategoriaId: e.target.value ? Number(e.target.value) : null})}
          >
            <option value="">-- Seleccione Tipo de {catNombre === 'Vidrios' ? 'Vidrio' : 'Estuche'} --</option>
            {catNombre === 'Vidrios' ? (
              <>
                <option value="1">5D</option>
                <option value="2">Cerámico</option>
                <option value="3">Blindado</option>
                <option value="4">Mate</option>
              </>
            ) : (
              <>
                <option value="5">Silicona</option>
                <option value="6">Con Diseño</option>
                <option value="7">Space</option>
                <option value="8">Unicolor</option>
              </>
            )}
          </select>
        );
      }
      return null;
    })()}

    <div style={{ marginTop: '20px' }}>
      <button onClick={guardarEnBD} style={botonGuardarStyle}>GUARDAR</button>
      <button onClick={() => setMostrarFormulario(false)} style={botonCancelarStyle}>CANCELAR</button>
    </div>
  </div>
) : (
 <table style={{ width: '100%', borderCollapse: 'collapse' }}>
<thead>
<tr style={{ borderBottom: `2px solid ${colores.neonAzul}` }}>
<th style={{ textAlign: 'left' }}>Modelo</th><th>Precio</th><th>Stock</th><th>Acciones</th>
</tr>
</thead>
<tbody>
  {/* Esta es la parte que decide qué productos se muestran */}
  {listaProductos.filter((p: any) => {
    if (filtroCategoria === 'todos') return true;
    
    // Buscamos si el ID del producto coincide con el filtro de la pestaña
    const coincideId = String(p.categoriaId) === String(filtroCategoria);
    
    // También buscamos por nombre por si la pestaña usa el nombre "Vidrios"
    const categoria = listaCategorias.find(c => String(c.id) === String(p.categoriaId));
    const coincideNombre = categoria?.nombre === filtroCategoria;

    return coincideId || coincideNombre;
  }).map((p: any) => (
    <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
      {/* Mostramos el nombre y, si es vidrio, su tipo al lado */}
      <td>
  {p.nombre}
  {p.subcategoriaId && (
    <span style={{ fontSize: '11px', color: '#00ff88', marginLeft: '10px', fontStyle: 'italic' }}>
      {p.subcategoriaId === 1 ? '(5D)' : 
       p.subcategoriaId === 2 ? '(Cerámico)' : 
       p.subcategoriaId === 3 ? '(Blindado)' : 
       p.subcategoriaId === 4 ? '(Mate)' : 
       p.subcategoriaId === 5 ? '(Silicona)' : 
       p.subcategoriaId === 6 ? '(Diseño)' : 
       p.subcategoriaId === 7 ? '(Space)' : 
       p.subcategoriaId === 8 ? '(Unicolor)' : 
       ''}
    </span>
  )}
</td>
      <td style={{ textAlign: 'center' }}>${p.precio}</td>
      <td style={{ textAlign: 'center' }}>{p.stock}</td>
      
      {/* TUS BOTONES ORIGINALES (No los toqué) */}
      <td style={{ display: 'flex', gap: '10px', justifyContent: 'center', padding: '10px' }}>
        <button onClick={() => prepararEdicion(p)} style={{ background: '#7000ff', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Editar</button>
        <button onClick={() => eliminarDeBD(p.id)} style={{ background: '#ff4b2b', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>Eliminar</button>
        <button onClick={() => manejarEntradaStock(p.id)} style={{ background: '#00ff88', color: '#050510', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>+ Stock</button>
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