"use server"

import { subirArchivo } from "./r2"
import { presentarDescargo } from "./descargos"
import { informarPago } from "./pagos"

export async function procesarTramiteCiudadano(formData: FormData) {
  const tipo = formData.get("tipo") as string
  const archivo = formData.get("archivo") as File
  const infraccionId = formData.get("infraccionId") as string

  if (!archivo || archivo.size === 0) {
    return { success: false, error: "Debe adjuntar un documento válido." }
  }

  try {
    // 1. Convertir y subir a Cloudflare R2
    const buffer = Buffer.from(await archivo.arrayBuffer())
    const nombreUnico = `${Date.now()}-${archivo.name.replace(/\s+/g, '_')}`
    
    const subida = await subirArchivo(buffer, nombreUnico, archivo.type)
    if (!subida.success || !subida.url) throw new Error("Fallo en la nube.")

    // 2. Registrar en la Base de Datos según el tipo de trámite
    if (tipo === 'descargo') {
      const expNro = `EXP-${Date.now().toString().slice(-6)}` // Genera ej: EXP-123456
      return await presentarDescargo({
        expedienteNro: expNro,
        infraccionId,
        motivo: formData.get("motivo") as string,
        archivosUrl: [subida.url]
      })
    } else {
      return await informarPago({
        infraccionId,
        comprobanteUrl: subida.url,
        montoInformado: Number(formData.get("monto"))
      })
    }
  } catch (error) {
    return { success: false, error: "Error al procesar el documento." }
  }
}