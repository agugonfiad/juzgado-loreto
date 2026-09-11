import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = "admin@loreto.gob.ar";
  const password = await hash("Loreto2026", 10);
  
  const user = await prisma.usuario.upsert({
    where: { email: email },
    update: { activo: true, password: password, rol: "SUPERADMIN" },
    create: {
      nombre: "Administrador General",
      email: email,
      password: password,
      rol: "SUPERADMIN",
      activo: true
    }
  });
  console.log(`✅ Usuario maestro asegurado: ${user.email}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });