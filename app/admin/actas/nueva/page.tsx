"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { registrarInfraccion } from "../../../actions/actas"

export default function NuevaActaForm() {
  const router = useRouter()
  const [guardando, setGuardando] = useState(false)

  const manejarSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setGuardando(true)

    const formData = new FormData(e.currentTarget)
    
    const datos = {
      nroActa: formData.get("nroActa") as string,
      fechaInfraccion: new Date(formData.get("fechaInfraccion") as string),
      lugar: formData.get("lugar") as string,
      articulo: formData.get("articulo") as string,
      monto: Number(formData.get("monto")),
      patente: formData.get("patente") as string,
      dniTitular: formData.get("dniTitular") as string,
      nombreTitular: formData.get("nombreTitular") as string,
      inspector: formData.get("inspector") as string,
      plazoDescargo: new Date(formData.get("plazoDescargo") as string),
    }

    const respuesta = await registrarInfraccion(datos)

    if (respuesta.success) {
      router.push("/admin/actas")
      router.refresh()
    } else {
      alert("Error al guardar: " + respuesta.error)
      setGuardando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Labrar Nueva Infracción</h2>
      
      <form onSubmit={manejarSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">N° de Acta</label>
            <input name="nroActa" required className="w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Infracción</label>
            <input type="datetime-local" name="fechaInfraccion" required className="w-full border border-gray-300 rounded p-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DNI del Infractor</label>
            <input name="dniTitular" required className="w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input name="nombreTitular" required className="w-full border border-gray-300 rounded p-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar del Hecho</label>
            <input name="lugar" required className="w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Patente (Opcional)</label>
            <input name="patente" className="w-full border border-gray-300 rounded p-2" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Artículo Infringido</label>
            <input name="articulo" required className="w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monto ($)</label>
            <input type="number" name="monto" required className="w-full border border-gray-300 rounded p-2" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inspector Interviniente</label>
            <input name="inspector" required className="w-full border border-gray-300 rounded p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimiento Descargo</label>
            <input type="datetime-local" name="plazoDescargo" required className="w-full border border-gray-300 rounded p-2" />
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t mt-6">
          <button type="button" onClick={() => router.back()} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
          <button type="submit" disabled={guardando} className="bg-blue-800 hover:bg-blue-900 text-white px-6 py-2 rounded font-medium disabled:opacity-50">
            {guardando ? "Guardando..." : "Registrar Acta"}
          </button>
        </div>
      </form>
    </div>
  )
}