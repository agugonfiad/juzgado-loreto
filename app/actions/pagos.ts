"use server"

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function informarPago(datos: {
  infraccionId: string
  comprobanteUrl: string
  montoInformado: number
}) {
  try {
    const nuevoPago = await prisma.pago.create({
      data: {
        ...datos,
        estado: 'PENDIENTE_CONCILIACION'
      }
    })
    return { success: true, data: nuevoPago }
  } catch (error) {
    return { success: false, error: 'Error al informar el pago' }
  }
}