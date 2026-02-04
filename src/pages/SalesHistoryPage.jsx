// ✅ SYSTEM IMPLEMENTATION - V. 1.0 (SALES HISTORY ENGINE)
// Archivo: src/pages/SalesHistoryPage.jsx
// Objetivo: Historial Global de Ventas con Paginación, Filtros Avanzados y Reimpresión.

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Calendar, Filter, ChevronLeft, ChevronRight,
  FileText, ArrowUpRight, Ban, CheckCircle, Printer
} from 'lucide-react';
import { db } from '../db'; // Acceso directo a Dexie
import ModalDetalleVenta from '../components/ventas/ModalDetalleVenta';
import { useStore } from '../context/StoreContext';
import { timeProvider } from '../utils/TimeProvider';

export default function SalesHistoryPage() {
  const { configuracion } = useStore();

  // --- ESTADOS ---
  const [ventas, setVentas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Paginación
  const [pagina, setPagina] = useState(0);
  const [itemsPorPagina, setItemsPorPagina] = useState(20);
  const [totalRegistros, setTotalRegistros] = useState(0);

  // Filtros
  // Función auxiliar para obtener fecha local YYYY-MM-DD
  const getTodayLocal = () => {
    const d = timeProvider.now();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [filtroFechaDesde, setFiltroFechaDesde] = useState(getTodayLocal());
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(getTodayLocal());
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('TODOS'); // TODOS, APROBADA, ANULADA

  // Modal
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [expandedRows, setExpandedRows] = useState([]);

  const toggleRow = (id) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // --- MOTOR DE BÚSQUEDA (DEXIE) ---
  const fetchVentas = useCallback(async () => {
    // ... (código existente de fechas) ...
    setCargando(true);
    try {
      // 1. Definir rango de tiempo (Inicio del día Desde -> Fin del día Hasta)
      const [yearStart, monthStart, dayStart] = filtroFechaDesde.split('-').map(Number);
      const start = new Date(yearStart, monthStart - 1, dayStart, 0, 0, 0, 0);

      const [yearEnd, monthEnd, dayEnd] = filtroFechaHasta.split('-').map(Number);
      const end = new Date(yearEnd, monthEnd - 1, dayEnd, 23, 59, 59, 999);

      // 2. Crear Colección Base (Por fecha es lo más rápido)
      let coleccion = db.ventas
        .where('fecha')
        .between(start.toISOString(), end.toISOString(), true, true)
        .reverse();

      // console.log(`🔎 [HISTORY] Buscando ventas entre ${start.toISOString()} y ${end.toISOString()}`);

      // 3. Aplicar Filtros en Memoria (Dexie Filter)
      const coleccionFiltrada = coleccion.filter(v => {
        // A. Filtro de Estado
        if (filtroEstado !== 'TODOS') {
          if (filtroEstado === 'ANULADA' && v.status !== 'ANULADA') return false;
          if (filtroEstado === 'APROBADA' && v.status === 'ANULADA') return false;
        }

        // B. Filtro de Texto (Buscador Profundo)
        if (busqueda.trim()) {
          const term = busqueda.toLowerCase();
          const idVenta = (v.numeroFactura || v.id).toString().toLowerCase();
          const cliente = (v.clienteNombre || '').toLowerCase();
          const total = v.total.toString();

          // 🔎 DEEP SEARCH: Buscar en Referencias de Pagos
          const matchPagos = (v.payments || []).some(p =>
            (p.reference || '').toLowerCase().includes(term) ||
            (p.referencia || '').toLowerCase().includes(term) ||
            (p.originalRef?.referencia || '').toLowerCase().includes(term) ||
            (p.method || '').toLowerCase().includes(term)
          );

          return idVenta.includes(term) || cliente.includes(term) || total.includes(term) || matchPagos;
        }

        return true;
      });

      // 4. Contar Total (Para la paginación)
      const count = await coleccionFiltrada.count();
      setTotalRegistros(count);

      // 🔍 DEBUG: Si no hay resultados, verificamos si existen ventas fuera del rango
      if (count === 0) {
        // const totalGlobal = await db.ventas.count();
        // console.log(`⚠️ [HISTORY] 0 resultados encontrados. Total en DB: ${totalGlobal}`);
        // if (totalGlobal > 0) {
        //   console.log("⚠️ Posible desajuste de fecha o filtros.");
        // }
      }

      // 5. Paginar (Offset & Limit)
      const datosPagina = await coleccionFiltrada
        .offset(pagina * itemsPorPagina)
        .limit(itemsPorPagina)
        .toArray();

      setVentas(datosPagina);

    } catch (error) {
      console.error("Error buscando ventas:", error);
    } finally {
      setCargando(false);
    }
  }, [pagina, itemsPorPagina, filtroFechaDesde, filtroFechaHasta, busqueda, filtroEstado]);

  // Ejecutar búsqueda al cambiar filtros
  useEffect(() => {
    fetchVentas();
  }, [fetchVentas]);

  // Resetear a página 0 si cambian los filtros
  useEffect(() => {
    setPagina(0);
  }, [filtroFechaDesde, filtroFechaHasta, busqueda, filtroEstado]);

  // --- RENDERIZADORES ---
  const totalPaginas = Math.ceil(totalRegistros / itemsPorPagina);

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen pb-20 animate-in fade-in duration-500">

      {/* 1. CABECERA */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <FileText className="text-blue-600" size={32} /> HISTORIAL DE VENTAS
          </h1>
          <p className="text-slate-500 font-medium">Consulta, auditoría y reimpresión global.</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4 text-center">
          <div className="px-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">Resultados</p>
            <p className="font-black text-xl text-slate-700 dark:text-white">{totalRegistros}</p>
          </div>
          <div className="w-px bg-slate-100 dark:bg-slate-700"></div>
          <div className="px-4">
            <p className="text-[10px] uppercase font-bold text-slate-400">Página</p>
            <p className="font-black text-xl text-blue-600">{pagina + 1} <span className="text-sm text-slate-400">/ {totalPaginas || 1}</span></p>
          </div>
        </div>
      </div>

      {/* 2. BARRA DE HERRAMIENTAS (FILTROS) */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">

        {/* Rango de Fechas */}
        <div className="md:col-span-4 flex gap-2">
          <div className="w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Desde</label>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-full">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Hasta</label>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Buscador Texto */}
        <div className="md:col-span-5 relative">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Buscar (Ref, Cliente, Monto)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Ej: 0045, Juan, 25.00..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filtro Estado */}
        <div className="md:col-span-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Estado</label>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
          >
            <option value="TODOS">Todas las Ventas</option>
            <option value="APROBADA">✅ Solo Válidas</option>
            <option value="ANULADA">🗑️ Solo Anuladas</option>
          </select>
        </div>
      </div>

      {/* 3. TABLA DE RESULTADOS */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm min-h-[400px] flex flex-col">
        {cargando ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 animate-pulse">
            <Search size={48} className="mb-4 opacity-50" />
            <p>Buscando en los archivos...</p>
          </div>
        ) : ventas.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
            <FileText size={48} className="mb-4 opacity-20" />
            <p>No se encontraron ventas con estos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <tr className="text-xs uppercase text-slate-500 font-bold">
                  <th className="p-4 pl-6">Ref / ID</th>
                  <th className="p-4">Fecha / Hora</th>
                  <th className="p-4">Cliente</th>
                  <th className="p-4 text-center">Items</th>
                  <th className="p-4 text-center">Método</th>
                  <th className="p-4 text-right">Total USD</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {ventas.map((v) => {
                  const esAnulada = v.status === 'ANULADA';
                  const isExpanded = expandedRows.includes(v.id);

                  // Analizar pagos para la vista previa
                  const pagos = v.payments || [];
                  const metodosUnicos = [...new Set(pagos.map(p => p.method))];
                  const esMixto = metodosUnicos.length > 1;
                  const tieneReferencia = pagos.some(p => p.reference || p.referencia || p.originalRef?.referencia);

                  return (
                    <React.Fragment key={v.id}>
                      <tr
                        onClick={() => toggleRow(v.id)}
                        className={`
                              transition-colors cursor-pointer group
                              ${isExpanded ? 'bg-blue-50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                          `}
                      >
                        <td className="p-4 pl-6 font-mono font-bold text-slate-700 dark:text-slate-300">
                          #{v.numeroFactura || String(v.id).slice(-6)}
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-400">
                          <div className="flex flex-col">
                            <span className="font-bold">{new Date(v.fecha).toLocaleDateString()}</span>
                            <span className="text-xs opacity-70">{new Date(v.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-700 dark:text-slate-200">
                          {v.clienteNombre || 'Consumidor Final'}
                        </td>
                        <td className="p-4 text-center text-slate-500">
                          <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-bold">
                            {v.items?.length || 0}
                          </span>
                        </td>


                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            {v.esCredito ? (
                              <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black uppercase border border-indigo-200">
                                CRÉDITO
                              </span>
                            ) : esMixto ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-[10px] font-black uppercase border border-purple-200">
                                MIXTO
                              </span>
                            ) : (
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase">
                                {metodosUnicos[0] || 'N/A'}
                              </span>
                            )}

                            {tieneReferencia && (
                              <span className="text-blue-500" title="Ver referencias">
                                <FileText size={14} />
                              </span>
                            )}

                            <ChevronRight size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </div>
                        </td>

                        <td className={`p-4 text-right font-black font-numbers text-base ${esAnulada ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-white'}`}>
                          {(() => {
                            // 🟢 HISTORIAL ESTRICTO: Solo mostramos lo guardado en DB (v.igtfTotal)
                            // NO recalculamos nada para preservar la fidelidad histórica.
                            const totalOriginal = parseFloat(v.total || 0);
                            const igtfDisplay = parseFloat(v.igtfTotal || 0);

                            const totalFinal = (igtfDisplay > 0) ? (totalOriginal + igtfDisplay) : totalOriginal;

                            return `$${totalFinal.toFixed(2)}`;
                          })()}
                        </td>
                        <td className="p-4 text-center">
                          {esAnulada ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-600 text-[10px] font-bold border border-red-200">
                              <Ban size={10} /> ANULADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                              <CheckCircle size={10} /> OK
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); setVentaSeleccionada(v); }}
                            className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-all shadow-sm active:scale-95 flex items-center gap-2 mx-auto"
                          >
                            <ArrowUpRight size={16} /> <span className="text-xs font-bold">Ver</span>
                          </button>
                        </td>
                      </tr>

                      {/* ✅ FILA EXPANDIBLE: DETALLE BANCARIO */}
                      {
                        isExpanded && (
                          <tr className="bg-slate-50 dark:bg-slate-800/50 animate-in fade-in slide-in-from-top-2 duration-200">
                            <td colSpan="8" className="p-4 pl-16 border-t border-slate-100 dark:border-slate-700 shadow-inner">
                              <div className="grid gap-2 max-w-2xl">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Desglose de Pagos y Referencias</p>
                                {(() => {
                                  // 🟢 LOGIC: Inject Virtual Credit Payment if applicable
                                  const displayPagos = [...pagos];
                                  if (v.esCredito) {
                                    const totalPagado = pagos.reduce((acc, p) => acc + parseFloat(p.amount), 0);
                                    const montoCredito = parseFloat(v.total) - totalPagado;
                                    // Tolerancia para flotantes
                                    if (montoCredito > 0.01) {
                                      displayPagos.push({
                                        method: 'CRÉDITO CLIENTE',
                                        amount: montoCredito,
                                        currency: 'USD',
                                        isVirtual: true,
                                        reference: 'Deuda Pendiente'
                                      });
                                    }
                                  }

                                  return displayPagos.map((p, idx) => {
                                    const ref = p.reference || p.referencia || p.originalRef?.referencia;
                                    const isCredit = p.isVirtual || p.method === 'CRÉDITO CLIENTE';

                                    return (
                                      <div key={idx} className={`flex items-center gap-4 p-2 rounded-lg border shadow-sm text-sm ${isCredit ? 'bg-indigo-50 border-indigo-100 dark:bg-indigo-900/20 dark:border-indigo-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                        <div className="flex items-center gap-2 w-32 font-bold text-slate-700 dark:text-slate-200">
                                          <div className={`w-2 h-2 rounded-full ${isCredit ? 'bg-indigo-500' : p.currency === 'VES' ? 'bg-purple-500' : 'bg-green-500'}`}></div>
                                          {p.method}
                                        </div>

                                        <div className="flex-1 font-mono font-medium text-slate-600 dark:text-slate-400">
                                          {p.currency === 'VES' ? 'Bs' : '$'} {parseFloat(p.amount).toLocaleString()}
                                        </div>

                                        {p.rate > 1 && (
                                          <div className="text-xs text-slate-400">
                                            Tasa: {p.rate}
                                          </div>
                                        )}

                                        <div className="w-1/3 flex items-center justify-end font-mono">
                                          {ref ? (
                                            <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1">
                                              Ref: {ref}
                                            </span>
                                          ) : (
                                            <span className="text-slate-300 text-xs italic">Sin referencia</span>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  });
                                })()}
                              </div>
                            </td>
                          </tr>
                        )
                      }
                    </React.Fragment >
                  );
                })}
              </tbody >
            </table >
          </div >
        )}
      </div >

      {/* 4. PAGINACIÓN */}
      < div className="mt-6 flex justify-between items-center" >
        <div className="text-xs font-bold text-slate-400">
          Mostrando {ventas.length} de {totalRegistros} registros
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setPagina(p => Math.max(0, p - 1))}
            disabled={pagina === 0}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <button
            onClick={() => setPagina(p => (p + 1 < totalPaginas ? p + 1 : p))}
            disabled={pagina + 1 >= totalPaginas}
            className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Siguiente <ChevronRight size={16} />
          </button>
        </div>
      </div >

      {/* MODAL DETALLE (Reutilizado) */}
      {
        ventaSeleccionada && (
          <ModalDetalleVenta
            venta={ventaSeleccionada}
            onClose={() => setVentaSeleccionada(null)}
          />
        )
      }

    </div >
  );
}