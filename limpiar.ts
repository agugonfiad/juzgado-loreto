import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.pago.deleteMany({})
  await prisma.descargo.deleteMany({})
  await prisma.infraccion.deleteMany({})
  console.log("✅ Sistema limpio. Listo para recibir las 576 actas.")
}
main()