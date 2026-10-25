"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { buscarInfraccionPorDni } from "./actions/actas"
import { procesarTramiteCiudadano, procesarNoticia } from "./actions/subidas"
import { inicializarSistema, iniciarSesion, obtenerActasAdmin, obtenerDescargosAdmin, obtenerPagosAdmin, resolverDescargo, conciliarPago, crearActa, eliminarActa, editarActa, obtenerUsuariosAdmin, crearUsuarioAdmin, toggleEstadoUsuario, cambiarContrasena, obtenerNoticiasAdmin, eliminarNoticia, eliminarUsuario, blanquearClave, registrarPagoManual, desistirActa, obtenerRecaudacionDiaria, obtenerTarifas, obtenerImpuestos, crearImpuesto, cobrarImpuesto, anularImpuesto, buscarImpuestosPorDni } from "./actions/admin"

// === COMPONENTES DE ANIMACIÓN Y MICROINTERACCIONES ===
const AnimatedNumber = ({ value, isCurrency = false }: { value: number, isCurrency?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const duration = 1500; 
    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.floor(easeOut * value));
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };
    requestAnimationFrame(animate);
  }, [value]);

  return <>{isCurrency ? '$' : ''}{displayValue.toLocaleString('es-AR')}</>;
}

const Reveal = ({ children }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setIsVisible(true); observer.unobserve(entry.target); }
    }, { threshold: 0.1 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ opacity: isVisible ? 1 : 0, transform: isVisible ? 'translateY(0)' : 'translateY(40px)', transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}>
      {children}
    </div>
  )
}

const Spinner = ({ dark = false }: { dark?: boolean }) => (
  <span className={`inline-block w-4 h-4 border-2 rounded-full mr-2 align-middle animate-[spin_0.8s_ease-in-out_infinite] ${dark ? 'border-[#0B4A82]/20 border-t-[#0B4A82]' : 'border-white/30 border-t-white'}`}></span>
);

const SkeletonTable = ({ columnas = 6 }) => (
  <div className="p-6">
    {[1, 2, 3, 4, 5].map(row => (
      <div key={row} className="flex gap-4 mb-5 pb-5 border-b border-gray-100 last:border-0 opacity-70">
        {Array.from({length: columnas}).map((_, col) => (
          <div key={col} className="h-4 rounded bg-gray-200 flex-1 animate-[pulse_1.5s_ease-in-out_infinite]" style={{ animationDelay: `${col * 0.1}s` }}></div>
        ))}
      </div>
    ))}
  </div>
);

// LÍNEA DE TIEMPO VISUAL
const TimelineExpediente = ({ estado }: { estado: string }) => {
  let progress = 0;
  let step1 = true; 
  let step2 = false;
  let step3 = false;

  if (['PRESENTADO', 'PENDIENTE_CONCILIACION'].includes(estado)) {
    progress = 50;
    step2 = true;
  } else if (['PAGADO', 'DESISTIDO', 'SOBRESEIDO', 'RESUELTO_A_FAVOR'].includes(estado)) {
    progress = 100;
    step2 = true;
    step3 = true;
  }

  return (
    <div className="py-6 mt-4 mb-2">
      <div className="relative">
        <div className="absolute top-[11px] left-0 w-full h-[4px] bg-gray-200 rounded"></div>
        <div className="absolute top-[11px] left-0 h-[4px] bg-[#00B2D6] transition-all duration-1000 ease-out rounded" style={{ width: `${progress}%` }}></div>
        
        <div className="relative flex justify-between">
          <div className="flex flex-col items-center">
            <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-black z-10 transition-colors ${step1 ? 'bg-[#00B2D6] text-white ring-4 ring-gray-50' : 'bg-gray-200 text-gray-400 ring-4 ring-gray-50'}`}>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${step1 ? 'text-[#0B4A82]' : 'text-gray-400'}`}>Labrada</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-black z-10 transition-colors ${step2 ? 'bg-[#00B2D6] text-white ring-4 ring-gray-50' : 'bg-gray-200 text-gray-400 ring-4 ring-gray-50'}`}>
              {progress > 50 ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : '2'}
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${step2 ? 'text-[#0B4A82]' : 'text-gray-400'}`}>En Revisión</span>
          </div>
          <div className="flex flex-col items-center">
            <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[12px] font-black z-10 transition-colors ${step3 ? 'bg-[#10B981] text-white ring-4 ring-gray-50' : 'bg-gray-200 text-gray-400 ring-4 ring-gray-50'}`}>
              {step3 ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> : '3'}
            </div>
            <span className={`text-[10px] font-bold mt-2 uppercase tracking-widest ${step3 ? 'text-[#10B981]' : 'text-gray-400'}`}>Resuelta</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// COMPONENTE DE BOTÓN FLOTANTE WHATSAPP
const BotonWhatsApp = () => {
  return (
    <a 
      href="https://wa.me/5493854743310?text=Hola!%20Queria%20hacer%20una%20consulta%20al%20Juzgado%20de%20Faltas..." 
      target="_blank" 
      rel="noopener noreferrer"
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:shadow-xl transition-all duration-300 no-print"
      title="Atención por WhatsApp"
    >
      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01a1.183 1.183 0 0 0-.854.398c-.297.319-1.139 1.114-1.139 2.716 0 1.603 1.164 3.153 1.327 3.371.163.218 2.298 3.509 5.567 4.921 2.321.999 3.13.914 3.693.856.634-.065 1.757-.718 2.005-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
      </svg>
    </a>
  );
}

// DATOS DE PREGUNTAS FRECUENTES DESTACADAS
const FAQS_DESTACADAS = [
  {
    pregunta: "¿Cuál es el plazo legal para presentar un descargo?",
    respuesta: "Usted dispone de un plazo improrrogable de cinco (5) días hábiles administrativos contados a partir de la fecha en que se labró o notificó el acta de infracción. Puede realizar la presentación de forma 100% digital desde este portal adjuntando su prueba documental."
  },
  {
    pregunta: "¿Cómo accedo al descuento del 50% por Pago Voluntario?",
    respuesta: "Si abona la infracción dentro del plazo inicial antes del vencimiento y sin haber interpuesto recurso de descargo, accede automáticamente a una quita del 50% sobre el valor base de la multa. Puede transferir a la cuenta oficial e informar el comprobante en la sección de Consulta."
  },
  {
    pregunta: "¿Cómo obtengo el Certificado de Libre Deuda Municipal?",
    respuesta: "Ingrese su número de DNI y género en el buscador superior. Si el sistema verifica que usted no registra actas pendientes ni deudas impositivas exigibles, se habilitará automáticamente un botón verde para descargar e imprimir su Certificado Oficial con membrete y código de validación."
  },
  {
    pregunta: "¿Qué documentación necesito para retirar un vehículo retenido?",
    respuesta: "Debe solicitar un turno presencial o acercarse al Juzgado con su DNI, Licencia de Conducir vigente, Cédula de Identificación del Vehículo (verde o azul) y comprobante de Póliza de Seguro en vigencia. Una vez regularizada la situación procesal, el Juez emitirá el Oficio de Liberación."
  },
  {
    pregunta: "¿Qué medios de pago están habilitados?",
    respuesta: "Puede abonar mediante transferencia bancaria desde cualquier billetera virtual o banco al Alias oficial 'LoretoRecaudacion' (Banco Santiago del Estero), o bien de forma presencial por ventanilla en la sede del Juzgado de Lunes a Viernes."
  }
];
// ===================================================

export default function JuzgadoFaltasUnificado() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [vista, setVista] = useState<'publica' | 'admin_actas' | 'admin_descargos' | 'admin_pagos' | 'admin_usuarios' | 'admin_noticias' | 'admin_calculadora' | 'admin_balance' | 'admin_recaudacion'>('publica')
  const [tabBalance, setTabBalance] = useState<'pendientes' | 'recaudacion' | 'reincidentes'>('pendientes')

  const [autenticado, setAutenticado] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [usuario, setUsuario] = useState<{nombre: string, rol: string} | null>(null)
  
  const [datosAdmin, setDatosAdmin] = useState<any[]>([])
  const [pagosAdmin, setPagosAdmin] = useState<any[]>([])
  const [noticiasPublicas, setNoticiasPublicas] = useState<any[]>([])
  const [cargandoAdmin, setCargandoAdmin] = useState(false)
  
  const [tarifas, setTarifas] = useState<any[]>([])
  const [impuestos, setImpuestos] = useState<any[]>([])
  const [modalRecaudacion, setModalRecaudacion] = useState(false)
  
  const [modalPrivacidad, setModalPrivacidad] = useState(false)
  const [modalTerminos, setModalTerminos] = useState(false)

  const [recDni, setRecDni] = useState("")
  const [recGenero, setRecGenero] = useState("MASCULINO")
  const [recNombre, setRecNombre] = useState("")
  const [recConcepto, setRecConcepto] = useState("")
  const [recMonto, setRecMonto] = useState("")
  const [recGuardando, setRecGuardando] = useState(false)
  const [filtroRec, setFiltroRec] = useState("")

  const [itemModal, setItemModal] = useState<any>(null)
  const [modalEditarActa, setModalEditarActa] = useState<any>(null)
  const [editandoActa, setEditandoActa] = useState(false)
  const [textoResolucion, setTextoResolucion] = useState("")
  const [procesando, setProcesando] = useState(false)

  // Búsqueda Pública y Navegación Guiada
  const [dni, setDni] = useState("")
  const [generoConsulta, setGeneroConsulta] = useState("MASCULINO")
  const [resultados, setResultados] = useState<any[]>([])
  const [resultadosImpuestos, setResultadosImpuestos] = useState<any[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [tramiteActivo, setTramiteActivo] = useState<{ id: string, tipo: 'pago' | 'descargo' } | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [guiaAccionRapida, setGuiaAccionRapida] = useState<string>("")
  const [faqAbierta, setFaqAbierta] = useState<number | null>(0)
  const inputDniRef = useRef<HTMLInputElement>(null)
  
  const [pasoDescargo, setPasoDescargo] = useState(1);
  const [motivoText, setMotivoText] = useState("");
  const MAX_MOTIVO = 3000;
  
  const [esLibreDeuda, setEsLibreDeuda] = useState(false)
  const [alertaNotificacion, setAlertaNotificacion] = useState<{titulo: string, mensaje: string, tipo: 'exito' | 'error'} | null>(null)

  const [fechaConsulta, setFechaConsulta] = useState(new Date().toISOString().split('T')[0])
  const [recaudacionDelDia, setRecaudacionDelDia] = useState<any[]>([])
  const [buscandoRecaudacion, setBuscandoRecaudacion] = useState(false)

  const [nuevoNroActa, setNuevoNroActa] = useState(""); const [nuevoNombre, setNuevoNombre] = useState(""); const [nuevoDni, setNuevoDni] = useState(""); const [nuevoGenero, setNuevoGenero] = useState("MASCULINO"); const [nuevoLugar, setNuevoLugar] = useState(""); const [nuevoArticulo, setNuevoArticulo] = useState(""); const [nuevoInspector, setNuevoInspector] = useState(""); const [nuevoMonto, setNuevoMonto] = useState(""); const [nuevoTipo, setNuevoTipo] = useState("TRANSITO"); const [nuevaFecha, setNuevaFecha] = useState(""); const [guardandoActa, setGuardandoActa] = useState(false);
  
  const [nuevoUsuarioNombre, setNuevoUsuarioNombre] = useState(""); const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState(""); const [nuevoUsuarioRol, setNuevoUsuarioRol] = useState("ADMINISTRATIVO"); const [guardandoUsuario, setGuardandoUsuario] = useState(false);
  const [modalPassword, setModalPassword] = useState(false); const [passActual, setPassActual] = useState(""); const [passNueva, setPassNueva] = useState(""); const [passConfirmar, setPassConfirmar] = useState(""); const [cambiandoPass, setCambiandoPass] = useState(false);

  const [filtroActaNombre, setFiltroActaNombre] = useState("")
  const [filtroDniAdmin, setFiltroDniAdmin] = useState("")
  const [filtroDireccion, setFiltroDireccion] = useState("")
  const [filtroEstado, setFiltroEstado] = useState("")

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
          cargarDatosPanel(data.vista, data.usuario.rol);
        }
      } catch (e) {}
    }
  }, [])

  useEffect(() => { setPaginaActual(1); }, [filtroActaNombre, filtroDniAdmin, filtroDireccion, filtroEstado, vista, tabBalance, filtroRec]);

  const activarAccesoRapido = (accion: 'descargo' | 'pago' | 'libredeuda' | 'turno') => {
    if (accion === 'turno') {
      document.getElementById('turnos-presenciales')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const textos: Record<string, string> = {
      descargo: "Para presentar un descargo formal, ingrese su DNI y género a continuación para localizar su acta:",
      pago: "Para informar una transferencia y adjuntar el comprobante, ingrese primero su DNI y género:",
      libredeuda: "Para validar sus antecedentes y emitir el Certificado de Libre Deuda en PDF, ingrese su DNI y género:"
    };
    setGuiaAccionRapida(textos[accion] || "");
    document.getElementById('consulta')?.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => inputDniRef.current?.focus(), 500);
  }

  const manejarBusqueda = async (e: React.FormEvent) => {
    e.preventDefault(); setBuscando(true); setMensaje(""); setTramiteActivo(null); setEsLibreDeuda(false); setGuiaAccionRapida("");
    setResultados([]); setResultadosImpuestos([]);

    const resInfracciones = await buscarInfraccionPorDni(dni, generoConsulta);
    const resImpuestos = await buscarImpuestosPorDni(dni, generoConsulta);

    let encontrados = 0;
    if (resInfracciones.success && resInfracciones.data) { setResultados(resInfracciones.data); encontrados += resInfracciones.data.length; }
    if (resImpuestos.success && resImpuestos.data) { setResultadosImpuestos(resImpuestos.data); encontrados += resImpuestos.data.length; }
    
    if (encontrados === 0) { 
      setMensaje("No se registran infracciones ni deudas impositivas exigibles con los datos ingresados."); 
      setEsLibreDeuda(true);
    } else {
      const tieneDeudasActivas = (resInfracciones.data || []).some((a: any) => ['PENDIENTE', 'PRESENTADO', 'PENDIENTE_CONCILIACION'].includes(a.estado)) || 
                                 (resImpuestos.data || []).some((i: any) => i.estado === 'PENDIENTE');
      if (!tieneDeudasActivas) {
        setEsLibreDeuda(true);
      }
    }
    setBuscando(false);
  }

  const manejarEnvioTramite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); 
    setEnviando(true);
    try {
      const formData = new FormData(e.currentTarget);
      const archivo = formData.get('archivo') as File | null;
      if (archivo && archivo.size > 0) {
        if (archivo.size > 10485760) {
          setAlertaNotificacion({ titulo: 'Archivo demasiado pesado', mensaje: 'El documento supera el límite máximo de 10 MB permitido por seguridad institucional. Por favor, comprima el archivo e intente nuevamente.', tipo: 'error' });
          setEnviando(false); return;
        }
        const tiposPermitidos = ['application/pdf', 'image/jpeg', 'image/png'];
        if (!tiposPermitidos.includes(archivo.type)) {
          setAlertaNotificacion({ titulo: 'Formato no admitido', mensaje: 'Por protocolos de seguridad, el sistema únicamente acepta documentación en formato PDF, JPG o PNG.', tipo: 'error' });
          setEnviando(false); return;
        }
      }

      const respuesta = await procesarTramiteCiudadano(formData);
      if (respuesta.success) {
        if (respuesta.expedienteNro) { 
          setAlertaNotificacion({ titulo: respuesta.esExtemporaneo ? 'Trámite Extemporáneo' : '¡Descargo Presentado!', mensaje: `Su número de expediente es: ${respuesta.expedienteNro}`, tipo: 'exito' }); 
        } else { 
          setAlertaNotificacion({ titulo: '¡Pago Informado!', mensaje: 'El comprobante ha sido enviado con éxito y está pendiente de conciliación bancaria.', tipo: 'exito' }); 
        }
        setTramiteActivo(null); manejarBusqueda(new Event('submit') as any);
      } else { 
        setAlertaNotificacion({ titulo: 'No se pudo procesar', mensaje: respuesta.error, tipo: 'error' }); 
      }
    } catch (error: any) { setAlertaNotificacion({ titulo: 'Error de conexión', mensaje: 'Revise su conexión a internet e intente nuevamente.', tipo: 'error' }); 
    } finally { setEnviando(false); }
  }

  const manejarEnvioTurno = (e: React.FormEvent) => {
    e.preventDefault();
    setAlertaNotificacion({ 
      titulo: '¡Turno Solicitado!', 
      mensaje: 'Su solicitud de turno ha sido registrada. Recibirá una confirmación por correo electrónico en la franja horaria seleccionada.', 
      tipo: 'exito' 
    });
    (e.target as HTMLFormElement).reset();
  }

  const procesarLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setProcesando(true);
    const auth = await iniciarSesion(email, password)
    setProcesando(false);
    if (!auth.success || !auth.usuario) return alert(auth.error || "Error de inicio de sesión")
    setUsuario({ nombre: auth.usuario.nombre, rol: auth.usuario.rol }); 
    setAutenticado(true); setMenuAbierto(false);
    
    let vistaInicial = 'admin_actas'
    if (auth.usuario.rol === 'LETRADO') vistaInicial = 'admin_descargos'
    if (auth.usuario.rol === 'CONTABLE') vistaInicial = 'admin_pagos'
    if (auth.usuario.rol === 'RECAUDADOR') vistaInicial = 'admin_recaudacion'

    setVista(vistaInicial as any); localStorage.setItem('juzgado_sesion', JSON.stringify({ usuario: auth.usuario, vista: vistaInicial }));
    cargarDatosPanel(vistaInicial, auth.usuario.rol);
  }

  const cargarDatosPanel = async (vistaDestino: string, rolActual?: string) => {
    setCargandoAdmin(true)
    try {
      if (vistaDestino === 'admin_recaudacion' || rolActual === 'RECAUDADOR') {
        const t = await obtenerTarifas();
        const i = await obtenerImpuestos();
        setTarifas(t); setImpuestos(i);
      } else {
        let datos: any = [];
        if (vistaDestino === 'admin_actas' || vistaDestino === 'admin_balance') {
          datos = await obtenerActasAdmin();
          const pagosGeneral = await obtenerPagosAdmin();
          setPagosAdmin(pagosGeneral);
          if (vistaDestino === 'admin_balance' && tabBalance === 'recaudacion') manejarConsultaDiaria();
        }
        if (vistaDestino === 'admin_descargos') datos = await obtenerDescargosAdmin();
        if (vistaDestino === 'admin_pagos') datos = await obtenerPagosAdmin();
        if (vistaDestino === 'admin_usuarios') datos = await obtenerUsuariosAdmin();
        if (vistaDestino === 'admin_noticias') datos = await obtenerNoticiasAdmin();
        if (Array.isArray(datos)) setDatosAdmin(datos); else setDatosAdmin([]);
      }
    } catch (error) { setDatosAdmin([]); }
    setCargandoAdmin(false)
  }

  const cambiarVistaAdmin = (nuevaVista: string) => { 
    setVista(nuevaVista as any); cargarDatosPanel(nuevaVista); setMenuAbierto(false); 
    const sesionActual = localStorage.getItem('juzgado_sesion');
    if (sesionActual) { const data = JSON.parse(sesionActual); localStorage.setItem('juzgado_sesion', JSON.stringify({ ...data, vista: nuevaVista })); }
  }

  const manejarConceptoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value; setRecConcepto(val);
    const tarifa = tarifas.find(t => t.concepto === val);
    if (tarifa) { setRecMonto(tarifa.monto.toString()); } else { setRecMonto(""); }
  }

  const manejarCrearImpuesto = async (e: React.FormEvent) => {
    e.preventDefault(); setRecGuardando(true);
    const data = { dniTitular: recDni, generoTitular: recGenero, nombreTitular: recNombre, concepto: recConcepto, monto: Number(recMonto), estado: 'PENDIENTE' };
    const res = await crearImpuesto(data);
    if (res.success) { setModalRecaudacion(false); setRecDni(""); setRecNombre(""); setRecConcepto(""); setRecMonto(""); setRecGenero("MASCULINO"); cargarDatosPanel('admin_recaudacion'); } else { alert("Error al cargar impuesto: " + res.error); }
    setRecGuardando(false);
  }

  const manejarCobroImpuesto = async (id: string, nombre: string, concepto: string, monto: number) => {
    if (!confirm(`¿Confirma el COBRO por ventanilla?\n\nContribuyente: ${nombre}\nConcepto: ${concepto}\nMonto a cobrar: $${monto}`)) return;
    setCargandoAdmin(true); const res = await cobrarImpuesto(id);
    if (res.success) { cargarDatosPanel('admin_recaudacion'); } else { alert(res.error); setCargandoAdmin(false); }
  }

  const manejarAnularImpuesto = async (id: string) => {
    if (!confirm(`¿Seguro que desea anular esta deuda generada por error?`)) return;
    setCargandoAdmin(true); const res = await anularImpuesto(id);
    if (res.success) { cargarDatosPanel('admin_recaudacion'); } else { alert(res.error); setCargandoAdmin(false); }
  }

  const deudaExigibleTotal = impuestos.filter(i => i.estado === 'PENDIENTE').reduce((acc, i) => acc + Number(i.monto), 0);
  const recaudacionTotalBordo = impuestos.filter(i => i.estado === 'PAGADO').reduce((acc, i) => acc + Number(i.monto), 0);
  const tramitesPendientesCount = impuestos.filter(i => i.estado === 'PENDIENTE').length;

  const impuestosFiltrados = impuestos.filter(i => {
    const txt = filtroRec.toLowerCase(); return i.dniTitular.includes(txt) || i.nombreTitular.toLowerCase().includes(txt) || i.concepto.toLowerCase().includes(txt);
  });

  const exportarRecaudacionCSV = () => {
    if (impuestosFiltrados.length === 0) return alert("No hay datos para exportar.");
    let csvContent = "\uFEFFFecha,Contribuyente,DNI,Concepto,Monto,Estado\n";
    impuestosFiltrados.forEach((imp: any) => {
      csvContent += `"${new Date(imp.creadoEn).toLocaleDateString('es-AR')}","${imp.nombreTitular}","${imp.dniTitular}","${imp.concepto}","${imp.monto}","${imp.estado}"\n`;
    });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Padron_Tasas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const manejarCrearActa = async (e: React.FormEvent) => {
    e.preventDefault(); setGuardandoActa(true);
    let fechaSegura = new Date().toISOString(); 
    if (nuevaFecha) { try { const partes = nuevaFecha.split('-'); if (partes.length === 3) { const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10), 12, 0, 0); if (!isNaN(d.getTime())) fechaSegura = d.toISOString(); } } catch(error) {} }
    const datosActa = { nroActa: nuevoNroActa, nombreTitular: nuevoNombre, dniTitular: nuevoDni, generoTitular: nuevoGenero, monto: Number(nuevoMonto), lugar: nuevoLugar || "No informado", articulo: nuevoArticulo || "No informado", inspector: nuevoInspector || "No informado", tipoInfraccion: nuevoTipo as any, fechaInfraccion: fechaSegura };
    const res = await crearActa(datosActa);
    if (res.success) { setNuevoNroActa(""); setNuevoNombre(""); setNuevoDni(""); setNuevoGenero("MASCULINO"); setNuevoLugar(""); setNuevoArticulo(""); setNuevoInspector(""); setNuevoMonto(""); setNuevoTipo("TRANSITO"); setNuevaFecha(""); cargarDatosPanel(vista); } else { alert(res.error); }
    setGuardandoActa(false);
  }

  const manejarEditarActa = async (e: React.FormEvent) => {
    e.preventDefault(); setEditandoActa(true);
    let fechaSegura = new Date().toISOString();
    if (modalEditarActa.fechaInfraccion_input) { try { const partes = modalEditarActa.fechaInfraccion_input.split('-'); if (partes.length === 3) { const d = new Date(parseInt(partes[0], 10), parseInt(partes[1], 10) - 1, parseInt(partes[2], 10), 12, 0, 0); if (!isNaN(d.getTime())) fechaSegura = d.toISOString(); } } catch(error) {} }
    const datosActualizados = { nroActa: modalEditarActa.nroActa, nombreTitular: modalEditarActa.nombreTitular, dniTitular: modalEditarActa.dniTitular, generoTitular: modalEditarActa.generoTitular, monto: Number(modalEditarActa.monto), lugar: modalEditarActa.lugar || "No informado", articulo: modalEditarActa.articulo || "No informado", inspector: modalEditarActa.inspector || "No informado", tipoInfraccion: modalEditarActa.tipoInfraccion, fechaInfraccion: fechaSegura };
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
    setCargandoAdmin(true); const res = await registrarPagoManual(item.id, montoFinal, usuario?.nombre || "Empleado");
    if (res.success) { cargarDatosPanel('admin_actas'); } else { alert("Error al registrar cobro: " + res.error); setCargandoAdmin(false); }
  }

  const manejarDesistimiento = async (item: any) => {
    if (!confirm(`¿Confirma el DESISTIMIENTO del Acta N° ${item.nroActa} por regularización de la falta (Subsanación)?\n\nEl titular ${item.nombreTitular} quedará eximido de responsabilidad en este expediente.`)) return;
    setCargandoAdmin(true); const res = await desistirActa(item.id);
    if (res.success) { cargarDatosPanel('admin_actas'); } else { alert("Error al registrar desistimiento: " + res.error); setCargandoAdmin(false); }
  }

  const manejarCrearNoticia = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); setProcesando(true);
    try {
      const formData = new FormData(e.currentTarget); const res = await procesarNoticia(formData);
      if (res.success) { alert("Noticia publicada."); (e.target as HTMLFormElement).reset(); cargarDatosPanel(vista); obtenerNoticiasAdmin().then(setNoticiasPublicas); } else { alert("Error: " + res.error) }
    } catch (error: any) { alert("Error de red al publicar la noticia."); } finally { setProcesando(false) }
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
    if (res.success) { alert(`CLAVE RESTABLECIDA\n\nLa nueva clave para ${nombre} es: ${res.tempPass}`); } else { alert("Error: " + res.error); }
  }

  const manejarConsultaDiaria = async (e?: React.FormEvent) => {
    if (e) e.preventDefault(); setBuscandoRecaudacion(true);
    const res = await obtenerRecaudacionDiaria(fechaConsulta);
    if (res.success && res.data) { setRecaudacionDelDia(res.data); } else { setRecaudacionDelDia([]); if (e) alert("Error al consultar recaudación: " + res.error); }
    setBuscandoRecaudacion(false);
  }

  const exportarCSV = () => {
    if (recaudacionDelDia.length === 0) return alert("No hay datos para exportar en esta fecha.");
    let csvContent = "Fecha de Carga,Hora,Acta Nro,Infractor,Monto Pagado,Medio de Pago\n";
    recaudacionDelDia.forEach(pago => {
      const fechaObj = new Date(pago.creadoEn); const fechaStr = fechaObj.toLocaleDateString('es-AR'); const horaStr = fechaObj.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const nroActa = pago.infraccion?.nroActa || '-'; const nombre = pago.infraccion?.nombreTitular || '-'; const monto = pago.montoInformado || 0;
      const medio = pago.comprobanteUrl === 'PAGO_PRESENCIAL_VENTANILLA' ? 'Efectivo (Ventanilla)' : 'Transferencia Bancaria (Online)';
      csvContent += `${fechaStr},${horaStr},${nroActa},"${nombre}",${monto},"${medio}"\n`;
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.setAttribute("href", URL.createObjectURL(blob)); link.setAttribute("download", `Recaudacion_Juzgado_${fechaConsulta}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const totalActasCount = datosAdmin.length;
  const actasPendientesCount = datosAdmin.filter(d => d.estado === 'PENDIENTE').length;
  const montoRecaudadoTotal = pagosAdmin.filter(p => p.estado === 'CONCILIADO').reduce((acc, p) => acc + (Number(p.montoInformado) || 0), 0);
  
  const dnisReincidentesGlobal = new Set();
  datosAdmin.forEach(item => { const mismo = datosAdmin.filter(d => d.dniTitular === item.dniTitular && d.tipoInfraccion === item.tipoInfraccion); if (mismo.length > 1) { dnisReincidentesGlobal.add(item.dniTitular); } });
  const reincidentesCount = dnisReincidentesGlobal.size;

  const dnisReincidentes = new Set(); const actasReincidentes: any[] = [];
  if (vista === 'admin_balance' && tabBalance === 'reincidentes') {
    datosAdmin.forEach(item => { const mismo = datosAdmin.filter(d => d.dniTitular === item.dniTitular && d.tipoInfraccion === item.tipoInfraccion); if (mismo.length > 1) dnisReincidentes.add(item.dniTitular); });
    datosAdmin.forEach(item => { if (dnisReincidentes.has(item.dniTitular) && !actasReincidentes.some(a => a.dniTitular === item.dniTitular)) { actasReincidentes.push({...item, totalActas: datosAdmin.filter(d => d.dniTitular === item.dniTitular && d.tipoInfraccion === item.tipoInfraccion).length}); } });
  }

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

  const listaBase = (vista === 'admin_recaudacion') ? impuestosFiltrados : ((vista === 'admin_balance' && tabBalance === 'reincidentes') ? actasReincidentes : ((vista === 'admin_balance' && tabBalance === 'recaudacion') ? recaudacionDelDia : ((vista === 'admin_actas' || (vista === 'admin_balance' && tabBalance === 'pendientes')) ? actasFiltradas : datosAdmin)));
  const totalItems = listaBase.length; const totalPaginas = Math.max(1, Math.ceil(totalItems / filasPorPagina));
  const indicePrimerItem = (paginaActual - 1) * filasPorPagina; const indiceUltimoItem = paginaActual * filasPorPagina;
  const listaPaginada = listaBase.slice(indicePrimerItem, indiceUltimoItem);

  const exportarDatosCSV = () => {
    if (listaBase.length === 0) return alert("No hay datos para exportar con los filtros actuales.");
    let csvContent = "\uFEFF"; 
    
    if (vista === 'admin_actas' || (vista === 'admin_balance' && tabBalance === 'pendientes') || (vista === 'admin_balance' && tabBalance === 'reincidentes')) {
      csvContent += "Nro Acta,Fecha Infraccion,Infractor,DNI,Genero,Domicilio,Articulo,Estado,Monto\n";
      listaBase.forEach((item: any) => {
        csvContent += `"${item.nroActa}","${new Date(item.fechaInfraccion).toLocaleDateString('es-AR')}","${item.nombreTitular}","${item.dniTitular}","${item.generoTitular || ''}","${item.lugar || ''}","${item.articulo || ''}","${item.estado}","${item.monto}"\n`;
      });
    } else if (vista === 'admin_descargos' || vista === 'admin_pagos') {
      csvContent += "Expediente / Nro Acta,Estado,Fecha Ingreso,Monto / Referencia\n";
      listaBase.forEach((item: any) => {
        const exp = item.expedienteNro || item.infraccion?.nroActa || item.nroActa;
        const fecha = new Date(item.creadoEn || item.fechaPago || item.fechaInfraccion || new Date()).toLocaleDateString('es-AR');
        const extra = vista === 'admin_pagos' ? (item.montoInformado || item.monto || "0") : "Descargo";
        csvContent += `"${exp}","${item.estado}","${fecha}","${extra}"\n`;
      });
    } else if (vista === 'admin_usuarios') {
      csvContent += "Nombre,Email,Rol,Estado\n";
      listaBase.forEach((item: any) => {
        csvContent += `"${item.nombre}","${item.email}","${item.rol}","${item.activo ? 'Operativa' : 'Suspendida'}"\n`;
      });
    } else {
       return alert("La exportación a Excel no está disponible para esta pantalla.");
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Exportacion_${vista}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  }

  const rol = usuario?.rol || ''
  const puedeActas = ['SUPERADMIN', 'JUEZ', 'ADMINISTRATIVO', 'LETRADO'].includes(rol);
  const puedeDescargos = ['SUPERADMIN', 'JUEZ', 'LETRADO'].includes(rol);
  const puedePagos = ['SUPERADMIN', 'JUEZ', 'CONTABLE'].includes(rol);
  const puedeBalance = ['SUPERADMIN', 'JUEZ', 'CONTABLE'].includes(rol);

  const recaudadoEfectivo = recaudacionDelDia.filter(p => p.comprobanteUrl === 'PAGO_PRESENCIAL_VENTANILLA').reduce((acc, p) => acc + (Number(p.montoInformado) || 0), 0);
  const recaudadoOnline = recaudacionDelDia.filter(p => p.comprobanteUrl !== 'PAGO_PRESENCIAL_VENTANILLA').reduce((acc, p) => acc + (Number(p.montoInformado) || 0), 0);
  const recaudadoTotalDia = recaudadoEfectivo + recaudadoOnline;

  return (
    <>
      {autenticado && usuario?.rol === 'RECAUDADOR' ? (
        
        /* ========================================================
           MUNDO RECAUDACIÓN (INTERFAZ BORDÓ TOTALMENTE AISLADA) 
           ======================================================== */
        <div className="min-h-screen bg-gray-100 flex flex-col font-sans no-print">
          <header className="bg-[#7A1B28] text-white shadow-md border-b-4 border-[#5E151F] sticky top-0 z-50">
            <div className="max-w-[1200px] mx-auto px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <img src="/logo-municipalidad.png" alt="Municipalidad de Loreto" className="h-12 drop-shadow-md bg-white rounded-lg p-1" />
                <div>
                  <span className="block text-[11px] font-bold tracking-widest text-[#E5B8B7] uppercase">Sistema de Recaudación</span>
                  <span className="block text-lg font-extrabold tracking-tight">Municipalidad de Loreto</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right hidden md:block">
                  <span className="block text-[13px] font-bold">{usuario?.nombre}</span>
                  <span className="block text-[11px] text-[#E5B8B7]">Oficina de Ingresos</span>
                </div>
                <button 
                  onClick={() => { localStorage.removeItem('juzgado_sesion'); setVista('publica'); setAutenticado(false); setUsuario(null); setPassword(""); }} 
                  className="bg-[#5E151F] hover:bg-[#4A1018] px-4 py-2 rounded-lg text-sm font-bold transition-colors border border-[#8B2332] shadow-sm"
                >
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </header>

          <main className="flex-grow max-w-[1200px] mx-auto w-full px-6 py-8">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#7A1B28]">
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Deuda Exigible Global</span>
                   <p className="text-3xl font-black text-[#7A1B28] mt-1"><AnimatedNumber value={deudaExigibleTotal} isCurrency={true} /></p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#10B981]">
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Recaudación Histórica</span>
                   <p className="text-3xl font-black text-[#10B981] mt-1"><AnimatedNumber value={recaudacionTotalBordo} isCurrency={true} /></p>
                </div>
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-[#F59E0B]">
                   <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Trámites Pendientes</span>
                   <p className="text-3xl font-black text-[#B45309] mt-1"><AnimatedNumber value={tramitesPendientesCount} /></p>
                </div>
             </div>

             <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-8">
                <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-4">
                   <h2 className="text-lg font-bold text-gray-800">Padrón de Contribuyentes y Tasas</h2>
                   <div className="flex gap-4">
                     <input 
                       type="text" 
                       placeholder="Buscar por DNI o Nombre..." 
                       value={filtroRec}
                       onChange={e => setFiltroRec(e.target.value)}
                       className="px-4 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#7A1B28]"
                     />
                     <button onClick={exportarRecaudacionCSV} className="flex items-center bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
                       <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Exportar a Excel
                     </button>
                     <button onClick={() => setModalRecaudacion(true)} className="bg-[#7A1B28] hover:bg-[#5E151F] text-white px-5 py-2.5 rounded-lg text-sm font-bold transition-colors shadow-sm">
                       + Cargar Nuevo Impuesto / Deuda
                     </button>
                   </div>
                </div>
                <div className="overflow-x-auto min-h-[300px]">
                  {cargandoAdmin ? <SkeletonTable columnas={6} /> : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                          <th className="p-4 font-bold">Fecha / Hora</th>
                          <th className="p-4 font-bold">Contribuyente (DNI)</th>
                          <th className="p-4 font-bold">Concepto Tarifario</th>
                          <th className="p-4 font-bold">Monto</th>
                          <th className="p-4 font-bold">Estado</th>
                          <th className="p-4 font-bold text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-gray-100">
                        {listaPaginada.map((imp: any) => (
                          <tr key={imp.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 text-gray-500">{new Date(imp.creadoEn).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}</td>
                            <td className="p-4"><strong className="block text-gray-800">{imp.nombreTitular}</strong><span className="text-xs text-gray-500">{imp.dniTitular} ({imp.generoTitular || 'MASCULINO'})</span></td>
                            <td className="p-4 text-gray-700 font-medium">{imp.concepto}</td>
                            <td className="p-4 font-bold text-[#7A1B28]">${imp.monto.toLocaleString('es-AR')}</td>
                            <td className="p-4">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${imp.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-700' : imp.estado === 'ANULADO' ? 'bg-gray-200 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                {imp.estado}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              {imp.estado === 'PENDIENTE' && (
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => manejarCobroImpuesto(imp.id, imp.nombreTitular, imp.concepto, imp.monto)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 rounded text-xs font-bold transition-colors">Cobrar</button>
                                  <button onClick={() => manejarAnularImpuesto(imp.id)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 py-1.5 rounded text-xs font-bold transition-colors">Anular</button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        {listaPaginada.length === 0 && (
                          <tr><td colSpan={6} className="text-center py-10 text-gray-500">No hay registros generados.</td></tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                {totalPaginas > 1 && (
                  <div className="bg-gray-50 border-t border-gray-200 p-4 flex justify-between items-center text-sm text-gray-600">
                    <span>Mostrando pág {paginaActual} de {totalPaginas}</span>
                    <div className="flex gap-2">
                      <button onClick={() => setPaginaActual(p => Math.max(1, p - 1))} disabled={paginaActual === 1} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">Anterior</button>
                      <button onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))} disabled={paginaActual === totalPaginas} className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50">Siguiente</button>
                    </div>
                  </div>
                )}
             </div>
          </main>

          {/* MODAL DE CARGA DE IMPUESTO BORDÓ */}
          {modalRecaudacion && (
            <div className="fixed inset-0 bg-[#3a0a13]/80 backdrop-blur-sm flex items-center justify-center z-[1000] p-4 transition-all animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-[#f8f9fa] rounded-2xl p-8 max-w-2xl w-full shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] border border-[#7A1B28]/20 animate-[zoomIn_0.3s_cubic-bezier(0.16,1,0.3,1)]">
                <div className="flex justify-between items-center mb-8 border-b-2 border-[#7A1B28]/10 pb-5">
                  <div>
                    <span className="block text-[11px] font-black tracking-widest text-[#7A1B28]/60 uppercase mb-1">Módulo de Facturación</span>
                    <h3 className="text-2xl font-black text-[#7A1B28] tracking-tight">Emitir Nueva Orden de Cobro</h3>
                  </div>
                  <button onClick={() => setModalRecaudacion(false)} className="bg-white hover:bg-gray-100 text-gray-500 hover:text-[#7A1B28] h-10 w-10 rounded-full flex items-center justify-center shadow-sm border border-gray-200 transition-all font-bold">✕</button>
                </div>
                
                <form onSubmit={manejarCrearImpuesto} className="space-y-6">
                  <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">DNI / CUIT</label>
                        <input type="text" value={recDni} onChange={e => setRecDni(e.target.value)} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-[#7A1B28] focus:ring-4 focus:ring-[#7A1B28]/10 outline-none transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="Sin puntos" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">Género Titular</label>
                        <select value={recGenero} onChange={e => setRecGenero(e.target.value)} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-[#7A1B28] focus:ring-4 focus:ring-[#7A1B28]/10 outline-none transition-all text-gray-800 font-medium">
                          <option value="MASCULINO">Masculino</option>
                          <option value="FEMENINO">Femenino</option>
                          <option value="X">No Binario / X</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">Nombre / Razón Social</label>
                        <input type="text" value={recNombre} onChange={e => setRecNombre(e.target.value)} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-[#7A1B28] focus:ring-4 focus:ring-[#7A1B28]/10 outline-none transition-all text-gray-800 font-medium placeholder-gray-400" placeholder="Ej: Juan Pérez" />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">Concepto Tarifario Oficial</label>
                      <select value={recConcepto} onChange={manejarConceptoChange} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:border-[#7A1B28] focus:ring-4 focus:ring-[#7A1B28]/10 outline-none transition-all text-gray-800 font-bold cursor-pointer">
                        <option value="" className="text-gray-400 font-normal">Seleccione el trámite o impuesto a cobrar...</option>
                        {tarifas.map(t => (
                          <option key={t.id} value={t.concepto}>{t.concepto} — ${t.monto.toLocaleString('es-AR')}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-[11px] font-black text-gray-700 uppercase tracking-widest mb-2">Monto a Abonar ($)</label>
                      <input type="number" value={recMonto} onChange={e => setRecMonto(e.target.value)} required readOnly={!!tarifas.find(t => t.concepto === recConcepto)} className={`w-full px-4 py-4 border-2 rounded-lg text-2xl font-black outline-none transition-all ${!!tarifas.find(t => t.concepto === recConcepto) ? 'bg-gray-100 border-gray-200 text-[#7A1B28] cursor-not-allowed shadow-inner' : 'bg-white border-gray-300 text-[#7A1B28] focus:border-[#7A1B28] focus:ring-4 focus:ring-[#7A1B28]/10'}`} placeholder="0" />
                      {!!tarifas.find(t => t.concepto === recConcepto) && <span className="text-[11px] font-semibold text-[#7A1B28]/70 mt-2 block bg-[#7A1B28]/5 px-3 py-1.5 rounded inline-block"><svg className="w-3.5 h-3.5 inline-block mr-1 relative -top-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>El monto está fijado por sistema según ordenanza y no puede ser alterado.</span>}
                    </div>
                  </div>

                  <div className="flex gap-4 pt-2">
                    <button type="button" onClick={() => setModalRecaudacion(false)} className="flex-1 py-4 text-gray-600 font-bold bg-white border-2 border-gray-200 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all">Cancelar Operación</button>
                    <button type="submit" disabled={recGuardando} className="flex-[2] py-4 bg-[#7A1B28] hover:bg-[#5E151F] text-white font-black rounded-xl shadow-[0_4px_14px_0_rgba(122,27,40,0.39)] hover:shadow-[0_6px_20px_rgba(122,27,40,0.23)] hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:transform-none text-[15px]">{recGuardando ? <><Spinner/> Registrando...</> : '✓ Asentar Deuda en Sistema'}</button>
                  </div>
                </form>
              </div>
              <style dangerouslySetInnerHTML={{ __html: `@keyframes zoomIn { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } } @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}} />
            </div>
          )}
        </div>

      ) : (

        /* ========================================================
           MUNDO JUZGADO DE FALTAS Y PÚBLICO (INTERFAZ AZUL) 
           ======================================================== */
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Montserrat:wght@500;600;700;800&display=swap');
            :root { --azul-loreto: #0B4A82; --celeste-loreto: #00B2D6; --rojo-loreto: #EB2128; --papel: #FFFFFF; --papel-alto: #F8F9FA; --tinta: #212529; --tinta-suave: #495057; --linea: #DEE2E6; --radius-s: 4px; --radius-m: 10px; --maxw: 1180px; }
            * { box-sizing: border-box; } html { scroll-behavior: smooth; overflow-x: hidden; } 
            body { margin: 0; background: var(--papel); color: var(--tinta); font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.55; overflow-x: hidden; }
            h1, h2, h3, h4 { font-family: 'Montserrat', sans-serif; color: var(--azul-loreto); margin: 0 0 0.5em; line-height: 1.2; font-weight: 700; letter-spacing: -0.01em; } 
            a { color: inherit; } .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
            header.site { background: var(--papel); border-bottom: 1px solid var(--linea); position: sticky; top: 0; z-index: 100; } 
            .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 20px; flex-wrap: wrap; }
            .brand { display: flex; align-items: center; gap: 14px; text-decoration: none; z-index: 101; } .brand__logo { height: 55px; width: auto; flex: none; } 
            .brand__text .eyebrow { font-family: 'Montserrat', sans-serif; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin: 0 0 2px; font-weight: 600; } 
            .brand__text strong { display: block; font-family: 'Montserrat', sans-serif; font-weight: 800; font-size: 18px; color: var(--azul-loreto); line-height: 1.1; letter-spacing: -0.02em; }
            .menu-toggle { display: none; background: none; border: none; font-size: 28px; color: var(--azul-loreto); cursor: pointer; padding: 5px; z-index: 101; }
            nav.primary { display: flex; align-items: center; gap: 28px; } nav.primary ul { list-style: none; display: flex; gap: 24px; margin: 0; padding: 0; } 
            nav.primary a { text-decoration: none; font-family: 'Montserrat', sans-serif; font-weight: 600; font-size: 13.5px; color: var(--tinta); padding: 6px 2px; border-bottom: 2px solid transparent; cursor: pointer; transition: all 0.2s; } 
            nav.primary a:hover, nav.primary a.active { border-color: var(--rojo-loreto); color: var(--azul-loreto); }
            .header-actions { display: flex; align-items: center; gap: 15px; }
            .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 12px 22px; border-radius: var(--radius-s); font-weight: 600; font-size: 14px; text-decoration: none; border: 1.5px solid transparent; cursor: pointer; font-family: 'Montserrat', sans-serif; transition: all 0.2s; letter-spacing: 0.02em; } 
            .btn--primary { background: var(--azul-loreto); color: #fff; border-radius: 4px; } .btn--primary:hover { background: #083863; } 
            .btn--ghost { background: transparent; color: var(--azul-loreto); border-color: var(--azul-loreto); } .btn--ghost:hover { background: var(--azul-loreto); color: #fff; } 
            .btn--sm { padding: 8px 14px; font-size: 13px; } .btn--block { width: 100%; } .btn--success { background: #10B981; color: white; border: none; } .btn--danger { background: #EF4444; color: white; border: none; }
            .hero { padding: 36px 0 24px; background: radial-gradient(circle at 88% 15%, rgba(0, 178, 214, 0.06), transparent 45%), var(--papel-alto); border-bottom: 1px solid var(--linea); } 
            .hero .wrap { display: grid; grid-template-columns: 1fr; text-align: center; max-width: 800px; } 
            .hero .eyebrow { font-family: 'Montserrat', sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--celeste-loreto); margin-bottom: 8px; font-weight: 700; } 
            .hero h1 { font-size: clamp(26px, 3.2vw, 38px); font-weight: 800; letter-spacing: -0.02em; } 
            .hero p.lead { font-size: 16px; color: var(--tinta-suave); max-width: 55ch; margin: 8px auto 12px; font-weight: 400; }
            section { padding: 64px 0; } .section-head { max-width: 60ch; margin-bottom: 40px; } 
            .section-head .kicker { font-family: 'Montserrat', sans-serif; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin-bottom: 10px; font-weight: 700; }
            .art-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--linea); border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; } 
            .art-card { background: var(--papel); padding: 28px 22px; } .art-card h3 { font-size: 16px; font-weight: 700; } .art-card p { font-size: 14px; color: var(--tinta-suave); margin: 0; }
            .autoridades-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
            .autoridad-card { background: var(--papel); padding: 28px 24px; border-radius: var(--radius-m); border: 1px solid var(--linea); box-shadow: 0 2px 10px rgba(0,0,0,0.02); text-align: center; border-top: 4px solid var(--azul-loreto); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
            .autoridad-card:hover { transform: translateY(-6px); box-shadow: 0 20px 25px -5px rgba(11,74,130,0.08), 0 10px 10px -5px rgba(11,74,130,0.04); border-color: rgba(11,74,130,0.15); }
            .autoridad-card.principal { border-top-color: var(--celeste-loreto); background: radial-gradient(circle at top, rgba(0,178,214,0.04), transparent 70%), var(--papel); }
            .autoridad-card span { font-family: 'Montserrat', sans-serif; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); display: block; margin-bottom: 6px; font-weight: 700; }
            .autoridad-card h3 { font-size: 17px; color: var(--azul-loreto); margin: 0; font-weight: 700; }
            .news-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; } 
            .news-card { background: var(--papel); padding: 24px; border-radius: var(--radius-m); border: 1px solid var(--linea); box-shadow: 0 4px 16px rgba(0,0,0,0.03); transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); cursor: default; }
            .news-card:hover { transform: translateY(-6px); box-shadow: 0 20px 25px -5px rgba(11,74,130,0.08); border-color: rgba(11,74,130,0.15); }
            .news-card img { width: 100%; aspect-ratio: 3/2; object-fit: cover; margin-bottom: 16px; border-radius: 6px; } 
            .news-card h3 { font-size: 16px; text-transform: uppercase; color: var(--azul-loreto); line-height: 1.4; font-weight: 800; letter-spacing: 0.02em; margin-bottom: 10px; }
            .news-card p { font-size: 14.5px; color: var(--tinta-suave); line-height: 1.6; white-space: pre-wrap; margin: 0; }
            .consulta-panel { background: var(--azul-loreto); color: #F8F9FA; border-radius: var(--radius-m); padding: 40px; max-width: 900px; margin: 0 auto; box-shadow: 0 16px 40px rgba(11,74,130,0.15); } 
            .consulta-panel h3 { color: #fff; font-size: 26px; text-align: center; }
            .consulta-form { background: var(--papel); border-radius: var(--radius-m); padding: 32px; color: var(--tinta); margin-top: 24px; } 
            .field { margin-bottom: 20px; } .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--tinta); font-family: 'Montserrat', sans-serif; } 
            .field input, .field textarea, .field select { width: 100%; padding: 12px 14px; border: 1.5px solid var(--linea); border-radius: var(--radius-s); font-family: 'Inter', sans-serif; font-size: 14.5px; background: #fff; color: var(--tinta); transition: border-color 0.2s; }
            .field input:focus, .field textarea:focus, .field select:focus { outline: none; border-color: var(--celeste-loreto); }
            .filter-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; align-items: end; background: var(--papel); padding: 24px; border-radius: var(--radius-m); border: 1px solid var(--linea); margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
            .admin-table { width: 100%; text-align: left; border-collapse: collapse; background: #fff; border-radius: var(--radius-m); overflow: hidden; border: 1px solid var(--linea); box-shadow: 0 4px 12px rgba(0,0,0,0.03); } 
            .admin-table th { background: var(--papel-alto); padding: 12px 10px; font-weight: 700; border-bottom: 2px solid var(--linea); font-size: 12.5px; color: var(--azul-loreto); font-family: 'Montserrat', sans-serif; text-transform: uppercase; letter-spacing: 0.04em; } 
            .admin-table td { padding: 12px 10px; border-bottom: 1px solid var(--linea); font-size: 13.5px; } 
            .badge { padding: 6px 10px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.02em; font-family: 'Montserrat', sans-serif; text-transform: uppercase; }
            .modal-overlay { position: fixed; inset: 0; background: rgba(11, 74, 130, 0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; animation: modalFadeIn 0.3s ease-out forwards; } 
            .modal-content { background: var(--papel); padding: 40px; border-radius: var(--radius-m); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3); border: 1px solid var(--linea); animation: modalZoom 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            .contacto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; align-items: start; } .contacto-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 24px; } .contacto-list li { display: flex; gap: 16px; align-items: flex-start; } .contacto-list .ico { width: 40px; height: 40px; border-radius: 50%; background: rgba(235, 33, 40, 0.1); color: var(--rojo-loreto); display: flex; align-items: center; justify-content: center; flex: none; font-size: 18px; } .contacto-list strong { display: block; font-size: 15px; color: var(--azul-loreto); font-weight: 600; margin-bottom: 4px; } .contacto-list span, .contacto-list a { font-size: 14.5px; color: var(--tinta-suave); text-decoration: none; } .contacto-list a:hover { color: var(--rojo-loreto); text-decoration: underline; } .map-frame { border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; height: 380px; } .map-frame iframe { width: 100%; height: 100%; border: 0; }
            .tabs { display: flex; gap: 8px; margin-bottom: 24px; border-bottom: 1px solid var(--linea); padding-bottom: 12px; overflow-x: auto; }
            .tabs button { background: none; border: none; font-family: 'Montserrat', sans-serif; font-size: 14px; font-weight: 700; color: var(--tinta-suave); cursor: pointer; padding: 8px 16px; border-radius: 6px; transition: all 0.2s; white-space: nowrap; }
            .tabs button:hover { background: var(--papel); color: var(--azul-loreto); }
            .tabs button.active { background: var(--azul-loreto); color: #fff; }
            
            /* REGLAS PARA GUARDAR COMO PDF */
            .print-only { display: none; }
            @media print {
              body { background: white !important; margin: 0 !important; padding: 0 !important; color: black !important; }
              .no-print, header, footer, section:not(#consulta) { display: none !important; }
              .print-only { display: block !important; position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
              .consulta-panel, .consulta-form { box-shadow: none !important; margin: 0 !important; padding: 0 !important; background: white !important; }
              @page { margin: 1cm; size: A4 portrait; }
            }

            @keyframes modalFadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes modalZoom { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            @media (max-width: 980px) { 
              .contacto-grid, .hero .wrap, .news-grid, .autoridades-grid, .art-grid { grid-template-columns: 1fr; } 
              .hero { padding: 24px 0; } .consulta-panel { padding: 24px 16px; } .menu-toggle { display: block; }
              nav.primary { display: none; width: 100%; order: 3; padding: 20px 0; border-top: 1px solid var(--linea); margin-top: 15px; }
              nav.primary.abierto { display: flex; flex-direction: column; align-items: flex-start; }
              nav.primary ul { flex-direction: column; gap: 15px; width: 100%; } nav.primary a { display: block; width: 100%; padding: 5px 0; }
              .header-actions { display: none; width: 100%; order: 4; flex-direction: column; padding-bottom: 20px; gap: 15px; }
              .header-actions.abierto { display: flex; } .header-actions .btn { width: 100%; }
              .admin-table { display: block; overflow-x: auto; white-space: nowrap; }
            }
          `}} />

          <header className="site no-print">
            <div className="wrap nav-row">
              <div className="flex items-center gap-5">
                <a href="https://www.facebook.com/profile.php?id=100087230738968" target="_blank" rel="noopener noreferrer" className="hidden md:flex items-center pr-5 border-r border-gray-200 hover:opacity-80 transition-opacity" title="Página Oficial de la Municipalidad">
                  <img src="/logo-municipalidad.png" alt="Municipalidad de Loreto" className="h-11 w-auto drop-shadow-sm" />
                </a>
                <a className="brand flex items-center gap-3" href="#" onClick={(e) => { e.preventDefault(); setVista('publica'); setMenuAbierto(false); }}>
                  <img src="/logojdf.png" alt="Logo Juzgado" className="brand__logo flex-shrink-0 h-[45px] w-auto" />
                  <span className="brand__text"><span className="eyebrow">Municipalidad de Loreto</span><strong>Juzgado de Faltas</strong></span>
                </a>
              </div>

              <button className="menu-toggle" onClick={() => setMenuAbierto(!menuAbierto)}>{menuAbierto ? '✖' : '☰'}</button>

              {vista === 'publica' ? (
                <nav className={`primary ${menuAbierto ? 'abierto' : ''}`}>
                  <ul className="pl-6 lg:pl-0">
                    <li><a href="#consulta" onClick={() => setMenuAbierto(false)}>Consultar y Pagar</a></li>
                    <li><a href="#accesos-rapidos" onClick={() => setMenuAbierto(false)}>Trámites</a></li>
                    <li><a href="#faq" onClick={() => setMenuAbierto(false)}>Preguntas Frecuentes</a></li>
                    <li><a href="#noticias" onClick={() => setMenuAbierto(false)}>Noticias</a></li>
                    <li><a href="#normativa" onClick={() => setMenuAbierto(false)}>Normativa</a></li>
                    <li><a href="#institucion" onClick={() => setMenuAbierto(false)}>El Juzgado</a></li>
                    <li><a href="#contacto" onClick={() => setMenuAbierto(false)}>Contacto</a></li>
                  </ul>
                </nav>
              ) : (
                <nav className={`primary ${menuAbierto ? 'abierto' : ''}`}>
                  {autenticado && (
                    <ul>
                      {puedeActas && <li><a className={vista === 'admin_actas' ? 'active' : ''} onClick={() => cambiarVistaAdmin('admin_actas')}>Gestión Actas</a></li>}
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

              {vista !== 'publica' && (
                <div className={`header-actions ${menuAbierto ? 'abierto' : ''}`}>
                  {autenticado && <span style={{fontSize: '13px', color: 'var(--tinta-suave)', fontWeight: 600, fontFamily: 'Montserrat, sans-serif'}}><svg className="w-4 h-4 inline mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>{usuario?.nombre}</span>}
                  {autenticado && <a onClick={() => { setModalPassword(true); setMenuAbierto(false); }} style={{fontSize: '13px', cursor: 'pointer', color: 'var(--celeste-loreto)', fontWeight: 700, fontFamily: 'Montserrat, sans-serif'}}>Cambiar Clave</a>}
                  <button onClick={() => { 
                    localStorage.removeItem('juzgado_sesion'); setVista('publica'); setAutenticado(false); setUsuario(null); setPassword(""); setMenuAbierto(false); 
                  }} className="btn btn--ghost btn--sm">
                    Volver al Portal Público
                  </button>
                </div>
              )}
            </div>
          </header>

          <main id="contenido">
            {vista === 'publica' && (
              <>
                <section className="hero no-print" id="inicio">
                  <div className="wrap">
                    <Reveal>
                      <p className="eyebrow">Municipalidad de Loreto · Santiago del Estero</p>
                      <h1>Juzgado de Faltas Municipal</h1>
                      <p className="lead">Plataforma digital oficial para la consulta de actas, presentación de descargos, libre deuda y gestión de pagos en línea.</p>
                    </Reveal>
                  </div>
                </section>

                {/* =================================================================
                    1. CONSULTA DE INFRACCIONES + 2. ACCESOS RÁPIDOS + 3. AVISO ESTAFAS
                    ================================================================= */}
                <section id="consulta" style={{background: '#fff', padding: '48px 0'}} className="no-print">
                  <div className="wrap">
                    <Reveal>
                      {/* 1. CONSULTA DE INFRACCIONES */}
                      <div className="consulta-panel">
                        <div style={{textAlign: 'center', marginBottom: '20px'}} className="no-print">
                          <svg className="w-9 h-9 text-white mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                          <h3 style={{fontSize: '26px', color: '#fff', marginBottom: '8px'}}>1. Consulta de Infracciones y Deudas</h3>
                          <p style={{fontSize: '14.5px', color: 'rgba(255,255,255,0.9)', maxWidth: '55ch', margin: '0 auto'}}>
                            Ingrese su documento y género para verificar su estado administrativo, informar pagos, presentar descargos o emitir su Libre Deuda.
                          </p>
                        </div>
                        
                        <div className="consulta-form no-print">
                          {guiaAccionRapida && (
                            <div className="mb-6 p-4 bg-[#00B2D6]/10 border-l-4 border-[#00B2D6] rounded-r-lg flex items-center justify-between">
                              <span className="text-[14px] font-bold text-[#0B4A82]">{guiaAccionRapida}</span>
                              <button onClick={() => setGuiaAccionRapida("")} className="text-gray-400 hover:text-gray-600 font-bold ml-4">✕</button>
                            </div>
                          )}

                          <form onSubmit={manejarBusqueda}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Documento (DNI / CUIT)</label>
                                <input ref={inputDniRef} type="text" value={dni} onChange={(e) => setDni(e.target.value)} placeholder="Sin puntos ni espacios" required className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 transition-all outline-none focus:bg-white focus:border-[#00B2D6] focus:ring-4 focus:ring-[#00B2D6]/20 shadow-inner" />
                              </div>
                              <div>
                                <label className="block text-[13px] font-bold text-gray-700 mb-2 uppercase tracking-wide">Género (Según su DNI)</label>
                                <select value={generoConsulta} onChange={(e) => setGeneroConsulta(e.target.value)} required className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl text-gray-800 transition-all outline-none focus:bg-white focus:border-[#00B2D6] focus:ring-4 focus:ring-[#00B2D6]/20 shadow-inner">
                                  <option value="MASCULINO">Masculino</option>
                                  <option value="FEMENINO">Femenino</option>
                                  <option value="X">No Binario / X</option>
                                </select>
                              </div>
                            </div>
                            <button type="submit" disabled={buscando} className="w-full bg-[#0B4A82] hover:bg-[#083863] text-white font-bold py-4 px-6 rounded-xl transition-all shadow-[0_4px_14px_0_rgba(11,74,130,0.39)] disabled:opacity-70">
                              {buscando ? <><Spinner/> Consultando base de datos segura...</> : 'Consultar Padrón de Infracciones'}
                            </button>
                          </form>

                          {buscando && (
                            <div className="mt-8 border-t-2 border-gray-100 pt-6">
                              <div className="h-4 bg-gray-200 rounded w-48 mb-6 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                              <div className="p-5 border-l-4 border-gray-300 bg-gray-50 mb-4 rounded-r-lg border-y border-r border-gray-100">
                                <div className="h-3 bg-gray-200 rounded w-32 mb-3 animate-[pulse_1.5s_ease-in-out_infinite]"></div>
                                <div className="h-5 bg-gray-200 rounded w-48 mb-5 animate-[pulse_1.5s_ease-in-out_infinite]" style={{animationDelay: '0.1s'}}></div>
                              </div>
                            </div>
                          )}

                          {mensaje && <p style={{marginTop: '16px', fontSize: '14.5px', color: esLibreDeuda ? '#10B981' : 'var(--rojo-loreto)', fontWeight: 600, textAlign: 'center'}}>{mensaje}</p>}
                          
                          {/* PANEL DE LIBRE DEUDA PÚBLICO */}
                          {esLibreDeuda && (
                            <div className="mt-8 border-t-2 border-gray-100 pt-8 animate-[fadeIn_0.5s_ease-out]">
                              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center">
                                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                </div>
                                <h4 className="text-xl font-black text-emerald-800 mb-2 font-['Montserrat']">Libre de Infracciones y Deudas</h4>
                                <p className="text-emerald-700 text-[14.5px] mb-6 max-w-md mx-auto">No posee actas de tránsito, bromatología ni deudas impositivas exigibles registradas bajo el documento <strong>{dni}</strong>.</p>
                                <button onClick={() => window.print()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-colors flex items-center justify-center gap-2 mx-auto">
                                  <svg className="w-5 h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                                  Descargar Certificado Libre Deuda (PDF)
                                </button>
                              </div>
                            </div>
                          )}

                          {resultados.length > 0 && (
                            <div style={{marginTop: '28px', borderTop: '2px solid var(--linea)', paddingTop: '24px'}}>
                              <h4 style={{fontSize: '16px', color: 'var(--azul-loreto)', marginBottom: '16px'}}>Expedientes Registrados en el Sistema:</h4>
                              {resultados.map((acta) => {
                                const esBroma = acta.tipoInfraccion === 'BROMATOLOGIA';
                                const colorBorde = esBroma ? '#10B981' : 'var(--azul-loreto)';
                                const nombreOrigen = esBroma ? 'BROMATOLOGÍA Y CALIDAD DE VIDA' : 'DIRECCIÓN DE TRÁNSITO';

                                return (
                                  <div key={acta.id} style={{padding: '20px', borderLeft: `4px solid ${colorBorde}`, background: 'var(--papel-alto)', marginBottom: '16px', borderRadius: '0 8px 8px 0', borderTop: '1px solid var(--linea)', borderRight: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)'}}>
                                    <span style={{fontSize: '11px', fontWeight: 700, color: colorBorde, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em'}}>{nombreOrigen}</span><br/>
                                    <strong style={{fontSize: '16px', display: 'inline-block', marginTop: '4px'}}>Acta N° {acta.nroActa}</strong> <span style={{fontSize: '16px', color: 'var(--tinta-suave)'}}>— ${acta.monto.toString()}</span> <br/>
                                    
                                    <TimelineExpediente estado={acta.estado} />
                                    
                                    {acta.estado === 'PENDIENTE' && (
                                      <div style={{display: 'flex', gap: '12px', marginTop: '16px', flexWrap: 'wrap'}}>
                                        <button onClick={() => { setTramiteActivo({ id: acta.id, tipo: 'pago' }); }} className="btn btn--ghost btn--sm">Informar Pago</button>
                                        <button onClick={() => { setTramiteActivo({ id: acta.id, tipo: 'descargo' }); setPasoDescargo(1); setMotivoText(""); }} className="btn btn--primary btn--sm">Presentar Descargo</button>
                                      </div>
                                    )}
                                    
                                    {tramiteActivo?.id === acta.id && (
                                      <form onSubmit={manejarEnvioTramite} style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--linea)'}}>
                                        <input type="hidden" name="infraccionId" value={acta.id} />
                                        <input type="hidden" name="tipo" value={tramiteActivo?.tipo || ''} />
                                        
                                        {tramiteActivo?.tipo === 'pago' && (
                                          <>
                                            <div style={{background: 'rgba(0, 178, 214, 0.08)', border: '1px solid rgba(0, 178, 214, 0.2)', padding: '20px', borderRadius: '6px', marginBottom: '20px', fontSize: '14.5px'}}>
                                              <h4 style={{fontSize: '14px', margin: '0 0 12px 0', color: 'var(--azul-loreto)', textTransform: 'uppercase', letterSpacing: '0.02em'}}>Datos Oficiales de Recaudación</h4>
                                              <p style={{margin: '0 0 6px 0'}}><strong>Titular:</strong> Municipalidad de Loreto - Sgo. del Estero</p>
                                              <p style={{margin: '0 0 6px 0'}}><strong>Entidad:</strong> Banco Santiago del Estero</p>
                                              <p style={{margin: '0 0 6px 0'}}><strong>Cuenta N°:</strong> 12000000001243138</p>
                                              <p style={{margin: '0 0 6px 0'}}><strong>CBU:</strong> 32101205300000012431389</p>
                                              <p style={{margin: '0'}}><strong>ALIAS:</strong> LoretoRecaudacion</p>
                                            </div>
                                            <div className="field">
                                              <label>Monto transferido exacto ($)</label>
                                              <input type="number" name="monto" required />
                                            </div>
                                            <div className="field">
                                              <label>Comprobante de Pago (PDF o Imagen — Máx. 10 MB)</label>
                                              <input type="file" name="archivo" accept=".pdf, .jpg, .jpeg, .png" required style={{padding: '8px'}} />
                                            </div>
                                            <button type="submit" disabled={enviando} className="btn btn--primary btn--block">{enviando ? <><Spinner/> Procesando envío...</> : 'Ingresar Documentación al Juzgado'}</button>
                                          </>
                                        )}
                                        
                                        {tramiteActivo?.tipo === 'descargo' && (
                                          <div className="bg-white border border-[#DEE2E6] rounded-xl shadow-sm p-6 mt-4">
                                            <div className="flex mb-6 text-[12px] font-bold text-gray-400 uppercase tracking-widest gap-2 border-b border-gray-100 pb-4">
                                              <span className={pasoDescargo >= 1 ? 'text-[#0B4A82]' : ''}>1. Datos Personales</span> <span className="mx-1">{'>'}</span>
                                              <span className={pasoDescargo >= 2 ? 'text-[#0B4A82]' : ''}>2. Fundamentos</span> <span className="mx-1">{'>'}</span>
                                              <span className={pasoDescargo === 3 ? 'text-[#0B4A82]' : ''}>3. Revisión</span>
                                            </div>

                                            <div className={pasoDescargo === 1 ? 'block' : 'hidden'}>
                                              <div className="mb-6 p-4 bg-[#00B2D6]/10 border border-[#00B2D6]/30 rounded-lg">
                                                <h4 className="text-[#0B4A82] font-bold mb-2 flex items-center gap-2">
                                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> 
                                                  Guía: Cómo presentar su descargo
                                                </h4>
                                                <ul className="text-[13.5px] text-gray-700 space-y-1.5 ml-5 list-disc">
                                                  <li>Complete sus datos de contacto reales (el correo será su <strong>Domicilio Digital válido</strong>).</li>
                                                  <li>Redacte los hechos de forma clara, respetuosa y detallada (máximo 3000 caracteres).</li>
                                                  <li>Tenga lista su prueba documental en formato PDF, JPG o PNG (fotos de pólizas de seguro, cédula verde, DNI, etc.). Límite de sistema: 10MB.</li>
                                                </ul>
                                              </div>
                                              
                                              <div className="field"><label>Nombre y Apellido del Presentante</label><input type="text" name="nombre" id="desc_nombre" /></div>
                                              <div className="field"><label>Correo Electrónico (Constitución de Domicilio Digital)</label><input type="email" name="email" id="desc_email" /></div>
                                              <button type="button" onClick={() => {
                                                const n = (document.getElementById('desc_nombre') as HTMLInputElement).value;
                                                const e = (document.getElementById('desc_email') as HTMLInputElement).value;
                                                if(n && e) setPasoDescargo(2); else alert("Por favor complete su nombre y correo para continuar.");
                                              }} className="btn btn--primary btn--block mt-2">Siguiente: Redactar Fundamentos</button>
                                            </div>

                                            <div className={pasoDescargo === 2 ? 'block' : 'hidden'}>
                                              <div className="field">
                                                <label className="flex justify-between items-end">
                                                  <span>Fundamentos Jurídicos / Relato de los Hechos</span>
                                                  <span className={`text-[11px] font-bold px-2 py-1 rounded ${motivoText.length >= MAX_MOTIVO ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>{motivoText.length} / {MAX_MOTIVO}</span>
                                                </label>
                                                <textarea name="motivo" id="desc_motivo" rows={6} value={motivoText} onChange={(e) => setMotivoText(e.target.value)} maxLength={MAX_MOTIVO} placeholder="Ej: Me dirijo a S.S. a fin de formular descargo respecto al Acta N°... en razón de que el vehículo se encontraba estacionado en un lugar permitido..." className="resize-y"></textarea>
                                              </div>
                                              <div className="field">
                                                <label>Documentación / Prueba Adjunta Obligatoria</label>
                                                <input type="file" name="archivo" id="desc_archivo" accept=".pdf, .jpg, .jpeg, .png" style={{padding: '8px'}} />
                                              </div>
                                              <div className="flex gap-4 mt-2">
                                                <button type="button" onClick={() => setPasoDescargo(1)} className="btn btn--ghost flex-1">Volver</button>
                                                <button type="button" onClick={() => {
                                                  const m = (document.getElementById('desc_motivo') as HTMLTextAreaElement).value;
                                                  const a = (document.getElementById('desc_archivo') as HTMLInputElement).files;
                                                  if(m && a && a.length > 0) setPasoDescargo(3); else alert("Debe redactar su defensa y adjuntar al menos un archivo probatorio.");
                                                }} className="btn btn--primary flex-[2]">Siguiente: Revisión Final</button>
                                              </div>
                                            </div>

                                            <div className={pasoDescargo === 3 ? 'block' : 'hidden'}>
                                              <div className="bg-gray-50 p-5 rounded-lg border border-gray-200 mb-6">
                                                <h4 className="text-red-600 font-bold mb-2 flex items-center gap-2">
                                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                                  Atención: Confirmación de Declaración Jurada
                                                </h4>
                                                <p className="text-[14px] text-gray-700 leading-relaxed m-0">
                                                  Está a punto de ingresar formalmente un descargo al Juzgado de Faltas. Al presionar "Firmar y Enviar", usted confirma que los datos y pruebas adjuntas son veraces. Su correo electrónico constituirá su Domicilio Digital legal para futuras notificaciones de este expediente.
                                                </p>
                                              </div>
                                              <div className="flex gap-4">
                                                <button type="button" onClick={() => setPasoDescargo(2)} className="btn btn--ghost flex-1" disabled={enviando}>Modificar</button>
                                                <button type="submit" disabled={enviando} className="btn btn--primary flex-[2]">{enviando ? <><Spinner/> Radicando Expediente...</> : '✓ Firmar y Enviar al Juzgado'}</button>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </form>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}

                          {resultadosImpuestos.length > 0 && (
                            <div style={{marginTop: '28px', borderTop: '2px solid var(--linea)', paddingTop: '24px'}}>
                              <h4 style={{fontSize: '16px', color: '#7A1B28', marginBottom: '16px'}}>Tasas e Impuestos Municipales Pendientes:</h4>
                              {resultadosImpuestos.map((impuesto) => {
                                const colorBorde = '#7A1B28'; 
                                const nombreOrigen = 'OFICINA DE RECAUDACIÓN Y TASAS';

                                return (
                                  <div key={impuesto.id} style={{padding: '20px', borderLeft: `4px solid ${colorBorde}`, background: 'var(--papel-alto)', marginBottom: '16px', borderRadius: '0 8px 8px 0', borderTop: '1px solid var(--linea)', borderRight: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)'}}>
                                    <span style={{fontSize: '11px', fontWeight: 700, color: colorBorde, fontFamily: 'Montserrat, sans-serif', letterSpacing: '0.05em'}}>{nombreOrigen}</span><br/>
                                    <strong style={{fontSize: '16px', display: 'inline-block', marginTop: '4px'}}>{impuesto.concepto}</strong> <span style={{fontSize: '16px', color: 'var(--tinta-suave)'}}>— ${impuesto.monto.toLocaleString('es-AR')}</span> <br/>
                                    <div style={{marginTop: '8px'}}>
                                      <span className="badge" style={{background: 'rgba(122, 27, 40, 0.1)', color: '#7A1B28'}}>
                                        DEUDA EXIGIBLE
                                      </span>
                                    </div>
                                    
                                    <div style={{background: 'rgba(122, 27, 40, 0.05)', border: '1px solid rgba(122, 27, 40, 0.15)', padding: '16px', borderRadius: '6px', marginTop: '16px', fontSize: '13.5px'}}>
                                      <strong style={{color: '#7A1B28', display: 'block', marginBottom: '8px', fontSize: '13px', textTransform: 'uppercase'}}><svg className="w-4 h-4 inline-block mr-1.5 relative -top-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Información para Regularización</strong>
                                      <p style={{margin: '0 0 4px 0'}}>Puede abonar mediante transferencia bancaria a la cuenta oficial de Recaudación:</p>
                                      <p style={{margin: '0 0 4px 0'}}><strong>CBU:</strong> 32101205300000012431389</p>
                                      <p style={{margin: 0}}><strong>ALIAS:</strong> LoretoRecaudacion</p>
                                      <p style={{margin: '8px 0 0 0', fontStyle: 'italic', color: 'var(--tinta-suave)'}}>Una vez realizada, envíe su comprobante por WhatsApp al <a href="https://wa.me/5493854743310" target="_blank" rel="noopener noreferrer" style={{color: '#7A1B28', fontWeight: 600}}>385 474-3310</a> para impactar el pago en el sistema.</p>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 2. ACCESOS RÁPIDOS */}
                      <div id="accesos-rapidos" className="max-w-[900px] mx-auto mt-10">
                        <div className="flex items-center justify-between mb-4">
                          <span className="text-[12px] font-extrabold uppercase tracking-widest text-[#0B4A82] font-['Montserrat']">Accesos Rápidos a Trámites</span>
                          <span className="text-[12px] text-gray-500">Seleccione una gestión para iniciar</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                          <button onClick={() => activarAccesoRapido('descargo')} className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#00B2D6] transition-all text-left flex flex-col justify-between">
                            <div className="w-10 h-10 rounded-lg bg-[#0B4A82]/10 text-[#0B4A82] group-hover:bg-[#0B4A82] group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <div>
                              <strong className="block text-[15px] font-bold text-[#0B4A82] font-['Montserrat'] mb-1">Presentar descargo</strong>
                              <span className="text-[12.5px] text-gray-500 leading-snug block">Ejerza su defensa y adjunte pruebas en línea.</span>
                            </div>
                          </button>

                          <button onClick={() => activarAccesoRapido('pago')} className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#00B2D6] transition-all text-left flex flex-col justify-between">
                            <div className="w-10 h-10 rounded-lg bg-[#00B2D6]/15 text-[#0B4A82] group-hover:bg-[#00B2D6] group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            </div>
                            <div>
                              <strong className="block text-[15px] font-bold text-[#0B4A82] font-['Montserrat'] mb-1">Informar pago</strong>
                              <span className="text-[12.5px] text-gray-500 leading-snug block">Suba su comprobante de transferencia bancaria.</span>
                            </div>
                          </button>

                          <button onClick={() => activarAccesoRapido('libredeuda')} className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-500 transition-all text-left flex flex-col justify-between">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                            </div>
                            <div>
                              <strong className="block text-[15px] font-bold text-[#0B4A82] font-['Montserrat'] mb-1">Libre deuda</strong>
                              <span className="text-[12.5px] text-gray-500 leading-snug block">Descargue su certificado oficial en formato PDF.</span>
                            </div>
                          </button>

                          <button onClick={() => activarAccesoRapido('turno')} className="group bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-[#0B4A82] transition-all text-left flex flex-col justify-between">
                            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            <div>
                              <strong className="block text-[15px] font-bold text-[#0B4A82] font-['Montserrat'] mb-1">Sacar turno</strong>
                              <span className="text-[12.5px] text-gray-500 leading-snug block">Agende atención presencial en Mesa de Entradas.</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* 3. AVISO DE SEGURIDAD CONTRA ESTAFAS */}
                      <div className="max-w-[900px] mx-auto mt-8 bg-amber-50 border-l-4 border-amber-500 border-t border-r border-b border-amber-200 rounded-r-xl p-6 shadow-sm">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          </div>
                          <div>
                            <h4 className="text-[15px] font-extrabold text-amber-900 uppercase tracking-wide font-['Montserrat'] mb-1">
                              Aviso Oficial de Prevención contra Estafas
                            </h4>
                            <p className="text-[14px] text-amber-800 leading-relaxed m-0">
                              El Juzgado de Faltas de Loreto <strong>nunca solicita pagos por teléfono, redes sociales ni cobradores a domicilio</strong>. La única cuenta bancaria autorizada pertenece a la <strong>Municipalidad de Loreto</strong> (Banco Santiago del Estero · CBU: <strong>32101205300000012431389</strong> · Alias: <strong>LoretoRecaudacion</strong>). Verifique siempre el destinatario antes de transferir.
                            </p>
                          </div>
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </section>

                {/* =================================================================
                    4. PREGUNTAS FRECUENTES DESTACADAS
                    ================================================================= */}
                <section id="faq" style={{background: 'var(--papel-alto)', borderTop: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)'}} className="no-print">
                  <div className="wrap">
                    <Reveal>
                      <div className="section-head" style={{margin: '0 auto 40px auto', textAlign: 'center'}}>
                        <p className="kicker">Orientación al Vecino</p>
                        <h2>Preguntas Frecuentes Destacadas</h2>
                        <p>Respuestas rápidas sobre plazos procesales, beneficios de pago voluntario y requisitos para trámites habituales.</p>
                      </div>

                      <div className="max-w-[820px] mx-auto space-y-3">
                        {FAQS_DESTACADAS.map((faq, idx) => {
                          const abierta = faqAbierta === idx;
                          return (
                            <div key={idx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all">
                              <button 
                                onClick={() => setFaqAbierta(abierta ? null : idx)}
                                className="w-full px-6 py-4 text-left flex justify-between items-center gap-4 hover:bg-gray-50 transition-colors"
                              >
                                <span className="font-bold text-[15.5px] text-[#0B4A82] font-['Montserrat']">{faq.pregunta}</span>
                                <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${abierta ? 'bg-[#0B4A82] text-white rotate-180' : 'bg-gray-100 text-[#0B4A82]'}`}>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                </span>
                              </button>
                              {abierta && (
                                <div className="px-6 pb-5 pt-1 text-[14.5px] text-gray-600 border-t border-gray-100 leading-relaxed">
                                  {faq.respuesta}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </Reveal>
                  </div>
                </section>

                {/* =================================================================
                    5. NOTICIAS RECIENTES
                    ================================================================= */}
                {noticiasPublicas.length > 0 && (
                  <section id="noticias" style={{background: '#FFFFFF', borderBottom: '1px solid var(--linea)'}} className="no-print">
                    <div className="wrap">
                      <Reveal>
                        <div className="section-head">
                          <p className="kicker">Actualidad y Operativos</p>
                          <h2>Noticias Recientes</h2>
                          <p>Comunicados oficiales, campañas de concientización vial y novedades operativas del Juzgado.</p>
                        </div>
                        <div className="news-grid">
                          {noticiasPublicas.slice(0, 3).map(n => (
                            <div className="news-card" key={n.id}>
                              <img src={n.imagenUrl} alt={n.titulo} />
                              <span style={{display: 'block', fontSize: '11px', fontWeight: 800, color: 'var(--celeste-loreto)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px'}}><svg className="w-3.5 h-3.5 inline-block mr-1 relative -top-[1px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>{new Date(n.creadoEn).toLocaleDateString('es-AR')}</span>
                              <h3>{n.titulo}</h3>
                              {n.contenido && <p>{n.contenido}</p>}
                            </div>
                          ))}
                        </div>
                        {noticiasPublicas.length > 3 && (
                          <div style={{textAlign: 'center', marginTop: '40px'}}>
                            <Link className="btn btn--ghost" href="/noticias">
                              Ver histórico de noticias
                            </Link>
                          </div>
                        )}
                      </Reveal>
                    </div>
                  </section>
                )}

                {/* =================================================================
                    6. NORMATIVA Y CÓDIGO DE CONVIVENCIA
                    ================================================================= */}
                <section id="normativa" style={{ background: '#FFFFFF', borderBottom: '1px solid var(--linea)' }} className="no-print">
                  <div className="wrap">
                    <Reveal>
                      <div style={{ background: 'var(--papel-alto)', borderRadius: 'var(--radius-m)', padding: '44px', display: 'flex', alignItems: 'center', gap: '44px', flexWrap: 'wrap', border: '1px solid var(--linea)' }}>
                        <div style={{ flex: 1, minWidth: '250px' }}>
                          <p className="kicker" style={{ color: 'var(--rojo-loreto)', fontFamily: 'Montserrat, sans-serif', fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Transparencia y Marco Legal</p>
                          <h2 style={{ fontSize: '30px', marginBottom: '16px', color: 'var(--azul-loreto)' }}>Normativa y Código de Convivencia</h2>
                          <p style={{ fontSize: '15.5px', color: 'var(--tinta-suave)', lineHeight: '1.6', marginBottom: '16px' }}>Acceda de forma directa al régimen contravencional de la Ciudad de Loreto, en concordancia con la Ley Nacional de Tránsito N° 24.449. Conozca sus derechos, garantías procesales y las reglamentaciones vigentes.</p>
                        </div>
                        <div style={{ flex: 'none', background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 8px 32px rgba(11,74,130,0.08)', textAlign: 'center', border: '1px solid var(--linea)', margin: '0 auto', maxWidth: '100%' }}>
                          <img src="/qrparacodigo.png" alt="QR Código de Convivencia" style={{ width: '100%', maxWidth: '170px', height: 'auto', display: 'block', margin: '0 auto', borderRadius: '4px' }} />
                          <span style={{ display: 'block', marginTop: '14px', fontSize: '11.5px', fontWeight: 800, color: 'var(--azul-loreto)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'Montserrat, sans-serif' }}>Escanear con el celular</span>
                          <a href="/codigo-convivencia.pdf" download className="btn btn--ghost btn--block" style={{marginTop: '14px', fontSize: '12px', padding: '8px', borderStyle: 'dashed'}}><svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Descargar PDF Completo</a>
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </section>

                {/* =================================================================
                    7. SOBRE EL JUZGADO Y AUTORIDADES
                    ================================================================= */}
                <section id="institucion" style={{background: 'var(--papel-alto)', borderBottom: '1px solid var(--linea)'}} className="no-print">
                  <div className="wrap">
                    <Reveal>
                      <div className="section-head">
                        <p className="kicker">Institucional y Autoridades</p>
                        <h2>Sobre el Juzgado de Faltas</h2>
                        <p>Órgano autónomo de juzgamiento administrativo municipal encargado de garantizar el debido proceso y la seguridad comunitaria.</p>
                      </div>
                      <div className="art-grid" style={{marginBottom: '56px'}}>
                        <div className="art-card"><h3>Jurisdicción</h3><p>Entiende en las faltas e infracciones cometidas dentro del ejido municipal de Loreto, conforme a las ordenanzas vigentes.</p></div>
                        <div className="art-card"><h3>Imparcialidad</h3><p>Actúa como órgano técnico autónomo, garantizando al ciudadano el derecho constitucional a ser oído antes de cualquier sanción.</p></div>
                        <div className="art-card"><h3>Debido Proceso</h3><p>Toda acta labrada admite la interposición de descargo, ofrecimiento de prueba documental y etapa de revisión resolutiva.</p></div>
                        <div className="art-card"><h3>Educación Vial</h3><p>Promueve el respeto a las normas de tránsito y bromatología como pilar para la convivencia pacífica en nuestra ciudad.</p></div>
                      </div>

                      <div id="autoridades">
                        <h3 style={{fontSize: '22px', marginBottom: '24px', textAlign: 'center'}}>Cuerpo de Magistrados y Funcionarios</h3>
                        <div className="autoridades-grid">
                          {[
                            { cargo: "Juez de Faltas", nombre: "Dr. Facundo Mansilla", principal: true },
                            { cargo: "Secretaria Letrada", nombre: "Dra. Romina Casaubon", principal: false },
                            { cargo: "Secretario Letrado", nombre: "Dr. Agustín González Fiad", principal: false },
                            { cargo: "Secretario Letrado", nombre: "Dr. Leandro Ledesma", principal: false },
                            { cargo: "Área Contable", nombre: "CPN Nur Salomón", principal: false }
                          ].map((aut, i) => (
                            <div key={i} className={`autoridad-card ${aut.principal ? 'principal' : ''}`}>
                              <div className="w-16 h-16 rounded-full bg-[#0B4A82]/10 text-[#0B4A82] flex items-center justify-center mx-auto mb-4 border-2 border-[#0B4A82]/20">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                              </div>
                              <span>{aut.cargo}</span>
                              <h3>{aut.nombre}</h3>
                            </div>
                          ))}
                        </div>
                      </div>
                    </Reveal>
                  </div>
                </section>

                {/* =================================================================
                    8. UBICACIÓN, MAPA, CONTACTO Y TURNOS PRESENCIALES
                    ================================================================= */}
                <section id="contacto" style={{background: 'var(--papel)'}} className="no-print">
                  <div className="wrap">
                    <Reveal>
                      <div className="section-head">
                        <p className="kicker">Atención Presencial</p>
                        <h2>Ubicación, Mapa y Contacto</h2>
                        <p>Canales oficiales de atención ciudadana y reserva de turnos para trámites en sede municipal.</p>
                      </div>
                      <div className="contacto-grid" style={{marginBottom: '64px'}}>
                        <ul className="contacto-list">
                          <li><span className="ico"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg></span><div><strong>Dirección Física</strong><span>Isla Soledad S/N, Bº Islas Malvinas<br/>Loreto, Santiago del Estero</span></div></li>
                          <li><span className="ico"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg></span><div><strong>Atención por WhatsApp</strong><a href="https://wa.me/5493854743310?text=Hola!%20Queria%20consultar%20sobre%20mi%20Acta%20de%20Infracción%20N.º..." target="_blank" rel="noopener noreferrer">385 474-3310</a></div></li>
                          <li><span className="ico"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.53 4.389a2 2 0 001.94 0L20 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></span><div><strong>Mesa de Entradas Virtual</strong><a href="mailto:juzgadodefaltasloreto@outlook.com">juzgadodefaltasloreto@outlook.com</a></div></li>
                          <li><span className="ico"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span><div><strong>Horario de Recepción</strong><span>Lunes a Viernes<br/>07:00 a 13:00 hs y 16:00 a 20:00 hs</span></div></li>
                        </ul>
                        <div className="map-frame"><iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3527.794711317769!2d-64.1893188!3d-28.3031456!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjjCsDE4JzExLjMiUyA2NMKwMTEnMjEuNSJX!5e0!3m2!1sen!2sar!4v1700000000000!5m2!1sen!2sar" title="Mapa de ubicación del Juzgado de Faltas de Loreto" loading="lazy" referrerPolicy="no-referrer-when-downgrade"></iframe></div>
                      </div>

                      {/* MÓDULO DE TURNOS PRESENCIALES INTEGRADO EN CONTACTO */}
                      <div id="turnos-presenciales" className="bg-[#F8F9FA] rounded-xl shadow-sm border border-gray-200 p-8 max-w-4xl mx-auto">
                        <div className="text-center mb-8">
                          <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#00B2D6] font-['Montserrat'] block mb-1">Reserva Online</span>
                          <h3 className="text-2xl font-bold text-[#0B4A82] mb-2">Solicitar Turno Presencial</h3>
                          <p className="text-gray-600 text-sm">Agende día y franja horaria para ser atendido sin filas en la Mesa de Entradas del Juzgado.</p>
                        </div>
                        <form onSubmit={manejarEnvioTurno}>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="field !mb-0">
                              <label>Nombre y Apellido</label>
                              <input type="text" required placeholder="Ej: Juan Pérez" />
                            </div>
                            <div className="field !mb-0">
                              <label>Correo Electrónico (para confirmación)</label>
                              <input type="email" required placeholder="ejemplo@correo.com" />
                            </div>
                            <div className="field !mb-0">
                              <label>Día del Turno</label>
                              <input type="date" required min={new Date().toISOString().split('T')[0]} />
                            </div>
                            <div className="field !mb-0">
                              <label>Franja Horaria</label>
                              <select required>
                                <option value="">Seleccione el horario...</option>
                                <option value="manana">Turno Mañana (07:00 a 13:00 hs)</option>
                                <option value="tarde">Turno Tarde (16:00 a 20:00 hs)</option>
                              </select>
                            </div>
                            <div className="field !mb-0 md:col-span-2">
                              <label>Motivo del Trámite</label>
                              <select required>
                                <option value="">Seleccione un motivo...</option>
                                <option value="descargo">Presentar documentación anexa a un descargo</option>
                                <option value="vehiculo">Retirar oficio de liberación de vehículo (Corralón)</option>
                                <option value="juez">Audiencia con el Juez de Faltas</option>
                                <option value="pago">Abonar infracción presencialmente por mostrador</option>
                                <option value="otro">Otras consultas o reclamos</option>
                              </select>
                            </div>
                          </div>
                          <button type="submit" className="w-full bg-[#0B4A82] hover:bg-[#083863] text-white font-bold py-3.5 px-6 rounded-lg transition-colors shadow-sm">
                            Confirmar Reserva de Turno
                          </button>
                        </form>
                      </div>
                    </Reveal>
                  </div>
                </section>

                {/* CERTIFICADO IMPRIMIBLE OCULTO */}
                <div className="print-only">
                  <div style={{ padding: '40px', border: '2px solid #000', borderRadius: '10px', maxWidth: '800px', margin: '0 auto', fontFamily: 'serif' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #000', paddingBottom: '20px', marginBottom: '30px' }}>
                      <img src="/logojdf.png" alt="Juzgado de Faltas" style={{ height: '75px', width: 'auto', flexShrink: 0 }} />
                      <div style={{ textAlign: 'center', flexGrow: 1, padding: '0 15px' }}>
                        <h1 style={{ fontSize: '22px', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 'bold' }}>Municipalidad de la Ciudad de Loreto</h1>
                        <h2 style={{ fontSize: '16px', margin: 0, fontWeight: 'normal' }}>Provincia de Santiago del Estero</h2>
                        <h3 style={{ fontSize: '18px', margin: '10px 0 0 0', fontWeight: 'bold' }}>JUZGADO DE FALTAS MUNICIPAL</h3>
                      </div>
                      <img src="/logo-municipalidad.png" alt="Municipalidad de Loreto" style={{ height: '75px', width: 'auto', flexShrink: 0 }} />
                    </div>
                    
                    <h4 style={{ textAlign: 'center', fontSize: '26px', textDecoration: 'underline', marginBottom: '40px' }}>CERTIFICADO DE LIBRE DEUDA</h4>
                    
                    <div style={{ fontSize: '16px', lineHeight: '2', textAlign: 'justify' }}>
                      <p>Por medio del presente, el Juzgado de Faltas de la Municipalidad de Loreto, Provincia de Santiago del Estero, certifica y deja constancia que, habiendo compulsado los registros informáticos y bases de datos oficiales a la fecha de emisión del presente documento:</p>
                      
                      <p style={{ margin: '20px 0', padding: '15px', background: '#f5f5f5', border: '1px solid #ddd', borderRadius: '5px' }}>
                        El/la titular del Documento Nacional de Identidad N° <strong>{dni}</strong> (Género: {generoConsulta}), <strong>NO REGISTRA</strong> actas de infracción pendientes de juzgamiento, ni resoluciones condenatorias con deudas exigibles por faltas de tránsito, bromatología o tasas de recaudación en la jurisdicción de este Municipio.
                      </p>
                      
                      <p>Se expide el presente certificado de forma automática a través del Portal de Autogestión Ciudadana, a los fines que el/la interesado/a estime corresponder.</p>
                    </div>

                    <div style={{ marginTop: '60px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <p style={{ margin: 0, fontStyle: 'italic' }}>Emitido electrónicamente el: {new Date().toLocaleDateString('es-AR')}</p>
                        <p style={{ margin: 0, fontSize: '12px', color: '#555' }}>Cód. Validación: {Math.random().toString(36).substr(2, 9).toUpperCase()}-{dni}</p>
                      </div>
                      <div style={{ textAlign: 'center', borderTop: '1px dashed #000', width: '250px', paddingTop: '10px' }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>Juzgado de Faltas</p>
                        <p style={{ margin: 0, fontSize: '14px' }}>Municipalidad de Loreto</p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {vista !== 'publica' && (
              <section style={{background: 'var(--papel-alto)', minHeight: '60vh'}}>
                <div className="wrap" style={{ maxWidth: '96%' }}>
                  {!autenticado ? (
                    <div style={{maxWidth: '400px', margin: '0 auto', background: 'var(--papel)', padding: '48px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', boxShadow: '0 8px 24px rgba(0,0,0,0.04)'}}>
                      <div style={{textAlign: 'center', marginBottom: '32px'}}>
                        <img src="/logojdf.png" alt="Logo" style={{height: '60px', display: 'block', margin: '0 auto 16px auto'}} />
                        <h2 style={{fontSize: '22px', margin: 0}}>Acceso Interno</h2>
                        <p style={{fontSize: '14px', color: 'var(--tinta-suave)', margin: '8px 0 0 0'}}>Plataforma exclusiva para personal de la Municipalidad.</p>
                      </div>
                      <form onSubmit={procesarLogin}>
                        <div className="field"><label>Correo Electrónico Institucional</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                        <div className="field"><label>Clave de Seguridad</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                        <button type="submit" disabled={procesando} className="btn btn--primary btn--block" style={{marginTop: '24px'}}>{procesando ? <><Spinner/> Verificando...</> : 'Verificar Identidad'}</button>
                      </form>
                    </div>
                  ) : (
                    <>
                      <div className="section-head" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '20px'}}>
                        <div>
                          <p className="kicker">Panel de Administración</p>
                          <h2>{vista === 'admin_actas' ? 'Carga y Edición de Actas' : vista === 'admin_balance' ? 'Balance General e Informes' : vista === 'admin_descargos' ? 'Auditoría Legal de Descargos' : vista === 'admin_usuarios' ? 'Gestión de Recursos Humanos' : vista === 'admin_noticias' ? 'Publicación Institucional' : vista === 'admin_calculadora' ? 'Calculadora de Multas' : 'Conciliación Bancaria y Pagos'}</h2>
                        </div>

                        {vista === 'admin_actas' && (
                          <div style={{display: 'flex', gap: '12px', flexWrap: 'wrap'}}>
                            <div style={{background: '#fff', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--linea)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: '130px'}}>
                              <span style={{fontSize: '11px', fontWeight: 700, color: 'var(--azul-loreto)', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif'}}>Total Actas</span>
                              <p style={{fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0', color: 'var(--tinta)', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={totalActasCount} /></p>
                            </div>
                            <div style={{background: '#fff', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--linea)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: '130px'}}>
                              <span style={{fontSize: '11px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif'}}>Pendientes</span>
                              <p style={{fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0', color: '#B45309', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={actasPendientesCount} /></p>
                            </div>
                            <div style={{background: '#fff', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--linea)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: '140px'}}>
                              <span style={{fontSize: '11px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif'}}>Recaudación</span>
                              <p style={{fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0', color: '#10B981', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={montoRecaudadoTotal} isCurrency={true}/></p>
                            </div>
                            <div style={{background: '#fff', padding: '12px 18px', borderRadius: '8px', border: '1px solid var(--linea)', boxShadow: '0 2px 8px rgba(0,0,0,0.02)', minWidth: '130px'}}>
                              <span style={{fontSize: '11px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', fontFamily: 'Montserrat, sans-serif'}}>Reincidentes</span>
                              <p style={{fontSize: '20px', fontWeight: 800, margin: '4px 0 0 0', color: '#DC2626', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={reincidentesCount} /></p>
                            </div>
                          </div>
                        )}
                      </div>
                      
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
                                  <label>Seleccionar Fecha de Carga en Sistema</label>
                                  <input type="date" value={fechaConsulta} onChange={e => setFechaConsulta(e.target.value)} max={new Date().toISOString().split('T')[0]} />
                                </div>
                                <button onClick={manejarConsultaDiaria} disabled={buscandoRecaudacion} className="btn btn--primary">{buscandoRecaudacion ? <><Spinner/> Consultando...</> : 'Ver Ingresos'}</button>
                                <button onClick={exportarCSV} className="btn btn--ghost"><svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Exportar Reporte CSV</button>
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
                                <label>DNI del Titular</label>
                                <input type="text" placeholder="Buscar DNI..." value={filtroDniAdmin} onChange={e => setFiltroDniAdmin(e.target.value)} />
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

                      {vista === 'admin_calculadora' && (
                        <div style={{background: 'var(--papel)', padding: '40px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', maxWidth: '900px', margin: '0 auto', marginBottom: '32px'}}>
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
                                <p style={{fontSize: '32px', fontWeight: 800, color: 'var(--azul-loreto)', margin: '12px 0 0 0', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={calcVoluntario} isCurrency={true}/></p>
                              </div>
                              <div style={{background: 'rgba(245, 158, 11, 0.05)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(245, 158, 11, 0.2)'}}>
                                <span style={{fontSize: '12px', fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Pago Notificación</span>
                                <p style={{fontSize: '32px', fontWeight: 800, color: '#B45309', margin: '12px 0 4px 0', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={calcNotificacion} isCurrency={true}/></p>
                                <span style={{fontSize: '11px', color: '#B45309', opacity: 0.8, fontWeight: 600}}>Incluye $5.000 de gastos admin.</span>
                              </div>
                              <div style={{background: 'rgba(239, 68, 68, 0.05)', padding: '24px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.2)'}}>
                                <span style={{fontSize: '12px', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Con Sentencia (100%)</span>
                                <p style={{fontSize: '32px', fontWeight: 800, color: '#DC2626', margin: '12px 0 0 0', fontFamily: 'Montserrat, sans-serif'}}><AnimatedNumber value={calcTotal} isCurrency={true}/></p>
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
                            <div className="field">
                              <label>Material Fotográfico (JPG/PNG — Máx. recomendado: 4 MB)</label>
                              <input type="file" name="archivo" accept=".jpg, .jpeg, .png" required style={{padding: '10px'}} />
                            </div>
                            <button type="submit" disabled={procesando} className="btn btn--primary">{procesando ? <><Spinner/> Publicando...</> : 'Publicar Comunicado'}</button>
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
                                <option value="RECAUDADOR">Oficina de Recaudación</option>
                              </select>
                            </div>
                            <button type="submit" disabled={guardandoUsuario} className="btn btn--primary">{guardandoUsuario ? <><Spinner/> Registrando...</> : 'Generar Credenciales'}</button>
                          </form>
                        </div>
                      )}

                      {vista === 'admin_actas' && (
                        <>
                          <div style={{background: 'var(--papel)', padding: '32px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '32px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)'}}>
                            <h3 style={{fontSize: '18px', marginBottom: '24px'}}>Carga de Nueva Acta de Infracción</h3>
                            <form onSubmit={manejarCrearActa} style={{display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '180px'}}><label>Repartición</label><select value={nuevoTipo} onChange={(e) => setNuevoTipo(e.target.value)}><option value="TRANSITO">Tránsito</option><option value="BROMATOLOGIA">Bromatología</option></select></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '110px'}}><label>N° Acta</label><input type="text" value={nuevoNroActa} onChange={(e) => setNuevoNroActa(e.target.value)} required /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '140px'}}><label>Fecha</label><input type="date" value={nuevaFecha} onChange={(e) => setNuevaFecha(e.target.value)} /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '160px'}}><label>Infractor</label><input type="text" value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} required /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>DNI</label><input type="text" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Género</label>
                                <select value={nuevoGenero} onChange={(e) => setNuevoGenero(e.target.value)}>
                                  <option value="MASCULINO">Masc</option>
                                  <option value="FEMENINO">Fem</option>
                                  <option value="X">Otro</option>
                                </select>
                              </div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '130px'}}><label>Domicilio</label><input type="text" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} placeholder="Opcional..." /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '90px'}}><label>Art. Infringido</label><input type="text" value={nuevoArticulo} onChange={(e) => setNuevoArticulo(e.target.value)} placeholder="Opcional..." /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '140px'}}><label>Inspector</label><input type="text" value={nuevoInspector} onChange={(e) => setNuevoInspector(e.target.value)} placeholder="Opcional..." /></div>
                              <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Monto ($)</label><input type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} required /></div>
                              <button type="submit" disabled={guardandoActa} className="btn btn--primary" style={{width: '100%'}}>{guardandoActa ? <><Spinner/> Procesando...</> : 'Asentar Acta'}</button>
                            </form>
                          </div>

                          <div className="filter-grid">
                            <div className="field" style={{marginBottom: 0}}>
                              <label>Buscar (N° Acta o Nombre)</label>
                              <input type="text" value={filtroActaNombre} onChange={e => setFiltroActaNombre(e.target.value)} placeholder="Ej: 0001 o Pérez..." />
                            </div>
                            <div className="field" style={{marginBottom: 0}}>
                              <label>DNI del Titular</label>
                              <input type="text" placeholder="Buscar DNI..." value={filtroDniAdmin} onChange={e => setFiltroDniAdmin(e.target.value)} />
                            </div>
                            <div className="field" style={{marginBottom: 0}}>
                              <label>Repartición (Búsqueda)</label>
                              <select value={filtroDireccion} onChange={e => setFiltroDireccion(e.target.value)}>
                                <option value="">Consolidado Histórico</option>
                                <option value="TRANSITO">Exclusivo Tránsito</option>
                                <option value="BROMATOLOGIA">Exclusivo Bromatología</option>
                              </select>
                            </div>
                            <div className="field" style={{marginBottom: 0}}>
                              <label>Estado Procesal</label>
                              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
                                <option value="">Todos</option>
                                <option value="PENDIENTE">Pendientes</option>
                                <option value="PRESENTADO">Con descargo</option>
                                <option value="PAGADO">Pagadas</option>
                                <option value="DESISTIDO">Desistidas</option>
                              </select>
                            </div>
                          </div>
                        </>
                      )}

                      <div style={{overflowX: 'auto'}}>
                        {vista !== 'admin_calculadora' && vista !== 'admin_noticias' && (vista !== 'admin_balance' || tabBalance !== 'recaudacion') && (
                           <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px'}}>
                             <h3 style={{fontSize: '16px', margin: 0, color: 'var(--azul-loreto)'}}>Listado de Registros ({totalItems})</h3>
                             <button onClick={exportarDatosCSV} className="btn btn--ghost btn--sm" style={{borderColor: '#10B981', color: '#047857'}}>
                               <svg className="w-4 h-4 inline-block mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> Exportar Vista a Excel
                             </button>
                           </div>
                        )}

                        {cargandoAdmin ? <SkeletonTable columnas={vista === 'admin_actas' ? 9 : 5} /> : (
                          <>
                            {vista === 'admin_balance' && tabBalance === 'recaudacion' && (
                              <table className="admin-table">
                                <thead><tr><th>Hora Carga</th><th>N° Acta Vinculada</th><th>Infractor (DNI)</th><th>Monto</th><th>Medio de Ingreso</th></tr></thead>
                                <tbody>
                                  {listaPaginada.map((item: any) => (
                                    <tr key={item.id}>
                                      <td><strong>{new Date(item.creadoEn).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs</strong></td>
                                      <td>Acta N° {item.infraccion?.nroActa || '-'}</td>
                                      <td>{item.infraccion?.nombreTitular || '-'} ({item.infraccion?.dniTitular || '-'})</td>
                                      <td style={{color: '#047857', fontWeight: 700}}>${item.montoInformado}</td>
                                      <td>{item.comprobanteUrl === 'PAGO_PRESENCIAL_VENTANILLA' ? 'Efectivo (Ventanilla)' : 'Transferencia Bancaria (Online)'}</td>
                                    </tr>
                                  ))}
                                  {listaPaginada.length === 0 && (<tr><td colSpan={5} style={{textAlign: 'center', padding: '40px'}}>No hay registros de cobro en la fecha seleccionada.</td></tr>)}
                                </tbody>
                              </table>
                            )}

                            {(vista === 'admin_actas' || (vista === 'admin_balance' && tabBalance !== 'recaudacion')) && (
                              <table className="admin-table">
                                <thead>
                                  <tr>
                                    <th>N° Acta Físico</th>
                                    <th>Infractor</th>
                                    <th>DNI</th>
                                    <th>Domicilio</th>
                                    <th>Fecha del Hecho</th>
                                    <th>Art. Infringido</th>
                                    <th>Fase Procesal</th>
                                    {vista === 'admin_balance' && tabBalance === 'reincidentes' ? <th>Faltas Acumuladas</th> : <th>Monto Base</th>}
                                    <th>Acciones</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {listaPaginada.map((item: any) => (
                                    <tr key={item.id}>
                                      <td><strong style={{fontSize: '15px'}}>{item.nroActa}</strong></td>
                                      <td><strong style={{display: 'block', fontSize: '14px'}}>{item.nombreTitular}</strong></td>
                                      <td style={{fontFamily: 'Montserrat, sans-serif', fontWeight: 600}}>{item.dniTitular}</td>
                                      <td><span style={{fontSize: '13.5px', color: 'var(--tinta-suave)'}}>{item.lugar || 'No informado'}</span></td>
                                      <td style={{fontSize: '13.5px'}}>{new Date(item.fechaInfraccion).toLocaleDateString('es-AR')}</td>
                                      <td style={{fontSize: '13.5px'}}>{item.articulo || '-'}</td>
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
                                              <button onClick={() => manejarDesistimiento(item)} className="btn btn--primary btn--sm" style={{background: 'var(--azul-loreto)'}}>Desistir</button>
                                            </>
                                          )}
                                          <button onClick={() => {
                                            const d = new Date(item.fechaInfraccion);
                                            setModalEditarActa({...item, fechaInfraccion_input: !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : ''});
                                          }} className="btn btn--ghost btn--sm">Editar</button>
                                          
                                          <button onClick={() => manejarEliminarDato(item.id, 'acta')} className="btn btn--danger btn--sm">Anular</button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                  {listaPaginada.length === 0 && (<tr><td colSpan={9} style={{textAlign: 'center', padding: '40px'}}>No hay resultados.</td></tr>)}
                                </tbody>
                              </table>
                            )}

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

                            {(vista === 'admin_descargos' || vista === 'admin_pagos') && (
                              <table className="admin-table">
                                <thead><tr><th>Identificador Expediente</th><th>Fase Procesal</th><th>Fecha de Ingreso</th><th>Acción de Auditoría</th></tr></thead>
                                <tbody>
                                  {listaPaginada.map((item: any) => (
                                    <tr key={item.id}>
                                      <td><strong style={{fontSize: '15px'}}>{item.expedienteNro || item.infraccion?.nroActa || item.nroActa}</strong></td>
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

          {modalEditarActa && (
            <div className="modal-overlay" onClick={() => setModalEditarActa(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px'}}>
                <h3 style={{marginBottom: '24px'}}>Editar Acta de Infracción</h3>
                <form onSubmit={manejarEditarActa} style={{display: 'flex', gap: '16px', flexWrap: 'wrap'}}>
                  <div className="field" style={{flex: 1, minWidth: '180px'}}>
                    <label>Repartición Emisora</label>
                    <select value={modalEditarActa.tipoInfraccion} onChange={(e) => setModalEditarActa({...modalEditarActa, tipoInfraccion: e.target.value})} required>
                      <option value="TRANSITO">Dirección de Tránsito</option>
                      <option value="BROMATOLOGIA">Bromatología y Calidad de Vida</option>
                    </select>
                  </div>
                  <div className="field" style={{flex: 1, minWidth: '110px'}}><label>N° Físico de Acta</label><input type="text" value={modalEditarActa.nroActa} onChange={(e) => setModalEditarActa({...modalEditarActa, nroActa: e.target.value})} required /></div>
                  
                  <div className="field" style={{flex: 1, minWidth: '140px'}}><label>Fecha del Hecho</label><input type="date" value={modalEditarActa.fechaInfraccion_input || ''} onChange={(e) => setModalEditarActa({...modalEditarActa, fechaInfraccion_input: e.target.value})} /></div>
                  
                  <div className="field" style={{flex: 1, minWidth: '160px'}}><label>Nombre del Imputado</label><input type="text" value={modalEditarActa.nombreTitular} onChange={(e) => setModalEditarActa({...modalEditarActa, nombreTitular: e.target.value})} required /></div>
                  <div className="field" style={{flex: 1, minWidth: '120px'}}><label>DNI / CUIT</label><input type="text" value={modalEditarActa.dniTitular} onChange={(e) => setModalEditarActa({...modalEditarActa, dniTitular: e.target.value})} required /></div>
                  
                  <div className="field" style={{flex: 1, minWidth: '120px'}}><label>Género Titular</label>
                    <select value={modalEditarActa.generoTitular || 'MASCULINO'} onChange={(e) => setModalEditarActa({...modalEditarActa, generoTitular: e.target.value})}>
                      <option value="MASCULINO">Masc</option>
                      <option value="FEMENINO">Fem</option>
                      <option value="X">Otro</option>
                    </select>
                  </div>

                  <div className="field" style={{flex: 1, minWidth: '130px'}}><label>Domicilio del Infractor</label><input type="text" value={modalEditarActa.lugar} onChange={(e) => setModalEditarActa({...modalEditarActa, lugar: e.target.value})} placeholder="Opcional..." /></div>
                  <div className="field" style={{flex: 1, minWidth: '90px'}}><label>Art. Infringido</label><input type="text" value={modalEditarActa.articulo} onChange={(e) => setModalEditarActa({...modalEditarActa, articulo: e.target.value})} placeholder="Opcional..." /></div>
                  <div className="field" style={{flex: 1, minWidth: '140px'}}><label>Agente Interviniente</label><input type="text" value={modalEditarActa.inspector} onChange={(e) => setModalEditarActa({...modalEditarActa, inspector: e.target.value})} placeholder="Opcional..." /></div>
                  <div className="field" style={{flex: 1, minWidth: '120px'}}><label>Monto a Cobrar ($)</label><input type="number" value={modalEditarActa.monto} onChange={(e) => setModalEditarActa({...modalEditarActa, monto: e.target.value})} required /></div>
                  
                  <div style={{display: 'flex', gap: '12px', width: '100%', marginTop: '16px'}}>
                    <button type="button" onClick={() => setModalEditarActa(null)} className="btn btn--ghost" style={{flex: 1}}>Cancelar</button>
                    <button type="submit" disabled={editandoActa} className="btn btn--primary" style={{flex: 1}}>{editandoActa ? <><Spinner/> Guardando...</> : 'Guardar Cambios'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

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
                    <button type="submit" disabled={cambiandoPass} className="btn btn--primary" style={{flex: 1}}>{cambiandoPass ? <><Spinner/> Procesando...</> : 'Confirmar Cambio'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {itemModal && (
            <div className="modal-overlay" onClick={() => setItemModal(null)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <h3 style={{marginBottom: '24px', fontSize: '22px'}}>Revisión de Expediente Electrónico</h3>
                
                <div style={{background: 'var(--papel-alto)', padding: '24px', borderRadius: '8px', marginBottom: '24px', fontSize: '15px', border: '1px solid var(--linea)'}}>
                  <p style={{margin: '0 0 8px 0'}}><strong>Acta de Infracción Relacionada:</strong> N° {itemModal.infraccion?.nroActa || itemModal.nroActa || "No especificado"}</p>
                  <p style={{margin: '0 0 16px 0'}}><strong>Identificación Imputado:</strong> DNI {itemModal.infraccion?.dniTitular || itemModal.dniTitular || "No especificado"} ({itemModal.infraccion?.generoTitular || itemModal.generoTitular || "MASCULINO"})</p>
                  {vista === 'admin_descargos' && (
                    <div style={{background: '#fff', padding: '16px', borderRadius: '6px', border: '1px solid var(--linea)'}}>
                      <strong style={{color: 'var(--azul-loreto)', display: 'block', marginBottom: '8px'}}>Fundamentos Jurídicos Presentados:</strong>
                      <p style={{whiteSpace: 'pre-wrap', margin: 0, fontStyle: 'italic', color: 'var(--tinta-suave)'}}>"{itemModal.motivo}"</p>
                    </div>
                  )}
                  {vista === 'admin_pagos' && <p style={{margin: '0', fontSize: '18px', fontWeight: 700, color: '#10B981'}}>Monto Declarado: ${itemModal.montoInformado || itemModal.monto || "0"}</p>}
                </div>
                
                <div style={{marginBottom: '32px'}}>
                  <a href={vista === 'admin_descargos' ? (itemModal.archivosUrl?.[0] || itemModal.archivoUrl || "#") : (itemModal.comprobanteUrl || itemModal.archivoUrl || "#")} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block" style={{borderStyle: 'dashed'}}>Visualizar Documento / Prueba Adjunta</a>
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
                          <button onClick={() => auditarDescargo('RESUELTO_A_FAVOR')} disabled={procesando} className="btn btn--success" style={{flex: 1}}>{procesando ? <Spinner/> : ''} Dictar Sobreseimiento</button>
                          <button onClick={() => auditarDescargo('RECHAZADO')} disabled={procesando} className="btn btn--danger" style={{flex: 1}}>{procesando ? <Spinner/> : ''} Confirmar Sanción</button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => auditarPago('CONCILIADO')} disabled={procesando} className="btn btn--success" style={{flex: 1}}>{procesando ? <Spinner/> : ''} Acreditar Impacto Bancario</button>
                          <button onClick={() => auditarPago('RECHAZADO')} disabled={procesando} className="btn btn--danger" style={{flex: 1}}>{procesando ? <Spinner/> : ''} Rechazar Comprobante Apócrifo</button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <p style={{textAlign: 'center', color: 'var(--tinta-suave)', fontWeight: 600, fontSize: '15px'}}>El presente expediente se encuentra con resolución firme.</p>
                )}
                <button onClick={() => setItemModal(null)} className="btn btn--ghost btn--block" style={{marginTop: '24px', border: 'none', background: 'var(--papel-alto)'}}>Volver a la bandeja</button>
              </div>
            </div>
          )}

          {alertaNotificacion && (
            <div className="fixed inset-0 flex items-center justify-center z-[9999] bg-[#0B4A82]/40 backdrop-blur-sm p-4 transition-opacity">
              <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_20px_50px_rgba(0,0,0,0.15)] animate-[zoomIn_0.35s_cubic-bezier(0.16,1,0.3,1)]">
                <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full mb-5 ${alertaNotificacion.tipo === 'exito' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                  {alertaNotificacion.tipo === 'exito' ? (
                    <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  ) : (
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
                <h3 className="text-[20px] font-extrabold text-[#0B4A82] mb-2 font-['Montserrat'] leading-tight">
                  {alertaNotificacion.titulo}
                </h3>
                <p className="text-[14.5px] text-[#495057] mb-8 leading-relaxed">
                  {alertaNotificacion.mensaje}
                </p>
                <button 
                  onClick={() => setAlertaNotificacion(null)} 
                  className="w-full bg-[#0B4A82] hover:bg-[#083863] text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg"
                >
                  Entendido
                </button>
              </div>
            </div>
          )}

          {/* MODALES LEGALES */}
          {modalTerminos && (
            <div className="modal-overlay" onClick={() => setModalTerminos(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', lineHeight: 1.6}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                  <h3 style={{fontSize: '22px', margin: 0}}>Términos y Condiciones de Uso</h3>
                  <button onClick={() => setModalTerminos(false)} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--tinta-suave)'}}>✕</button>
                </div>
                <div style={{fontSize: '14.5px', color: 'var(--tinta)'}}>
                  <p><strong>1. Objeto:</strong> El presente portal de Autogestión Ciudadana es administrado por el Juzgado de Faltas de la Municipalidad de Loreto, con el fin de facilitar la consulta de actas de infracción, presentación de descargos y emisión de comprobantes de pago de forma digital.</p>
                  <p><strong>2. Validez Legal:</strong> Toda documentación, descargo o comprobante ingresado a través de esta plataforma digital reviste carácter de Declaración Jurada. El infractor asume la total responsabilidad civil y penal por la falsedad, adulteración o inexactitud de los datos y documentos proporcionados.</p>
                  <p><strong>3. Uso de la Plataforma:</strong> El usuario se compromete a no utilizar el sistema con fines ilícitos, no intentar vulnerar sus medidas de seguridad, ni cargar archivos maliciosos. La Municipalidad se reserva el derecho de bloquear el acceso a cualquier dirección IP que presente un comportamiento anómalo o fraudulento.</p>
                  <p><strong>4. Domicilio Electrónico:</strong> El correo electrónico proporcionado al momento de presentar un descargo será considerado como Domicilio Electrónico Constituido, siendo válidas todas las notificaciones, citaciones y resoluciones enviadas a dicha casilla.</p>
                  <p><strong>5. Modificaciones:</strong> El Juzgado de Faltas se reserva el derecho de modificar o suspender temporalmente el servicio web para tareas de mantenimiento, sin que ello genere derecho a reclamo alguno por parte del usuario, quedando siempre habilitada la mesa de entradas presencial en sus horarios habituales.</p>
                </div>
                <button onClick={() => setModalTerminos(false)} className="btn btn--primary btn--block" style={{marginTop: '24px'}}>Cerrar y Aceptar</button>
              </div>
            </div>
          )}

          {modalPrivacidad && (
            <div className="modal-overlay" onClick={() => setModalPrivacidad(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '700px', lineHeight: 1.6}}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px'}}>
                  <h3 style={{fontSize: '22px', margin: 0}}>Política de Privacidad y Tratamiento de Datos</h3>
                  <button onClick={() => setModalPrivacidad(false)} style={{background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'var(--tinta-suave)'}}>✕</button>
                </div>
                <div style={{fontSize: '14.5px', color: 'var(--tinta)'}}>
                  <p><strong>1. Responsabilidad:</strong> De conformidad con la Ley Nacional N° 25.326 de Protección de Datos Personales, la Municipalidad de Loreto (en adelante "El Municipio") garantiza la seguridad y confidencialidad de los datos suministrados por los ciudadanos en este portal.</p>
                  <p><strong>2. Finalidad de la Recopilación:</strong> Los datos personales solicitados (DNI, Género, Nombre, Correo Electrónico) y los documentos adjuntados serán utilizados de manera exclusiva para la consulta, gestión, procesamiento y resolución de expedientes de faltas e infracciones de tránsito o comerciales.</p>
                  <p><strong>3. Protección y Confidencialidad:</strong> El Municipio ha adoptado las medidas técnicas y organizativas necesarias para evitar la pérdida, mal uso, alteración, acceso no autorizado y robo de los Datos Personales. Los archivos adjuntos son procesados mediante identificadores encriptados para garantizar el anonimato de sus rutas de acceso público.</p>
                  <p><strong>4. Derechos ARCO:</strong> El titular de los datos personales tiene la facultad de ejercer el derecho de acceso a los mismos en forma gratuita. Asimismo, puede solicitar la rectificación, actualización o supresión de sus datos personales, dirigiéndose presencialmente a la Mesa de Entradas del Juzgado de Faltas.</p>
                  <p><strong>5. Registros de Auditoría:</strong> El sistema registra automáticamente información de acceso (fecha, hora y dirección IP) con fines estrictamente orientados a la auditoría interna de seguridad y prevención de fraudes informáticos.</p>
                </div>
                <button onClick={() => setModalPrivacidad(false)} className="btn btn--primary btn--block" style={{marginTop: '24px'}}>Cerrar y Aceptar</button>
              </div>
            </div>
          )}

          <BotonWhatsApp />

          <footer className="site no-print" style={{background: 'var(--azul-loreto)', color: '#F8F9FA', padding: '48px 0 24px 0'}}>
            <div className="wrap" style={{textAlign: 'center', fontSize: '13.5px', fontFamily: 'Montserrat, sans-serif', opacity: 0.9}}>
              <strong>Juzgado de Faltas Municipal de Loreto</strong><br/>
              Provincia de Santiago del Estero — República Argentina<br/>
              <span style={{fontSize: '12px', opacity: 0.75}}>Creado y regulado conforme a las Ordenanzas Municipales vigentes y al Código de Convivencia de la Ciudad de Loreto.</span><br/><br/>
              
              <div style={{display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '24px', margin: '20px 0', borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '16px 0'}}>
                <button onClick={() => setModalTerminos(true)} style={{textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}}>Términos y Condiciones de Uso</button>
                <button onClick={() => setModalPrivacidad(true)} style={{textDecoration: 'underline', background: 'none', border: 'none', color: 'inherit', cursor: 'pointer'}}>Política de Privacidad (Ley 25.326)</button>
                <button onClick={() => { setVista('admin_actas'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} style={{textDecoration: 'underline', background: 'none', border: 'none', color: '#00B2D6', fontWeight: 700, cursor: 'pointer'}}>
                  🔒 Acceso Interno (Personal)
                </button>
              </div>

              © {new Date().getFullYear()} Todos los derechos reservados
            </div>
          </footer>
        </>
      )}
    </>
  )
}