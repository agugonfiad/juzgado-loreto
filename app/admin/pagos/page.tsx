import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function ConciliacionBSE() {
  const pagos = await prisma.pago.findMany({
    include: { infraccion: true } // Traemos los datos del acta asociada
  })

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Conciliación BSE</h1>
        <p className="text-gray-500 mt-1">Auditoría de transferencias y comprobantes de pago</p>
      </header>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-200 text-slate-600 text-sm">
              <th className="p-4 font-semibold">N° Acta</th>
              <th className="p-4 font-semibold">DNI Infractor</th>
              <th className="p-4 font-semibold">Monto Transferido</th>
              <th className="p-4 font-semibold">Estado</th>
              <th className="p-4 font-semibold text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pagos.map((pago) => (
              <tr key={pago.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 font-medium text-slate-900">{pago.infraccion.nroActa}</td>
                <td className="p-4 text-slate-600">{pago.infraccion.dniTitular}</td>
                <td className="p-4 text-slate-900 font-medium">${pago.montoInformado.toString()}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-semibold tracking-wide ${
                    pago.estado === 'PENDIENTE_CONCILIACION' ? 'bg-amber-100 text-amber-800' :
                    pago.estado === 'RECHAZADO' ? 'bg-red-100 text-red-800' :
                    'bg-emerald-100 text-emerald-800'
                  }`}>
                    {pago.estado}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="text-sky-600 hover:text-sky-800 text-sm font-medium hover:underline">Ver Comprobante</button>
                </td>
              </tr>
            ))}
            {pagos.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No hay transferencias pendientes de revisión.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}