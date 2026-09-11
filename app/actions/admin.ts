"use server"

import { hash, compare } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

const prisma = new PrismaClient()
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function inicializarSistema() { return { success: true } }

export async function iniciarSesion(email: string, pass: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { email } })
    if (!user || !user.activo) return { success: false, error: "Usuario inactivo o no encontrado." }

    let esValida = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      esValida = await compare(pass, user.password);
    } else {
      esValida = (pass === user.password);
    }

    if (!esValida) return { success: false, error: "Contraseña incorrecta." }

    return { 
      success: true, 
      usuario: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol } 
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function obtenerActasAdmin(filtroBusqueda?: string) {
  try {
    if (filtroBusqueda && filtroBusqueda.trim() !== "") {
      return await prisma.infraccion.findMany({
        where: {
          OR: [
            { nroActa: { contains: filtroBusqueda, mode: 'insensitive' } },
            { dniTitular: { contains: filtroBusqueda, mode: 'insensitive' } },
            { nombreTitular: { contains: filtroBusqueda, mode: 'insensitive' } }
          ]
        },
        orderBy: { creadoEn: 'desc' }
      });
    }
    return await prisma.infraccion.findMany({ orderBy: { creadoEn: 'desc' } })
  } catch (error) {
    return []
  }
}

export async function obtenerDescargosAdmin() {
  try {
    return await prisma.descargo.findMany({ include: { infraccion: true }, orderBy: { creadoEn: 'desc' } })
  } catch (error) { return [] }
}

export async function obtenerPagosAdmin() {
  try {
    return await prisma.pago.findMany({ include: { infraccion: true }, orderBy: { creadoEn: 'desc' } })
  } catch (error) { return [] }
}

export async function resolverDescargo(id: string, estado: string, resolucion: string) {
  try {
    const descargo = await prisma.descargo.findUnique({ where: { id }, include: { infraccion: true } });
    if (!descargo) return { success: false, error: "Expediente no encontrado." };

    await prisma.descargo.update({ where: { id }, data: { estado, resolucion, fechaResolucion: new Date() } });

    if (descargo.infraccionId) {
      const nuevoEstadoActa = estado === 'RESUELTO_A_FAVOR' ? 'SOBRESEIDO' : 'CONFIRMADO';
      await prisma.infraccion.update({ where: { id: descargo.infraccionId }, data: { estado: nuevoEstadoActa } });
    }

    if (resend && descargo.email) {
      const esFavor = estado === 'RESUELTO_A_FAVOR';
      await resend.emails.send({
        from: 'Juzgado de Faltas Loreto <onboarding@resend.dev>',
        to: descargo.email,
        subject: `Resolución de Expediente ${descargo.expedienteNro || 'Municipal'}`,
        html: `<div style="font-family: sans-serif; padding: 20px;"><h2>Juzgado de Faltas Municipal</h2><p>Se ha emitido resolución para su expediente. Ingrese al sistema para notificaciones.</p></div>`
      });
    }
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function conciliarPago(id: string, estado: string, usuarioNombre?: string) {
  try {
    const pago = await prisma.pago.update({
      where: { id },
      data: { estado, registradoPor: usuarioNombre || "S/D" }
    })

    if (pago.infraccionId) {
      if (estado === 'CONCILIADO') {
        await prisma.infraccion.update({ where: { id: pago.infraccionId }, data: { estado: 'PAGADO' } });
      } else if (estado === 'RECHAZADO') {
        await prisma.infraccion.update({ where: { id: pago.infraccionId }, data: { estado: 'PENDIENTE' } });
      }
    }
    return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function crearActa(data: any) {
  try { await prisma.infraccion.create({ data }); return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function editarActa(id: string, data: any) {
  try {
    const datosLimpios = { ...data };
    if (data.fechaInfraccion) {
      const fechaParseada = new Date(data.fechaInfraccion);
      if (!isNaN(fechaParseada.getTime())) datosLimpios.fechaInfraccion = fechaParseada;
    }
    await prisma.infraccion.update({ where: { id }, data: datosLimpios });
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function eliminarActa(id: string) {
  try {
    await prisma.descargo.deleteMany({ where: { infraccionId: id } });
    await prisma.pago.deleteMany({ where: { infraccionId: id } });
    await prisma.infraccion.delete({ where: { id } })
    return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function obtenerUsuariosAdmin() {
  try { return await prisma.usuario.findMany({ orderBy: { creadoEn: 'desc' } }) } catch (error) { return [] }
}

export async function crearUsuarioAdmin(data: { nombre: string, email: string, rol: string }) {
  try {
    const passwordHash = await hash("Loreto2026", 10);
    await prisma.usuario.create({
      data: { nombre: data.nombre, email: data.email, rol: data.rol as any, password: passwordHash, activo: true }
    })
    return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function toggleEstadoUsuario(id: string, estadoActual: boolean) {
  try { await prisma.usuario.update({ where: { id }, data: { activo: !estadoActual } }); return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function cambiarContrasena(email: string, actual: string, nueva: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { email } })
    if (!user) return { success: false, error: "Usuario no encontrado." }
    const esValida = user.password.startsWith('$') ? await compare(actual, user.password) : (actual === user.password);
    if (!esValida) return { success: false, error: "Clave incorrecta." }
    const nuevoHash = await hash(nueva, 10);
    await prisma.usuario.update({ where: { email }, data: { password: nuevoHash } })
    return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function blanquearClave(id: string) {
  try {
    const tempPass = "Loreto2026";
    const nuevoHash = await hash(tempPass, 10);
    await prisma.usuario.update({ where: { id }, data: { password: nuevoHash } })
    return { success: true, tempPass }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function eliminarUsuario(id: string) {
  try { await prisma.usuario.delete({ where: { id } }); return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function obtenerNoticiasAdmin() {
  try { return await prisma.noticia.findMany({ orderBy: { creadoEn: 'desc' } }) } catch (error) { return [] }
}

export async function eliminarNoticia(id: string) {
  try { await prisma.noticia.delete({ where: { id } }); return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

export async function registrarPagoManual(infraccionId: string, montoCobrado: number, usuarioNombre: string) {
  try {
    await prisma.pago.create({
      data: {
        infraccionId: infraccionId,
        montoInformado: montoCobrado,
        comprobanteUrl: "PAGO_PRESENCIAL_VENTANILLA",
        estado: "CONCILIADO",
        registradoPor: usuarioNombre
      }
    });

    await prisma.infraccion.update({ where: { id: infraccionId }, data: { estado: 'PAGADO' } });
    return { success: true };
  } catch (error: any) { return { success: false, error: error.message }; }
}

export async function desistirActa(id: string) {
  try {
    await prisma.infraccion.update({ where: { id }, data: { estado: 'DESISTIDO' } })
    return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}

// === TAREA 2: REPORTE DE RECAUDACIÓN EXACTA ===
export async function obtenerRecaudacionDiaria(fechaLocalString: string) {
  try {
    // Manejo de zona horaria: Construimos los límites UTC para el día en Argentina (GMT-3)
    const inicioDia = new Date(`${fechaLocalString}T00:00:00.000-03:00`);
    const finDia = new Date(`${fechaLocalString}T23:59:59.999-03:00`);

    const pagos = await prisma.pago.findMany({
      where: {
        estado: 'CONCILIADO', // Solo dinero efectivamente ingresado/aprobado
        creadoEn: {
          gte: inicioDia,
          lte: finDia
        }
      },
      include: { infraccion: true },
      orderBy: { creadoEn: 'asc' }
    });

    return { success: true, data: pagos };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}