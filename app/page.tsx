"use client"

import { useState, useEffect } from "react"
import { buscarInfraccionPorDni } from "./actions/actas"
import { procesarTramiteCiudadano, procesarNoticia } from "./actions/subidas"
import { inicializarSistema, iniciarSesion, obtenerActasAdmin, obtenerDescargosAdmin, obtenerPagosAdmin, resolverDescargo, conciliarPago, crearActa, eliminarActa, editarActa, obtenerUsuariosAdmin, crearUsuarioAdmin, toggleEstadoUsuario, cambiarContrasena, obtenerNoticiasAdmin, eliminarNoticia, eliminarUsuario, blanquearClave, registrarPagoManual, desistirActa, obtenerRecaudacionDiaria } from "./actions/admin"

export default function JuzgadoFaltasUnificado() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [vista, setVista] = useState<'publica' | 'admin_actas' | 'admin_descargos' | 'admin_pagos' | 'admin_usuarios' | 'admin_noticias' | 'admin_calculadora' | 'admin_balance'>('publica')
  const [tabBalance, setTabBalance] = useState<'pendientes' | 'recaudacion' | 'reincidentes'>('pendientes')

  const [autenticado, setAutenticado] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [usuario, setUsuario] = useState<{nombre: string, rol: string} | null>(null)
  
  const [datosAdmin, setDatosAdmin] = useState<any[]>([])
  const [pagosAdmin, setPagosAdmin] = useState<any[]>([])
  const [noticiasPublicas, setNoticiasPublicas] = useState<any[]>([])
  const [cargandoAdmin, setCargandoAdmin] = useState(false)
  
  const [itemModal, setItemModal] = useState<any>(null)
  const [modalEditarActa, setModalEditarActa] = useState<any>(null)
  const [editandoActa, setEditandoActa] = useState(false)
  const [textoResolucion, setTextoResolucion] = useState("")
  const [procesando, setProcesando] = useState(false)

  const [dni, setDni] = useState("")
  const [resultados, setResultados] = useState<any[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [tramiteActivo, setTramiteActivo] = useState<{ id: string, tipo: 'pago' | 'descargo' } | null>(null)
  const [enviando, setEnviando] = useState(false)

  // Reporte Diario
  const [fechaConsulta, setFechaConsulta] = useState(new Date().toISOString().split('T')[0])
  const [recaudacionDelDia, setRecaudacionDelDia] = useState<any[]>([])
  const [buscandoRecaudacion, setBuscandoRecaudacion] = useState(false)

  // Estados Formularios Carga
  const [nuevoNroActa, setNuevoNroActa] = useState(""); const [nuevoNombre, setNuevoNombre] = useState(""); const [nuevoDni, setNuevoDni] = useState(""); const [nuevoLugar, setNuevoLugar] = useState(""); const [nuevoArticulo, setNuevoArticulo] = useState(""); const [nuevoInspector, setNuevoInspector] = useState(""); const [nuevoMonto, setNuevoMonto] = useState(""); const [nuevoTipo, setNuevoTipo] = useState("TRANSITO"); const [nuevaFecha, setNuevaFecha] = useState(""); const [guardandoActa, setGuardandoActa] = useState(false);
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState(""); const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState(""); const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState("ADMINISTRATIVO"); const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [modalPassword, setModalPassword] = useState(false); const [passActual, setPassActual] = useState(""); const [passNueva, setPassNueva] = useState(""); const [passConfirmar, setPassConfirmar] = useState(""); const [cambiandoPass, setCambiandoPass] = useState(false);

  // Estados Buscador Avanzado
  const [filtroActaNombre, setFiltroActaNombre] = useState("")
  const [filtroDniAdmin, setFiltroDniAdmin] = useState("")
  const [filtroDireccion, setFiltroDireccion] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

  // Estados Calculadora
  const [calcArticulo, setCalcArticulo] = useState("")
  const [calcUemValor, setCalcUemValor] = useState("")
  const [calcUemCantidad, setCalcUemCantidad] = useState("")
  const calcTotal = (Number(calcUemValor) * Number(calcUemCantidad)) || 0;
  const calcVoluntario = calcTotal / 2;
  const calcNotificacion = calcTotal > 0 ? calcVoluntario + 5000 : 0;

  const [paginaActual, setPaginaActual] = useState(1);
  const filasPorPagina = 10; 

  useEffect(() => { 
    obtenerNoticiasAdmin().then(setNoticiasPublicas);

    const sesion = localStorage.getItem('juzgado_sesion');
    if (sesion) {
      try {
        const data = JSON.parse(sesion);
        if (data && data.usuario) {
          setUsuario({ nombre: data.usuario.nombre, rol: data.usuario.rol });
          setAutenticado(true);
          setVista(data.vista);
          cargarDatosPanel(data.vista);
        }
      } catch (e) {}
    }
  }, [])

  useEffect(() => { setPaginaActual(1); }, [filtroActaNombre, filtroDniAdmin, filtroDireccion, filtroEstado, vista, tabBalance]);

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
    try {
      const formData = new FormData(e.currentTarget);
      const respuesta = await procesarTramiteCiudadano(formData);
      if (respuesta.success) {
        if (respuesta.expedienteNro) { alert(respuesta.esExtemporaneo ? `Trámite EXTEMPORÁNEO.\nExpediente: ${respuesta.expedienteNro}` : `¡Descargo presentado!\nExpediente: ${respuesta.expedienteNro}`); } else { alert("¡Trámite de pago enviado con éxito!"); }
        setTramiteActivo(null); manejarBusqueda(new Event('submit') as any);
      } else { alert("Error del servidor: " + respuesta.error); }
    } catch (error: any) { alert("Error de red."); } finally { setEnviando(false); }
  }

  const procesarLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const auth = await iniciarSesion(email, password)
    if (!auth.success || !auth.usuario) return alert(auth.error || "Error de inicio de sesión")
    setUsuario({ nombre: auth.usuario.nombre, rol: auth.usuario.rol }); setAutenticado(true); setMenuAbierto(false);
    let vistaInicial = 'admin_actas'
    if (auth.usuario.rol === 'LETRADO') vistaInicial = 'admin_descargos'
    if (auth.usuario.rol === 'CONTABLE') vistaInicial = 'admin_pagos'
    setVista(vistaInicial as any); localStorage.setItem('juzgado_sesion', JSON.stringify({ usuario: auth.usuario, vista: vistaInicial }));
    cargarDatosPanel(vistaInicial);
  }

  const cargarDatosPanel = async (vistaDestino: string) => {
    setCargandoAdmin(true)
    try {
      let datos: any = [];
      if (vistaDestino === 'admin_actas' || vistaDestino === 'admin_balance') {
        datos = await obtenerActasAdmin();
        const pagosGeneral = await obtenerPagosAdmin();
        setPagosAdmin(pagosGeneral);
        if (vistaDestino === 'admin_balance' && tabBalance === 'recaudacion') { manejarConsultaDiaria(); }
      }
      if (vistaDestino === 'admin_descargos') datos = await obtenerDescargosAdmin();
      if (vistaDestino === 'admin_pagos') datos = await obtenerPagosAdmin();
      if (vistaDestino === 'admin_usuarios') datos = await obtenerUsuariosAdmin();
      if (vistaDestino === 'admin_noticias') datos = await obtenerNoticiasAdmin();
      
      if (Array.isArray(datos)) setDatosAdmin(datos); else setDatosAdmin([]);
    } catch (error) { setDatosAdmin([]); }
    setCargandoAdmin(false)
  }

  const cambiarVistaAdmin = (nuevaVista: string) => { 
    setVista(nuevaVista as any); cargarDatosPanel(nuevaVista); setMenuAbierto(false); 
    const sesionActual = localStorage.getItem('juzgado_sesion');
    if (sesionActual) { const data = JSON.parse(sesionActual); localStorage.setItem('juzgado_sesion', JSON.stringify({ ...data, vista: nuevaVista })); }
  }

  const manejarCrearActa = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardandoActa(true);
    let fechaSegura = new Date().toISOString(); 
    if (nuevaFecha) {
      try {
         const partes = nuevaFecha.split('-'); 
         if (partes.length === 3) {
           const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10), 12, 0, 0);
           if (!isNaN(d.getTime())) fechaSegura = d.toISOString();
         }
      } catch(error) {}
    }
    const datosActa = { nroActa: nuevoNroActa, nombreTitular: nuevoNombre, dniTitular: nuevoDni, monto: Number(nuevoMonto), lugar: nuevoLugar || "No informado", articulo: nuevoArticulo || "No informado", inspector: nuevoInspector || "No informado", tipoInfraccion: nuevoTipo as any, fechaInfraccion: fechaSegura };
    const res = await crearActa(datosActa);
    if (res.success) { setNuevoNroActa(""); setNuevoNombre(""); setNuevoDni(""); setNuevoLugar(""); setNuevoArticulo(""); setNuevoInspector(""); setNuevoMonto(""); setNuevoTipo("TRANSITO"); setNuevaFecha(""); cargarDatosPanel(vista); } else { alert(res.error); }
    setGuardandoActa(false);
  }

  const manejarEditarActa = async (e: React.FormEvent) => {
    e.preventDefault(); setEditandoActa(true);
    let fechaSegura = new Date().toISOString();
    if (modalEditarActa.fechaInfraccion_input) {
      try {
        const partes = modalEditarActa.fechaInfraccion_input.split('-');
        if (partes.length === 3) { const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10), 12, 0, 0); if (!isNaN(d.getTime())) fechaSegura = d.toISOString(); }
      } catch(error) {}
    }
    const datosActualizados = { nroActa: modalEditarActa.nroActa, nombreTitular: modalEditarActa.nombreTitular, dniTitular: modalEditarActa.dniTitular, monto: Number(modalEditarActa.monto), lugar: modalEditarActa.lugar || "No informado", articulo: modalEditarActa.articulo || "No informado", inspector: modalEditarActa.inspector || "No informado", tipoInfraccion: modalEditarActa.tipoInfraccion, fechaInfraccion: fechaSegura };
    const res = await editarActa(modalEditarActa.id, datosActualizados);
    if (res.success) { setModalEditarActa(null); cargarDatosPanel(vista); } else { alert(res.error); }
    setEditandoActa(false);
  }

  const manejarCobroManual = async (item: any) => {
    const sugerenciaMonto = item.monto > 0 ? item.monto : "";
    const respuestaMonto = window.prompt(`Registrar cobro manual por mostrador para el Acta N° ${item.nroActa}.\n\nTitular: ${item.nombreTitular}\n\nIngrese el monto cobrado ($):`, sugerenciaMonto);
    if (respuestaMonto === null) return; 
    const montoFinal = Number(respuestaMonto);
    if (isNaN(montoFinal) || montoFinal <= 0) return alert("Error: Debe ingresar un monto numérico válido mayor a cero.");
    if (!confirm(`¿Confirma que se ha efectuado el cobro de $${montoFinal} y desea cerrar el acta como PAGADA?`)) return;

    setCargandoAdmin(true);
    const res = await registrarPagoManual(item.id, montoFinal, usuario?.nombre || "Empleado");
    if (res.success) { cargarDatosPanel('admin_actas'); } else { alert("Error al registrar cobro: " + res.error); setCargandoAdmin(false); }
  }

  const manejarDesistimiento = async (item: any) => {
    if (!confirm(`¿Confirma el DESISTIMIENTO del Acta N° ${item.nroActa} por regularización de la falta (Subsanación)?\n\nEl titular ${item.nombreTitular} quedará eximido de responsabilidad en este expediente.`)) return;
    setCargandoAdmin(true);
    const res = await desistirActa(item.id);
    if (res.success) { cargarDatosPanel('admin_actas'); } else { alert("Error al registrar desistimiento: " + res.error); setCargandoAdmin(false); }
  }

  const manejarCrearNoticia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setProcesando(true);
    try {
      const formData = new FormData(e.currentTarget); const res = await procesarNoticia(formData)
      if (res.success) { alert("Noticia publicada."); (e.target as HTMLFormElement).reset(); cargarDatosPanel(vista); obtenerNoticiasAdmin().then(setNoticiasPublicas); } else { alert("Error: " + res.error) }
    } catch (error: any) { alert("Error de red al publicar la noticia."); } finally { setProcesando(false) }
  }

  const manejarEliminarDato = async (id: string, tipo: 'acta'|'noticia') => {
    if (!confirm(`¿Seguro que desea ELIMINAR ${tipo === 'acta' ? 'esta acta' : 'esta noticia'}?`)) return
    const res = tipo === 'acta' ? await eliminarActa(id) : await eliminarNoticia(id)
    if (res.success) { cargarDatosPanel(vista); if(tipo==='noticia') obtenerNoticiasAdmin().then(setNoticiasPublicas); } else { alert(res.error); }
  }

  const manejarEliminarUsuario = async (id: string) => {
    if (!confirm("¿Seguro que desea ELIMINAR definitivamente a este empleado del sistema?")) return
    const res = await eliminarUsuario(id)
    if (res.success) { cargarDatosPanel('admin_usuarios'); } else { alert(res.error); }
  }

  const auditarDescargo = async (estado: string) => {
    if (estado === 'RECHAZADO' && !textoResolucion) return alert("Debe justificar el rechazo.")
    setProcesando(true); const res = await resolverDescargo(itemModal.id, estado, textoResolucion);
    if(!res.success) alert(res.error);
    setItemModal(null); setTextoResolucion(""); setProcesando(false); cargarDatosPanel(vista);
  }

  const auditarPago = async (estado: string) => {
    setProcesando(true); const res = await conciliarPago(itemModal.id, estado, usuario?.nombre);
    if(!res.success) alert(res.error);
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
    setCambiandoPass(true); const res = await cambiarContrasena(email, passActual, passNueva); setCambiandoPass(false);
    if (res.success) { alert("Contraseña actualizada con éxito."); setModalPassword(false); setPassActual(""); setPassNueva(""); setPassConfirmar(""); } else { alert(res.error); }
  }

  const manejarBlanquearClave = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de BLANQUEAR la contraseña de ${nombre}?`)) return;
    const res = await blanquearClave(id);
    if (res.success) { alert(`✅ CLAVE RESTABLECIDA\n\nLa nueva clave para ${nombre} es: ${res.tempPass}`); } else { alert("Error: " + res.error); }
  }

  // Lógica Balance (Reincidentes y Pendientes)
  const dnisReincidentes = new Set();
  const actasReincidentes: any[] = [];
  if (vista === 'admin_balance' && tabBalance === 'reincidentes') {
    datosAdmin.forEach(item => {
      const mismo = datosAdmin.filter(d => d.dniTitular === item.dniTitular && d.tipoInfraccion === item.tipoInfraccion);
      if (mismo.length > 1) dnisReincidentes.add(item.dniTitular);
    });
    datosAdmin.forEach(item => {
      if (dnisReincidentes.has(item.dniTitular) && !actasReincidentes.some(a => a.dniTitular === item.dniTitular)) {
        actasReincidentes.push({...item, totalActas: datosAdmin.filter(d => d.dniTitular === item.dniTitular && d.tipoInfraccion === item.tipoInfraccion).length});
      }
    });
  }

  // Filtrado General
  const actasFiltradas = datosAdmin.filter(item => {
    if (vista !== 'admin_actas' && vista !== 'admin_balance') return true;
    if (vista === 'admin_balance' && tabBalance === 'pendientes' && item.estado !== 'PENDIENTE') return false;

    const textoBuscado = filtroActaNombre.toLowerCase();
    const coincideTexto = (item.nroActa?.toLowerCase().includes(textoBuscado)) || (item.nombreTitular?.toLowerCase().includes(textoBuscado));
    const coincideDni = item.dniTitular?.includes(filtroDniAdmin);
    const coincideDireccion = filtroDireccion ? item.tipoInfraccion === filtroDireccion : true;
    const coincideEstado = (vista === 'admin_balance' && tabBalance === 'pendientes') ? true : (filtroEstado ? item.estado === filtroEstado : true);
    return coincideTexto && coincideDni && coincideDireccion && coincideEstado;
  });

  const listaBase = (vista === 'admin_balance' && tabBalance === 'reincidentes') ? actasReincidentes : ((vista === 'admin_balance' && tabBalance === 'recaudacion') ? recaudacionDelDia : (vista === 'admin_actas' || (vista === 'admin_balance' && tabBalance === 'pendientes') ? actasFiltradas : datosAdmin));
  const totalItems = listaBase.length;
  const totalPaginas = Math.max(1, Math.ceil(totalItems / filasPorPagina));
  const indicePrimerItem = (paginaActual - 1) * filasPorPagina;
  const indiceUltimoItem = paginaActual * filasPorPagina;
  const listaPaginada = listaBase.slice(indicePrimerItem, indiceUltimoItem);

  // Manejo de Consulta Diaria
  const manejarConsultaDiaria = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setBuscandoRecaudacion(true);
    const res = await obtenerRecaudacionDiaria(fechaConsulta);
    if (res.success && res.data) { setRecaudacionDelDia(res.data); } else { setRecaudacionDelDia([]); alert("Error: " + res.error); }
    setBuscandoRecaudacion(false);
  }

  const exportarCSV = () => {
    if (recaudacionDelDia.length === 0) return alert("No hay datos para exportar.");
    let csvContent = "Fecha Carga,Hora,Nro Acta,Titular,DNI,Reparticion,Monto,Medio Pago,Registrado Por\n";
    
    recaudacionDelDia.forEach(pago => {
      const d = new Date(pago.creadoEn);
      const fecha = d.toLocaleDateString('es-AR');
      const hora = d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const medio = pago.comprobanteUrl === 'PAGO_PRESENCIAL_VENTANILLA' ? 'Efectivo (Ventanilla)' : 'Transferencia (Online)';
      csvContent += `${fecha},${hora},${pago.infraccion?.nroActa || '-'},"${pago.infraccion?.nombreTitular || '-'}",${pago.infraccion?.dniTitular || '-'},${pago.infraccion?.tipoInfraccion || '-'},${pago.montoInformado},${medio},"${pago.registradoPor || 'S/D'}"\n`;
    });

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Recaudacion_Juzgado_${fechaConsulta}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Totales Diarios
  const recaudadoEfectivo = recaudacionDelDia.filter(p => p.comprobanteUrl === 'PAGO_PRESENCIAL_VENTANILLA').reduce((acc, p) => acc + (Number(p.montoInformado) || 0), 0);
  const recaudadoOnline = recaudacionDelDia.filter(p => p.comprobanteUrl !== 'PAGO_PRESENCIAL_VENTANILLA').reduce((acc, p) => acc + (Number(p.montoInformado) || 0), 0);
  const recaudadoTotalDia = recaudadoEfectivo + recaudadoOnline;

  const rol = usuario?.rol || ''
  const puedeActas = ['SUPERADMIN', 'JUEZ', 'ADMINISTRATIVO', 'LETRADO'].includes(rol)
  const puedeDescargos = ['SUPERADMIN', 'JUEZ', 'LETRADO'].includes(rol)
  const puedePagos = ['SUPERADMIN', 'JUEZ', 'CONTABLE'].includes(rol)
  const puedeBalance = ['SUPERADMIN', 'JUEZ', 'CONTABLE'].includes(rol)

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
        
        .hero { padding: 48px 0 32px; background: radial-gradient(circle at 88% 15%, rgba(0, 178, 214, 0.06), transparent 45%), var(--papel-alto); border-bottom: 1px solid var(--linea); } 
        .hero .wrap { display: grid; grid-template-columns: 1fr; text-align: center; max-width: 800px; } 
        .hero .eyebrow { font-family: 'Montserrat', sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--celeste-loreto); margin-bottom: 12px; font-weight: 700; } 
        .hero h1 { font-size: clamp(28px, 3.5vw, 42px); font-weight: 800; letter-spacing: -0.02em; } 
        .hero p.lead { font-size: 16.5px; color: var(--tinta-suave); max-width: 55ch; margin: 12px auto 24px; font-weight: 400; }
        
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
        .news-card img { width: 100%; aspect-ratio: 3/2; object-fit: cover; margin-bottom: 16px; border-radius: 6px; } 
        .news-card h3 { font-size: 16px; text-transform: uppercase; color: var(--azul-loreto); line-height: 1.4; font-weight: 800; letter-spacing: 0.02em; margin-bottom: 10px; }
        .news-card p { font-size: 14.5px; color: var(--tinta-suave); line-height: 1.6; white-space: pre-wrap; margin: 0; }
        
        .consulta-panel { background: var(--azul-loreto); color: #F8F9FA; border-radius: var(--radius-m); padding: 48px; max-width: 900px; margin: 0 auto; box-shadow: 0 16px 40px rgba(11,74,130,0.15); } 
        .consulta-panel h3 { color: #fff; font-size: 28px; text-align: center; }
        .consulta-form { background: var(--papel); border-radius: var(--radius-m); padding: 32px; color: var(--tinta); margin-top: 24px; } 
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

        /* TABS BALANCE */
        .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--linea); padding-bottom: 12px; overflow-x: auto; }
        .tabs button { background: none; border: none; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; color: var(--tinta-suave); cursor: pointer; padding: 8px 16px; border-radius: 6px; transition: all 0.2s; white-space: nowrap; }
        .tabs button:hover { background: var(--papel); color: var(--azul-loreto); }
        .tabs button.active { background: var(--azul-loreto); color: #fff; }
        
        @media (max-width: 980px) { 
          .contacto-grid, .hero .wrap, .news-grid, .autoridades-grid, .art-grid { grid-template-columns: 1fr; } 
          .hero { padding: 30px 0; }
          .consulta-panel { padding: 24px 16px; }
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
                <li><a href="#consulta" onClick={() => setMenuAbierto(false)}>Trámites Online</a></li>
                <li><a href="#autoridades" onClick={() => setMenuAbierto(false)}>Autoridades</a></li>
                <li><a href="#normativa" onClick={() => setMenuAbierto(false)}>Normativa</a></li>
                <li><a href="#noticias" onClick={() => setMenuAbierto(false)}>Noticias</a></li>
              </ul>
            </nav>
          ) : (
            <nav className={`primary ${menuAbierto ? 'abierto' : ''}`}>
              {autenticado && (
                <ul>
                  {puedeActas && <li><a className={vista === 'admin_actas' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_actas')}>Actas</a></li>}
                  {puedeBalance && <li><a className={vista === 'admin_balance' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_balance')}>Balance</a></li>}
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
            <button onClick={() => { 
              if (vista === 'publica') { setVista('admin_actas'); } else { localStorage.removeItem('juzgado_sesion'); setVista('publica'); setAutenticado(false); setUsuario(null); setPassword(""); } 
              setMenuAbierto(false); 
            }} className="btn btn--ghost btn--sm">
              {vista === 'publica' ? 'Acceso Personal' : 'Cerrar Sesión'}
            </button>
          </div>
        </div>
      </header>

      <main id="contenido">
        {vista === 'publica' && (
          // (Toda la sección pública se mantiene exactamente igual)
          <section className="hero" id="inicio">
              <div className="wrap">
                <div>
                  <p className="eyebrow">Municipalidad de Loreto · Santiago del Estero</p>
                  <h1>Juzgado de Faltas Municipal</h1>
                  <p className="lead">Plataforma digital oficial para la consulta de actas, presentación de descargos y gestión de pagos sin necesidad de trámites presenciales.</p>
                </div>
              </div>
            </section>
            // ... (Resto del código público omitido para brevedad en esta respuesta, mantenlo intacto en tu archivo) ...
        )}

        {vista !== 'publica' && (
          <section style={{background: 'var(--papel-alto)', minHeight: '60vh'}}>
            <div className="wrap">
              {!autenticado ? (
                <div style={{maxWidth: '400px', margin: '0 auto', background: 'var(--papel)', padding: '48px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)'}}>
                  <div style={{textAlign: 'center', marginBottom: '32px'}}>
                    <img src="/logojdf.png" alt="Logo" style={{height: '60px', marginBottom: '16px'}} />
                    <h2 style={{fontSize: '22px', margin: 0}}>Acceso Restringido</h2>
                  </div>
                  <form onSubmit={procesarLogin}>
                    <div className="field"><label>Correo Electrónico Institucional</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                    <div className="field"><label>Clave de Seguridad</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                    <button type="submit" className="btn btn--primary btn--block" style={{marginTop: '24px'}}>Verificar Identidad</button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="section-head" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px'}}>
                    <div>
                      <p className="kicker">Panel de Administración</p>
                      <h2>{vista === 'admin_actas' ? 'Carga y Edición de Actas' : vista === 'admin_balance' ? 'Balance General e Informes' : vista === 'admin_descargos' ? 'Auditoría Legal de Descargos' : vista === 'admin_usuarios' ? 'Gestión de Recursos Humanos' : vista === 'admin_noticias' ? 'Publicación Institucional' : vista === 'admin_calculadora' ? 'Calculadora de Multas (UEM)' : 'Conciliación Bancaria y Pagos'}</h2>
                    </div>
                  </div>
                  
                  {/* MODULO BALANCE */}
                  {vista === 'admin_balance' && (
                    <div style={{background: 'var(--papel)', padding: '32px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'}}>
                      
                      <div className="tabs">
                        <button className={tabBalance === 'pendientes' ? 'active' : ''} onClick={() => setTabBalance('pendientes')}>Actas Pendientes</button>
                        <button className={tabBalance === 'recaudacion' ? 'active' : ''} onClick={() => { setTabBalance('recaudacion'); manejarConsultaDiaria(); }}>Recaudación Diaria</button>
                        <button className={tabBalance === 'reincidentes' ? 'active' : ''} onClick={() => setTabBalance('reincidentes')}>Reincidentes</button>
                      </div>

                      {tabBalance === 'recaudacion' && (
                        <div style={{marginBottom: '24px'}}>
                          <div style={{background: 'var(--papel-alto)', padding: '24px', borderRadius: '8px', border: '1px solid var(--linea)', display: 'flex', gap: '20px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px'}}>
                            <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '200px'}}>
                              <label>Seleccionar Fecha de Carga del Pago</label>
                              <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                            </div>
                            <button onClick={manejarConsultaDiaria} disabled={buscandoRecaudacion} className="btn btn--primary">{buscandoRecaudacion ? 'Consultando...' : 'Ver Ingresos'}</button>
                            <button onClick={exportarCSV} className="btn btn--ghost">📥 Exportar CSV</button>
                          </div>

                          {!buscandoRecaudacion && (
                            <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px'}}>
                              <div style={{background: 'rgba(16, 185, 129, 0.05)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)'}}>
                                <span style={{fontSize: '11px', fontWeight: 700, color: '#047857', textTransform: 'uppercase'}}>Total Recaudado (Día)</span>
                                <p style={{fontSize: '24px', fontWeight: 800, margin: '4px 0 0 0', color: '#047857'}}>${recaudadoTotalDia.toLocaleString('es-AR')}</p>
                              </div>
                              <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid var(--linea)'}}>
                                <span style={{fontSize: '11px', fontWeight: 700, color: 'var(--tinta-suave)', textTransform: 'uppercase'}}>Por Ventanilla (Efectivo)</span>
                                <p style={{fontSize: '20px', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--tinta)'}}>${recaudadoEfectivo.toLocaleString('es-AR')}</p>
                              </div>
                              <div style={{background: '#fff', padding: '20px', borderRadius: '8px', border: '1px solid var(--linea)'}}>
                                <span style={{fontSize: '11px', fontWeight: 700, color: 'var(--tinta-suave)', textTransform: 'uppercase'}}>Por Transferencia (Online)</span>
                                <p style={{fontSize: '20px', fontWeight: 700, margin: '4px 0 0 0', color: 'var(--tinta)'}}>${recaudadoOnline.toLocaleString('es-AR')}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {tabBalance === 'pendientes' && (
                        <div className="filter-grid" style={{marginBottom: 0, padding: 0, border: 'none', boxShadow: 'none'}}>
                          <div className="field" style={{marginBottom: 0}}>
                            <label>Búsqueda (N° Acta o Nombre)</label>
                            <input type="text" placeholder="Ej: 0001 o Pérez..." value={filtroActaNombre} onChange={e => setFiltroActaNombre(e.target.value)} />
                          </div>
                          <div className="field" style={{marginBottom: 0}}>
                            <label>Repartición (Búsqueda)</label>
                            <select value={filtroDireccion} onChange={e => setFiltroDireccion(e.target.value)}>
                              <option value="">Consolidado Histórico</option>
                              <option value="TRANSITO">Exclusivo Tránsito</option>
                              <option value="BROMATOLOGIA">Exclusivo Bromatología</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* VISTA ACTAS - Carga y buscador simplificado */}
                  {vista === 'admin_actas' && (
                    <div style={{background: 'var(--papel)', padding: '32px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'}}>
                      <h3 style={{fontSize: '18px', marginBottom: '24px'}}>Carga de Nueva Acta de Infracción</h3>
                      <form onSubmit={manejarCrearActa} style={{display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '180px'}}><label>Repartición</label><select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}><option value="TRANSITO">Tránsito</option><option value="BROMATOLOGIA">Bromatología</option></select></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '110px'}}><label>N° Acta</label><input type="text" value={nuevoNroActa} onChange={(e) => setNuevoNroActa(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '140px'}}><label>Fecha</label><input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '160px'}}><label>Infractor</label><input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>DNI</label><input type="text" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Monto ($)</label><input type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} required /></div>
                        <button type="submit" disabled={guardandoActa} className="btn btn--primary">{guardandoActa ? 'Procesando...' : 'Asentar Acta'}</button>
                      </form>
                    </div>
                  )}

                  {vista === 'admin_actas' && (
                    <div className="filter-grid">
                      <div className="field" style={{marginBottom: 0}}><label>Buscar (N° Acta o Nombre)</label><input type="text" value={filtroActaNombre} onChange={e => setFiltroActaNombre(e.target.value)} /></div>
                      <div className="field" style={{marginBottom: 0}}><label>Estado Procesal</label><select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}><option value="">Todos</option><option value="PENDIENTE">Pendientes</option><option value="PAGADO">Pagadas</option><option value="DESISTIDO">Desistidas</option></select></div>
                    </div>
                  )}

                  <div style={{overflowX: 'auto'}}>
                    {cargandoAdmin ? <p style={{textAlign: 'center', padding: '60px', color: 'var(--tinta-suave)'}}>Cargando información del servidor...</p> : (
                      <>
                        {/* TABLA RECAUDACION */}
                        {vista === 'admin_balance' && tabBalance === 'recaudacion' && (
                          <table className="admin-table">
                            <thead><tr><th>Hora Carga</th><th>N° Acta Vinculada</th><th>Infractor (DNI)</th><th>Monto Efectivo</th><th>Medio de Ingreso</th><th>Registrado Por</th></tr></thead>
                            <tbody>
                              {listaPaginada.map((item: any) => (
                                <tr key={item.id}>
                                  <td><strong>{new Date(item.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong></td>
                                  <td>Acta N° {item.infraccion?.nroActa || '-'}</td>
                                  <td>{item.infraccion?.nombreTitular || '-'} ({item.infraccion?.dniTitular || '-'})</td>
                                  <td style={{color: '#047857', fontWeight: 700}}>${item.montoInformado}</td>
                                  <td>{item.comprobanteUrl === 'PAGO_PRESENCIAL_VENTANILLA' ? 'Efectivo (Ventanilla)' : 'Transferencia Bancaria'}</td>
                                  <td><span className="badge" style={{background: 'var(--papel-alto)', color: 'var(--tinta-suave)'}}>{item.registradoPor || 'Sistema'}</span></td>
                                </tr>
                              ))}
                              {listaPaginada.length === 0 && (<tr><td colSpan={6} style={{textAlign: 'center', padding: '40px'}}>No hay registros de cobro en la fecha seleccionada.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {/* TABLA ACTAS GENERAL, PENDIENTES Y REINCIDENTES */}
                        {(vista === 'admin_actas' || (vista === 'admin_balance' && tabBalance !== 'recaudacion')) && (
                          <table className="admin-table">
                            <thead><tr><th>N° Acta</th><th>Infractor</th><th>DNI</th><th>Fecha Hecho</th><th>Fase Procesal</th>{vista === 'admin_balance' && tabBalance === 'reincidentes' ? <th>Infracciones Acumuladas</th> : <th>Monto Base</th>}<th>Acciones</th></tr></thead>
                            <tbody>
                              {listaPaginada.map((item: any) => (
                                <tr key={item.id}>
                                  <td><strong style={{fontSize: '15px'}}>{item.nroActa}</strong></td>
                                  <td><strong style={{display: 'block', fontSize: '14px'}}>{item.nombreTitular}</strong></td>
                                  <td style={{fontFamily: 'Montserrat, sans-serif', fontWeight: 600}}>{item.dniTitular}</td>
                                  <td style={{fontSize: '13.5px'}}>{new Date(item.fechaInfraccion).toLocaleDateString('es-AR')}</td>
                                  <td><span className="badge" style={{background: item.estado === 'PENDIENTE' ? 'rgba(245, 158, 11, 0.15)' : (item.estado === 'DESISTIDO' ? 'rgba(11, 74, 130, 0.15)' : 'rgba(16, 185, 129, 0.15)'), color: item.estado === 'PENDIENTE' ? '#B45309' : (item.estado === 'DESISTIDO' ? 'var(--azul-loreto)' : '#047857')}}>{item.estado}</span></td>
                                  
                                  {vista === 'admin_balance' && tabBalance === 'reincidentes' ? (
                                    <td><span style={{background: '#DC2626', color: '#fff', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold'}}>{item.totalActas} registradas</span></td>
                                  ) : (
                                    <td style={{fontWeight: 600}}>${item.monto}</td>
                                  )}
                                  
                                  <td>
                                    <div style={{display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
                                      {item.estado !== 'PAGADO' && item.estado !== 'SOBRESEIDO' && item.estado !== 'DESISTIDO' && (
                                        <>
                                          <button onClick={() => manejarCobroManual(item)} className="btn btn--success btn--sm" style={{background: '#10B981'}}>Cobrar</button>
                                          <button onClick={() => manejarDesistimiento(item)} className="btn btn--primary btn--sm" style={{background: 'var(--azul-loreto)'}}>Desistimiento</button>
                                        </>
                                      )}
                                      <button onClick={() => {
                                        const d = new Date(item.fechaInfraccion);
                                        setModalEditarActa({...item, fechaInfraccion_input: !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''});
                                      }} className="btn btn--ghost btn--sm">Editar</button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                              {listaPaginada.length === 0 && (<tr><td colSpan={7} style={{textAlign: 'center', padding: '40px'}}>No hay resultados.</td></tr>)}
                            </tbody>
                          </table>
                        )}

                        {/* Paginación */}
                        {totalPaginas > 1 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', background: 'var(--papel-alto)', borderTop: '1px solid var(--linea)', borderBottomLeftRadius: 'var(--radius-m)', borderBottomRightRadius: 'var(--radius-m)', flexWrap: 'wrap', gap: '10px' }}>
                            <span style={{ fontSize: '13px', color: 'var(--tinta-suave)' }}>
                              Mostrando registros <strong>{indicePrimerItem + 1}</strong> al <strong>{Math.min(indiceUltimoItem, totalItems)}</strong> (Total: {totalItems})
                            </span>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="btn btn--ghost btn--sm">Anterior</button>
                              <span style={{ fontSize: '13px', fontWeight: 600, padding: '0 8px' }}>Página {paginaActual} de {totalPaginas}</span>
                              <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="btn btn--ghost btn--sm">Siguiente</button>
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

      {/* MODAL EXPEDIENTE y CLAVES se mantienen intactos */}
      {/* ... (Se omiten los modales de contraseña y descargo por brevedad. Asegúrate de conservar tu código original de modales) ... */}

    </>
  )
}