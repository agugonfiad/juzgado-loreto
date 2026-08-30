"use client"

import { useState, useEffect } from "react"
import { buscarInfraccionPorDni } from "./actions/actas"
import { procesarTramiteCiudadano, procesarNoticia } from "./actions/subidas"
import { inicializarSistema, iniciarSesion, obtenerActasAdmin, obtenerDescargosAdmin, obtenerPagosAdmin, resolverDescargo, conciliarPago, crearActa, eliminarActa, obtenerUsuariosAdmin, crearUsuarioAdmin, toggleEstadoUsuario, cambiarContrasena, obtenerNoticiasAdmin, eliminarNoticia, eliminarUsuario } from "./actions/admin"

export default function JuzgadoFaltasUnificado() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [vista, setVista] = useState<'publica' | 'admin_actas' | 'admin_descargos' | 'admin_pagos' | 'admin_usuarios' | 'admin_noticias'>('publica')

  const [autenticado, setAutenticado] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [usuario, setUsuario] = useState<{nombre: string, rol: string} | null>(null)
  
  const [datosAdmin, setDatosAdmin] = useState<any[]>([])
  const [noticiasPublicas, setNoticiasPublicas] = useState<any[]>([])
  const [cargandoAdmin, setCargandoAdmin] = useState(false)
  
  const [itemModal, setItemModal] = useState<any>(null)
  const [textoResolucion, setTextoResolucion] = useState("")
  const [procesando, setProcesando] = useState(false)

  const [dni, setDni] = useState("")
  const [resultados, setResultados] = useState<any[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [tramiteActivo, setTramiteActivo] = useState<{ id: string, tipo: 'pago' | 'descargo' } | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Estados Formularios Carga
  const [nuevoNroActa, setNuevoNroActa] = useState(""); const [nuevoNombre, setNuevoNombre] = useState(""); const [nuevoDni, setNuevoDni] = useState(""); const [nuevoLugar, setNuevoLugar] = useState(""); const [nuevoArticulo, setNuevoArticulo] = useState(""); const [nuevoInspector, setNuevoInspector] = useState(""); const [nuevoMonto, setNuevoMonto] = useState(""); const [nuevoTipo, setNuevoTipo] = useState("TRANSITO"); const [guardandoActa, setGuardandoActa] = useState(false);
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState(""); const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState(""); const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState("ADMINISTRATIVO"); const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [modalPassword, setModalPassword] = useState(false); const [passActual, setPassActual] = useState(""); const [passNueva, setPassNueva] = useState(""); const [passConfirmar, setPassConfirmar] = useState(""); const [cambiandoPass, setCambiandoPass] = useState(false);

  // Estados Buscador Avanzado
  const [filtroActa, setFiltroActa] = useState("")
  const [filtroDniAdmin, setFiltroDniAdmin] = useState("")
  const [filtroInspector, setFiltroInspector] = useState("")
  const [filtroDireccion, setFiltroDireccion] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  useEffect(() => { obtenerNoticiasAdmin().then(setNoticiasPublicas) }, [])

  const manejarBusqueda = async (e: React.FormEvent) => {
    e.preventDefault(); setBuscando(true); setMensaje(""); setTramiteActivo(null);
    const respuesta = await buscarInfraccionPorDni(dni)
    if (respuesta.success && respuesta.data) {
      setResultados(respuesta.data)
      if (respuesta.data.length === 0) setMensaje("No se registran infracciones para el DNI ingresado.")
    } else { setMensaje("Ocurrió un error al buscar los registros.") }
    setBuscando(false)
  }

  const manejarEnvioTramite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setEnviando(true);
    const formData = new FormData(e.currentTarget)
    const respuesta = await procesarTramiteCiudadano(formData)
    if (respuesta.success) {
      if (respuesta.expedienteNro) { alert(respuesta.esExtemporaneo ? `Trámite EXTEMPORÁNEO.\nExpediente: ${respuesta.expedienteNro}` : `¡Descargo presentado!\nExpediente: ${respuesta.expedienteNro}`) } else { alert("¡Trámite de pago enviado con éxito!") }
      setTramiteActivo(null); manejarBusqueda(new Event('submit') as any);
    } else { alert("Error: " + respuesta.error) }
    setEnviando(false)
  }

  const procesarLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const auth = await iniciarSesion(email, password)
    if (!auth.success) return alert(auth.error)
    setUsuario(auth.usuario); setAutenticado(true);
    let vistaInicial = 'admin_actas'
    if (auth.usuario.rol === 'LETRADO') vistaInicial = 'admin_descargos'
    if (auth.usuario.rol === 'CONTABLE') vistaInicial = 'admin_pagos'
    setVista(vistaInicial as any); cargarDatosPanel(vistaInicial);
  }

  const cargarDatosPanel = async (vistaDestino: string) => {
    setCargandoAdmin(true)
    if (vistaDestino === 'admin_actas') setDatosAdmin(await obtenerActasAdmin())
    if (vistaDestino === 'admin_descargos') setDatosAdmin(await obtenerDescargosAdmin())
    if (vistaDestino === 'admin_pagos') setDatosAdmin(await obtenerPagosAdmin())
    if (vistaDestino === 'admin_usuarios') setDatosAdmin(await obtenerUsuariosAdmin())
    if (vistaDestino === 'admin_noticias') setDatosAdmin(await obtenerNoticiasAdmin())
    setCargandoAdmin(false)
  }

  const cambiarVistaAdmin = (nuevaVista: string) => { setVista(nuevaVista as any); cargarDatosPanel(nuevaVista); }

  const manejarCrearActa = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardandoActa(true);
    const res = await crearActa({ nroActa: nuevoNroActa, nombreTitular: nuevoNombre, dniTitular: nuevoDni, monto: Number(nuevoMonto), lugar: nuevoLugar, articulo: nuevoArticulo, inspector: nuevoInspector, tipoInfraccion: nuevoTipo as any })
    if (res.success) { setNuevoNroActa(""); setNuevoNombre(""); setNuevoDni(""); setNuevoLugar(""); setNuevoArticulo(""); setNuevoInspector(""); setNuevoMonto(""); setNuevoTipo("TRANSITO"); cargarDatosPanel(vista) } else { alert(res.error) }
    setGuardandoActa(false)
  }

  const manejarCrearNoticia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setProcesando(true);
    const formData = new FormData(e.currentTarget)
    const res = await procesarNoticia(formData)
    if (res.success) {
      alert("Noticia publicada con éxito.");
      (e.target as HTMLFormElement).reset();
      cargarDatosPanel(vista);
      obtenerNoticiasAdmin().then(setNoticiasPublicas); 
    } else { alert("Error: " + res.error) }
    setProcesando(false)
  }

  const manejarEliminarDato = async (id: string, tipo: 'acta'|'noticia') => {
    if (!confirm(`¿Seguro que desea ELIMINAR ${tipo === 'acta' ? 'esta acta' : 'esta noticia'}?`)) return
    const res = tipo === 'acta' ? await eliminarActa(id) : await eliminarNoticia(id)
    if (res.success) { cargarDatosPanel(vista); if(tipo==='noticia') obtenerNoticiasAdmin().then(setNoticiasPublicas); } else { alert(res.error); }
  }

  const manejarEliminarUsuario = async (id: string) => {
    if (!confirm("¿Seguro que desea ELIMINAR definitivamente a este empleado del sistema? Esta acción no se puede deshacer.")) return
    const res = await eliminarUsuario(id)
    if (res.success) { cargarDatosPanel('admin_usuarios'); } else { alert(res.error); }
  }

  const auditarDescargo = async (estado: string) => {
    if (estado === 'RECHAZADO' && !textoResolucion) return alert("Debe justificar el rechazo.")
    setProcesando(true); await resolverDescargo(itemModal.id, estado, textoResolucion);
    setItemModal(null); setTextoResolucion(""); setProcesando(false); cargarDatosPanel(vista);
  }

  const auditarPago = async (estado: string) => {
    setProcesando(true); await conciliarPago(itemModal.id, estado);
    setItemModal(null); setProcesando(false); cargarDatosPanel(vista);
  }

  const manejarCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardandoUsuario(true);
    const res = await crearUsuarioAdmin({ nombre: nuevoUsuarioNombre, email: nuevoUsuarioEmail, rol: nuevoUsuarioRol })
    if (res.success) { setNuevoUsuarioNombre(""); setNuevoUsuarioEmail(""); setNuevoUsuarioRol("ADMINISTRATIVO"); cargarDatosPanel(vista) } else { alert(res.error) }
    setGuardandoUsuario(false)
  }

  const manejarCambioPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passNueva !== passConfirmar) return alert("Las contraseñas nuevas no coinciden.");
    if (passNueva.length < 6) return alert("La nueva contraseña debe tener al menos 6 caracteres.");
    setCambiandoPass(true);
    const res = await cambiarContrasena(email, passActual, passNueva);
    setCambiandoPass(false);
    if (res.success) { alert("Contraseña actualizada con éxito."); setModalPassword(false); setPassActual(""); setPassNueva(""); setPassConfirmar(""); } else { alert(res.error); }
  }

  const actasFiltradas = datosAdmin.filter(item => {
    if (vista !== 'admin_actas') return true;
    const coincideActa = item.nroActa?.toLowerCase().includes(filtroActa.toLowerCase());
    const coincideDni = item.dniTitular?.includes(filtroDniAdmin);
    const coincideInspector = item.inspector?.toLowerCase().includes(filtroInspector.toLowerCase());
    const coincideDireccion = filtroDireccion ? item.tipoInfraccion === filtroDireccion : true;
    const coincideEstado = filtroEstado ? item.estado === filtroEstado : true;
    return coincideActa && coincideDni && coincideInspector && coincideDireccion && coincideEstado;
  });

  const rol = usuario?.rol || ''
  const puedeActas = ['SUPERADMIN', 'JUEZ', 'ADMINISTRATIVO'].includes(rol)
  const puedeDescargos = ['SUPERADMIN', 'JUEZ', 'LETRADO'].includes(rol)
  const puedePagos = ['SUPERADMIN', 'JUEZ', 'CONTABLE'].includes(rol)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --azul-loreto: #0B4A82; --celeste-loreto: #00B2D6; --rojo-loreto: #EB2128; --papel: #FFFFFF; --papel-alto: #F8F9FA; --tinta: #212529; --tinta-suave: #495057; --linea: #DEE2E6; --radius-s: 4px; --radius-m: 10px; --maxw: 1180px; }
        * { box-sizing: border-box; } html { scroll-behavior: smooth; } body { margin: 0; background: var(--papel); color: var(--tinta); font-family: 'Public Sans', system-ui, sans-serif; line-height: 1.55; }
        h1, h2, h3, h4 { font-family: 'Fraunces', Georgia, serif; color: var(--azul-loreto); margin: 0 0 0.5em; line-height: 1.15; font-weight: 600; } a { color: inherit; } .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
        .topbar { background: var(--azul-loreto); color: #FFFFFF; font-size: 13.5px; } .topbar .wrap { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; padding-bottom: 8px; gap: 16px; flex-wrap: wrap; } .topbar a { text-decoration: none; opacity: .9; } .topbar a:hover { opacity: 1; text-decoration: underline; } .topbar__item { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; }
        header.site { background: var(--papel); border-bottom: 1px solid var(--linea); position: sticky; top: 0; z-index: 100; } .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 20px; }
        .brand { display: flex; align-items: center; gap: 14px; text-decoration: none; } .brand__logo { height: 55px; width: auto; flex: none; } .brand__text .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin: 0 0 2px; } .brand__text strong { display: block; font-family: 'Fraunces', serif; font-weight: 600; font-size: 17px; color: var(--azul-loreto); line-height: 1.2; }
        nav.primary { display: flex; align-items: center; gap: 28px; } nav.primary ul { list-style: none; display: flex; gap: 26px; margin: 0; padding: 0; } nav.primary a { text-decoration: none; font-weight: 600; font-size: 14.5px; color: var(--tinta); padding: 6px 2px; border-bottom: 2px solid transparent; cursor: pointer; } nav.primary a:hover, nav.primary a.active { border-color: var(--rojo-loreto); color: var(--azul-loreto); }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: var(--radius-s); font-weight: 700; font-size: 14.5px; text-decoration: none; border: 1.5px solid transparent; cursor: pointer; font-family: 'Public Sans', sans-serif; transition: all 0.2s; } .btn--primary { background: #205c87; color: #fff; border-radius: 24px; } .btn--primary:hover { background: var(--azul-loreto); } .btn--ghost { background: transparent; color: var(--azul-loreto); border-color: var(--azul-loreto); } .btn--ghost:hover { background: var(--azul-loreto); color: #fff; } .btn--sm { padding: 8px 14px; font-size: 13.5px; border-radius: 4px; } .btn--block { width: 100%; border-radius: 4px; background: var(--celeste-loreto); } .btn--success { background: #10B981; color: white; border: none; border-radius: 4px; } .btn--danger { background: #EF4444; color: white; border: none; border-radius: 4px; }
        .hero { padding: 64px 0 56px; background: radial-gradient(circle at 88% 15%, rgba(0, 178, 214, 0.08), transparent 45%), var(--papel-alto); border-bottom: 1px solid var(--linea); } .hero .wrap { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 56px; align-items: center; } .hero .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: .09em; text-transform: uppercase; color: var(--celeste-loreto); margin-bottom: 14px; font-weight: 500; } .hero h1 { font-size: clamp(30px, 4vw, 44px); max-width: 14ch; } .hero p.lead { font-size: 17.5px; color: var(--tinta-suave); max-width: 46ch; margin: 14px 0 28px; }
        section { padding: 72px 0; } .section-head { max-width: 60ch; margin-bottom: 40px; } .section-head .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin-bottom: 10px; font-weight: 500; }
        .art-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--linea); border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; } .art-card { background: var(--papel); padding: 30px 26px; } 
        
        .autoridades-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .autoridad-card { background: var(--papel); padding: 28px; border-radius: var(--radius-m); border: 1px solid var(--linea); box-shadow: 0 2px 8px rgba(0,0,0,0.02); text-align: center; border-top: 4px solid var(--azul-loreto); }
        .autoridad-card.principal { border-top-color: var(--celeste-loreto); background: radial-gradient(circle at top, rgba(0,178,214,0.04), transparent 70%), var(--papel); }
        .autoridad-card span { font-family: 'IBM Plex Mono', monospace; font-size: 11.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); display: block; margin-bottom: 8px; font-weight: 600; }
        .autoridad-card h3 { font-size: 18px; color: var(--azul-loreto); margin: 0; font-family: 'Fraunces', serif; }

        .news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 30px; } 
        .news-card { background: var(--papel); padding: 20px; border-radius: var(--radius-m); border: 1px solid var(--linea); box-shadow: 0 4px 12px rgba(0,0,0,0.03); }
        .news-card img { width: 100%; aspect-ratio: 3/2; object-fit: cover; margin-bottom: 16px; border-radius: 4px; } 
        .news-card h3 { font-size: 15px; text-transform: uppercase; color: var(--azul-loreto); line-height: 1.4; font-family: 'Public Sans', sans-serif; font-weight: 800; letter-spacing: 0.2px; margin-bottom: 8px; }
        .news-card p { font-size: 14px; color: var(--tinta-suave); line-height: 1.6; white-space: pre-wrap; margin: 0; }
        
        .consulta-panel { background: var(--azul-loreto); color: #F8F9FA; border-radius: var(--radius-m); padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; } .consulta-form { background: var(--papel); border-radius: var(--radius-m); padding: 26px; color: var(--tinta); } .field { margin-bottom: 16px; } .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--tinta); } .field input, .field textarea, .field select { width: 100%; padding: 11px 12px; border: 1.5px solid var(--linea); border-radius: var(--radius-s); font-family: 'IBM Plex Mono', monospace; font-size: 14px; background: #fff; color: var(--tinta); }
        
        .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: end; background: var(--papel); padding: 20px; border-radius: var(--radius-m); border: 1px solid var(--linea); margin-bottom: 24px; box-shadow: 0 2px 6px rgba(0,0,0,0.02); }
        .admin-table { width: 100%; text-align: left; border-collapse: collapse; background: #fff; border-radius: var(--radius-m); overflow: hidden; border: 1px solid var(--linea); box-shadow: 0 2px 8px rgba(0,0,0,0.05); } .admin-table th { background: var(--papel-alto); padding: 16px; font-weight: 600; border-bottom: 2px solid var(--linea); font-size: 14px; color: var(--azul-loreto); } .admin-table td { padding: 16px; border-bottom: 1px solid var(--linea); font-size: 14.5px; } .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; } .modal-content { background: var(--papel); padding: 32px; border-radius: var(--radius-m); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .contacto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; } .contacto-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 20px; } .contacto-list li { display: flex; gap: 14px; align-items: flex-start; } .contacto-list .ico { width: 36px; height: 36px; border-radius: 50%; background: rgba(235, 33, 40, 0.1); color: var(--rojo-loreto); display: flex; align-items: center; justify-content: center; flex: none; } .contacto-list strong { display: block; font-size: 14px; color: var(--azul-loreto); } .contacto-list span, .contacto-list a { font-size: 14.5px; color: var(--tinta-suave); text-decoration: none; } .contacto-list a:hover { color: var(--rojo-loreto); text-decoration: underline; } .map-frame { border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; height: 360px; } .map-frame iframe { width: 100%; height: 100%; border: 0; }
        @media (max-width: 980px) { .contacto-grid { grid-template-columns: 1fr; } .consulta-panel { grid-template-columns: 1fr; } .hero .wrap { grid-template-columns: 1fr; } .news-grid, .autoridades-grid { grid-template-columns: 1fr; } }
      `}} />

      <div className="topbar">
        <div className="wrap">
          <div><span className="topbar__item">🕗 Lun. a Vie. 07:00 a 13:00 y 16:00 a 20:00 hs</span><span className="topbar__item">☎ <a href="tel:+5493854743310">385 474-3310</a></span></div>
          <div><span className="topbar__item"><a href="#contacto">Contacto</a></span></div>
        </div>
      </div>

      <header className="site">
        <div className="wrap nav-row">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setVista('publica'); }}>
            <img src="/logojdf.png" alt="Logo Juzgado" className="brand__logo" />
            <span className="brand__text">
              <span className="eyebrow">Municipalidad de Loreto</span>
              <strong>Juzgado de Faltas</strong>
            </span>
          </a>
          
          {vista === 'publica' ? (
            <nav className="primary"><ul><li><a href="#inicio">Inicio</a></li><li><a href="#autoridades">Autoridades</a></li><li><a href="#normativa">Normativa</a></li><li><a href="#noticias">Noticias</a></li><li><a href="#consulta">Trámites</a></li></ul></nav>
          ) : (
            <nav className="primary">
              {autenticado && (
                <ul>
                  {puedeActas && <li><a className={vista === 'admin_actas' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_actas')}>Gestión Actas</a></li>}
                  {puedeDescargos && <li><a className={vista === 'admin_descargos' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_descargos')}>Auditoría</a></li>}
                  {puedePagos && <li><a className={vista === 'admin_pagos' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_pagos')}>Conciliación</a></li>}
                  {rol === 'SUPERADMIN' && (
                    <>
                      <li><a className={vista === 'admin_noticias' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_noticias')}>Noticias</a></li>
                      <li><a className={vista === 'admin_usuarios' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_usuarios')}>Personal</a></li>
                    </>
                  )}
                </ul>
              )}
            </nav>
          )}

          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            {autenticado && <span style={{fontSize: '13px', color: 'var(--tinta-suave)', fontWeight: 600}}>👤 {usuario?.nombre}</span>}
            {autenticado && <a onClick={() => setModalPassword(true)} style={{fontSize: '13px', cursor: 'pointer', color: 'var(--celeste-loreto)', fontWeight: 600}}>Cambiar Clave</a>}
            <button onClick={() => { if (vista === 'publica') { setVista('admin_actas'); } else { setVista('publica'); setAutenticado(false); setUsuario(null); setPassword(""); } }} className="btn btn--ghost btn--sm">
              {vista === 'publica' ? 'Acceso Personal' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </header>

      <main id="contenido">
        {vista === 'publica' && (
          <>
            <section className="hero" id="inicio">
              <div className="wrap">
                <div><p className="eyebrow">Municipalidad de Loreto · Provincia de Santiago del Estero</p><h1>Juzgado de Faltas Municipal de Loreto</h1><p className="lead">Consultá el estado de tus infracciones de tránsito, presentá tu descargo y gestioná tus trámites con el Juzgado desde un mismo lugar.</p><a href="#consulta" className="btn btn--primary" style={{borderRadius: '4px'}}>Consultar mi infracción</a></div>
                <div style={{display: 'flex', justifyContent: 'center'}}><img src="/logojdf.png" alt="Sello institucional" style={{width: 'min(380px, 100%)'}} /></div>
              </div>
            </section>

            <section id="autoridades" style={{background: 'var(--papel-alto)', borderBottom: '1px solid var(--linea)'}}>
              <div className="wrap">
                <div className="section-head">
                  <p className="kicker">Estructura Institucional</p>
                  <h2>Autoridades del Juzgado</h2>
                  <p>Conocé al equipo de magistrados y profesionales que integran la administración del Juzgado de Faltas Municipal.</p>
                </div>
                <div className="autoridades-grid">
                  <div className="autoridad-card principal">
                    <span>Juez de Faltas</span>
                    <h3>Dr. Facundo Mansilla</h3>
                  </div>
                  <div className="autoridad-card">
                    <span>Secretaria Letrada</span>
                    <h3>Dra. Romina Casaubon</h3>
                  </div>
                  <div className="autoridad-card">
                    <span>Secretario Letrado</span>
                    <h3>Dr. Agustín González Fiad</h3>
                  </div>
                  <div className="autoridad-card">
                    <span>Secretario Letrado</span>
                    <h3>Dr. Leandro Ledesma</h3>
                  </div>
                  <div className="autoridad-card">
                    <span>Contadora</span>
                    <h3>CPN Nur Salomón</h3>
                  </div>
                </div>
              </div>
            </section>
            
            <section id="institucion">
              <div className="wrap">
                <div className="section-head">
                  <p className="kicker">Código de Faltas Municipal</p>
                  <h2>Qué hace el Juzgado de Faltas</h2>
                  <p>El Juzgado interviene una vez agotada la instancia administrativa, cuando un vecino apela una infracción labrada por la autoridad de control de tránsito.</p>
                </div>
                <div className="art-grid">
                  <div className="art-card"><h3>Jurisdicción</h3><p>Entiende en las faltas cometidas dentro del ejido municipal de Loreto, conforme a la ordenanza vigente.</p></div>
                  <div className="art-card"><h3>Imparcialidad</h3><p>Actúa como órgano autónomo, garantizando al infractor el derecho a ser oído antes de la sanción.</p></div>
                  <div className="art-card"><h3>Debido proceso</h3><p>Toda infracción admite descargo, prueba y, si correspondiera, apelación, antes de quedar firme.</p></div>
                  <div className="art-card"><h3>Educación vial</h3><p>Promueve el conocimiento de las normas de tránsito como herramienta central para reducir siniestros.</p></div>
                </div>
              </div>
            </section>

            {/* SECCIÓN NUEVA DE NORMATIVA Y CÓDIGO QR */}
            <section id="normativa" style={{ background: '#FFFFFF', padding: '80px 0', borderBottom: '1px solid var(--linea)' }}>
              <div className="wrap">
                <div style={{ background: 'var(--papel-alto)', borderRadius: 'var(--radius-m)', padding: '40px', display: 'flex', alignItems: 'center', gap: '40px', flexWrap: 'wrap', border: '1px solid var(--linea)' }}>
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <p className="kicker" style={{ color: 'var(--rojo-loreto)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '12px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '10px' }}>Transparencia Municipal</p>
                    <h2 style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--azul-loreto)' }}>Código de Convivencia y Faltas de Tránsito</h2>
                    <p style={{ fontSize: '16px', color: 'var(--tinta-suave)', lineHeight: '1.6' }}>
                      Accedé de forma directa a la normativa oficial vigente de la Ciudad de Loreto. Conocé tus derechos, obligaciones ciudadanas y las normativas de tránsito escaneando el código QR con la cámara de tu celular.
                    </p>
                  </div>
                  <div style={{ flex: 'none', background: '#fff', padding: '20px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.06)', textAlign: 'center', border: '1px solid var(--linea)', margin: '0 auto' }}>
                    <img src="/qrparacodigo.png" alt="QR Código de Convivencia" style={{ width: '180px', height: '180px', display: 'block', margin: '0 auto' }} />
                    <span style={{ display: 'block', marginTop: '12px', fontSize: '13.5px', fontWeight: 700, color: 'var(--azul-loreto)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Escanear para leer</span>
                  </div>
                </div>
              </div>
            </section>

            {noticiasPublicas.length > 0 && (
              <section id="noticias" style={{background: '#FFFFFF', paddingTop: '40px', paddingBottom: '80px'}}>
                <div className="wrap">
                  <div style={{textAlign: 'center', marginBottom: '50px'}}>
                    <h2 style={{fontSize: '36px', color: 'var(--tinta)', fontFamily: 'Public Sans', fontWeight: 800}}>Noticias</h2>
                  </div>
                  <div className="news-grid">
                    {noticiasPublicas.slice(0, 3).map(n => (
                      <div className="news-card" key={n.id}>
                        <img src={n.imagenUrl} alt={n.titulo} />
                        <h3>{n.titulo}</h3>
                        {n.contenido && <p>{n.contenido}</p>}
                      </div>
                    ))}
                  </div>
                  {noticiasPublicas.length > 3 && (
                    <div style={{textAlign: 'center', marginTop: '50px'}}>
                      <button className="btn btn--primary">Ver más noticias</button>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section id="consulta" style={{background: 'var(--papel-alto)'}}>
              <div className="wrap">
                <div className="consulta-panel">
                  <div><p className="kicker" style={{color: 'var(--celeste-loreto)'}}>Consulta de infracciones</p><h3 style={{color: '#fff'}}>Consultá tus actas pendientes</h3><p>Ingresá tu DNI para verificar el estado de infracciones y adjuntar documentación a tu expediente en la nube.</p></div>
                  <div className="consulta-form">
                    <form onSubmit={manejarBusqueda}>
                      <div className="field"><label>DNI del infractor/a</label><input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Sin puntos" required /></div>
                      <button type="submit" disabled={buscando} className="btn btn--primary btn--block">{buscando ? 'Buscando en sistema...' : 'Consultar'}</button>
                    </form>
                    {mensaje && <p style={{marginTop: '15px', fontSize: '14px', color: 'var(--rojo-loreto)'}}>{mensaje}</p>}
                    {resultados.length > 0 && (
                      <div style={{marginTop: '20px'}}>
                        {resultados.map((acta) => {
                          const esBroma = acta.tipoInfraccion === 'BROMATOLOGIA';
                          const colorBorde = esBroma ? '#10B981' : 'var(--azul-loreto)';
                          const nombreOrigen = esBroma ? 'BROMATOLOGÍA Y CALIDAD DE VIDA' : 'DIRECCIÓN DE TRÁNSITO';

                          return (
                            <div key={acta.id} style={{padding: '15px', borderLeft: `4px solid ${colorBorde}`, background: 'var(--papel-alto)', marginBottom: '10px'}}>
                              <span style={{fontSize: '11px', fontWeight: 'bold', color: colorBorde}}>{nombreOrigen}</span><br/>
                              <strong>Acta N° {acta.nroActa}</strong> - ${acta.monto.toString()} <br/><span style={{fontSize: '13px', color: 'var(--tinta-suave)'}}>Estado: {acta.estado}</span>
                              {acta.estado === 'PENDIENTE' && (
                                <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}><button onClick={() => setTramiteActivo({ id: acta.id, tipo: 'pago' })} className="btn btn--ghost btn--sm">Informar Pago</button><button onClick={() => setTramiteActivo({ id: acta.id, tipo: 'descargo' })} className="btn btn--primary btn--sm" style={{borderRadius: '4px'}}>Descargo</button></div>
                              )}
                              {tramiteActivo?.id === acta.id && (
                                <form onSubmit={manejarEnvioTramite} style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--linea)'}}>
                                  <input type="hidden" name="infraccionId" value={acta.id} />
                                  <input type="hidden" name="tipo" value={tramiteActivo.tipo} />
                                  
                                  {tramiteActivo.tipo === 'pago' ? (
                                    <>
                                      <div style={{background: 'rgba(0, 178, 214, 0.08)', border: '1px solid var(--celeste-loreto)', padding: '16px', borderRadius: '4px', marginBottom: '16px', fontSize: '14px'}}>
                                        <h4 style={{fontSize: '15px', margin: '0 0 10px 0', color: 'var(--azul-loreto)'}}>Datos para transferencia bancaria</h4>
                                        <p style={{margin: '0 0 5px 0'}}><strong>Titular:</strong> Municipalidad de Loreto - Santiago del Estero</p>
                                        <p style={{margin: '0 0 5px 0'}}><strong>Banco:</strong> Banco Santiago del Estero</p>
                                        <p style={{margin: '0 0 5px 0'}}><strong>N° de Cuenta:</strong> 12000000001243138</p>
                                        <p style={{margin: '0 0 5px 0'}}><strong>CBU:</strong> 32101205300000012431389</p>
                                        <p style={{margin: '0'}}><strong>ALIAS:</strong> LoretoRecaudacion</p>
                                      </div>
                                      <div className="field"><label>Monto transferido ($)</label><input type="number" name="monto" required /></div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="field"><label>Nombre Completo</label><input type="text" name="nombre" placeholder="Ej: Juan Perez" required /></div>
                                      <div className="field"><label>Correo Electrónico</label><input type="email" name="email" placeholder="Para recibir notificaciones" required /></div>
                                      <div className="field"><label>Motivo de defensa</label><textarea name="motivo" rows={3} required></textarea></div>
                                    </>
                                  )}
                                  <div className="field">
                                    <label>Adjuntar comprobante (PDF, JPG, PNG)</label>
                                    <input type="file" name="archivo" accept=".pdf, .jpg, .jpeg, .png" required />
                                  </div>
                                  <button type="submit" disabled={enviando} className="btn btn--primary btn--block">{enviando ? 'Enviando...' : 'Subir Documentación'}</button>
                                </form>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section id="contacto" style={{background: 'var(--papel)', borderTop: '1px solid var(--linea)'}}>
              <div className="wrap">
                <div className="section-head"><p className="kicker">Contacto</p><h2>Ubicación y contacto</h2></div>
                <div className="contacto-grid">
                  <ul className="contacto-list">
                    <li><span className="ico">📍</span><div><strong>Dirección</strong><span>Isla Soledad S/N, Bº Islas Malvinas<br/>Loreto, Santiago del Estero</span></div></li>
                    <li><span className="ico">☎</span><div><strong>Teléfono / Celular</strong><a href="tel:+5493854743310">385 474-3310</a></div></li>
                    <li><span className="ico">📧</span><div><strong>Correo electrónico</strong><a href="mailto:juzgadodefaltasloreto@outlook.com">juzgadodefaltasloreto@outlook.com</a></div></li>
                    <li><span className="ico">🕗</span><div><strong>Horario de atención</strong><span>Lunes a viernes de 07:00 a 13:00 y 16:00 a 20:00 hs</span></div></li>
                  </ul>
                  <div className="map-frame"><iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3527.794711317769!2d-64.1893188!3d-28.3031456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjjCsDE4JzExLjMiUyA2NMKwMTEnMjEuNSJX!5e0!3m2!1sen!2sar!4v1700000000000!5m2!1sen!2sar" title="Mapa de ubicación del Juzgado de Faltas de Loreto" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe></div>
                </div>
              </div>
            </section>
          </>
        )}

        {vista !== 'publica' && (
          <section style={{background: 'var(--papel-alto)', minHeight: '60vh'}}>
            <div className="wrap">
              {!autenticado ? (
                <div style={{maxWidth: '400px', margin: '0 auto', background: 'var(--papel)', padding: '40px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)'}}>
                  <h2 style={{fontSize: '20px', marginBottom: '20px', textAlign: 'center'}}>Acceso Institucional</h2>
                  <form onSubmit={procesarLogin}>
                    <div className="field"><label>Correo Electrónico</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="field"><label>Contraseña</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                    <button type="submit" className="btn btn--primary btn--block" style={{borderRadius: '4px'}}>Ingresar al Sistema</button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="section-head"><p className="kicker">Panel Interno</p><h2>{vista === 'admin_actas' ? 'Gestión de Actas' : vista === 'admin_descargos' ? 'Auditoría de Descargos' : vista === 'admin_usuarios' ? 'Personal' : vista === 'admin_noticias' ? 'Portal de Noticias' : 'Conciliación BSE'}</h2></div>
                  
                  {vista === 'admin_noticias' && (
                    <div style={{background: 'var(--papel)', padding: '24px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '24px'}}>
                      <h3 style={{fontSize: '16px', marginBottom: '16px'}}>Publicar Nueva Noticia</h3>
                      <form onSubmit={manejarCrearNoticia}>
                        <div className="field"><label>Título de la Noticia</label><input type="text" name="titulo" required /></div>
                        <div className="field"><label>Desarrollo / Contenido</label><textarea name="contenido" rows={4} placeholder="Escribe aquí el desarrollo de la actividad..." required></textarea></div>
                        <div className="field"><label>Fotografía (JPG/PNG)</label><input type="file" name="archivo" accept=".jpg, .jpeg, .png" required /></div>
                        <button type="submit" disabled={procesando} className="btn btn--primary" style={{borderRadius: '4px', marginTop: '10px'}}>{procesando ? 'Subiendo...' : 'Publicar en Portada'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_usuarios' && (
                    <div style={{background: 'var(--papel)', padding: '24px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '24px'}}>
                      <h3 style={{fontSize: '16px', marginBottom: '16px'}}>Dar de alta a nuevo empleado</h3>
                      <form onSubmit={manejarCrearUsuario} style={{display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                        <div className="field" style={{marginBottom: 0, flex: 1}}><label>Nombre Completo</label><input type="text" value={nuevoUsuarioNombre} onChange={(e) => setNuevoUsuarioNombre(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1}}><label>Correo Electrónico</label><input type="email" value={nuevoUsuarioEmail} onChange={(e) => setNuevoUsuarioEmail(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1}}>
                          <label>Rol Asignado</label>
                          <select value={nuevoUsuarioRol} onChange={(e) => setNuevoUsuarioRol(e.target.value)}>
                            <option value="JUEZ">Juez de Faltas</option>
                            <option value="LETRADO">Secretario Letrado</option>
                            <option value="CONTABLE">Contadora</option>
                            <option value="ADMINISTRATIVO">Mesa de Entradas</option>
                          </select>
                        </div>
                        <button type="submit" disabled={guardandoUsuario} className="btn btn--primary" style={{borderRadius: '4px'}}>{guardandoUsuario ? 'Creando...' : 'Crear Cuenta'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_actas' && (
                    <div style={{background: 'var(--papel)', padding: '24px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '24px'}}>
                      <h3 style={{fontSize: '16px', marginBottom: '16px'}}>Cargar Nueva Infracción</h3>
                      <form onSubmit={manejarCrearActa} style={{display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '150px'}}>
                          <label>Origen del Acta</label>
                          <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}>
                            <option value="TRANSITO">Dirección de Tránsito</option>
                            <option value="BROMATOLOGIA">Bromatología / Calidad de Vida</option>
                          </select>
                        </div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '90px'}}><label>N° Acta</label><input type="text" value={nuevoNroActa} onChange={(e) => setNuevoNroActa(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '130px'}}><label>Nombre Infractor</label><input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '110px'}}><label>DNI</label><input type="text" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '110px'}}><label>Lugar</label><input type="text" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '90px'}}><label>Art.</label><input type="text" value={nuevoArticulo} onChange={(e) => setNuevoArticulo(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '130px'}}><label>Inspector</label><input type="text" value={nuevoInspector} onChange={(e) => setNuevoInspector(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '100px'}}><label>Monto ($)</label><input type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} required /></div>
                        <button type="submit" disabled={guardandoActa} className="btn btn--primary" style={{borderRadius: '4px'}}>{guardandoActa ? 'Guardando...' : 'Registrar'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_actas' && (
                    <div className="filter-grid">
                      <div className="field" style={{marginBottom: 0}}><label>N° Acta</label><input type="text" placeholder="Ej: 0001" value={filtroActa} onChange={e => setFiltroActa(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}><label>DNI del Titular</label><input type="text" placeholder="Buscar DNI..." value={filtroDniAdmin} onChange={e => setFiltroDniAdmin(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}><label>Inspector</label><input type="text" placeholder="Apellido..." value={filtroInspector} onChange={e => setFiltroInspector(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}>
                        <label>Dirección</label>
                        <select value={filtroDireccion} onChange={e => setFiltroDireccion(e.target.value)}>
                          <option value="">Todas las áreas</option>
                          <option value="TRANSITO">Tránsito</option>
                          <option value="BROMATOLOGIA">Bromatología</option>
                        </select>
                      </div>
                      <div className="field" style={{marginBottom: 0}}>
                        <label>Estado</label>
                        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                          <option value="">Todos los estados</option>
                          <option value="PENDIENTE">Pendiente</option>
                          <option value="PRESENTADO">Presentado / En proceso</option>
                          <option value="PAGADO">Pagado</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div style={{overflowX: 'auto'}}>
                    {cargandoAdmin ? <p style={{textAlign: 'center', padding: '40px'}}>Cargando registros...</p> : (
                      <>
                        {vista === 'admin_usuarios' && (
                          <table className="admin-table">
                            <thead><tr><th>Nombre / Correo</th><th>Rol</th><th>Estado</th><th>Acción</th></tr></thead>
                            <tbody>
                              {datosAdmin.map(item => (
                                <tr key={item.id}>
                                  <td><strong>{item.nombre}</strong><br/><span style={{fontSize: '12px', color: 'var(--tinta-suave)'}}>{item.email}</span></td>
                                  <td><span className="badge" style={{background: 'rgba(11, 74, 130, 0.1)', color: 'var(--azul-loreto)'}}>{item.rol}</span></td>
                                  <td><span className="badge" style={{background: item.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: item.activo ? '#047857' : '#DC2626'}}>{item.activo ? 'Activo' : 'Suspendido'}</span></td>
                                  <td>
                                    {item.rol !== 'SUPERADMIN' && (
                                      <div style={{display: 'flex', gap: '8px'}}>
                                        <button onClick={async () => { await toggleEstadoUsuario(item.id, item.activo); cargarDatosPanel('admin_usuarios'); }} className="btn btn--ghost btn--sm">{item.activo ? 'Suspender' : 'Reactivar'}</button>
                                        <button onClick={() => manejarEliminarUsuario(item.id)} className="btn btn--danger btn--sm" style={{padding: '6px 10px', fontSize: '12.5px'}}>Eliminar</button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {datosAdmin.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>No hay registros.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {vista === 'admin_noticias' && (
                          <table className="admin-table">
                            <thead><tr><th>Imagen</th><th>Título Público</th><th>Fecha de Publicación</th><th>Acción</th></tr></thead>
                            <tbody>
                              {datosAdmin.map(item => (
                                <tr key={item.id}>
                                  <td><img src={item.imagenUrl} alt="miniatura" style={{width: '60px', height: '40px', objectFit: 'cover', borderRadius: '4px'}} /></td>
                                  <td><strong>{item.titulo}</strong></td>
                                  <td>{new Date(item.creadoEn).toLocaleDateString('es-AR')}</td>
                                  <td><button onClick={() => manejarEliminarDato(item.id, 'noticia')} className="btn btn--danger btn--sm" style={{padding: '6px 10px', fontSize: '12.5px'}}>Eliminar Noticia</button></td>
                                </tr>
                              ))}
                              {datosAdmin.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>No hay registros.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {vista === 'admin_actas' && (
                          <table className="admin-table">
                            <thead><tr><th>N° Acta</th><th>Dirección</th><th>DNI Titular</th><th>Estado</th><th>Monto</th><th>Acción</th></tr></thead>
                            <tbody>
                              {actasFiltradas.map((item: any) => {
                                const esBroma = item.tipoInfraccion === 'BROMATOLOGIA';
                                return (
                                <tr key={item.id}>
                                  <td><strong>{item.nroActa}</strong></td>
                                  <td><span className="badge" style={{background: esBroma ? 'rgba(16, 185, 129, 0.1)' : 'rgba(11, 74, 130, 0.1)', color: esBroma ? '#047857' : 'var(--azul-loreto)'}}>{esBroma ? 'Bromatología' : 'Tránsito'}</span></td>
                                  <td>{item.dniTitular}</td>
                                  <td><span className="badge" style={{background: item.estado === 'PENDIENTE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: item.estado === 'PENDIENTE' ? '#B45309' : '#047857'}}>{item.estado}</span></td>
                                  <td>${item.monto}</td>
                                  <td><button onClick={() => manejarEliminarDato(item.id, 'acta')} className="btn btn--danger btn--sm" style={{padding: '6px 10px', fontSize: '12.5px'}}>Eliminar</button></td>
                                </tr>
                              )})}
                              {actasFiltradas.length === 0 && (<tr><td colSpan={6} style={{textAlign: 'center', padding: '40px'}}>No se encontraron actas con esos filtros.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {(vista === 'admin_descargos' || vista === 'admin_pagos') && (
                          <table className="admin-table">
                            <thead><tr><th>Expediente / Acta</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead>
                            <tbody>
                              {datosAdmin.map(item => (
                                <tr key={item.id}>
                                  <td><strong>{item.expedienteNro || item.infraccion?.nroActa}</strong></td>
                                  <td>
                                    <span className="badge" style={{background: item.estado === 'EXTEMPORANEO' ? 'rgba(239, 68, 68, 0.15)' : (item.estado === 'PENDIENTE' || item.estado === 'PRESENTADO' || item.estado === 'PENDIENTE_CONCILIACION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'), color: item.estado === 'EXTEMPORANEO' ? '#DC2626' : (item.estado === 'PENDIENTE' || item.estado === 'PRESENTADO' || item.estado === 'PENDIENTE_CONCILIACION' ? '#B45309' : '#047857')}}>{item.estado}</span>
                                  </td>
                                  <td>{new Date(item.creadoEn || item.fechaPago || item.fechaInfraccion || new Date()).toLocaleDateString('es-AR')}</td>
                                  <td><button onClick={() => setItemModal(item)} className="btn btn--ghost btn--sm">Ver Detalles</button></td>
                                </tr>
                              ))}
                              {datosAdmin.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>No hay registros.</td></tr>)}
                            </tbody>
                          </table>
                        )}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      {modalPassword && (
        <div className="modal-overlay" onClick={() => setModalPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '400px'}}>
            <h3 style={{marginBottom: '15px'}}>Cambiar mi contraseña</h3>
            <form onSubmit={manejarCambioPassword}>
              <div className="field"><label>Contraseña Actual</label><input type="password" value={passActual} onChange={(e) => setPassActual(e.target.value)} required /></div>
              <div className="field"><label>Nueva Contraseña</label><input type="password" value={passNueva} onChange={(e) => setPassNueva(e.target.value)} required /></div>
              <div className="field"><label>Confirmar Nueva Contraseña</label><input type="password" value={passConfirmar} onChange={(e) => setPassConfirmar(e.target.value)} required /></div>
              <div style={{display: 'flex', gap: '10px', marginTop: '20px'}}>
                <button type="button" onClick={() => setModalPassword(false)} className="btn btn--ghost" style={{flex: 1, borderRadius: '4px'}}>Cancelar</button>
                <button type="submit" disabled={cambiandoPass} className="btn btn--primary" style={{flex: 1, borderRadius: '4px'}}>{cambiandoPass ? 'Guardando...' : 'Actualizar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itemModal && (
        <div className="modal-overlay" onClick={() => setItemModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginBottom: '15px'}}>Auditoría de Expediente</h3>
            <div style={{background: 'var(--papel-alto)', padding: '15px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px'}}>
              <p><strong>Acta Asociada:</strong> {itemModal.infraccion?.nroActa}</p><p><strong>DNI Titular:</strong> {itemModal.infraccion?.dniTitular}</p>
              {vista === 'admin_descargos' && <p style={{whiteSpace: 'pre-wrap'}}><strong>Información Presentada:</strong><br/>{itemModal.motivo}</p>}
              {vista === 'admin_pagos' && <p><strong>Monto Informado:</strong> ${itemModal.montoInformado}</p>}
            </div>
            <div style={{marginBottom: '20px'}}><a href={vista === 'admin_descargos' ? itemModal.archivosUrl?.[0] : itemModal.comprobanteUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block" style={{borderRadius: '4px'}}>Abrir Documento Adjunto</a></div>
            
            {(itemModal.estado === 'PRESENTADO' || itemModal.estado === 'EXTEMPORANEO' || itemModal.estado === 'PENDIENTE_CONCILIACION') ? (
              <div style={{borderTop: '1px solid var(--linea)', paddingTop: '20px'}}>
                {itemModal.estado === 'EXTEMPORANEO' && (
                  <div style={{background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', padding: '10px', borderRadius: '4px', marginBottom: '15px', fontSize: '13.5px', fontWeight: 'bold'}}>⚠️ Atención: Esta presentación superó el plazo legal.</div>
                )}
                {vista === 'admin_descargos' && (
                  <div className="field"><label>Escribir Dictamen / Resolución Corta</label><textarea value={textoResolucion} onChange={(e) => setTextoResolucion(e.target.value)} placeholder="Ej: Se comprueba error en patente..." rows={2} /></div>
                )}
                <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                  {vista === 'admin_descargos' ? (
                    <><button onClick={() => auditarDescargo('RESUELTO_A_FAVOR')} disabled={procesando} className="btn btn--success" style={{flex: 1}}>Fallo a Favor (Anular)</button><button onClick={() => auditarDescargo('RECHAZADO')} disabled={procesando} className="btn btn--danger" style={{flex: 1}}>Rechazar Descargo</button></>
                  ) : (
                    <><button onClick={() => auditarPago('CONCILIADO')} disabled={procesando} className="btn btn--success" style={{flex: 1}}>Aprobar Pago</button><button onClick={() => auditarPago('RECHAZADO')} disabled={procesando} className="btn btn--danger" style={{flex: 1}}>Rechazar Comprobante</button></>
                  )}
                </div>
              </div>
            ) : (<p style={{textAlign: 'center', color: 'var(--tinta-suave)', fontWeight: 'bold'}}>Este expediente ya fue auditado.</p>)}
            <button onClick={() => setItemModal(null)} className="btn btn--ghost btn--block" style={{marginTop: '20px', border: 'none'}}>Cerrar Ventana</button>
          </div>
        </div>
      )}
      <footer className="site" style={{background: 'var(--azul-loreto)', color: '#F8F9FA', padding: '40px 0'}}>
        <div className="wrap" style={{textAlign: 'center', fontSize: '14px'}}>© 2026 Juzgado de Faltas Municipal de Loreto — Todos los derechos reservados</div>
      </footer>
    </>
  )
}