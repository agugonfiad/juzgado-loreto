"use server"

import { PrismaClient } from '@prisma/client'

// Aseguramos una única conexión a la base de datos para que no colapse
const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function procesarTramiteCiudadano(formData: FormData) {
  try {
    const infraccionId = formData.get('infraccionId') as string;
    const tipo = formData.get('tipo') as string;
    const archivo = formData.get('archivo') as File;

    if (!infraccionId || !tipo || !archivo) {
      return { success: false, error: "Faltan datos obligatorios." };
    }

    // === MAGIA ANTI-VERCEL: Convertimos el archivo a texto (Base64) para guardarlo en Supabase ===
    const buffer = await archivo.arrayBuffer();
    const base64Archivo = Buffer.from(buffer).toString('base64');
    const mimeType = archivo.type;
    const archivoUrl = `data:${mimeType};base64,${base64Archivo}`;

    // Verificamos que el acta realmente exista en la base de datos
    const infraccion = await prisma.infraccion.findUnique({ where: { id: infraccionId } });
    if (!infraccion) throw new Error("Acta de infracción no encontrada.");

    // === 1. SI EL CIUDADANO ESTÁ INFORMANDO UN PAGO ===
    if (tipo === 'pago') {
      const monto = Number(formData.get('monto'));
      
      await prisma.pago.create({
        data: {
          infraccionId,
          montoInformado: monto,
          comprobanteUrl: archivoUrl, // Acá guardamos la imagen convertida en código
          estado: 'PENDIENTE_CONCILIACION'
        }
      });

      // Actualizamos el estado del acta principal
      await prisma.infraccion.update({
        where: { id: infraccionId },
        data: { estado: 'PENDIENTE_CONCILIACION' }
      });

      return { success: true };
    } 
    
    // === 2. SI EL CIUDADANO ESTÁ PRESENTANDO UN DESCARGO LEGAL ===
    if (tipo === 'descargo') {
      const nombre = formData.get('nombre') as string;
      const email = formData.get('email') as string;
      const motivo = formData.get('motivo') as string;

      const fechaInfraccion = new Date(infraccion.fechaInfraccion);
      const hoy = new Date();
      const diasTranscurridos = Math.floor((hoy.getTime() - fechaInfraccion.getTime()) / (1000 * 60 * 60 * 24));
      const esExtemporaneo = diasTranscurridos > 5;

      // --- MOTOR DE EXPEDIENTE SECUENCIAL ---
      const anioActual = hoy.getFullYear();
      
      const cantidadDescargos = await prisma.descargo.count({
        where: {
          creadoEn: {
            gte: new Date(`${anioActual}-01-01T00:00:00.000Z`),
            lt: new Date(`${anioActual + 1}-01-01T00:00:00.000Z`)
          }
        }
      });
      
      const expedienteNro = `${String(cantidadDescargos + 1).padStart(4, '0')}-${anioActual}`;

      await prisma.descargo.create({
        data: {
          infraccionId,
          nombre,
          email,
          motivo,
          archivosUrl: [archivoUrl], // Guardamos el PDF/Imagen convertido en código
          estado: esExtemporaneo ? 'EXTEMPORANEO' : 'PRESENTADO',
          expedienteNro
        }
      });

      // Actualizamos el estado del acta principal
      await prisma.infraccion.update({
        where: { id: infraccionId },
        data: { estado: 'PRESENTADO' }
      });

      return { success: true, expedienteNro, esExtemporaneo };
    }

    return { success: false, error: "El tipo de trámite seleccionado es inválido." };

  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function procesarNoticia(formData: FormData) {
  try {
    const titulo = formData.get('titulo') as string;
    const contenido = formData.get('contenido') as string;
    const archivo = formData.get('archivo') as File;

    if (!titulo || !archivo) return { success: false, error: "Faltan datos obligatorios para publicar la noticia." };

    // Lo mismo para las Noticias: Convertimos a código Base64
    const buffer = await archivo.arrayBuffer();
    const base64Archivo = Buffer.from(buffer).toString('base64');
    const mimeType = archivo.type;
    const archivoUrl = `data:${mimeType};base64,${base64Archivo}`;

    await prisma.noticia.create({
      data: {
        titulo,
        contenido,
        imagenUrl: archivoUrl
      }
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}