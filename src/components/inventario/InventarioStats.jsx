import React from 'react';
import { Package, DollarSign, AlertTriangle, TrendingUp, Box } from 'lucide-react';

export default function InventarioStats({ kpis }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* TARJETA 1: TOTAL PRODUCTOS (25%) */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all duration-300">
        <div className="absolute -right-6 -bottom-6 text-slate-50 dark:text-slate-700 opacity-50 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
          <Box size={120} strokeWidth={0.5} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Package size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Items</span>
          </div>
          <h3 className="text-4xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
            {kpis.totalProductos}
          </h3>
          <p className="text-xs text-slate-400 mt-1 font-medium">Productos registrados</p>
        </div>
      </div>

      {/* TARJETA 2: ESTADO DEL STOCK (ALERTAS) (25%) */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all duration-300">
        <div className="absolute -right-6 -bottom-6 text-orange-50 dark:text-orange-900/20 opacity-50 transform rotate-12 group-hover:scale-110 transition-transform duration-500">
          <AlertTriangle size={120} strokeWidth={0.5} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className={`p-2 rounded-lg transition-colors ${kpis.stockBajo > 0 ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle size={20} />
            </div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Alertas de Stock</span>
          </div>
          <h3 className="text-4xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
            {kpis.stockBajo}
          </h3>
          <p className={`text-xs mt-1 font-bold ${kpis.stockBajo > 0 ? 'text-orange-500' : 'text-slate-400'}`}>
            {kpis.stockBajo > 0 ? 'Productos agotándose o en mínimo' : 'Niveles de stock óptimos'}
          </p>
        </div>
      </div>

      {/* TARJETA 3: VALORACIÓN DEL NEGOCIO (INVERSIÓN Y GANANCIA) (50%) - MOVED TO END */}
      <div className="md:col-span-2 lg:col-span-2 relative overflow-hidden bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 group hover:shadow-md transition-all duration-300">
        <div className="absolute -right-6 -top-6 text-emerald-50 dark:text-emerald-900/10 opacity-30 transform -rotate-12 group-hover:scale-110 transition-transform duration-500">
          <DollarSign size={160} strokeWidth={0.5} />
        </div>

        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
                <TrendingUp size={20} />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Valoración Financiera</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black text-slate-800 dark:text-white font-mono tracking-tight">
                ${kpis.valorInventarioVenta.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Venta Total Proyectada (PVP)</p>
            </div>
          </div>

          <div className="flex flex-col justify-center border-l border-slate-100 dark:border-slate-700 md:pl-8">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase">Inversión (Costo)</span>
                <p className="text-lg font-bold text-slate-700 dark:text-slate-200 font-mono">
                  ${kpis.valorCostoInventario.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <span className="text-[10px] font-black text-emerald-500 uppercase">Ganancia Bruta</span>
                <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                  +${kpis.gananciaProyectada.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden flex">
                <div
                  className="bg-slate-400 h-full"
                  style={{ width: `${(kpis.valorCostoInventario / (kpis.valorInventarioVenta || 1)) * 100}%` }}
                  title="Costo"
                />
                <div
                  className="bg-emerald-500 h-full"
                  style={{ width: `${(kpis.gananciaProyectada / (kpis.valorInventarioVenta || 1)) * 100}%` }}
                  title="Ganancia"
                />
              </div>
              <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase italic">Distribución Costo vs. Margen</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}