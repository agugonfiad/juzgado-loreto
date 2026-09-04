"use server"

import { hash, compare } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'

const prisma = new PrismaClient()
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function inicializarSistema() {
  return { success: true }
}

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
    return await prisma.descargo.findMany({ 
      include: { infraccion: true },
      orderBy: { creadoEn: 'desc' } 
    })
  } catch (error) {
    return []
  }
}

export async function obtenerPagosAdmin() {
  try {
    return await prisma.pago.findMany({ 
      include: { infraccion: true },
      orderBy: { creadoEn: 'desc' } 
    })
  } catch (error) {
    return []
  }
}

export async function resolverDescargo(id: string, estado: string, resolucion: string) {
  try {
    const descargo = await prisma.descargo.findUnique({
      where: { id },
      include: { infraccion: true }
    });

    if (!descargo) return { success: false, error: "Expediente no encontrado." };

    await prisma.descargo.update({
      where: { id },
      data: {
        estado,
        resolucion,
        fechaResolucion: new Date(),
      }
    });

    // Sincronización automática del Acta Principal
    if (descargo.infraccionId) {
      const nuevoEstadoActa = estado === 'RESUELTO_A_FAVOR' ? 'SOBRESEIDO' : 'CONFIRMADO';
      await prisma.infraccion.update({
        where: { id: descargo.infraccionId },
        data: { estado: nuevoEstadoActa }
      });
    }

    if (resend && descargo.email) {
      const esFavor = estado === 'RESUELTO_A_FAVOR';
      const tituloFallo = esFavor ? 'SOBRESEIMIENTO / FALLO FAVORABLE' : 'CONFIRMACIÓN DE SANCIÓN';
      const colorBorde = esFavor ? '#10B981' : '#EF4444';

      await resend.emails.send({
        from: 'Juzgado de Faltas Loreto <onboarding@resend.dev>',
        to: descargo.email,
        subject: `Resolución de Expediente ${descargo.expedienteNro || 'Municipal'}`,
        html: `
          <div style="font-family: sans-serif; color: #212529; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 10px;">
            <h2 style="color: #0B4A82;">Juzgado de Faltas Municipal</h2>
            <p>Estimado/a <strong>${descargo.nombre || 'Vecino/a'}</strong>,</p>
            <p>Le informamos que se ha emitido resolución firme para su expediente N° <strong>${descargo.expedienteNro || 'S/N'}</strong> correspondiente al acta N° ${descargo.infraccion?.nroActa || 'General'}.</p>
            
            <div style="background: #F8F9FA; padding: 15px; border-left: 4px solid ${colorBorde}; margin: 20px 0;">
              <p style="margin: 0; color: ${colorBorde}; font-weight: bold; text-transform: uppercase;">${tituloFallo}</p>
              <p style="margin: 10px 0 0 0;"><strong>Dictamen del Juez:</strong></p>
              <p style="margin: 5px 0 0 0; font-style: italic; color: #495057;">"${resolucion}"</p>
            </div>
            <p>Puede verificar el estado actualizado de sus trámites ingresando con su DNI en nuestra plataforma digital oficial.</p>
            <hr style="border: none; border-top: 1px solid #DEE2E6; margin: 20px 0;" />
            <p style="font-size: 12px; color: #495057;">Este es un mensaje automático del sistema municipal. No responda a este correo.</p>
          </div>
        `
      });
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function conciliarPago(id: string, estado: string) {
  try {
    const pago = await prisma.pago.update({
      where: { id },
      data: { estado }
    })

    // Sincronización automática del Acta Principal
    if (pago.infraccionId) {
      if (estado === 'CONCILIADO') {
        await prisma.infraccion.update({
          where: { id: pago.infraccionId },
          data: { estado: 'PAGADO' }
        });
      } else if (estado === 'RECHAZADO') {
        await prisma.infraccion.update({
          where: { id: pago.infraccionId },
          data: { estado: 'PENDIENTE' }
        });
      }
    }

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function crearActa(data: any) {
  try {
    await prisma.infraccion.create({ data })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function editarActa(id: string, data: any) {
  try {
    const datosLimpios = { ...data };
    if (data.fechaInfraccion) {
      const fechaParseada = new Date(data.fechaInfraccion);
      if (!isNaN(fechaParseada.getTime())) {
        datosLimpios.fechaInfraccion = fechaParseada;
      }
    }
    await prisma.infraccion.update({ where: { id }, data: datosLimpios });
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function eliminarActa(id: string) {
  try {
    await prisma.infraccion.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function obtenerUsuariosAdmin() {
  try {
    return await prisma.usuario.findMany({ orderBy: { creadoEn: 'desc' } })
  } catch (error) {
    return []
  }
}

export async function crearUsuarioAdmin(data: { nombre: string, email: string, rol: string }) {
  try {
    const passwordTemp = "Loreto2026";
    const passwordHash = await hash(passwordTemp, 10);
    await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol as any,
        password: passwordHash,
        activo: true
      }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleEstadoUsuario(id: string, estadoActual: boolean) {
  try {
    await prisma.usuario.update({
      where: { id },
      data: { activo: !estadoActual }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cambiarContrasena(email: string, actual: string, nueva: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { email } })
    if (!user) return { success: false, error: "Usuario no encontrado." }

    let esValida = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      esValida = await compare(actual, user.password);
    } else {
      esValida = (actual === user.password);
    }

    if (!esValida) return { success: false, error: "La clave actual es incorrecta." }

    const nuevoHash = await hash(nueva, 10);
    await prisma.usuario.update({
      where: { email },
      data: { password: nuevoHash }
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function blanquearClave(id: string) {
  try {
    const tempPass = "Loreto2026";
    const nuevoHash = await hash(tempPass, 10);
    await prisma.usuario.update({
      where: { id },
      data: { password: nuevoHash }
    })
    return { success: true, tempPass }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function eliminarUsuario(id: string) {
  try {
    await prisma.usuario.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function obtenerNoticiasAdmin() {
  try {
    return await prisma.noticia.findMany({ orderBy: { creadoEn: 'desc' } })
  } catch (error) {
    return []
  }
}

export async function eliminarNoticia(id: string) {
  try {
    await prisma.noticia.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}