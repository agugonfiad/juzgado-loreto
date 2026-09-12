import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 👇 CAMBIA ESTO POR TU CORREO REAL
  const miCorreo = "agustingonzalezfiad@outlook.com"; 
  
  const miNombre = "Agustín González Fiad";
  
  const password = await hash("Loreto2026", 10);
  
  const user = await prisma.usuario.upsert({
    where: { email: miCorreo },
    update: { activo: true, password: password, rol: "SUPERADMIN", nombre: miNombre },
    create: {
      nombre: miNombre,
      email: miCorreo,
      password: password,
      rol: "SUPERADMIN",
      activo: true
    }
  });
  
  console.log(`✅ Cuenta principal restaurada exitosamente: ${user.email} (SUPERADMIN)`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });