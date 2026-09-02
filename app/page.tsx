"use client"

import { useState, useEffect } from "react"
import { buscarInfraccionPorDni } from "./actions/actas"
import { procesarTramiteCiudadano, procesarNoticia } from "./actions/subidas"
import { inicializarSistema, iniciarSesion, obtenerActasAdmin, obtenerDescargosAdmin, obtenerPagosAdmin, resolverDescargo, conciliarPago, crearActa, eliminarActa, obtenerUsuariosAdmin, crearUsuarioAdmin, toggleEstadoUsuario, cambiarContrasena, obtenerNoticiasAdmin, eliminarNoticia, eliminarUsuario, blanquearContrasena } from "./actions/admin"

export default function JuzgadoFaltasUnificado() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [vista, setVista] = useState<'publica' | 'admin_actas' | 'admin_descargos' | 'admin_pagos' | 'admin_usuarios' | 'admin_noticias' | 'admin_calculadora'>('publica')

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

  // Estados Calculadora
  const [calcArticulo, setCalcArticulo] = useState("")
  const [calcUemValor, setCalcUemValor] = useState("")
  const [calcUemCantidad, setCalcUemCantidad] = useState("")
  const calcTotal = (Number(calcUemValor) * Number(calcUemCantidad)) || 0;
  const calcVoluntario = calcTotal / 2;
  const calcNotificacion = calcTotal > 0 ? calcVoluntario + 5000 : 0;

  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10; 

  useEffect(() => { obtenerNoticiasAdmin().then(setNoticiasPublicas) }, [])

  useEffect(() => {
    setPaginaActual(1);
  }, [filtroActa, filtroDniAdmin, filtroInspector, filtroDireccion, filtroEstado, vista]);

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
    setUsuario(auth.usuario); setAutenticado(true); setMenuAbierto(false);
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

  const cambiarVistaAdmin = (nuevaVista: string) => { setVista(nuevaVista as any); cargarDatosPanel(nuevaVista); setMenuAbierto(false); }

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
    if (res.success) { setNuevoUsuarioNombre(""); setNuevoUsuarioEmail(""); setNuevoUsuarioRol("ADMINISTRATIVO"); cargarDatosPanel(vista); alert(`Usuario creado.\nLa clave de acceso temporal es: Loreto2026`) } else { alert(res.error) }
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

  const manejarBlanquearClave = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de BLANQUEAR la contraseña de ${nombre}?\n\nSe le asignará una clave temporal y el empleado no podrá ingresar con su clave actual.`)) return;
    const res = await blanquearContrasena(id);
    if (res.success) {
      alert(`✅ CLAVE RESTABLECIDA CON ÉXITO\n\nLa nueva clave temporal para ${nombre} es: ${res.tempPass}\n\nPor favor, comuníqueselo al empleado para que inicie sesión y cambie su clave inmediatamente por seguridad.`);
    } else {
      alert("Error al restablecer: " + res.error);
    }
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

  const listaBase = vista === 'admin_actas' ? actasFiltradas : datosAdmin;
  const totalItems = listaBase.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / filasPorPagina));
  const indicePrimerItem = (paginaActual - 1) * filasPorPagina;
  const indiceUltimoItem = paginaActual * filasPorPagina;
  const listaPaginada = listaBase.slice(indicePrimerItem, indiceUltimoItem);

  const rol = usuario?.rol || ''
  const puedeActas = ['SUPERADMIN', 'JUEZ', 'ADMINISTRATIVO'].includes(rol)
  const puedeDescargos = ['SUPERADMIN', 'JUEZ', 'LETRADO'].includes(rol)
  const puedePagos = ['SUPERADMIN', 'JUEZ', 'CONTABLE'].includes(rol)

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700;800&display=swap');
        
        :root { --azul-loreto: #0B4A82; --celeste-loreto: #00B2D6; --rojo-loreto: #EB2128; --papel: #FFFFFF; --papel-alto: #F8F9FA; --tinta: #212529; --tinta-suave: #495057; --linea: #DEE2E6; --radius-s: 4px; --radius-m: 10px; --maxw: 1180px; }
        * { box-sizing: border-box; } html { scroll-behavior: smooth; overflow-x: hidden; } 
        body { margin: 0; background: var(--papel); color: var(--tinta); font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.55; overflow-x: hidden; }
        h1, h2, h3, h4 { font-family: 'Montserrat', sans-serif; color: var(--azul-loreto); margin: 0 0 0.5em; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; } 
        a { color: inherit; } .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
        
        .topbar { background: var(--azul-loreto); color: #FFFFFF; font-size: 13.5px; font-family: 'Inter', sans-serif; font-weight: 500; } 
        .topbar .wrap { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; padding-bottom: 8px; gap: 16px; flex-wrap: wrap; } 
        .topbar a { text-decoration: none; opacity: .9; } .topbar a:hover { opacity: 1; text-decoration: underline; } .topbar__item { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; }
        
        header.site { background: var(--papel); border-bottom: 1px solid var(--linea); position: sticky; top: 0; z-index: 100; } 
        .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 20px; flex-wrap: wrap; }
        .brand { display: flex; align-items: center; gap: 14px; text-decoration: none; z-index: 101; } .brand__logo { height: 55px; width: auto; flex: none; } 
        .brand__text .eyebrow { font-family: 'Montserrat', sans-serif; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin: 0 0 2px; font-weight: 600; } 
        .brand__text strong { display: block; font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 18px; color: var(--azul-loreto); line-height: 1.1; letter-spacing: -0.02em; }
        
        .menu-toggle { display: none; background: none; border: none; font-size: 28px; color: var(--azul-loreto); cursor: pointer; padding: 5px; z-index: 101; }
        
        nav.primary { display: flex; align-items: center; gap: 28px; } nav.primary ul { list-style: none; display: flex; gap: 26px; margin: 0; padding: 0; } 
        nav.primary a { text-decoration: none; font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 14px; color: var(--tinta); padding: 6px 2px; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; } 
        nav.primary a:hover, nav.primary a.active { border-color: var(--rojo-loreto); color: var(--azul-loreto); }
        
        .header-actions { display: flex; align-items: center; gap: 15px; }

        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border-radius: var(--radius-s); font-weight: 600; font-size: 14px; text-decoration: none; border: 1.5px solid transparent; cursor: pointer; font-family: 'Montserrat', sans-serif; transition: all 0.2s; letter-spacing: 0.02em; } 
        .btn--primary { background: var(--azul-loreto); color: #fff; border-radius: 4px; } .btn--primary:hover { background: #083863; } 
        .btn--ghost { background: transparent; color: var(--azul-loreto); border-color: var(--azul-loreto); } .btn--ghost:hover { background: var(--azul-loreto); color: #fff; } 
        .btn--sm { padding: 8px 14px; font-size: 13px; } .btn--block { width: 100%; } .btn--success { background: #10B981; color: white; border: none; } .btn--danger { background: #EF4444; color: white; border: none; }
        
        .hero { padding: 72px 0 64px; background: radial-gradient(circle at 88% 15%, rgba(0, 178, 214, 0.06), transparent 45%), var(--papel-alto); border-bottom: 1px solid var(--linea); } 
        .hero .wrap { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 56px; align-items: center; } 
        .hero .eyebrow { font-family: 'Montserrat', sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--celeste-loreto); margin-bottom: 16px; font-weight: 700; } 
        .hero h1 { font-size: clamp(32px, 4vw, 48px); max-width: 14ch; font-weight: 800; letter-spacing: -0.02em; } 
        .hero p.lead { font-size: 18px; color: var(--tinta-suave); max-width: 46ch; margin: 16px 0 32px; font-weight: 400; }
        
        section { padding: 80px 0; } .section-head { max-width: 60ch; margin-bottom: 48px; } 
        .section-head .kicker { font-family: 'Montserrat', sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin-bottom: 12px; font-weight: 700; }
        
        .art-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--linea); border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; } 
        .art-card { background: var(--papel); padding: 32px 24px; } .art-card h3 { font-size: 16px; font-weight: 700; } .art-card p { font-size: 14.5px; color: var(--tinta-suave); margin: 0; }
        
        .autoridades-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .autoridad-card { background: var(--papel); padding: 32px; border-radius: var(--radius-m); border: 1px solid var(--linea); box-shadow: 0 2px 12px rgba(0,0,0,0.02); text-align: center; border-top: 4px solid var(--azul-loreto); }
        .autoridad-card.principal { border-top-color: var(--celeste-loreto); background: radial-gradient(circle at top, rgba(0,178,214,0.04), transparent 70%), var(--papel); }
        .autoridad-card span { font-family: 'Montserrat', sans-serif; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); display: block; margin-bottom: 10px; font-weight: 700; }
        .autoridad-card h3 { font-size: 18px; color: var(--azul-loreto); margin: 0; font-weight: 700; }

        .news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; } 
        .news-card { background: var(--papel); padding: 24px; border-radius: var(--radius-m); border: 1px solid var(--linea); box-shadow: 0 4px 16px rgba(0,0,0,0.03); }
        .news-card img { width: 100%; aspect-ratio: 3/2; object-fit: cover; margin-bottom: 20px; border-radius: 6px; } 
        .news-card h3 { font-size: 16px; text-transform: uppercase; color: var(--azul-loreto); line-height: 1.4; font-weight: 800; letter-spacing: 0.02em; margin-bottom: 10px; }
        .news-card p { font-size: 14.5px; color: var(--tinta-suave); line-height: 1.6; white-space: pre-wrap; margin: 0; }
        
        .consulta-panel { background: var(--azul-loreto); color: #F8F9FA; border-radius: var(--radius-m); padding: 48px; display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: center; } 
        .consulta-panel h3 { color: #fff; font-size: 28px; }
        .consulta-form { background: var(--papel); border-radius: var(--radius-m); padding: 32px; color: var(--tinta); } 
        .field { margin-bottom: 20px; } .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--tinta); font-family: 'Montserrat', sans-serif; } 
        .field input, .field textarea, .field select { width: 100%; padding: 12px 14px; border: 1.5px solid var(--linea); border-radius: var(--radius-s); font-family: 'Inter', sans-serif; font-size: 14.5px; background: #fff; color: var(--tinta); transition: border-color 0.2s; }
        .field input:focus, .field textarea:focus, .field select:focus { outline: none; border-color: var(--celeste-loreto); }
        
        .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: end; background: var(--papel); padding: 24px; border-radius: var(--radius-m); border: 1px solid var(--linea); margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .admin-table { width: 100%; text-align: left; border-collapse: collapse; background: #fff; border-radius: var(--radius-m); overflow: hidden; border: 1px solid var(--linea); box-shadow: 0 4px 12px rgba(0,0,0,0.03); } 
        .admin-table th { background: var(--papel-alto); padding: 18px 20px; font-weight: 700; border-bottom: 2px solid var(--linea); font-size: 13px; color: var(--azul-loreto); font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 0.04em; } 
        .admin-table td { padding: 18px 20px; border-bottom: 1px solid var(--linea); font-size: 14.5px; } 
        .badge { padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.02em; font-family: 'Montserrat', sans-serif; text-transform: uppercase; }
        
        .modal-overlay { position: fixed; inset: 0; background: rgba(11, 74, 130, 0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; } 
        .modal-content { background: var(--papel); padding: 40px; border-radius: var(--radius-m); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 40px rgba(0,0,0,0.15); border: 1px solid var(--linea); }
        
        .contacto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; } .contacto-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 24px; } .contacto-list li { display: flex; gap: 16px; align-items: flex-start; } .contacto-list .ico { width: 40px; height: 40px; border-radius: 50%; background: rgba(235, 33, 40, 0.1); color: var(--rojo-loreto); display: flex; align-items: center; justify-content: center; flex: none; font-size: 18px; } .contacto-list strong { display: block; font-size: 15px; color: var(--azul-loreto); font-weight: 600; margin-bottom: 4px; } .contacto-list span, .contacto-list a { font-size: 14.5px; color: var(--tinta-suave); text-decoration: none; } .contacto-list a:hover { color: var(--rojo-loreto); text-decoration: underline; } .map-frame { border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; height: 380px; } .map-frame iframe { width: 100%; height: 100%; border: 0; }
        
        @media (max-width: 980px) { 
          .contacto-grid, .consulta-panel, .hero .wrap, .news-grid, .autoridades-grid, .art-grid { grid-template-columns: 1fr; } 
          .hero { text-align: center; padding: 40px 0; }
          .hero h1 { font-size: 28px; margin-left: auto; margin-right: auto; }
          .brand__logo { height: 45px; }
          .brand__text strong { font-size: 16px; }
          .brand__text .eyebrow { font-size: 10px; }
          .menu-toggle { display: block; }
          nav.primary { display: none; width: 100%; order: 3; padding: 20px 0; border-top: 1px solid var(--linea); margin-top: 15px; }
          nav.primary.abierto { display: flex; flex-direction: column; align-items: flex-start; }
          nav.primary ul { flex-direction: column; gap: 15px; width: 100%; }
          nav.primary a { display: block; width: 100%; padding: 5px 0; }
          .header-actions { display: none; width: 100%; order: 4; flex-direction: column; padding-bottom: 20px; gap: 15px; }
          .header-actions.abierto { display: flex; }
          .header-actions .btn { width: 100%; }
          .admin-table { display: block; overflow-x: auto; white-space: nowrap; }
        }
      `}} />

      <div className="topbar">
        <div className="wrap">
          <div><span className="topbar__item">🕗 Lun. a Vie. 07:00 a 13:00 y 16:00 a 20:00 hs</span><span className="topbar__item">☎ <a href="tel:+5493854743310">385 474-3310</a></span></div>
          <div><span className="topbar__item"><a href="#contacto">Contacto</a></span></div>
        </div>
      </div>

      <header className="site">
        <div className="wrap nav-row">
          <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setVista('publica'); setMenuAbierto(false); }}>
            <img src="/logojdf.png" alt="Logo Juzgado" className="brand__logo" />
            <span className="brand__text">
              <span className="eyebrow">Municipalidad de Loreto</span>
              <strong>Juzgado de Faltas</strong>
            </span>
          </a>
          
          <button className="menu-toggle" onClick={() => setMenuAbierto(!menuAbierto)}>
            {menuAbierto ? '✖' : '☰'}
          </button>

          {vista === 'publica' ? (
            <nav className={`primary ${menuAbierto ? 'abierto' : ''}`}>
              <ul>
                <li><a href="#inicio" onClick={() => setMenuAbierto(false)}>Inicio</a></li>
                <li><a href="#autoridades" onClick={() => setMenuAbierto(false)}>Autoridades</a></li>
                <li><a href="#normativa" onClick={() => setMenuAbierto(false)}>Normativa</a></li>
                <li><a href="#noticias" onClick={() => setMenuAbierto(false)}>Noticias</a></li>
                <li><a href="#consulta" onClick={() => setMenuAbierto(false)}>Trámites</a></li>
              </ul>
            </nav>
          ) : (
            <nav className={`primary ${menuAbierto ? 'abierto' : ''}`}>
              {autenticado && (
                <ul>
                  {puedeActas && <li><a className={vista === 'admin_actas' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_actas')}>Gestión Actas</a></li>}
                  {puedeActas && <li><a className={vista === 'admin_calculadora' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_calculadora')}>Calculadora</a></li>}
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

          <div className={`header-actions ${menuAbierto ? 'abierto' : ''}`}>
            {autenticado && <span style={{fontSize: '13px', color: 'var(--tinta-suave)', fontWeight: 600, fontFamily: 'Montserrat, sans-serif'}}>👤 {usuario?.nombre}</span>}
            {autenticado && <a onClick={() => { setModalPassword(true); setMenuAbierto(false); }} style={{fontSize: '13px', cursor: 'pointer', color: 'var(--celeste-loreto)', fontWeight: 700, fontFamily: 'Montserrat, sans-serif'}}>Cambiar Clave</a>}
            <button onClick={() => { if (vista === 'publica') { setVista('admin_actas'); } else { setVista('publica'); setAutenticado(false); setUsuario(null); setPassword(""); } setMenuAbierto(false); }} className="btn btn--ghost btn--sm">
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
                <div><p className="eyebrow">Municipalidad de Loreto · Provincia de Santiago del Estero</p><h1>Juzgado de Faltas Municipal</h1><p className="lead">Consulte el estado de sus infracciones, presente su descargo de forma remota y gestione sus trámites de manera ágil, transparente y segura.</p><a href="#consulta" className="btn btn--primary">Consultar Infracción</a></div>
                <div style={{display: 'flex', justifyContent: 'center'}}><img src="/logojdf.png" alt="Sello institucional" style={{width: 'min(380px, 100%)', maxWidth: '80%'}} /></div>
              </div>
            </section>

            <section id="autoridades" style={{background: 'var(--papel-alto)', borderBottom: '1px solid var(--linea)'}}>
              <div className="wrap">
                <div className="section-head">
                  <p className="kicker">Estructura Institucional</p>
                  <h2>Autoridades del Juzgado</h2>
                  <p>Conozca al equipo de magistrados y profesionales que integran la administración del Juzgado de Faltas Municipal.</p>
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
                  <p className="kicker">Competencia y Funciones</p>
                  <h2>Sobre el Juzgado de Faltas</h2>
                  <p>El Juzgado interviene como órgano de juzgamiento una vez agotada la instancia administrativa preventiva, garantizando el derecho de defensa del ciudadano.</p>
                </div>
                <div className="art-grid">
                  <div className="art-card"><h3>Jurisdicción</h3><p>Entiende en las faltas cometidas dentro del ejido municipal de Loreto, conforme a la normativa vigente.</p></div>
                  <div className="art-card"><h3>Imparcialidad</h3><p>Actúa como órgano autónomo, garantizando al presunto infractor el derecho a ser oído antes de cualquier sanción.</p></div>
                  <div className="art-card"><h3>Debido Proceso</h3><p>Toda acta de infracción admite la presentación de descargo, ofrecimiento de prueba y etapa de apelación.</p></div>
                  <div className="art-card"><h3>Educación Vial</h3><p>Promueve la concientización sobre las normas de tránsito como herramienta central para la seguridad comunitaria.</p></div>
                </div>
              </div>
            </section>

            <section id="normativa" style={{ background: '#FFFFFF', padding: '80px 0', borderBottom: '1px solid var(--linea)' }}>
              <div className="wrap">
                <div style={{ background: 'var(--papel-alto)', borderRadius: 'var(--radius-m)', padding: '48px', display: 'flex', alignItems: 'center', gap: '48px', flexWrap: 'wrap', border: '1px solid var(--linea)' }}>
                  <div style={{ flex: 1, minWidth: '250px' }}>
                    <p className="kicker" style={{ color: 'var(--rojo-loreto)', fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Transparencia Municipal</p>
                    <h2 style={{ fontSize: '32px', marginBottom: '16px', color: 'var(--azul-loreto)' }}>Código de Convivencia y Faltas de Tránsito</h2>
                    <p style={{ fontSize: '16px', color: 'var(--tinta-suave)', lineHeight: '1.6' }}>
                      Acceda de forma directa a la normativa oficial de la Ciudad de Loreto. Conozca sus derechos, obligaciones ciudadanas y las reglamentaciones de tránsito vigentes escaneando el código QR con la cámara de su dispositivo móvil.
                    </p>
                  </div>
                  <div style={{ flex: 'none', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(11,74,130,0.08)', textAlign: 'center', border: '1px solid var(--linea)', margin: '0 auto', maxWidth: '100%' }}>
                    <img src="/qrparacodigo.png" alt="QR Código de Convivencia" style={{ width: '100%', maxWidth: '180px', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '4px' }} />
                    <span style={{ display: 'block', marginTop: '16px', fontSize: '12px', fontWeight: 800, color: 'var(--azul-loreto)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif' }}>Escanear para acceder</span>
                  </div>
                </div>
              </div>
            </section>

            {noticiasPublicas.length > 0 && (
              <section id="noticias" style={{background: '#FFFFFF', paddingTop: '60px', paddingBottom: '80px'}}>
                <div className="wrap">
                  <div style={{textAlign: 'center', marginBottom: '56px'}}>
                    <h2 style={{fontSize: '36px', color: 'var(--tinta)'}}>Novedades Institucionales</h2>
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
                    <div style={{textAlign: 'center', marginTop: '56px'}}>
                      <button className="btn btn--ghost">Ver histórico de noticias</button>
                    </div>
                  )}
                </div>
              </section>
            )}

            <section id="consulta" style={{background: 'var(--papel-alto)'}}>
              <div className="wrap">
                <div className="consulta-panel">
                  <div><p className="kicker" style={{color: 'var(--celeste-loreto)', fontFamily: 'Montserrat, sans-serif'}}>Plataforma de Autogestión</p><h3>Consulta de Infracciones</h3><p style={{fontSize: '16px', opacity: 0.9}}>Ingrese su número de documento para verificar el estado de sus actas, informar transferencias bancarias o presentar descargos formales adjuntando documentación en formato digital.</p></div>
                  <div className="consulta-form">
                    <form onSubmit={manejarBusqueda}>
                      <div className="field"><label>Número de Documento (DNI)</label><input type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Ej: 35123456 (sin puntos)" required /></div>
                      <button type="submit" disabled={buscando} className="btn btn--primary btn--block">{buscando ? 'Consultando base de datos...' : 'Buscar Expedientes'}</button>
                    </form>
                    {mensaje && <p style={{marginTop: '16px', fontSize: '14.5px', color: 'var(--rojo-loreto)', fontWeight: 500}}>{mensaje}</p>}
                    {resultados.length > 0 && (
                      <div style={{marginTop: '24px'}}>
                        {resultados.map((acta) => {
                          const esBroma = acta.tipoInfraccion === 'BROMATOLOGIA';
                          const colorBorde = esBroma ? '#10B981' : 'var(--azul-loreto)';
                          const nombreOrigen = esBroma ? 'BROMATOLOGÍA Y CALIDAD DE VIDA' : 'DIRECCIÓN DE TRÁNSITO';

                          return (
                            <div key={acta.id} style={{padding: '20px', borderLeft: `4px solid ${colorBorde}`, background: 'var(--papel-alto)', marginBottom: '12px', borderRadius: '0 8px 8px 0', borderTop: '1px solid var(--linea)', borderRight: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)'}}>
                              <span style={{fontSize: '11px', fontWeight: 700, color: colorBorde, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em'}}>{nombreOrigen}</span><br/>
                              <strong style={{fontSize: '16px', display: 'inline-block', marginTop: '4px'}}>Acta N° {acta.nroActa}</strong> <span style={{fontSize: '16px', color: 'var(--tinta-suave)'}}>— ${acta.monto.toString()}</span> <br/>
                              <div style={{marginTop: '6px'}}><span className="badge" style={{background: acta.estado === 'PENDIENTE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: acta.estado === 'PENDIENTE' ? '#B45309' : '#047857'}}>{acta.estado}</span></div>
                              
                              {acta.estado === 'PENDIENTE' && (
                                <div style={{display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap'}}><button onClick={() => setTramiteActivo({ id: acta.id, tipo: 'pago' })} className="btn btn--ghost btn--sm">Informar Pago</button><button onClick={() => setTramiteActivo({ id: acta.id, tipo: 'descargo' })} className="btn btn--primary btn--sm">Presentar Descargo</button></div>
                              )}
                              
                              {tramiteActivo?.id === acta.id && (
                                <form onSubmit={manejarEnvioTramite} style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--linea)'}}>
                                  <input type="hidden" name="infraccionId" value={acta.id} />
                                  <input type="hidden" name="tipo" value={tramiteActivo.tipo} />
                                  
                                  {tramiteActivo.tipo === 'pago' ? (
                                    <>
                                      <div style={{background: 'rgba(0, 178, 214, 0.08)', border: '1px solid rgba(0, 178, 214, 0.2)', padding: '20px', borderRadius: '6px', marginBottom: '20px', fontSize: '14.5px'}}>
                                        <h4 style={{fontSize: '14px', margin: '0 0 12px 0', color: 'var(--azul-loreto)', textTransform: 'uppercase', letterSpacing: '0.02em'}}>Datos Oficiales de Recaudación</h4>
                                        <p style={{margin: '0 0 6px 0'}}><strong>Titular:</strong> Municipalidad de Loreto - Sgo. del Estero</p>
                                        <p style={{margin: '0 0 6px 0'}}><strong>Entidad:</strong> Banco Santiago del Estero</p>
                                        <p style={{margin: '0 0 6px 0'}}><strong>Cuenta N°:</strong> 12000000001243138</p>
                                        <p style={{margin: '0 0 6px 0'}}><strong>CBU:</strong> 32101205300000012431389</p>
                                        <p style={{margin: '0'}}><strong>ALIAS:</strong> LoretoRecaudacion</p>
                                      </div>
                                      <div className="field"><label>Monto transferido exacto ($)</label><input type="number" name="monto" required /></div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="field"><label>Nombre y Apellido del Presentante</label><input type="text" name="nombre" required /></div>
                                      <div className="field"><label>Correo Electrónico (Constitución de Domicilio Digital)</label><input type="email" name="email" required /></div>
                                      <div className="field"><label>Fundamentos del Descargo</label><textarea name="motivo" rows={4} required></textarea></div>
                                    </>
                                  )}
                                  <div className="field">
                                    <label>Adjuntar Prueba / Comprobante (Formato PDF o Imagen)</label>
                                    <input type="file" name="archivo" accept=".pdf, .jpg, .jpeg, .png" required style={{padding: '8px'}} />
                                  </div>
                                  <button type="submit" disabled={enviando} className="btn btn--primary btn--block">{enviando ? 'Procesando envío...' : 'Ingresar Documentación al Juzgado'}</button>
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
                <div className="section-head"><p className="kicker">Atención al Público</p><h2>Ubicación y Vías de Contacto</h2></div>
                <div className="contacto-grid">
                  <ul className="contacto-list">
                    <li><span className="ico">📍</span><div><strong>Dirección Física</strong><span>Isla Soledad S/N, Bº Islas Malvinas<br/>Loreto, Santiago del Estero</span></div></li>
                    <li><span className="ico">☎</span><div><strong>Línea de Atención</strong><a href="tel:+5493854743310">385 474-3310</a></div></li>
                    <li><span className="ico">📧</span><div><strong>Mesa de Entradas Virtual</strong><a href="mailto:juzgadodefaltasloreto@outlook.com">juzgadodefaltasloreto@outlook.com</a></div></li>
                    <li><span className="ico">🕗</span><div><strong>Horario de Recepción</strong><span>Lunes a Viernes<br/>07:00 a 13:00 hs y 16:00 a 20:00 hs</span></div></li>
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
                <div style={{maxWidth: '400px', margin: '0 auto', background: 'var(--papel)', padding: '48px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)'}}>
                  <div style={{textAlign: 'center', marginBottom: '32px'}}>
                    <img src="/logojdf.png" alt="Logo" style={{height: '60px', marginBottom: '16px'}} />
                    <h2 style={{fontSize: '22px', margin: 0}}>Acceso Restringido</h2>
                    <p style={{fontSize: '14px', color: 'var(--tinta-suave)', margin: '8px 0 0 0'}}>Plataforma exclusiva para personal del Juzgado.</p>
                  </div>
                  <form onSubmit={procesarLogin}>
                    <div className="field"><label>Correo Electrónico Institucional</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="field"><label>Clave de Seguridad</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                    <button type="submit" className="btn btn--primary btn--block" style={{marginTop: '24px'}}>Verificar Identidad</button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="section-head"><p className="kicker">Panel de Administración</p><h2>{vista === 'admin_actas' ? 'Gestión Documental de Actas' : vista === 'admin_descargos' ? 'Auditoría Legal de Descargos' : vista === 'admin_usuarios' ? 'Gestión de Recursos Humanos' : vista === 'admin_noticias' ? 'Publicación Institucional' : vista === 'admin_calculadora' ? 'Calculadora de Multas (UEM)' : 'Conciliación Bancaria y Pagos'}</h2></div>
                  
                  {vista === 'admin_calculadora' && (
                    <div style={{background: 'var(--papel)', padding: '40px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', maxWidth: '900px', margin: '0 auto'}}>
                      <h3 style={{fontSize: '18px', marginBottom: '8px'}}>Simulador Rápido de Infracciones</h3>
                      <p style={{fontSize: '14px', color: 'var(--tinta-suave)', marginBottom: '32px'}}>Ingrese el valor actual de la Unidad Económica Municipal y la cantidad de UEM correspondientes a la falta para obtener los montos finales.</p>
                      
                      <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '32px'}}>
                        <div className="field" style={{flex: 1, minWidth: '150px'}}>
                          <label>Artículo (Referencia)</label>
                          <input type="text" placeholder="Ej: Art. 45" value={calcArticulo} onChange={e => setCalcArticulo(e.target.value)} />
                        </div>
                        <div className="field" style={{flex: 1, minWidth: '180px'}}>
                          <label>Valor 1 UEM ($)</label>
                          <input type="number" placeholder="Ej: 850" value={calcUemValor} onChange={e => setCalcUemValor(e.target.value)} />
                        </div>
                        <div className="field" style={{flex: 1, minWidth: '180px'}}>
                          <label>Cantidad de UEM</label>
                          <input type="number" placeholder="Ej: 150" value={calcUemCantidad} onChange={e => setCalcUemCantidad(e.target.value)} />
                        </div>
                      </div>

                      {calcTotal > 0 && (
                        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px'}}>
                          <div style={{background: 'rgba(11, 74, 130, 0.05)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(11, 74, 130, 0.2)'}}>
                            <span style={{fontSize: '12px', fontWeight: 700, color: 'var(--azul-loreto)', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Pago Voluntario (50%)</span>
                            <p style={{fontSize: '32px', fontWeight: 800, color: 'var(--azul-loreto)', margin: '12px 0 0 0', fontFamily: 'Montserrat, sans-serif'}}>${calcVoluntario.toLocaleString('es-AR')}</p>
                          </div>
                          <div style={{background: 'rgba(245, 158, 11, 0.05)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)'}}>
                            <span style={{fontSize: '12px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Pago Notificación</span>
                            <p style={{fontSize: '32px', fontWeight: 800, color: '#B45309', margin: '12px 0 4px 0', fontFamily: 'Montserrat, sans-serif'}}>${calcNotificacion.toLocaleString('es-AR')}</p>
                            <span style={{fontSize: '11px', color: '#B45309', opacity: 0.8, fontWeight: 600}}>Incluye $5.000 de gastos admin.</span>
                          </div>
                          <div style={{background: 'rgba(239, 68, 68, 0.05)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
                            <span style={{fontSize: '12px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Con Sentencia (100%)</span>
                            <p style={{fontSize: '32px', fontWeight: 800, color: '#DC2626', margin: '12px 0 0 0', fontFamily: 'Montserrat, sans-serif'}}>${calcTotal.toLocaleString('es-AR')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {vista === 'admin_noticias' && (
                    <div style={{background: 'var(--papel)', padding: '32px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'}}>
                      <h3 style={{fontSize: '18px', marginBottom: '24px'}}>Emitir Nuevo Comunicado</h3>
                      <form onSubmit={manejarCrearNoticia}>
                        <div className="field"><label>Titular Principal</label><input type="text" name="titulo" required /></div>
                        <div className="field"><label>Cuerpo del Comunicado</label><textarea name="contenido" rows={5} required></textarea></div>
                        <div className="field"><label>Material Fotográfico (JPG/PNG)</label><input type="file" name="archivo" accept=".jpg, .jpeg, .png" required style={{padding: '10px'}} /></div>
                        <button type="submit" disabled={procesando} className="btn btn--primary">{procesando ? 'Procesando...' : 'Publicar Comunicado'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_usuarios' && (
                    <div style={{background: 'var(--papel)', padding: '32px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'}}>
                      <h3 style={{fontSize: '18px', marginBottom: '24px'}}>Alta de Nuevo Funcionario / Empleado</h3>
                      <form onSubmit={manejarCrearUsuario} style={{display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '200px'}}><label>Nombre y Apellido</label><input type="text" value={nuevoUsuarioNombre} onChange={(e) => setNuevoUsuarioNombre(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '200px'}}><label>Casilla de Correo</label><input type="email" value={nuevoUsuarioEmail} onChange={(e) => setNuevoUsuarioEmail(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '200px'}}>
                          <label>Jerarquía / Rol en el Sistema</label>
                          <select value={nuevoUsuarioRol} onChange={(e) => setNuevoUsuarioRol(e.target.value)}>
                            <option value="JUEZ">Juez de Faltas</option>
                            <option value="LETRADO">Secretario Letrado</option>
                            <option value="CONTABLE">Contadora</option>
                            <option value="ADMINISTRATIVO">Mesa de Entradas</option>
                          </select>
                        </div>
                        <button type="submit" disabled={guardandoUsuario} className="btn btn--primary">{guardandoUsuario ? 'Registrando...' : 'Generar Credenciales'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_actas' && (
                    <div style={{background: 'var(--papel)', padding: '32px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'}}>
                      <h3 style={{fontSize: '18px', marginBottom: '24px'}}>Carga de Nueva Acta de Infracción</h3>
                      <form onSubmit={manejarCrearActa} style={{display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '180px'}}>
                          <label>Repartición Emisora</label>
                          <select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}>
                            <option value="TRANSITO">Dirección de Tránsito</option>
                            <option value="BROMATOLOGIA">Bromatología y Calidad de Vida</option>
                          </select>
                        </div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '110px'}}><label>N° Físico de Acta</label><input type="text" value={nuevoNroActa} onChange={(e) => setNuevoNroActa(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '160px'}}><label>Nombre del Imputado</label><input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>DNI / CUIT</label><input type="text" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '130px'}}><label>Ubicación del Hecho</label><input type="text" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '90px'}}><label>Art. Infringido</label><input type="text" value={nuevoArticulo} onChange={(e) => setNuevoArticulo(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '140px'}}><label>Agente Interviniente</label><input type="text" value={nuevoInspector} onChange={(e) => setNuevoInspector(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Monto a Cobrar ($)</label><input type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} required /></div>
                        <button type="submit" disabled={guardandoActa} className="btn btn--primary">{guardandoActa ? 'Procesando...' : 'Asentar Acta'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_actas' && (
                    <div className="filter-grid">
                      <div className="field" style={{marginBottom: 0}}><label>N° Acta</label><input type="text" placeholder="Ej: 0001" value={filtroActa} onChange={e => setFiltroActa(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}><label>DNI del Titular</label><input type="text" placeholder="Buscar DNI..." value={filtroDniAdmin} onChange={e => setFiltroDniAdmin(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}><label>Agente</label><input type="text" placeholder="Apellido..." value={filtroInspector} onChange={e => setFiltroInspector(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}>
                        <label>Repartición</label>
                        <select value={filtroDireccion} onChange={e => setFiltroDireccion(e.target.value)}>
                          <option value="">Consolidado Histórico</option>
                          <option value="TRANSITO">Exclusivo Tránsito</option>
                          <option value="BROMATOLOGIA">Exclusivo Bromatología</option>
                        </select>
                      </div>
                      <div className="field" style={{marginBottom: 0}}>
                        <label>Estado Procesal</label>
                        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                          <option value="">Cualquier estado</option>
                          <option value="PENDIENTE">Pendientes de resolución</option>
                          <option value="PRESENTADO">Con descargo presentado</option>
                          <option value="PAGADO">Finalizadas (Pagado)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div style={{overflowX: 'auto'}}>
                    {cargandoAdmin ? <p style={{textAlign: 'center', padding: '60px', color: 'var(--tinta-suave)'}}>Sincronizando con la base de datos central...</p> : (
                      <>
                        {vista === 'admin_usuarios' && (
                          <table className="admin-table">
                            <thead><tr><th>Funcionario / Contacto</th><th>Jerarquía</th><th>Estado de Cuenta</th><th>Acciones Administrativas</th></tr></thead>
                            <tbody>
                              {listaPaginada.map((item: any) => (
                                <tr key={item.id}>
                                  <td><strong style={{fontSize: '15px'}}>{item.nombre}</strong><br/><span style={{fontSize: '13px', color: 'var(--tinta-suave)'}}>{item.email}</span></td>
                                  <td><span className="badge" style={{background: 'rgba(11, 74, 130, 0.1)', color: 'var(--azul-loreto)'}}>{item.rol}</span></td>
                                  <td><span className="badge" style={{background: item.activo ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: item.activo ? '#047857' : '#DC2626'}}>{item.activo ? 'Operativa' : 'Suspendida'}</span></td>
                                  <td>
                                    {item.rol !== 'SUPERADMIN' && (
                                      <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                        <button onClick={async () => { await toggleEstadoUsuario(item.id, item.activo); cargarDatosPanel('admin_usuarios'); }} className="btn btn--ghost btn--sm">{item.activo ? 'Bloquear Acceso' : 'Restituir Acceso'}</button>
                                        <button onClick={() => manejarBlanquearClave(item.id, item.nombre)} className="btn btn--ghost btn--sm" style={{borderColor: 'var(--celeste-loreto)', color: 'var(--celeste-loreto)'}}>Blanquear Clave</button>
                                        <button onClick={() => manejarEliminarUsuario(item.id)} className="btn btn--danger btn--sm">Baja Definitiva</button>
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              {listaPaginada.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>No hay registros activos.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {vista === 'admin_noticias' && (
                          <table className="admin-table">
                            <thead><tr><th>Previsualización</th><th>Titular Emitido</th><th>Fecha de Publicación</th><th>Acción</th></tr></thead>
                            <tbody>
                              {listaPaginada.map((item: any) => (
                                <tr key={item.id}>
                                  <td><img src={item.imagenUrl} alt="miniatura" style={{width: '70px', height: '45px', objectFit: 'cover', borderRadius: '4px'}} /></td>
                                  <td><strong style={{fontSize: '15px'}}>{item.titulo}</strong></td>
                                  <td>{new Date(item.creadoEn).toLocaleDateString('es-AR')}</td>
                                  <td><button onClick={() => manejarEliminarDato(item.id, 'noticia')} className="btn btn--danger btn--sm">Retirar Comunicado</button></td>
                                </tr>
                              ))}
                              {listaPaginada.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>No hay comunicados activos.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {vista === 'admin_actas' && (
                          <table className="admin-table">
                            <thead><tr><th>N° Acta Físico</th><th>Área Competente</th><th>Identificación (DNI)</th><th>Fase Procesal</th><th>Monto Base</th><th>Acción</th></tr></thead>
                            <tbody>
                              {listaPaginada.map((item: any) => {
                                const esBroma = item.tipoInfraccion === 'BROMATOLOGIA';
                                return (
                                <tr key={item.id}>
                                  <td><strong style={{fontSize: '15px'}}>{item.nroActa}</strong></td>
                                  <td><span className="badge" style={{background: esBroma ? 'rgba(16, 185, 129, 0.1)' : 'rgba(11, 74, 130, 0.1)', color: esBroma ? '#047857' : 'var(--azul-loreto)'}}>{esBroma ? 'Bromatología' : 'Tránsito'}</span></td>
                                  <td style={{fontFamily: 'Montserrat, sans-serif', fontWeight: 600}}>{item.dniTitular}</td>
                                  <td><span className="badge" style={{background: item.estado === 'PENDIENTE' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: item.estado === 'PENDIENTE' ? '#B45309' : '#047857'}}>{item.estado}</span></td>
                                  <td style={{fontWeight: 600}}>${item.monto}</td>
                                  <td><button onClick={() => manejarEliminarDato(item.id, 'acta')} className="btn btn--danger btn--sm">Anular Acta</button></td>
                                </tr>
                              )})}
                              {listaPaginada.length === 0 && (<tr><td colSpan={6} style={{textAlign: 'center', padding: '40px'}}>La búsqueda no arrojó resultados en la base de datos.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {(vista === 'admin_descargos' || vista === 'admin_pagos') && (
                          <table className="admin-table">
                            <thead><tr><th>Identificador Expediente</th><th>Fase Procesal</th><th>Fecha de Ingreso</th><th>Acción de Auditoría</th></tr></thead>
                            <tbody>
                              {listaPaginada.map((item: any) => (
                                <tr key={item.id}>
                                  <td><strong style={{fontSize: '15px'}}>{item.expedienteNro || item.infraccion?.nroActa}</strong></td>
                                  <td>
                                    <span className="badge" style={{background: item.estado === 'EXTEMPORANEO' ? 'rgba(239, 68, 68, 0.15)' : (item.estado === 'PENDIENTE' || item.estado === 'PRESENTADO' || item.estado === 'PENDIENTE_CONCILIACION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)'), color: item.estado === 'EXTEMPORANEO' ? '#DC2626' : (item.estado === 'PENDIENTE' || item.estado === 'PRESENTADO' || item.estado === 'PENDIENTE_CONCILIACION' ? '#B45309' : '#047857')}}>{item.estado}</span>
                                  </td>
                                  <td>{new Date(item.creadoEn || item.fechaPago || item.fechaInfraccion || new Date()).toLocaleDateString('es-AR')}</td>
                                  <td><button onClick={() => setItemModal(item)} className="btn btn--primary btn--sm">Abrir Expediente</button></td>
                                </tr>
                              ))}
                              {listaPaginada.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>Bandeja de entrada vacía.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {totalPaginas > 1 && vista !== 'admin_calculadora' && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--papel-alto)', borderTop: '1px solid var(--linea)', borderBottomLeftRadius: 'var(--radius-m)', borderBottomRightRadius: 'var(--radius-m)', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--tinta-suave)' }}>
                              Mostrando registros <strong>{indicePrimerItem + 1}</strong> al <strong>{Math.min(indiceUltimoItem, totalItems)}</strong> (Total: {totalItems})
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="btn btn--ghost btn--sm" style={{padding: '6px 12px'}}>Anterior</button>
                              <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>Página {paginaActual} de {totalPaginas}</span>
                              <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="btn btn--ghost btn--sm" style={{padding: '6px 12px'}}>Siguiente</button>
                            </div>
                          </div>
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

      {/* MODAL CLAVES */}
      {modalPassword && (
        <div className="modal-overlay" onClick={() => setModalPassword(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '440px'}}>
            <h3 style={{marginBottom: '24px'}}>Actualización de Credenciales</h3>
            <form onSubmit={manejarCambioPassword}>
              <div className="field"><label>Clave de Seguridad Actual</label><input type="password" value={passActual} onChange={(e) => setPassActual(e.target.value)} required /></div>
              <div className="field"><label>Nueva Clave (Mín. 6 caracteres)</label><input type="password" value={passNueva} onChange={(e) => setPassNueva(e.target.value)} required /></div>
              <div className="field"><label>Reingrese la Nueva Clave</label><input type="password" value={passConfirmar} onChange={(e) => setPassConfirmar(e.target.value)} required /></div>
              <div style={{display: 'flex', gap: '12px', marginTop: '32px'}}>
                <button type="button" onClick={() => setModalPassword(false)} className="btn btn--ghost" style={{flex: 1}}>Cancelar</button>
                <button type="submit" disabled={cambiandoPass} className="btn btn--primary" style={{flex: 1}}>{cambiandoPass ? 'Registrando...' : 'Confirmar Cambio'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EXPEDIENTE */}
      {itemModal && (
        <div className="modal-overlay" onClick={() => setItemModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginBottom: '24px', fontSize: '22px'}}>Revisión de Expediente Electrónico</h3>
            <div style={{background: 'var(--papel-alto)', padding: '24px', borderRadius: '8px', marginBottom: '24px', fontSize: '15px', border: '1px solid var(--linea)'}}>
              <p style={{margin: '0 0 8px 0'}}><strong>Acta de Infracción Relacionada:</strong> N° {itemModal.infraccion?.nroActa}</p>
              <p style={{margin: '0 0 16px 0'}}><strong>Identificación Imputado:</strong> DNI {itemModal.infraccion?.dniTitular}</p>
              {vista === 'admin_descargos' && (
                <div style={{background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid var(--linea)'}}>
                  <strong style={{color: 'var(--azul-loreto)', display: 'block', marginBottom: '8px'}}>Fundamentos Jurídicos Presentados:</strong>
                  <p style={{whiteSpace: 'pre-wrap', margin: 0, fontStyle: 'italic', color: 'var(--tinta-suave)'}}>"{itemModal.motivo}"</p>
                </div>
              )}
              {vista === 'admin_pagos' && <p style={{margin: '0', fontSize: '18px', fontWeight: 700, color: '#10B981'}}>Monto Declarado: ${itemModal.montoInformado}</p>}
            </div>
            
            <div style={{marginBottom: '32px'}}>
              <a href={vista === 'admin_descargos' ? itemModal.archivosUrl?.[0] : itemModal.comprobanteUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block" style={{borderStyle: 'dashed'}}>Visualizar Documento / Prueba Adjunta</a>
            </div>
            
            {(itemModal.estado === 'PRESENTADO' || itemModal.estado === 'EXTEMPORANEO' || itemModal.estado === 'PENDIENTE_CONCILIACION') ? (
              <div style={{borderTop: '2px solid var(--linea)', paddingTop: '24px'}}>
                {itemModal.estado === 'EXTEMPORANEO' && (
                  <div style={{background: 'rgba(239, 68, 68, 0.1)', color: '#DC2626', padding: '12px 16px', borderRadius: '4px', marginBottom: '20px', fontSize: '14px', fontWeight: 600, borderLeft: '4px solid #DC2626'}}>
                    ALERTA LEGAL: La presente interposición supera los plazos procesales vigentes.
                  </div>
                )}
                {vista === 'admin_descargos' && (
                  <div className="field"><label>Fundamentación del Fallo (Dictamen de Juez)</label><textarea value={textoResolucion} onChange={(e) => setTextoResolucion(e.target.value)} placeholder="Redacte aquí la justificación resolutiva..." rows={3} /></div>
                )}
                <div style={{display: 'flex', gap: '12px', marginTop: '16px'}}>
                  {vista === 'admin_descargos' ? (
                    <>
                      <button onClick={() => auditarDescargo('RESUELTO_A_FAVOR')} disabled={procesando} className="btn btn--success" style={{flex: 1}}>Dictar Sobreseimiento</button>
                      <button onClick={() => auditarDescargo('RECHAZADO')} disabled={procesando} className="btn btn--danger" style={{flex: 1}}>Confirmar Sanción</button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => auditarPago('CONCILIADO')} disabled={procesando} className="btn btn--success" style={{flex: 1}}>Acreditar Impacto Bancario</button>
                      <button onClick={() => auditarPago('RECHAZADO')} disabled={procesando} className="btn btn--danger" style={{flex: 1}}>Rechazar Comprobante Apócrifo</button>
                    </>
                  )}
                </div>
              </div>
            ) : (<p style={{textAlign: 'center', color: 'var(--tinta-suave)', fontWeight: 600, fontSize: '15px'}}>El presente expediente se encuentra con resolución firme.</p>)}
            <button onClick={() => setItemModal(null)} className="btn btn--ghost btn--block" style={{marginTop: '24px', border: 'none', background: 'var(--papel-alto)'}}>Volver a la bandeja</button>
          </div>
        </div>
      )}

      <footer className="site" style={{background: 'var(--azul-loreto)', color: '#F8F9FA', padding: '48px 0'}}>
        <div className="wrap" style={{textAlign: 'center', fontSize: '13.5px', fontFamily: 'Montserrat, sans-serif', opacity: 0.9}}>
          <strong>Juzgado de Faltas Municipal de Loreto</strong><br/>
          Provincia de Santiago del Estero — República Argentina<br/><br/>
          © {new Date().getFullYear()} Todos los derechos reservados
        </div>
      </footer>
    </>
  )
}