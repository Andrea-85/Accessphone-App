import React, { useState, useEffect } from 'react';
import logo from './assets/logo-nuevo.png'; 
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Registramos los componentes de las gráficas
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

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
  const [mostrarReporteDano, setMostrarReporteDano] = useState(false);
  const [productoSeleccionadoDano, setProductoSeleccionadoDano] = useState<any>(null);
  const [motivoDano, setMotivoDano] = useState("");

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

  const datosGraficaCategorias = {
    labels: listaCategorias.map (c => c.nombre),
    datasets: [
      { 
        label : "Valor en Inventario",
        data: listaCategorias.map (cat => {
          return listaProductos
          .filter(p => String(p. categoriaId) === String(cat.id))
          .reduce((acc, p) => acc + (Number(p.precio) * Number(p.stock)), 0);
        }),
        backgroundColor: [
          '#00ff88', '#7000ff', '#00d1ff', '#ff0055', '#ffcc00'
        ],
        borderWidth: 1,
      },
    ],      
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
    <> {/* <--- Agrega esto */}
      <button 
        onClick={() => setPantalla('novedades')} 
        style={navLinkStyle(pantalla === 'novedades', colores)}
      >
        NOVEDADES
      </button>
      <button 
        onClick={() => { localStorage.clear(); window.location.reload(); }} 
        style={{ color: '#ff4b2b', border: '1px solid #ff4b2b', background: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}
      >
        SALIR
      </button>
    </> // <--- Y cierra con esto
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
        onClick={esRegistro ? manejarRegistro : manejarLogin} style={{ ...botonGuardarStyle, width: '100%', marginTop: '10px' }}
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

    {/* SELECTOR DINÁMICO MEJORADO */}
{(() => {
  const categoriaSeleccionada = listaCategorias.find(c => String(c.id) === String(nuevoProducto.categoriaId));
  const nombreCat = (categoriaSeleccionada?.nombre || "").toUpperCase().trim();

  // Si la categoría es Vidrios o Estuches, mostramos el menú
  if (nombreCat === 'VIDRIOS' || nombreCat === 'ESTUCHES' || nombreCat === 'ACCESORIOS') {
    return (
      <div style={{ marginTop: '10px' }}>
        <label style={{ fontSize: '0.8rem', color: colores.neonAzul }}>Tipo de {nombreCat}:</label>
        <select 
          style={{...inputStyle, border: `1px solid ${colores.neonAzul}`, marginTop: '5px'}} 
          value={nuevoProducto.subcategoriaId || ""}
          onChange={(e) => setNuevoProducto({...nuevoProducto, subcategoriaId: e.target.value === 'nueva' ? 'nueva' : Number(e.target.value)})}
        >
          <option value="">-- Seleccione --</option>
          {nombreCat === 'VIDRIOS' ? (
            <>
              <option value="1">5D</option>
              <option value="2">Cerámico</option>
              <option value="3">Blindado</option>
            </>
          ) : (
            <>
              <option value="5">Silicona</option>
              <option value="6">Con Diseño</option>
              <option value="7">Space</option>
              <option value="8">Unicolor</option>
            </>
          )}
          <option value="nueva" style={{ color: colores.neonRosa, fontWeight: 'bold' }}>+ CREAR NUEVA TIPO...</option>
        </select>

        {/* CAMPO PARA CREAR SI ELIGEN "NUEVA" */}
        {nuevoProducto.subcategoriaId === 'nueva' && (
          <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
            <input 
              type="text" 
              placeholder="Nombre del nuevo tipo..." 
              style={{ ...inputStyle, flex: 1 }}
              id="nombreNuevaSub"
            />
            <button 
              onClick={() => {
                const input = document.getElementById('nombreNuevaSub') as HTMLInputElement;
                if(input.value) alert("Guardando nueva subcategoría: " + input.value);
                // Aquí llamaremos a la función crearSubcategoria que hicimos antes
              }}
              style={{ ...botonGuardarStyle, padding: '5px' }}
            >
              Añadir
            </button>
          </div>
        )}
      </div>
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
      <button 
  onClick={() => {
    setProductoSeleccionadoDano(producto);
    setMostrarReporteDano(true);
  }}
  style={{ background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: '10px' }}
  title="Reportar Daño"
>
  🚩
</button>
      </td>
    </tr>
  ))}
</tbody>
                  </table>
                )}
              </div>
            )}

            {pantalla === 'reportes' && (
  <div style={{ padding: '20px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h2 style={{ borderLeft: '5px solid #7000ff', paddingLeft: '15px' }}>INFORME ESTRATÉGICO</h2>
      <button 
        onClick={() => {
          const doc = new jsPDF();
          doc.text("ACCESSPHONE - REPORTE DE INVENTARIO", 10, 10);
          autoTable(doc, {
            head: [['Categoría', 'Valor Total']],
            body: listaCategorias.map(cat => [
              cat.nombre,
              "$" + listaProductos
                .filter(p => String(p.categoriaId) === String(cat.id))
                .reduce((acc, p) => acc + (Number(p.precio) * Number(p.stock)), 0).toLocaleString()
            ]),
          });
          doc.save(`Reporte_Accessphone_${new Date().toLocaleDateString()}.pdf`);
        }}
        style={{ ...botonGuardarStyle, background: '#ff0055' }}
      >
        📥 DESCARGAR PDF
      </button>
    </div>

    {/* TARJETAS SUPERIORES RECUADRADAS */}
<div style={{ 
  display: 'grid', 
  gridTemplateColumns: 'repeat(3, 1fr)', // Esto fuerza a que sean 3 columnas iguales
  gap: '15px', 
  marginBottom: '30px' 
}}>
  {/* Tarjeta 1: Valor Total */}
  <div style={cardStyle(colores.neonAzul)}>
    <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>VALOR TOTAL INVENTARIO</p>
    <h3 style={{ fontSize: '1.8rem' }}>
      ${listaProductos.reduce((acc: number, p: any) => acc + (Number(p.precio) * Number(p.stock)), 0).toLocaleString()}
    </h3>
  </div>

  {/* Tarjeta 2: Stock Bajo (LA QUE SE HABÍA PERDIDO) */}
  <div style={cardStyle('#ff4444')}>
    <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>⚠️ STOCK BAJO (Menos de 5)</p>
    {listaProductos.filter(p => Number(p.stock) < 5).length > 0 ? (
      <h3 style={{ fontSize: '1.8rem', color: '#ffcc00' }}>
        {listaProductos.filter(p => Number(p.stock) < 5).length} Productos
      </h3>
    ) : (
      <h3 style={{ fontSize: '1.2rem', marginTop: '10px', color: '#00ff88' }}>✅ Todo al día</h3>
    )}
  </div>

  {/* Tarjeta 3: Unidades Totales */}
  <div style={cardStyle('#7000ff')}>
    <p style={{ fontSize: '0.7rem', opacity: 0.8 }}>📦 UNIDADES EN STOCK</p>
    <h3 style={{ fontSize: '1.8rem' }}>
      {listaProductos.reduce((acc: number, p: any) => acc + Number(p.stock), 0)}
    </h3>
  </div>
</div>

    {/* SECCIÓN DE GRÁFICAS */}
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '20px', background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '15px' }}>
      <div style={{ textAlign: 'center' }}>
        <h4>Distribución por Categoría</h4>
        <div style={{ width: '300px', margin: '0 auto' }}>
          <Doughnut data={datosGraficaCategorias} />
        </div>
      </div>
      {/* SECCIÓN DE RECOMENDACIÓN DE INVERSIÓN */}
<div style={{ 
  marginTop: '30px', 
  padding: '20px', 
  background: 'rgba(112, 0, 255, 0.1)', 
  border: '1px solid #7000ff', 
  borderRadius: '15px' 
}}>
  <h4 style={{ color: '#00d1ff' }}>💡 Sugerencia de Inversión</h4>
  <p style={{ fontSize: '1rem' }}>
    {listaProductos.filter(p => Number(p.stock) < 3).length > 0 ? (
      <>
        Andrea, tienes <strong>{listaProductos.filter(p => Number(p.stock) < 3).length} productos</strong> críticos. 
        Te sugiero invertir primero en reponer <strong>{listaProductos.find(p => Number(p.stock) < 3)?.modelo}</strong>.
      </>
    ) : (
      "Tu stock está sano. Si tienes capital extra, podrías invertir en nuevas tendencias de Estuches para aumentar variedad."
    )}
  </p>
  
  {/* Botón rápido para ver qué falta */}
  <button 
    onClick={() => setFiltroCategoria('bajo-stock')} // Si creamos este filtro
    style={{ ...botonGuardarStyle, marginTop: '10px', fontSize: '0.8rem' }}
  >
    VER LISTA DE COMPRAS SUGERIDA
  </button>
</div>
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <h4>Análisis de Inversión</h4>
        <p style={{ fontSize: '0.9rem', color: '#ccc' }}>
          Este gráfico muestra dónde tienes invertido tu capital actualmente. 
          Recuerda que los <strong>Estuches</strong> suelen tener mayor rotación.
        </p>
      </div>
    </div>
  </div>
)}
{pantalla === 'novedades' && (
  <div style={{ padding: '20px' }}>
    <h2 style={{ borderLeft: '5px solid #ffcc00', paddingLeft: '15px' }}>GESTIÓN DE NOVEDADES</h2>
    <p style={{ opacity: 0.7 }}>Aquí verás el historial de productos dañados o devoluciones.</p>
    
    <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '15px', marginTop: '20px' }}>
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #333' }}>
            <th style={{ padding: '10px' }}>Fecha</th>
            <th>Producto</th>
            <th>Cantidad</th>
            <th>Motivo</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: '10px', opacity: 0.5 }}>{new Date().toLocaleDateString()}</td>
            <td>Ejemplo: Vidrio 5D</td>
            <td>5</td>
            <td>Dañado por transportadora</td>
            <td style={{ color: '#ffcc00' }}>Pendiente de Revisión</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
)}
          </>
        )}
      </main>
     {mostrarReporteDano && (
  <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
    <div style={{ background: '#1a1a1a', padding: '25px', borderRadius: '15px', border: `1px solid ${colores.neonRosa}`, width: '400px' }}>
      <h3 style={{ color: colores.neonRosa }}>🚩 Reportar Daño / Baja</h3>
      <p>Producto: <strong>{productoSeleccionadoDano?.modelo}</strong></p>
      
      <label style={{ fontSize: '0.8rem', marginTop: '10px', display: 'block' }}>¿Cuántas unidades se dañaron?</label>
      <input 
        type="number" 
        id="cantidadDano" 
        defaultValue="1" 
        style={{ ...inputStyle, width: '60px', marginBottom: '15px' }} 
      />

      <label style={{ fontSize: '0.8rem', display: 'block' }}>Motivo (Fábrica, Transporte, Local):</label>
      <textarea id="motivoDano" placeholder="Ej: Llegó quebrado en la caja..." style={{ ...inputStyle, height: '60px' }} />
      
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
        <button onClick={() => setMostrarReporteDano(false)} style={{ flex: 1, padding: '10px', borderRadius: '5px' }}>Cancelar</button>
        <button 
          onClick={() => {
            const cant = Number((document.getElementById('cantidadDano') as HTMLInputElement).value);
            const mot = (document.getElementById('motivoDano') as HTMLInputElement).value;
            
            // LÓGICA DE RESTA AUTOMÁTICA
            const listaActualizada = listaProductos.map(p => {
              if (p.id === productoSeleccionadoDano.id) {
                return { ...p, stock: p.stock - cant }; // Restamos la cantidad
              }
              return p;
            });
            
            setListaProductos(listaActualizada); // Actualizamos el inventario visualmente
            alert(`¡Inventario Actualizado! Se descontaron ${cant} unidades de ${productoSeleccionadoDano.modelo}`);
            setMostrarReporteDano(false);
          }} 
          style={{ flex: 1, padding: '10px', background: colores.neonRosa, color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Confirmar y Restar
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

const navLinkStyle = (activo: boolean, c: any) => ({ background: 'none', border: 'none', color: activo ? c.neonAzul : '#fff', fontWeight: 'bold' as const, cursor: 'pointer', borderBottom: activo ? `3px solid ${c.neonAzul}` : '3px solid transparent', padding: '10px 0' });
const inputStyle = { padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(0,0,0,0.3)', color: 'white', marginBottom: '10px', width: '100%', boxSizing: 'border-box' as const };
const botonGuardarStyle = { background: '#00d2ff', color: '#050510', border: 'none', padding: '12px 20px', borderRadius: '10px', fontWeight: 'bold' as const, cursor: 'pointer' };
const botonCancelarStyle = { background: 'transparent', border: '1px solid white', color: 'white', padding: '12px 20px', borderRadius: '10px', cursor: 'pointer', marginLeft: '10px' };
const cardStyle = (color: string) => ({ background: 'rgba(255, 255, 255, 0.05)', padding: '30px', borderRadius: '20px', border: `1px solid ${color}44`, cursor: 'default', textAlign: 'center' as const });

export default App;