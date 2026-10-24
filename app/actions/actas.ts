"use server"

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function registrarInfraccion(datos: {
  nroActa: string
  fechaInfraccion: Date
  lugar: string
  articulo: string
  monto: number
  patente?: string
  dniTitular: string
  nombreTitular: string
  inspector: string
  plazoDescargo: Date
}) {
  try {
    const nuevaActa = await prisma.infraccion.create({
      data: {
        ...datos,
        estado: 'PENDIENTE',
      }
    })
    return { success: true, data: nuevaActa }
  } catch (error) {
    return { success: false, error: 'Error al registrar el acta' }
  }
}

export async function buscarInfraccionPorDni(dni: string, genero: string) {
  try {
    const actas = await prisma.infraccion.findMany({
      where: { 
        dniTitular: dni,
        generoTitular: genero // <-- DOBLE FACTOR DE SEGURIDAD
      },
      orderBy: { creadoEn: 'desc' }
    });
    return { success: true, data: actas };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
