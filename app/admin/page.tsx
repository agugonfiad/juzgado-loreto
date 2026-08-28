import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function AdminDashboard() {
  const totalActas = await prisma.infraccion.count()
  const descargosPendientes = await prisma.descargo.count({ where: { estado: 'PRESENTADO' } })
  const pagosAConciliar = await prisma.pago.count({ where: { estado: 'PENDIENTE_CONCILIACION' } })

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Mesa de Entradas Virtual</h1>
        <p className="text-gray-500 mt-1">Resumen operativo del sistema</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-blue-600">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Actas Registradas</h3>
          <p className="text-4xl font-bold text-gray-800 mt-2">{totalActas}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-amber-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Descargos a Revisar</h3>
          <p className="text-4xl font-bold text-gray-800 mt-2">{descargosPendientes}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-t-4 border-t-emerald-500">
          <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Transferencias BSE</h3>
          <p className="text-4xl font-bold text-gray-800 mt-2">{pagosAConciliar}</p>
        </div>
      </div>
    </div>
  )
}