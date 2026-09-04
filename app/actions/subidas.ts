"use server"

import { PrismaClient } from '@prisma/client'
import { Resend } from 'resend'
import { put } from '@vercel/blob'

const prisma = new PrismaClient()

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;

export async function procesarTramiteCiudadano(formData: FormData) {
  try {
    const infraccionId = formData.get('infraccionId') as string
    const tipo = formData.get('tipo') as string
    const archivo = formData.get('archivo') as File

    const infraccion = await prisma.infraccion.findUnique({ where: { id: infraccionId } })
    if (!infraccion) return { success: false, error: "Acta no encontrada en el sistema." }

    let urlArchivo = ""
    if (archivo && archivo.size > 0) {
      const blob = await put(archivo.name, archivo, { 
        access: 'public',
        addRandomSuffix: true
      })
      urlArchivo = blob.url
    } else {
      return { success: false, error: "Debe adjuntar un documento válido." }
    }

    if (tipo === 'descargo') {
      const motivo = formData.get('motivo') as string
      const nombre = formData.get('nombre') as string
      const email = formData.get('email') as string

      // === CORRECCIÓN AQUÍ: Evitamos el choque si la fecha está vacía ===
      const fechaInfraccion = infraccion.fechaInfraccion ? new Date(infraccion.fechaInfraccion) : new Date();
      const hoy = new Date();
      const diasTranscurridos = Math.floor((hoy.getTime() - fechaInfraccion.getTime()) / (1000 * 60 * 60 * 24));
      const esExtemporaneo = diasTranscurridos > 5;
      
      const estadoDescargo = esExtemporaneo ? 'EXTEMPORANEO' : 'PRESENTADO'

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

      const textoEstructurado = `TITULAR: ${nombre}\nEMAIL: ${email}\n\nDEFENSA:\n${motivo}`

      await prisma.descargo.create({
        data: {
          infraccionId,
          motivo: textoEstructurado,
          archivosUrl: [urlArchivo], 
          estado: estadoDescargo,
          expedienteNro: expedienteNro,
          nombre: nombre,
          email: email
        }
      })
      
      if (resend && email) {
        await resend.emails.send({
          from: 'Juzgado de Faltas Loreto <onboarding@resend.dev>',
          to: email,
          subject: `Confirmación de Descargo - Expediente ${expedienteNro}`,
          html: `
            <div style="font-family: sans-serif; color: #212529; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #DEE2E6; border-radius: 10px;">
              <h2 style="color: #0B4A82;">Juzgado de Faltas Municipal</h2>
              <p>Estimado/a <strong>${nombre}</strong>,</p>
              <p>Hemos recibido formalmente su presentación de descargo para el acta N° ${infraccion.nroActa}.</p>
              <div style="background: #F8F9FA; padding: 15px; border-left: 4px solid #00B2D6; margin: 20px 0;">
                <p style="margin: 0;"><strong>Número de Expediente:</strong> ${expedienteNro}</p>
                <p style="margin: 5px 0 0 0;"><strong>Estado de presentación:</strong> ${esExtemporaneo ? 'Fuera de término' : 'En término'}</p>
              </div>
              <p>La documentación adjunta será evaluada por el Juzgado. Se le notificará la resolución final por este mismo medio.</p>
              <hr style="border: none; border-top: 1px solid #DEE2E6; margin: 20px 0;" />
              <p style="font-size: 12px; color: #495057;">Este es un mensaje automático del sistema municipal. No responda a este correo.</p>
            </div>
          `
        });
      }

      return { success: true, expedienteNro, esExtemporaneo }
    }

    if (tipo === 'pago') {
      const monto = Number(formData.get('monto'))
      await prisma.pago.create({
        data: {
          infraccionId,
          montoInformado: monto,
          comprobanteUrl: urlArchivo,
          estado: 'PENDIENTE_CONCILIACION'
        }
      })
      await prisma.infraccion.update({
        where: { id: infraccionId },
        data: { estado: 'PENDIENTE_CONCILIACION' }
      })
      return { success: true }
    }

    return { success: false, error: "Tipo de trámite inválido" }
  } catch (error: any) {
    return { success: false, error: "Error interno al procesar el trámite: " + error.message }
  }
}

export async function procesarNoticia(formData: FormData) {
  try {
    const titulo = formData.get('titulo') as string
    const contenido = formData.get('contenido') as string 
    const archivo = formData.get('archivo') as File

    if (!archivo || archivo.size === 0) return { success: false, error: "Debe adjuntar una imagen." }
    
    const blob = await put(archivo.name, archivo, { access: 'public', addRandomSuffix: true })
    
    await prisma.noticia.create({
      data: { titulo, contenido, imagenUrl: blob.url } 
    })
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}