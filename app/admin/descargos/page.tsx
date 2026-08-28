import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function BandejaDescargos() {
  const descargos = await prisma.descargo.findMany({
    orderBy: { creadoEn: 'desc' },
    include: { infraccion: true }
  })

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Auditoría de Descargos</h1>
        <p className="text-gray-500 mt-1">Bandeja de entrada de apelaciones presentadas por los ciudadanos</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-slate-600 text-sm">
              <th className="p-4 font-semibold">N° Expediente</th>
              <th className="p-4 font-semibold">Fecha Presentación</th>
              <th className="p-4 font-semibold">N° Acta</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {descargos.map((descargo) => (
              <tr key={descargo.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{descargo.expedienteNro}</td>
                <td className="p-4 text-slate-600">{new Date(descargo.creadoEn).toLocaleDateString('es-AR')}</td>
                <td className="p-4 text-slate-600">{descargo.infraccion.nroActa}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold tracking-wide ${
                    descargo.estado === 'PRESENTADO' ? 'bg-amber-100 text-amber-800' :
                    descargo.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {descargo.estado}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-sky-600 hover:text-sky-800 text-sm font-medium hover:underline">Auditar Documentación</button>
                </td>
              </tr>
            ))}
            {descargos.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No hay descargos pendientes de revisión en este momento.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}