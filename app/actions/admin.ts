"use server"

import { PrismaClient } from '@prisma/client'

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

export async function crearActa(datos: { nroActa: string, nombreTitular: string, dniTitular: string, monto: number, lugar: string, articulo: string }) {
  try {
    await prisma.infraccion.create({
      data: {
        nroActa: datos.nroActa,
        nombreTitular: datos.nombreTitular,
        dniTitular: datos.dniTitular,
        monto: datos.monto,
        lugar: datos.lugar,
        articulo: datos.articulo,
        estado: 'PENDIENTE',
        fechaInfraccion: new Date() 
      }
    })
    return { success: true }
  } catch (error: any) { 
    return { success: false, error: "Error al crear: " + error.message } 
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
}