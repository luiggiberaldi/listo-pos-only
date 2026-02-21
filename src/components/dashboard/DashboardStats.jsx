// ✅ SYSTEM IMPLEMENTATION - V. 3.1 (STATS FIX)
// Archivo: src/components/dashboard/DashboardStats.jsx
// Auditoría: Corrección de doble conversión en Bs y suma de apertura en USD.

import React, { useMemo, Suspense, lazy } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { TrendingUp, Users, CreditCard, Clock, Wallet, ArrowRight, Banknote, DollarSign, Activity, Shield } from 'lucide-react';
import { useConfigContext } from '../../context/ConfigContext';
import { calcularKPIs, agruparPorHora, agruparPorMetodo, calcularTesoreia } from '../../utils/reportUtils';

// 🚀 Lazy load charts to reduce initial bundle
const DashboardCharts = lazy(() => import('./DashboardCharts'));

const KPICard = ({ title, value, subtext, icon: Icon, color }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow group">
    <div className="flex-1 min-w-0">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight truncate">{value}</h3>
      {subtext && <p className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full w-fit ${color.badge}`}>{subtext}</p>}
    </div>
    <div className={`p-3 rounded-xl bg-opacity-10 group-hover:scale-110 transition-transform flex-shrink-0 ml-3 ${color.bg} ${color.text}`}>
      <Icon size={24} />
    </div>
  </div>
);

const ChartsSkeleton = () => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">
    <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-pulse">
      <div className="h-6 w-48 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
      <div className="h-full bg-slate-100 dark:bg-slate-700/50 rounded"></div>
    </div>
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-pulse">
      <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-6"></div>
      <div className="h-full bg-slate-100 dark:bg-slate-700/50 rounded-full"></div>
    </div>
  </div>
);

// 🛡️ Backup Status Indicator
const BackupIndicator = () => {
  const lastBackup = useLiveQuery(async () => {
    const backup = await db.config.get('backup_snapshot_v1');
    return backup?.timestamp || null;
  }, []);

  const formatTime = (ts) => {
    if (!ts) return 'Sin respaldo';
    const diff = Date.now() - ts;
    if (diff < 60000) return 'Hace < 1 min';
    if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)} min`;
    return new Date(ts).toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' });
  };

  const isRecent = lastBackup && (Date.now() - lastBackup < 600000); // < 10 min

  return (
    <div className={`flex items-center gap-1.5 ${isRecent ? 'text-emerald-500' : 'text-amber-500'}`}>
      <Shield size={11} />
      <span>Respaldo: {formatTime(lastBackup)}</span>
    </div>
  );
};

// ✅ Recibimos balancesApertura (objeto)
export default function DashboardStats({ ventas, balancesApertura = {} }) {
  const { configuracion } = useConfigContext();
  const tasa = configuracion?.tasa || 1;

  // 🔴 LIVE QUERY: Obtener Gastos del Día
  const gastosHoy = useLiveQuery(async () => {
    const inicioDia = new Date(); inicioDia.setHours(0, 0, 0, 0);
    const finDia = new Date(); finDia.setHours(23, 59, 59, 999);

    return await db.logs
      .where('fecha')
      .between(inicioDia.toISOString(), finDia.toISOString())
      .and(l => l.tipo === 'GASTO_CAJA' || l.tipo === 'CONSUMO_INTERNO')
      .toArray();
  }, []) || [];

  const { kpis, salesByHour, salesByMethod, tesoreria, totalGastos } = useMemo(() => {
    const _gastos = gastosHoy.reduce((acc, g) => {
      if (g.tipo === 'GASTO_CAJA') {
        const monto = parseFloat(g.cantidad) || 0;
        const moneda = g.meta?.moneda || g.referencia || 'USD';
        if (moneda === 'VES' || moneda === 'BS') {
          // 🛡️ CORRECCIÓN HISTÓRICA: Usar la tasa del momento (snapshot) si existe
          const tasaHistorica = parseFloat(g.meta?.tasaSnapshot) || (tasa || 1);
          return acc + (monto / tasaHistorica);
        }
        return acc + monto;
      } else if (g.tipo === 'CONSUMO_INTERNO') {
        const unidades = parseFloat(g.cantidad) || 0;
        const costoUnitario = parseFloat(g.meta?.costoSnapshot) || 0;
        return acc + (unidades * costoUnitario);
      }
      return acc;
    }, 0);

    if (!ventas || ventas.length === 0) {
      return {
        kpis: calcularKPIs([]),
        salesByHour: agruparPorHora([]),
        salesByMethod: [],
        tesoreria: { cajaUSD: 0, cajaBS: 0 },
        totalGastos: _gastos
      };
    }

    const _kpis = calcularKPIs(ventas);
    const _salesByHour = agruparPorHora(ventas);
    const _salesByMethod = agruparPorMetodo(ventas);
    const _tesoreria = calcularTesoreia(ventas, balancesApertura);

    const peakHourObj = [..._salesByHour].sort((a, b) => b.total - a.total)[0];
    const peakHourLabel = peakHourObj && peakHourObj.total > 0 ? `${peakHourObj.name}` : '--:--';

    return {
      kpis: { ..._kpis, peakHour: peakHourLabel },
      salesByHour: _salesByHour,
      salesByMethod: _salesByMethod,
      tesoreria: _tesoreria,
      totalGastos: _gastos
    };
  }, [ventas, balancesApertura, gastosHoy]);

  const utilidadOperativa = kpis.totalVentas - totalGastos;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">

        {/* Venta Neta */}
        <KPICard
          title="Ingresos"
          value={`$${kpis.totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext={`~ Bs ${(kpis.totalVentas * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={TrendingUp}
          color={{ bg: 'bg-blue-500', text: 'text-blue-500', badge: 'bg-blue-50 text-blue-700 border border-blue-100' }}
        />

        {/* Gastos y Consumos */}
        <KPICard
          title="Egresos / Gastos"
          value={`$${totalGastos.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext={`~ Bs ${(totalGastos * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={Activity}
          color={{ bg: 'bg-rose-500', text: 'text-rose-500', badge: 'bg-rose-50 text-rose-700 border border-rose-100' }}
        />

        {/* Utilidad Operativa */}
        <KPICard
          title="Utilidad Operativa"
          value={`$${utilidadOperativa.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtext={`~ Bs ${(utilidadOperativa * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          icon={DollarSign}
          color={{ bg: utilidadOperativa >= 0 ? 'bg-emerald-600' : 'bg-red-600', text: utilidadOperativa >= 0 ? 'text-emerald-600' : 'text-red-600', badge: utilidadOperativa >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100' }}
        />

        {/* Tesorería (Fondos) */}
        <KPICard
          title="Fondo Divisas"
          value={`$${((tesoreria.usdCash || 0) + (tesoreria.usdDigital || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext={`Físico: $${(tesoreria.usdCash || 0).toFixed(2)}`}
          icon={Wallet}
          color={{ bg: 'bg-emerald-500', text: 'text-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' }}
        />

        <KPICard
          title="Fondo Bolívares"
          value={`Bs ${((tesoreria.vesCash || 0) + (tesoreria.vesDigital || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
          subtext={`Físico: Bs ${(tesoreria.vesCash || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`}
          icon={Banknote}
          color={{ bg: 'bg-purple-500', text: 'text-purple-500', badge: 'bg-purple-50 text-purple-700 border border-purple-100' }}
        />
      </div>

      {/* 🚀 Lazy-loaded Charts */}
      <Suspense fallback={<ChartsSkeleton />}>
        <DashboardCharts
          salesByHour={salesByHour}
          salesByMethod={salesByMethod}
          kpis={kpis}
        />
      </Suspense>

      <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">
        <BackupIndicator />
        <div className="flex items-center gap-2">
          <ArrowRight size={12} />
          <span>Sincronización en Tiempo Real • Tasa Activa: {tasa}</span>
        </div>
      </div>
    </div>
  );
}