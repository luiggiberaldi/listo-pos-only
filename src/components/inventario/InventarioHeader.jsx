import React from 'react';
import { Search, Plus, History, ShieldAlert, Filter, ChevronDown, ChevronUp, X, FolderOpen, FileSpreadsheet, Printer, Settings, List, Download, Upload } from 'lucide-react';
import { ActionGuard } from '../../components/security/ActionGuard';
import { PERMISSIONS } from '../../config/permissions';

export default function InventarioHeader({
  busqueda, setBusqueda,
  filtroCategoria, setFiltroCategoria,
  mostrarCategorias, setMostrarCategorias,
  categorias,
  handleCrearCategoria,
  handleEliminarCategoria,
  handleBorrarTodo,
  setMostrarKardex,
  abrirModalCrear,
  tieneProductos,
  // 🆕
  onImportClick,
  onPrintAllClick,
  onOpenLabelStudio,
  onExportCatalog,
  onImportCatalog,
  selectedCount = 0
}) {

  const isFiltering = filtroCategoria !== 'Todas' && filtroCategoria !== 'General';

  return (
    <div className="flex flex-col gap-4 mb-8 relative z-30">

      {/* FILA SUPERIOR: BUSCADOR Y CONTROLES PRINCIPALES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

        {/* BUSCADOR + TOGGLE CATEGORÍAS */}
        <div className="flex w-full lg:max-w-2xl gap-3">
          {/* Buscador */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar producto..."
              className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition-all text-sm font-medium"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {/* Botón Trigger de Categorías */}
          <button
            onClick={() => setMostrarCategorias(!mostrarCategorias)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all shadow-sm min-w-[180px] justify-between group ${mostrarCategorias || isFiltering ? 'bg-slate-800 text-white border-slate-800 dark:bg-blue-600 dark:border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Filter size={18} className={mostrarCategorias || isFiltering ? 'text-blue-400 dark:text-blue-200' : 'text-slate-400 group-hover:text-slate-600'} />
              <span className="text-sm font-bold truncate max-w-[120px]">
                {filtroCategoria === 'Todas' ? 'Categorías' : filtroCategoria}
              </span>
            </div>
            {mostrarCategorias ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* BOTONES DE ACCIÓN (Derecha) */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">

          {tieneProductos && (
            <>
              {/* 🆕 IMPRIMIR ETIQUETAS */}
              <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-1">
                {/* STUDIO CONFIG */}
                <button
                  onClick={onOpenLabelStudio}
                  className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                  title="Configurar Etiquetas (Label Studio)"
                >
                  <Settings size={20} />
                </button>

                <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>

                {/* ACTION PRINT (LISTS) */}
                <button
                  onClick={onPrintAllClick} // Ahora abre el modal de listas
                  className={`p-2.5 rounded-lg transition-all flex items-center gap-2 ${selectedCount > 0 ? 'text-indigo-600 font-bold bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-600 dark:text-slate-300 hover:text-indigo-600'}`}
                  title={selectedCount > 0 ? `Gestor de Impresión (${selectedCount})` : "Listas de Impresión"}
                >
                  {selectedCount > 0 ? <Plus size={20} /> : <List size={20} />}
                  <span className="text-xs font-bold">{selectedCount > 0 ? 'Crear Lista' : 'Listas'}</span>
                </button>
              </div>

              <ActionGuard permission={PERMISSIONS.SETTINGS_DB_RESET} onClick={handleBorrarTodo} actionName="Vaciado de Emergencia">
                <button
                  className="p-3.5 bg-white dark:bg-slate-800 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-red-200 transition-all shadow-sm"
                  title="Vaciado de Emergencia"
                >
                  <ShieldAlert size={20} />
                </button>
              </ActionGuard>
            </>
          )}

          {/* 🆕 IMPORTAR EXCEL */}
          <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={onImportClick} actionName="Importar Masivo">
            <button
              className="p-3.5 bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-emerald-200 transition-all shadow-sm flex items-center gap-2"
              title="Importar Excel"
            >
              <FileSpreadsheet size={20} />
              <span className="hidden sm:inline text-sm font-bold">Importar</span>
            </button>
          </ActionGuard>

          {/* 📦 CATÁLOGO: EXPORTAR / IMPORTAR */}
          <div className="flex items-center gap-1 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-1">
            <button
              onClick={onExportCatalog}
              className="p-2.5 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all flex items-center gap-1.5"
              title="Exportar Catálogo (JSON) — para copiar a otra PC"
            >
              <Download size={18} />
              <span className="hidden lg:inline text-xs font-bold">Exportar</span>
            </button>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            <button
              onClick={onImportCatalog}
              className="p-2.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-all flex items-center gap-1.5"
              title="Importar Catálogo (JSON) — desde otra PC"
            >
              <Upload size={18} />
              <span className="hidden lg:inline text-xs font-bold">Importar</span>
            </button>
          </div>

          <button
            onClick={() => typeof setMostrarKardex === 'function' && setMostrarKardex(true)}
            className="p-3.5 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-700 transition-all shadow-sm flex items-center gap-2"
            title="Historial de Movimientos"
          >
            <History size={20} />
            <span className="hidden sm:inline text-sm font-bold">Movimientos</span>
          </button>

          <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={abrirModalCrear} actionName="Crear Producto">
            <button
              className="bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-slate-200 dark:shadow-blue-900/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 whitespace-nowrap"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">Nuevo Producto</span>
              <span className="inline sm:hidden">Nuevo</span>
            </button>
          </ActionGuard>
        </div>
      </div>

      {/* PANEL DESPLEGABLE (GRID) */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${mostrarCategorias ? 'max-h-[500px] opacity-100 mt-2' : 'max-h-0 opacity-0 mt-0'}`}>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">

          <div className="flex justify-between items-center mb-4 border-b border-slate-100 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={14} /> Explorador de Categorías
            </span>

            <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={handleCrearCategoria} actionName="Crear Categoría">
              <button className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1 hover:underline">
                <Plus size={12} /> Crear Nueva
              </button>
            </ActionGuard>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Botón "Todas" */}
            {/* ... (mantener igual) */}
            <button
              onClick={() => { setFiltroCategoria('Todas'); setMostrarCategorias(false); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border text-center ${filtroCategoria === 'Todas' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-white hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
            >
              Todas
            </button>

            {/* Grid de Categorías */}
            {categorias.map(cat => (
              <div key={cat} className="relative group">
                <button
                  onClick={() => { setFiltroCategoria(cat); setMostrarCategorias(false); }}
                  className={`w-full h-full px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${filtroCategoria === cat ? 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                >
                  <span className="truncate">{cat}</span>
                  {filtroCategoria === cat && <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>}
                </button>

                {cat !== 'General' && cat !== 'Todas' && (
                  <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={(e) => { e.stopPropagation(); handleEliminarCategoria(cat, e); }} actionName="Eliminar Categoría">
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-white dark:bg-slate-800 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-slate-600 hover:border-red-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
                      title="Eliminar Categoría"
                    >
                      <X size={10} strokeWidth={3} />
                    </button>
                  </ActionGuard>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}