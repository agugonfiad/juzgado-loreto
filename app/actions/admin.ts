"use server"

import { hash, compare } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function inicializarSistema() {
  return { success: true }
}

export async function iniciarSesion(email: string, pass: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { email } })
    if (!user || !user.activo) return { success: false, error: "Usuario inactivo o no encontrado." }

    let esValida = false;
    if (user.password.startsWith('$2a$')) {
      esValida = await compare(pass, user.password);
    } else {
      esValida = (pass === user.password);
    }

    if (!esValida) return { success: false, error: "Contraseña incorrecta." }
    return { success: true, usuario: { id: user.id, nombre: user.nombre, rol: user.rol, email: user.email } }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function obtenerActasAdmin() {
  return await prisma.infraccion.findMany({ orderBy: { creadoEn: 'desc' } })
}

export async function obtenerDescargosAdmin() {
  return await prisma.descargo.findMany({ include: { infraccion: true }, orderBy: { creadoEn: 'desc' } })
}

export async function obtenerPagosAdmin() {
  return await prisma.pago.findMany({ include: { infraccion: true }, orderBy: { fechaPago: 'desc' } })
}

export async function resolverDescargo(id: string, estado: string, resolucion: string) {
  try {
    await prisma.descargo.update({ where: { id }, data: { estado, resolucion } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function conciliarPago(id: string, estado: string) {
  try {
    await prisma.pago.update({ where: { id }, data: { estado } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function crearActa(data: any) {
  try {
    let fechaSegura = new Date();
    
    if (data.fechaInfraccion) {
      const fechaParseada = new Date(data.fechaInfraccion);
      if (!isNaN(fechaParseada.getTime())) {
        fechaSegura = fechaParseada;
      }
    }

    const datosLimpios = { 
      ...data, 
      fechaInfraccion: fechaSegura, 
      estado: 'PENDIENTE' 
    };

    await prisma.infraccion.create({ data: datosLimpios })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
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
  return await prisma.usuario.findMany({
    select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
    orderBy: { creadoEn: 'desc' }
  })
}

export async function crearUsuarioAdmin(data: { nombre: string, email: string, rol: string }) {
  try {
    const existe = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existe) return { success: false, error: "El correo ya está registrado." }

    const hashedPass = await hash("Loreto2026", 10)

    await prisma.usuario.create({
      data: { nombre: data.nombre, email: data.email, rol: data.rol, password: hashedPass }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function toggleEstadoUsuario(id: string, estadoActual: boolean) {
  try {
    await prisma.usuario.update({ where: { id }, data: { activo: !estadoActual } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function cambiarContrasena(email: string, passActual: string, passNueva: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { email } })
    if (!user) return { success: false, error: "Usuario no encontrado." }

    let esValida = false;
    if (user.password.startsWith('$2a$')) {
      esValida = await compare(passActual, user.password);
    } else {
      esValida = (passActual === user.password);
    }

    if (!esValida) return { success: false, error: "La contraseña actual es incorrecta." }

    const hashedNueva = await hash(passNueva, 10)

    await prisma.usuario.update({ where: { email }, data: { password: hashedNueva } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function blanquearContrasena(id: string) {
  try {
    const claveTemporal = "Loreto2026";
    const hashedPass = await hash(claveTemporal, 10);
    await prisma.usuario.update({ where: { id }, data: { password: hashedPass } });
    return { success: true, tempPass: claveTemporal };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function obtenerNoticiasAdmin() {
  return await prisma.noticia.findMany({ orderBy: { creadoEn: 'desc' } })
}

export async function eliminarNoticia(id: string) {
  try {
    await prisma.noticia.delete({ where: { id } })
    return { success: true }
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