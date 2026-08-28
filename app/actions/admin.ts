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

// NUEVO: Funciones para resolver expedientes
export async function resolverDescargo(id: string, nuevoEstado: string, resolucionText: string) {
  try {
    const descargo = await prisma.descargo.update({
      where: { id },
      data: { estado: nuevoEstado, resolucion: resolucionText, fechaResolucion: new Date() }
    })
    
    // Si el juez falla a favor, anulamos el acta original
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

    // Si el pago es válido, marcamos el acta como pagada
    if (nuevoEstado === 'CONCILIADO') {
       await prisma.infraccion.update({
         where: { id: pago.infraccionId },
         data: { estado: 'PAGADA' }
       })
    }
    return { success: true }
  } catch (error) { return { success: false, error: "Fallo al actualizar" } }
}