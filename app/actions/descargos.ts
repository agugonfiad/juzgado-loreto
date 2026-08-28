"use server"

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function presentarDescargo(datos: {
  expedienteNro: string
  infraccionId: string
  motivo: string
  archivosUrl: string[]
}) {
  try {
    // 1. Crear el descargo
    const nuevoDescargo = await prisma.descargo.create({
      data: {
        ...datos,
        estado: 'PRESENTADO'
      }
    })
    
    // 2. Actualizar automáticamente la infracción para frenar los plazos
    await prisma.infraccion.update({
      where: { id: datos.infraccionId },
      data: { estado: 'EN_DESCARGO' }
    })

    return { success: true, data: nuevoDescargo }
  } catch (error) {
    return { success: false, error: 'Error al presentar el descargo' }
  }
}