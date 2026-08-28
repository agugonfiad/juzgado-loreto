import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
const prisma = new PrismaClient()

export default async function GestionActas() {
  const actas = await prisma.infraccion.findMany({
    orderBy: { fechaInfraccion: 'desc' }
  })

  return (
    <div>
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Gestión de Actas</h1>
          <p className="text-gray-500 mt-1">Listado histórico de infracciones labradas</p>
        </div>
        <button className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded shadow-sm font-medium transition-colors">
          <Link href="/admin/actas/nueva" className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded shadow-sm font-medium transition-colors">
  + Cargar Nueva Acta
</Link>
        </button>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-slate-600 text-sm">
              <th className="p-4 font-semibold">N° Acta</th>
              <th className="p-4 font-semibold">Fecha</th>
              <th className="p-4 font-semibold">DNI Titular</th>
              <th className="p-4 font-semibold">Monto</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {actas.map((acta) => (
              <tr key={acta.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{acta.nroActa}</td>
                <td className="p-4 text-slate-600">{new Date(acta.fechaInfraccion).toLocaleDateString('es-AR')}</td>
                <td className="p-4 text-slate-600">{acta.dniTitular}</td>
                <td className="p-4 text-slate-900 font-medium">${acta.monto.toString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold tracking-wide ${
                    acta.estado === 'PENDIENTE' ? 'bg-amber-100 text-amber-800' :
                    acta.estado === 'EN_DESCARGO' ? 'bg-sky-100 text-sky-800' :
                    acta.estado === 'PAGADO' ? 'bg-emerald-100 text-emerald-800' :
                    'bg-slate-100 text-slate-800'
                  }`}>
                    {acta.estado}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-sky-600 hover:text-sky-800 text-sm font-medium hover:underline">Revisar</button>
                </td>
              </tr>
            ))}
            {actas.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500">No hay actas registradas en el sistema.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}