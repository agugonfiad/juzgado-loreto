import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando escaneo e importación masiva de actas...");
  
  // Leer el archivo CSV
  const rutaArchivo = path.join(process.cwd(), 'actas.csv');
  const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
  const lineas = contenido.split('\n');

  let importadas = 0;

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];
    const partes = linea.split(';');
    
    // Ignorar líneas vacías, con puros punto y coma, o la fila de encabezado
    if (partes.length < 5) continue;
    const actaFecha = partes[0].trim();
    if (!actaFecha || actaFecha.includes('ACTA DE INFRACCIÓN')) continue;

    try {
      const infractor = partes[1].trim();
      const dniRaw = partes[2].trim();
      const domicilio = partes[3].trim();
      const tipoMulta = partes[4].trim();

      // 1. Separar Nro Acta y Fecha (Ej: "181" y "19/02/25")
      const partesActa = actaFecha.split('-');
      const nroActa = partesActa[0].trim();
      const fechaStr = partesActa.length > 1 ? partesActa[1].trim() : '';

      // 2. Parsear Fecha al estándar del sistema
      let fechaInfraccion = new Date();
      if (fechaStr) {
        const fParts = fechaStr.split('/');
        if (fParts.length === 3) {
          const dia = parseInt(fParts[0], 10);
          const mes = parseInt(fParts[1], 10) - 1; // En JavaScript los meses van de 0 a 11
          let anio = parseInt(fParts[2], 10);
          if (anio < 100) anio += 2000; // Convierte el "25" a "2025"
          const d = new Date(anio, mes, dia, 12, 0, 0);
          if (!isNaN(d.getTime())) fechaInfraccion = d;
        }
      }

      // 3. Limpiar DNI (quitar los puntos de los miles y espacios)
      const dniTitular = dniRaw.replace(/\./g, '').replace(/\s/g, '');

      // 4. Mapeo de Artículos Inteligente (Lectura de la columna Tipo de Multa)
      let articulos: string[] = [];
      const textoBaja = tipoMulta.toLowerCase();
      
      if (textoBaja.includes('casco')) articulos.push('Art. 61.18');
      if (textoBaja.includes('espejo')) articulos.push('Art. 61.17');
      if (textoBaja.includes('documentacion') || textoBaja.includes('documentación')) articulos.push('Art. 61.a');
      
      // Si reconoció alguno, los une con coma (Ej: "Art. 61.18, Art. 61.a"). Si no, pone el texto original.
      const articuloFinal = articulos.length > 0 ? articulos.join(', ') : tipoMulta;

      // 5. Inyectar silenciosamente a la Base de Datos (Supabase)
      await prisma.infraccion.create({
        data: {
          nroActa: nroActa,
          nombreTitular: infractor || "S/D",
          dniTitular: dniTitular || "S/D",
          monto: 0, // Las dejamos en 0 por defecto ya que el Excel no traía montos definidos
          lugar: domicilio || "No informado",
          articulo: articuloFinal,
          inspector: "Carga Histórica Automática",
          tipoInfraccion: "TRANSITO", // Todo este lote corresponde a tránsito
          fechaInfraccion: fechaInfraccion,
          estado: "PENDIENTE"
        }
      });

      importadas++;
      console.log(`✅ Acta N° ${nroActa} de ${infractor} importada correctamente.`);
    } catch (err: any) {
      console.error(`❌ Error en la fila ${i + 1}: ${err.message}`);
    }
  }

  console.log(`\n🎉 ¡Finalizado! Se inyectaron ${importadas} actas en Supabase/Vercel de manera exitosa.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });