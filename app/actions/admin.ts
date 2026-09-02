"use server"

import { hash, compare } from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { compare } from 'bcryptjs'

const prisma = new PrismaClient()

export async function verificarAcceso(password: string) {
  if (password === "JuzgadoLoreto2026") return { success: true }
  return { success: false, error: "Contraseña incorrecta" }
}

export async function obtenerActasAdmin() {
  return await prisma.infraccion.findMany({ orderBy: { fechaInfraccion: 'desc' } })
}

export async function obtenerDescargosAdmin() {
  return await prisma.descargo.findMany({ 
    include: { infraccion: true },
    orderBy: { creadoEn: 'desc' } 
  })
}

export async function obtenerPagosAdmin() {
  return await prisma.pago.findMany({ 
    include: { infraccion: true },
    orderBy: { id: 'desc' }
  })
}

export async function resolverDescargo(id: string, nuevoEstado: string, resolucionText: string) {
  try {
    const descargo = await prisma.descargo.update({
      where: { id },
      data: { estado: nuevoEstado, resolucion: resolucionText, fechaResolucion: new Date() }
    })
    
    if (nuevoEstado === 'RESUELTO_A_FAVOR') {
       await prisma.infraccion.update({
         where: { id: descargo.infraccionId },
         data: { estado: 'ANULADA' }
       })
    }
    return { success: true }
  } catch (error) { return { success: false, error: "Fallo al actualizar" } }
}

export async function conciliarPago(id: string, nuevoEstado: string) {
  try {
    const pago = await prisma.pago.update({
      where: { id },
      data: { estado: nuevoEstado }
    })

    if (nuevoEstado === 'CONCILIADO') {
       await prisma.infraccion.update({
         where: { id: pago.infraccionId },
         data: { estado: 'PAGADA' }
       })
    }
    return { success: true }
  } catch (error) { return { success: false, error: "Fallo al actualizar" } }
}

export async function crearActa(data: {
  nroActa: string
  nombreTitular: string
  dniTitular: string
  monto: number
  lugar?: string
  articulo?: string
  inspector?: string
  tipoInfraccion?: 'TRANSITO' | 'BROMATOLOGIA'
}) {
  try {
    const existe = await prisma.infraccion.findUnique({ where: { nroActa: data.nroActa } })
    if (existe) return { success: false, error: "El número de acta ya existe en el sistema." }

    const plazo = new Date()
    plazo.setDate(plazo.getDate() + 5)

    await prisma.infraccion.create({
      data: {
        nroActa: data.nroActa,
        nombreTitular: data.nombreTitular,
        dniTitular: data.dniTitular,
        monto: data.monto,
        lugar: data.lugar,
        articulo: data.articulo,
        inspector: data.inspector,
        tipoInfraccion: data.tipoInfraccion || 'TRANSITO',
        plazoDescargo: plazo,
        fechaInfraccion: new Date() // Solución al error de fecha faltante
      }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function eliminarActa(id: string) {
  try {
    await prisma.descargo.deleteMany({ where: { infraccionId: id } })
    await prisma.pago.deleteMany({ where: { infraccionId: id } })
    await prisma.infraccion.delete({ where: { id } })
    return { success: true }
  } catch (error: any) { 
    return { success: false, error: "Error al eliminar: " + error.message } 
  }
}export async function inicializarSistema() {
  try {
    const existe = await prisma.usuario.findUnique({ 
      where: { email: "agustingonzalezfiad@outlook.com" } 
    })
    
    if (existe) return { success: true, mensaje: "El administrador ya está configurado." }

    // La contraseña inicial será Loreto2026! (luego podrás cambiarla)
    const passwordEncriptada = await hash("Loreto2026!", 10)

    await prisma.usuario.create({
      data: {
        nombre: "Agustín González Fiad",
        email: "agustingonzalezfiad@outlook.com",
        password: passwordEncriptada,
        rol: "SUPERADMIN"
      }
    })
    
    return { success: true, mensaje: "Cuenta SuperAdmin creada con éxito." }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
export async function iniciarSesion(email: string, pass: string) {
  try {
    const user = await prisma.usuario.findUnique({ where: { email } })
    if (!user || !user.activo) return { success: false, error: "Usuario inactivo o no encontrado." }

    let esValida = false;
    // Sistema inteligente: si la clave ya está encriptada la compara con seguridad, si no, usa la vieja
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
}export async function obtenerUsuariosAdmin() {
  try {
    return await prisma.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true, activo: true, creadoEn: true },
      orderBy: { creadoEn: 'desc' }
    })
  } catch (error) {
    return []
  }
}

export async function crearUsuarioAdmin(data: { nombre: string, email: string, rol: string }) {
  try {
    const existe = await prisma.usuario.findUnique({ where: { email: data.email } })
    if (existe) return { success: false, error: "El correo ya está registrado." }

    // Encriptamos la clave temporal por defecto antes de enviarla a la base de datos
    const hashedPass = await hash("Loreto2026", 10)

    await prisma.usuario.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        rol: data.rol,
        password: hashedPass
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
      data: { activo: !estadoActual } // Si estaba activo lo apaga, y viceversa
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
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

    // Encriptamos la clave nueva que eligió el empleado
    const hashedNueva = await hash(passNueva, 10)

    await prisma.usuario.update({
      where: { email },
      data: { password: hashedNueva }
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function blanquearContrasena(id: string) {
  try {
    const claveTemporal = "Loreto2026";
    // Generamos un hash seguro para la clave temporal
    const hashedPass = await hash(claveTemporal, 10);
    await prisma.usuario.update({
      where: { id },
      data: { password: hashedPass }
    });
    return { success: true, tempPass: claveTemporal };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
}export async function obtenerNoticiasAdmin() {
  try {
    return await prisma.noticia.findMany({ orderBy: { creadoEn: 'desc' } })
  } catch (error) { return [] }
}

export async function eliminarNoticia(id: string) {
  try {
    await prisma.noticia.delete({ where: { id } })
    return { success: true }
  } catch (error: any) { return { success: false, error: error.message } }
}export async function eliminarUsuario(id: string) {
  try {
    await prisma.usuario.delete({ where: { id } })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}