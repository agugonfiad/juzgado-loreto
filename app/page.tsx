"use client"

import { useState } from "react"
import { buscarInfraccionPorDni } from "./actions/actas"
import { procesarTramiteCiudadano } from "./actions/subidas"
import { verificarAcceso, obtenerActasAdmin, obtenerDescargosAdmin, obtenerPagosAdmin, resolverDescargo, conciliarPago, crearActa, eliminarActa } from "./actions/admin"

export default function JuzgadoFaltasUnificado() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const [vista, setVista] = useState<'publica' | 'admin_actas' | 'admin_descargos' | 'admin_pagos'>('publica')

  const [autenticado, setAutenticado] = useState(false)
  const [password, setPassword] = useState("")
  const [datosAdmin, setDatosAdmin] = useState<any[]>([])
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

  const [nuevoNroActa, setNuevoNroActa] = useState("")
  const [nuevoDni, setNuevoDni] = useState("")
  const [nuevoLugar, setNuevoLugar] = useState("")
  const [nuevoArticulo, setNuevoArticulo] = useState("")
  const [nuevoMonto, setNuevoMonto] = useState("")
  const [guardandoActa, setGuardandoActa] = useState(false)

  const manejarBusqueda = async (e: React.FormEvent) => {
    e.preventDefault()
    setBuscando(true)
    setMensaje("")
    setTramiteActivo(null)
    const respuesta = await buscarInfraccionPorDni(dni)
    if (respuesta.success && respuesta.data) {
      setResultados(respuesta.data)
      if (respuesta.data.length === 0) setMensaje("No se registran infracciones para el DNI ingresado.")
    } else { setMensaje("Ocurrió un error al buscar los registros.") }
    setBuscando(false)
  }

  const manejarEnvioTramite = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setEnviando(true)
    const formData = new FormData(e.currentTarget)
    const respuesta = await procesarTramiteCiudadano(formData)
    if (respuesta.success) {
      alert("¡Trámite enviado con éxito!")
      setTramiteActivo(null)
      manejarBusqueda(new Event('submit') as any)
    } else { alert("Error: " + respuesta.error) }
    setEnviando(false)
  }

  const manejarLoginYDatos = async (e?: React.FormEvent, nuevaVista?: string) => {
    if (e) e.preventDefault()
    if (!autenticado) {
      const auth = await verificarAcceso(password)
      if (!auth.success) return alert(auth.error)
      setAutenticado(true)
    }
    const vistaDestino = nuevaVista || vista
    setCargandoAdmin(true)
    if (vistaDestino === 'admin_actas') setDatosAdmin(await obtenerActasAdmin())
    if (vistaDestino === 'admin_descargos') setDatosAdmin(await obtenerDescargosAdmin())
    if (vistaDestino === 'admin_pagos') setDatosAdmin(await obtenerPagosAdmin())
    if (nuevaVista) setVista(nuevaVista as any)
    setCargandoAdmin(false)
  }

  const manejarCrearActa = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoActa(true)
    const res = await crearActa({ nroActa: nuevoNroActa, dniTitular: nuevoDni, monto: Number(nuevoMonto), lugar: nuevoLugar, articulo: nuevoArticulo })
    if (res.success) {
      setNuevoNroActa("")
      setNuevoDni("")
      setNuevoLugar("")
      setNuevoArticulo("")
      setNuevoMonto("")
      manejarLoginYDatos(undefined, vista)
    } else { alert(res.error) }
    setGuardandoActa(false)
  }

  const manejarEliminarActa = async (id: string) => {
    if (!confirm("¿Seguro que desea ELIMINAR esta acta del sistema? Úselo solo para corregir errores de tipeo.")) return
    const res = await eliminarActa(id)
    if (res.success) { manejarLoginYDatos(undefined, vista) } 
    else { alert(res.error) }
  }

  const auditarDescargo = async (estado: string) => {
    if (estado === 'RECHAZADO' && !textoResolucion) return alert("Debe justificar el rechazo.")
    setProcesando(true)
    await resolverDescargo(itemModal.id, estado, textoResolucion)
    setItemModal(null)
    setTextoResolucion("")
    setProcesando(false)
    manejarLoginYDatos(undefined, vista)
  }

  const auditarPago = async (estado: string) => {
    setProcesando(true)
    await conciliarPago(itemModal.id, estado)
    setItemModal(null)
    setProcesando(false)
    manejarLoginYDatos(undefined, vista)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        :root { --azul-loreto: #0B4A82; --celeste-loreto: #00B2D6; --rojo-loreto: #EB2128; --papel: #FFFFFF; --papel-alto: #F8F9FA; --tinta: #212529; --tinta-suave: #495057; --linea: #DEE2E6; --radius-s: 4px; --radius-m: 10px; --maxw: 1180px; }
        * { box-sizing: border-box; } html { scroll-behavior: smooth; } body { margin: 0; background: var(--papel); color: var(--tinta); font-family: 'Public Sans', system-ui, sans-serif; line-height: 1.55; }
        h1, h2, h3, h4 { font-family: 'Fraunces', Georgia, serif; color: var(--azul-loreto); margin: 0 0 0.5em; line-height: 1.15; font-weight: 600; } a { color: inherit; } .wrap { max-width: var(--maxw); margin: 0 auto; padding: 0 24px; }
        .topbar { background: var(--azul-loreto); color: #FFFFFF; font-size: 13.5px; } .topbar .wrap { display: flex; justify-content: space-between; align-items: center; padding-top: 8px; padding-bottom: 8px; gap: 16px; flex-wrap: wrap; } .topbar a { text-decoration: none; opacity: .9; } .topbar a:hover { opacity: 1; text-decoration: underline; } .topbar__item { display: inline-flex; align-items: center; gap: 6px; margin-right: 18px; }
        header.site { background: var(--papel); border-bottom: 1px solid var(--linea); position: sticky; top: 0; z-index: 100; } .nav-row { display: flex; align-items: center; justify-content: space-between; padding: 14px 0; gap: 20px; }
        .brand { display: flex; align-items: center; gap: 14px; text-decoration: none; } .brand__logo { height: 55px; width: auto; flex: none; } .brand__text .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin: 0 0 2px; } .brand__text strong { display: block; font-family: 'Fraunces', serif; font-weight: 600; font-size: 17px; color: var(--azul-loreto); line-height: 1.2; }
        nav.primary { display: flex; align-items: center; gap: 28px; } nav.primary ul { list-style: none; display: flex; gap: 26px; margin: 0; padding: 0; } nav.primary a { text-decoration: none; font-weight: 600; font-size: 14.5px; color: var(--tinta); padding: 6px 2px; border-bottom: 2px solid transparent; cursor: pointer; } nav.primary a:hover { border-color: var(--rojo-loreto); color: var(--azul-loreto); }
        .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: var(--radius-s); font-weight: 700; font-size: 14.5px; text-decoration: none; border: 1.5px solid transparent; cursor: pointer; font-family: 'Public Sans', sans-serif; } .btn--primary { background: var(--celeste-loreto); color: #fff; } .btn--ghost { background: transparent; color: var(--azul-loreto); border-color: var(--azul-loreto); } .btn--ghost:hover { background: var(--azul-loreto); color: #fff; } .btn--sm { padding: 8px 14px; font-size: 13.5px; } .btn--block { width: 100%; } .btn--success { background: #10B981; color: white; border: none; } .btn--danger { background: #EF4444; color: white; border: none; }
        .hero { padding: 64px 0 56px; background: radial-gradient(circle at 88% 15%, rgba(0, 178, 214, 0.08), transparent 45%), var(--papel-alto); border-bottom: 1px solid var(--linea); } .hero .wrap { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 56px; align-items: center; } .hero .eyebrow { font-family: 'IBM Plex Mono', monospace; font-size: 12.5px; letter-spacing: .09em; text-transform: uppercase; color: var(--celeste-loreto); margin-bottom: 14px; font-weight: 500; } .hero h1 { font-size: clamp(30px, 4vw, 44px); max-width: 14ch; } .hero p.lead { font-size: 17.5px; color: var(--tinta-suave); max-width: 46ch; margin: 14px 0 28px; }
        section { padding: 72px 0; } .section-head { max-width: 60ch; margin-bottom: 40px; } .section-head .kicker { font-family: 'IBM Plex Mono', monospace; font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--rojo-loreto); margin-bottom: 10px; font-weight: 500; }
        .art-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: var(--linea); border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; } .art-card { background: var(--papel); padding: 30px 26px; } .art-card__tag { font-family: 'IBM Plex Mono', monospace; font-size: 12px; color: var(--celeste-loreto); font-weight: 600; margin-bottom: 14px; display: block; }
        .consulta-panel { background: var(--azul-loreto); color: #F8F9FA; border-radius: var(--radius-m); padding: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; } .consulta-form { background: var(--papel); border-radius: var(--radius-m); padding: 26px; color: var(--tinta); } .field { margin-bottom: 16px; } .field label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: var(--tinta); } .field input, .field textarea { width: 100%; padding: 11px 12px; border: 1.5px solid var(--linea); border-radius: var(--radius-s); font-family: 'IBM Plex Mono', monospace; font-size: 14px; background: #fff; color: var(--tinta); }
        .admin-table { width: 100%; text-align: left; border-collapse: collapse; background: #fff; border-radius: var(--radius-m); overflow: hidden; border: 1px solid var(--linea); box-shadow: 0 2px 8px rgba(0,0,0,0.05); } .admin-table th { background: var(--papel-alto); padding: 16px; font-weight: 600; border-bottom: 2px solid var(--linea); font-size: 14px; color: var(--azul-loreto); } .admin-table td { padding: 16px; border-bottom: 1px solid var(--linea); font-size: 14.5px; } .badge { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; } .modal-content { background: var(--papel); padding: 32px; border-radius: var(--radius-m); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .contacto-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: start; } .contacto-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 20px; } .contacto-list li { display: flex; gap: 14px; align-items: flex-start; } .contacto-list .ico { width: 36px; height: 36px; border-radius: 50%; background: rgba(235, 33, 40, 0.1); color: var(--rojo-loreto); display: flex; align-items: center; justify-content: center; flex: none; } .contacto-list strong { display: block; font-size: 14px; color: var(--azul-loreto); } .contacto-list span, .contacto-list a { font-size: 14.5px; color: var(--tinta-suave); text-decoration: none; } .contacto-list a:hover { color: var(--rojo-loreto); text-decoration: underline; } .map-frame { border: 1px solid var(--linea); border-radius: var(--radius-m); overflow: hidden; height: 360px; } .map-frame iframe { width: 100%; height: 100%; border: 0; }
        @media (max-width: 980px) { .contacto-grid { grid-template-columns: 1fr; } .consulta-panel { grid-template-columns: 1fr; } .hero .wrap { grid-template-columns: 1fr; } }
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
            <nav className={`primary ${menuAbierto ? 'open' : ''}`}><ul><li><a href="#inicio">Inicio</a></li><li><a href="#institucion">Competencia</a></li><li><a href="#consulta">Trámites</a></li></ul></nav>
          ) : (
            <nav className="primary">{autenticado && (<ul><li><a onClick={() => manejarLoginYDatos(undefined, 'admin_actas')}>Gestión Actas</a></li><li><a onClick={() => manejarLoginYDatos(undefined, 'admin_descargos')}>Auditoría Descargos</a></li><li><a onClick={() => manejarLoginYDatos(undefined, 'admin_pagos')}>Conciliación BSE</a></li></ul>)}</nav>
          )}
          <div>
            <button onClick={() => {
                if (vista === 'publica') { setVista('admin_actas'); if (autenticado) manejarLoginYDatos(undefined, 'admin_actas'); }
                else { setVista('publica'); setAutenticado(false); setPassword(""); }
              }} className="btn btn--ghost btn--sm">
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
                <div><p className="eyebrow">Municipalidad de Loreto · Provincia de Santiago del Estero</p><h1>Juzgado de Faltas Municipal de Loreto</h1><p className="lead">Consultá el estado de tus infracciones de tránsito, presentá tu descargo y gestioná tus trámites con el Juzgado desde un mismo lugar.</p><a href="#consulta" className="btn btn--primary">Consultar mi infracción</a></div>
                <div style={{display: 'flex', justifyContent: 'center'}}><img src="/logojdf.png" alt="Sello institucional" style={{width: 'min(380px, 100%)'}} /></div>
              </div>
            </section>
            
            <section id="institucion">
              <div className="wrap">
                <div className="section-head">
                  <p className="kicker">Código de Faltas Municipal</p>
                  <h2>Qué hace el Juzgado de Faltas</h2>
                  <p>El Juzgado interviene una vez agotada la instancia administrativa, cuando un vecino o vecina apela una infracción labrada por los inspectores o por la autoridad de control de tránsito.</p>
                </div>
                <div className="art-grid">
                  <div className="art-card"><span className="art-card__tag">ART. 1 — Competencia</span><h3>Jurisdicción</h3><p>Entiende en las faltas y contravenciones de tránsito cometidas dentro del ejido municipal de Loreto, conforme a la ordenanza vigente.</p></div>
                  <div className="art-card"><span className="art-card__tag">ART. 2 — Principios</span><h3>Imparcialidad</h3><p>Actúa como órgano autónomo, garantizando a cada infractor el derecho a ser oído antes de que se confirme cualquier sanción.</p></div>
                  <div className="art-card"><span className="art-card__tag">ART. 3 — Proceso</span><h3>Debido proceso</h3><p>Toda infracción admite descargo, prueba y, si correspondiera, apelación, antes de quedar firme.</p></div>
                  <div className="art-card"><span className="art-card__tag">ART. 4 — Prevención</span><h3>Educación vial</h3><p>Promueve el conocimiento de las normas de tránsito como herramienta central para reducir siniestros en la vía pública.</p></div>
                </div>
              </div>
            </section>

            <section id="consulta">
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
                        {resultados.map((acta) => (
                          <div key={acta.id} style={{padding: '15px', borderLeft: '3px solid var(--rojo-loreto)', background: 'var(--papel-alto)', marginBottom: '10px'}}>
                            <strong>Acta N° {acta.nroActa}</strong> - ${acta.monto.toString()} <br/><span style={{fontSize: '13px', color: 'var(--tinta-suave)'}}>Estado: {acta.estado}</span>
                            {acta.estado === 'PENDIENTE' && (
                              <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}><button onClick={() => setTramiteActivo({ id: acta.id, tipo: 'pago' })} className="btn btn--ghost btn--sm">Informar Pago</button><button onClick={() => setTramiteActivo({ id: acta.id, tipo: 'descargo' })} className="btn btn--primary btn--sm">Descargo</button></div>
                            )}
                            {tramiteActivo?.id === acta.id && (
                              <form onSubmit={manejarEnvioTramite} style={{marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--linea)'}}>
                                <input type="hidden" name="infraccionId" value={acta.id} />
                                <input type="hidden" name="tipo" value={tramiteActivo.tipo} />
                                {tramiteActivo.tipo === 'pago' ? (
                                  <div className="field"><label>Monto transferido ($)</label><input type="number" name="monto" required /></div>
                                ) : (
                                  <div className="field"><label>Motivo de defensa</label><textarea name="motivo" rows={3} required></textarea></div>
                                )}
                                <div className="field"><label>Adjuntar archivo (PDF/IMG)</label><input type="file" name="archivo" required /></div>
                                <button type="submit" disabled={enviando} className="btn btn--primary btn--block">{enviando ? 'Enviando...' : 'Subir Documentación'}</button>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section id="contacto" style={{background: 'var(--papel-alto)', borderTop: '1px solid var(--linea)'}}>
              <div className="wrap">
                <div className="section-head"><p className="kicker">Contacto</p><h2>Ubicación y contacto</h2></div>
                <div className="contacto-grid">
                  <ul className="contacto-list">
                    <li><span className="ico">📍</span><div><strong>Dirección</strong><span>Isla Soledad S/N, Bº Islas Malvinas<br/>Loreto, Santiago del Estero</span></div></li>
                    <li><span className="ico">☎</span><div><strong>Teléfono / Celular</strong><a href="tel:+5493854743310">385 474-3310</a></div></li>
                    <li><span className="ico">📧</span><div><strong>Correo electrónico</strong><a href="mailto:juzgadodefaltasloreto@outlook.com">juzgadodefaltasloreto@outlook.com</a><br/><a href="mailto:juzgadodefaltas@gmail.com" style={{display: 'inline-block', marginTop: '4px'}}>juzgadodefaltas@gmail.com</a></div></li>
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
                  <h2 style={{fontSize: '20px', marginBottom: '20px', textAlign: 'center'}}>Acceso Restringido</h2>
                  <form onSubmit={manejarLoginYDatos}>
                    <div className="field"><label>Contraseña del Personal</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                    <button type="submit" className="btn btn--primary btn--block">Ingresar al Sistema</button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="section-head"><p className="kicker">Panel Interno de Trabajo</p><h2>{vista === 'admin_actas' ? 'Gestión General de Actas' : vista === 'admin_descargos' ? 'Auditoría de Descargos Presentados' : 'Conciliación de Transferencias BSE'}</h2></div>
                  
                  {vista === 'admin_actas' && (
                    <div style={{background: 'var(--papel)', padding: '24px', borderRadius: 'var(--radius-m)', border: '1px solid var(--linea)', marginBottom: '24px'}}>
                      <h3 style={{fontSize: '16px', marginBottom: '16px'}}>Cargar Nueva Infracción</h3>
                      <form onSubmit={manejarCrearActa} style={{display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap'}}>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>N° Acta</label><input type="text" value={nuevoNroActa} onChange={(e) => setNuevoNroActa(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>DNI Infractor</label><input type="text" value={nuevoDni} onChange={(e) => setNuevoDni(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Lugar</label><input type="text" value={nuevoLugar} onChange={(e) => setNuevoLugar(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Art. Infringido</label><input type="text" value={nuevoArticulo} onChange={(e) => setNuevoArticulo(e.target.value)} required /></div>
                        <div className="field" style={{marginBottom: 0, flex: 1, minWidth: '120px'}}><label>Monto ($)</label><input type="number" value={nuevoMonto} onChange={(e) => setNuevoMonto(e.target.value)} required /></div>
                        <button type="submit" disabled={guardandoActa} className="btn btn--primary">{guardandoActa ? 'Guardando...' : 'Registrar Acta'}</button>
                      </form>
                    </div>
                  )}

                  <div style={{overflowX: 'auto'}}>
                    {cargandoAdmin ? <p style={{textAlign: 'center', padding: '40px'}}>Cargando registros...</p> : (
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>{vista === 'admin_actas' ? 'N° Acta' : 'Expediente / Acta'}</th>
                            <th>{vista === 'admin_actas' ? 'DNI Titular' : 'Estado'}</th>
                            <th>{vista === 'admin_actas' ? 'Monto' : 'Fecha'}</th>
                            <th>Acción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {datosAdmin.map((item: any) => (
                            <tr key={item.id}>
                              <td><strong>{item.nroActa || item.expedienteNro || item.infraccion?.nroActa}</strong></td>
                              <td><span className="badge" style={{background: item.estado === 'PENDIENTE' || item.estado === 'PRESENTADO' || item.estado === 'PENDIENTE_CONCILIACION' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: item.estado === 'PENDIENTE' || item.estado === 'PRESENTADO' || item.estado === 'PENDIENTE_CONCILIACION' ? '#B45309' : '#047857'}}>{item.estado || item.dniTitular}</span></td>
                              <td>{item.monto ? `$${item.monto}` : new Date(item.creadoEn || item.fechaPago || item.fechaInfraccion).toLocaleDateString('es-AR')}</td>
                              <td>
                                {vista !== 'admin_actas' ? (
                                  <button onClick={() => setItemModal(item)} className="btn btn--ghost btn--sm">Ver Detalles</button>
                                ) : (
                                  <button onClick={() => manejarEliminarActa(item.id)} className="btn btn--danger btn--sm" style={{padding: '6px 10px', fontSize: '12.5px'}}>Eliminar</button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {datosAdmin.length === 0 && (<tr><td colSpan={4} style={{textAlign: 'center', padding: '40px'}}>No hay registros.</td></tr>)}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </main>

      {itemModal && (
        <div className="modal-overlay" onClick={() => setItemModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 style={{marginBottom: '15px'}}>Auditoría de Expediente</h3>
            <div style={{background: 'var(--papel-alto)', padding: '15px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px'}}>
              <p><strong>Acta Asociada:</strong> {itemModal.infraccion?.nroActa}</p><p><strong>DNI Titular:</strong> {itemModal.infraccion?.dniTitular}</p>
              {vista === 'admin_descargos' && <p><strong>Motivo del Descargo:</strong> {itemModal.motivo}</p>}
              {vista === 'admin_pagos' && <p><strong>Monto Informado:</strong> ${itemModal.montoInformado}</p>}
            </div>
            <div style={{marginBottom: '20px'}}><a href={vista === 'admin_descargos' ? itemModal.archivosUrl?.[0] : itemModal.comprobanteUrl} target="_blank" rel="noreferrer" className="btn btn--ghost btn--block">Abrir Documento Adjunto (Nube)</a></div>
            {(itemModal.estado === 'PRESENTADO' || itemModal.estado === 'PENDIENTE_CONCILIACION') ? (
              <div style={{borderTop: '1px solid var(--linea)', paddingTop: '20px'}}>
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