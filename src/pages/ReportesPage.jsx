import React from 'react';
import { useUnifiedAnalytics } from '../hooks/analytics/useUnifiedAnalytics';
import { useStore } from '../context/StoreContext';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Clock,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Lock // 🔒 Icono de bloqueo
} from 'lucide-react';
import { PERMISOS, useRBAC } from '../hooks/store/useRBAC';

/**
 * ReportesPage.jsx
 * Panel Ejecutivo de Inteligencia de Negocios.
 * Consume métricas centralizadas del Motor de BI Unificado.
 */
const ReportesPage = () => {
  const { kpis, variacionAyer, heatmapHoras, topProductos, topClientes, saludDatos } = useUnifiedAnalytics();
  const { monedaSimbolo, usuario } = useStore(); // ✅ Usuario para RBAC
  const { tienePermiso } = useRBAC(usuario);
  const canSeeFinance = tienePermiso(PERMISOS.REP_VER_TOTAL_DIARIO);

  // Cálculo para escala del Heatmap (CSS puro)
  const maxVentaHora = Math.max(...heatmapHoras, 1); // Evitar división por cero

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">

      {/* HEADER & METADATOS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">Análisis de Negocio</h1>
          <p className="text-slate-500 dark:text-slate-400">Datos procesados al corte de: {saludDatos.ultimaActualizacion}</p>
        </div>
        <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-bold">
          Transacciones analizadas: {saludDatos.totalRegistros}
        </div>
      </header>

      {/* SECCIÓN 1: KPIs GLOBALES (PROTEGIDA) */}
      {canSeeFinance ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Ventas Hoy */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 rounded-2xl">
                <DollarSign size={24} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-black px-2 py-1 rounded-full ${variacionAyer >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                {variacionAyer >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {Math.abs(variacionAyer)}%
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Ventas Hoy</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {monedaSimbolo}{kpis.hoy.total.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">{kpis.hoy.count} operaciones finalizadas</p>
          </div>

          {/* Ganancia Hoy */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl">
                <TrendingUp size={24} />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Ganancia Estimada</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {monedaSimbolo}{kpis.hoy.ganancia.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Margen neto del día</p>
          </div>

          {/* Ticket Promedio */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 rounded-2xl">
                <ShoppingBag size={24} />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Ticket Promedio</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {monedaSimbolo}{kpis.hoy.ticketPromedio.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">Gasto medio por cliente</p>
          </div>

          {/* Ventas Mes */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800 dark:to-slate-900">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl">
                <Clock size={24} />
              </div>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">Total del Mes</p>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white mt-1">
              {monedaSimbolo}{kpis.mes.total.toLocaleString()}
            </h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">{kpis.mes.count} ventas este mes</p>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-slate-200 dark:bg-slate-800 rounded-full mb-4 text-slate-400">
            <Lock size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">Información Financiera Protegida</h3>
          <p className="text-sm text-slate-500 max-w-md mt-2">
            No tienes los permisos necesarios para ver los balances de ventas y ganancias. Contacta al administrador si necesitas acceso.
          </p>
        </div>
      )}

      {/* SECCIÓN 2: RITMO DE VENTAS (HEATMAP) */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
            <Clock size={20} />
          </div>
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Ritmo de Ventas por Hora (Hoy)</h3>
        </div>

        <div className="h-48 flex items-end gap-1 sm:gap-2">
          {heatmapHoras.map((monto, hora) => (
            <div key={hora} className="flex-1 group relative flex flex-col items-center">
              {/* Barra de Datos */}
              <div
                className={`w-full rounded-t-md transition-all duration-500 cursor-help ${monto > 0 ? 'bg-blue-500 dark:bg-blue-600 hover:bg-blue-400' : 'bg-slate-100 dark:bg-slate-900'}`}
                style={{ height: `${(monto / maxVentaHora) * 100}%`, minHeight: monto > 0 ? '4px' : '2px' }}
              >
                {/* Tooltip */}
                {monto > 0 && (
                  <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                    <div className="bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded whitespace-nowrap">
                      {monedaSimbolo}{monto.toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
              {/* Etiqueta de Hora */}
              <span className="text-[9px] font-bold text-slate-400 mt-2 rotate-45 sm:rotate-0">
                {hora % 4 === 0 ? `${hora}h` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* SECCIÓN 3: TOP PERFORMERS (SIDE BY SIDE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Top Productos */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                <Star size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Productos Estrella</h3>
            </div>
          </div>
          <div className="space-y-4">
            {topProductos.map((prod, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-800 text-slate-400 text-xs font-black rounded-full border border-slate-200 dark:border-slate-700">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{prod.nombre}</p>
                    <p className="text-xs text-slate-500 font-medium">{prod.cantidad} unidades vendidas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-600">{monedaSimbolo}{prod.ingresos.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clientes */}
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Users size={20} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Mejores Clientes</h3>
            </div>
          </div>
          <div className="space-y-4">
            {topClientes.map((cliente, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-500 text-white rounded-xl flex items-center justify-center font-black text-sm">
                    {cliente.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white uppercase">{cliente.nombre}</p>
                    <p className="text-xs text-slate-500 font-medium">{cliente.visitas} visitas registradas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-indigo-600">{monedaSimbolo}{cliente.totalGasto.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* FOOTER: DATA HEALTH STATUS */}
      <footer className="flex justify-center py-8">
        <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
          Motor de BI Activo • Sincronización Realtime
        </div>
      </footer>
    </div>
  );
};

export default ReportesPage;