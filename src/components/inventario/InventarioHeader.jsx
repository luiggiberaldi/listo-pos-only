import React from 'react';
import { Search, Plus, History, ShieldAlert, Filter, ChevronDown, ChevronUp, X, FolderOpen, FileSpreadsheet, Printer, Settings, List, Download, Upload } from 'lucide-react';
import { ActionGuard } from '../../components/security/ActionGuard';
import { PERMISSIONS } from '../../config/permissions';

import ToolsMenu from './ToolsMenu';

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

  // [BUG-5 FIX] Solo "Todas" es el bypass de filtrado
  const isFiltering = filtroCategoria !== 'Todas';

  return (
    <div className="flex flex-col gap-4 mb-8 relative z-30">

      {/* FILA SUPERIOR: BUSCADOR Y CONTROLES PRINCIPALES */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">

        {/* BUSCADOR + TOGGLE CATEGORÍAS */}
        <div className="flex w-full lg:max-w-2xl gap-3">
          {/* Buscador */}
          <div className="relative flex-1 group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="text-content-secondary group-focus-within:text-primary transition-colors" size={20} />
            </div>
            <input
              type="text"
              placeholder="Buscar producto..."
              className="w-full pl-11 pr-4 py-3.5 bg-surface-light dark:bg-slate-800 border border-border-subtle dark:border-slate-700 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary shadow-sm transition-all text-sm font-medium"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
          </div>

          {/* Botón Trigger de Categorías */}
          <button
            onClick={() => setMostrarCategorias(!mostrarCategorias)}
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl border transition-all shadow-sm min-w-[180px] justify-between group ${mostrarCategorias || isFiltering ? 'bg-content-main text-white border-content-main dark:bg-primary dark:border-primary' : 'bg-surface-light text-content-main border-border-subtle hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <Filter size={18} className={mostrarCategorias || isFiltering ? 'text-primary-light dark:text-primary-light' : 'text-content-secondary group-hover:text-content-main'} />
              <span className="text-sm font-bold truncate max-w-[120px]">
                {filtroCategoria === 'Todas' ? 'Categorías' : filtroCategoria}
              </span>
            </div>
            {mostrarCategorias ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* BOTONES DE ACCIÓN (Derecha) */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">

          {/* 🛠️ MENÚ DE HERRAMIENTAS (Consolidado) */}
          <ToolsMenu
            onImportClick={onImportClick}
            onExportCatalog={onExportCatalog}
            onImportCatalog={onImportCatalog}
            onOpenLabelStudio={onOpenLabelStudio}
            onPrintAllClick={onPrintAllClick}
            onResetDatabase={handleBorrarTodo}
            selectedCount={selectedCount}
          />

          <ActionGuard permission={PERMISSIONS.INV_VER_KARDEX} onClick={() => setMostrarKardex(true)} actionName="Ver Historial (Kardex)">
            <button
              className="p-3.5 bg-surface-light dark:bg-slate-800 text-content-main dark:text-slate-300 hover:bg-app-light dark:hover:bg-slate-700 rounded-xl border border-border-subtle dark:border-slate-700 transition-all shadow-sm flex items-center gap-2"
              title="Historial de Movimientos"
            >
              <History size={20} />
              <span className="hidden sm:inline text-sm font-bold">Movimientos</span>
            </button>
          </ActionGuard>

          <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={abrirModalCrear} actionName="Crear Producto">
            <button
              className="bg-content-main hover:bg-black dark:bg-primary dark:hover:bg-primary/90 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-slate-200 dark:shadow-primary/20 flex items-center justify-center gap-2 transition-all transform active:scale-95 whitespace-nowrap"
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
        <div className="bg-surface-light dark:bg-slate-900 p-6 rounded-3xl border border-border-subtle dark:border-slate-700 shadow-xl shadow-slate-200/50 dark:shadow-none">

          <div className="flex justify-between items-center mb-4 border-b border-border-subtle/50 dark:border-slate-800 pb-2">
            <span className="text-xs font-bold text-content-secondary uppercase tracking-wider flex items-center gap-2">
              <FolderOpen size={14} /> Explorador de Categorías
            </span>

            <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={handleCrearCategoria} actionName="Crear Categoría">
              <button className="text-primary hover:text-primary/80 text-xs font-bold flex items-center gap-1 hover:underline">
                <Plus size={12} /> Crear Nueva
              </button>
            </ActionGuard>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {/* Botón "Todas" */}
            {/* ... (mantener igual) */}
            <button
              onClick={() => { setFiltroCategoria('Todas'); setMostrarCategorias(false); }}
              className={`px-4 py-3 rounded-xl text-xs font-bold transition-all border text-center ${filtroCategoria === 'Todas' ? 'bg-content-main text-white border-content-main shadow-md' : 'bg-app-light text-content-main border-border-subtle/50 hover:bg-surface-light hover:border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'}`}
            >
              Todas
            </button>

            {/* Grid de Categorías */}
            {categorias.map(cat => (
              <div key={cat} className="relative group">
                <button
                  onClick={() => { setFiltroCategoria(cat); setMostrarCategorias(false); }}
                  className={`w-full h-full px-4 py-3 rounded-xl text-xs font-bold transition-all border text-left flex items-center justify-between ${filtroCategoria === cat ? 'bg-primary-light text-primary border-primary/30 ring-1 ring-primary/20 dark:bg-primary/10 dark:text-primary-light dark:border-primary/30' : 'bg-surface-light text-content-main border-border-subtle hover:border-primary/30 hover:text-primary hover:shadow-sm dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'}`}
                >
                  <span className="truncate">{cat}</span>
                  {filtroCategoria === cat && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
                </button>

                {cat !== 'General' && cat !== 'Todas' && (
                  <ActionGuard permission={PERMISSIONS.INVENTORY_MANAGE} onClick={(e) => { e.stopPropagation(); handleEliminarCategoria(cat, e); }} actionName="Eliminar Categoría">
                    <button
                      className="absolute -top-1.5 -right-1.5 bg-surface-light dark:bg-slate-800 text-content-secondary hover:text-status-danger border border-border-subtle dark:border-slate-600 hover:border-red-200 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-sm z-10"
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