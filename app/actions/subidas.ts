"use server"

import { PrismaClient } from '@prisma/client'
import { createClient } from '@supabase/supabase-js'

const globalForPrisma = global as unknown as { prisma: PrismaClient }
const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Conexión oficial al disco duro de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function procesarTramiteCiudadano(formData: FormData) {
  try {
    const infraccionId = formData.get('infraccionId') as string;
    const tipo = formData.get('tipo') as string;
    const archivo = formData.get('archivo') as File;

    if (!infraccionId || !tipo || !archivo) {
      return { success: false, error: "Faltan datos obligatorios." };
    }

    // === MAGIA NEXT.JS: Convertimos el archivo a Buffer para que Supabase lo entienda ===
    const extension = archivo.name.split('.').pop();
    const nombreUnico = `${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    
    // Traducimos el archivo a datos crudos
    const fileBuffer = await archivo.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('archivos')
      .upload(nombreUnico, fileBuffer, { // Enviamos el buffer en lugar del objeto File
        contentType: archivo.type,
        upsert: false
      });

    if (uploadError) throw new Error("Error al subir evidencia a la nube: " + uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from('archivos')
      .getPublicUrl(nombreUnico);

    const archivoUrl = publicUrlData.publicUrl;
    // ==========================================

    const infraccion = await prisma.infraccion.findUnique({ where: { id: infraccionId } });
    if (!infraccion) throw new Error("Acta de infracción no encontrada.");

    if (tipo === 'pago') {
      const monto = Number(formData.get('monto'));
      
      await prisma.pago.create({
        data: {
          infraccionId,
          montoInformado: monto,
          comprobanteUrl: archivoUrl,
          estado: 'PENDIENTE_CONCILIACION'
        }
      });

      await prisma.infraccion.update({
        where: { id: infraccionId },
        data: { estado: 'PENDIENTE_CONCILIACION' }
      });

      return { success: true };
    } 
    
    if (tipo === 'descargo') {
      const nombre = formData.get('nombre') as string;
      const email = formData.get('email') as string;
      const motivo = formData.get('motivo') as string;

      const fechaInfraccion = new Date(infraccion.fechaInfraccion);
      const hoy = new Date();
      const diasTranscurridos = Math.floor((hoy.getTime() - fechaInfraccion.getTime()) / (1000 * 60 * 60 * 24));
      const esExtemporaneo = diasTranscurridos > 5;

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
          archivosUrl: [archivoUrl], 
          estado: esExtemporaneo ? 'EXTEMPORANEO' : 'PRESENTADO',
          expedienteNro
        }
      });

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

    const extension = archivo.name.split('.').pop();
    const nombreUnico = `noticia-${Date.now()}-${Math.random().toString(36).substring(7)}.${extension}`;
    
    // Traducimos la imagen de la noticia también
    const fileBuffer = await archivo.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from('archivos')
      .upload(nombreUnico, fileBuffer, {
        contentType: archivo.type,
        upsert: false
      });

    if (uploadError) throw new Error("Error al subir imagen de noticia: " + uploadError.message);

    const { data: publicUrlData } = supabase.storage
      .from('archivos')
      .getPublicUrl(nombreUnico);

    const archivoUrl = publicUrlData.publicUrl;

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