export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Menú Lateral */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold text-sky-400">Panel Interno</h2>
          <p className="text-sm text-slate-400 mt-1">Juzgado de Faltas</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <a href="/admin" className="block px-4 py-2 bg-slate-800 rounded text-sky-300 font-medium border-l-4 border-sky-500">Tablero Principal</a>
          <a href="/admin/actas" className="block px-4 py-2 hover:bg-slate-800 rounded transition-colors text-slate-300">Gestión de Actas</a>
          <a href="/admin/descargos" className="block px-4 py-2 hover:bg-slate-800 rounded transition-colors text-slate-300">Auditoría Descargos</a>
          <a href="/admin/pagos" className="block px-4 py-2 hover:bg-slate-800 rounded transition-colors text-slate-300">Conciliación BSE</a>
        </nav>
      </aside>

      {/* Contenido Dinámico */}
      <main className="flex-1 p-8">
        {children}
      </main>
    </div>
  )
}