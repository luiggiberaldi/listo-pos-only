// ✅ SYSTEM IMPLEMENTATION - V. 3.1 (STATS FIX)
// Archivo: src/components/dashboard/DashboardStats.jsx
// Auditoría: Corrección de doble conversión en Bs y suma de apertura en USD.

import React, { useMemo } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Users, CreditCard, Clock, Wallet, ArrowRight, Banknote } from 'lucide-react';
import { useConfigContext } from '../../context/ConfigContext';
import { calcularKPIs, agruparPorHora, agruparPorMetodo, calcularTesoreia } from '../../utils/reportUtils';

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

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

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-3 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-slate-700 dark:text-slate-200 mb-1">{label}</p>
        <p className="text-emerald-600 font-mono font-bold">${payload[0].value.toFixed(2)}</p>
      </div>
    );
  }
  return null;
};

// ✅ Recibimos balancesApertura (objeto)
export default function DashboardStats({ ventas, balancesApertura = {} }) {
  const { configuracion } = useConfigContext();
  const tasa = configuracion?.tasa || 1;

  const { kpis, salesByHour, salesByMethod, tesoreria } = useMemo(() => {
    if (!ventas || ventas.length === 0) {
      return {
        kpis: calcularKPIs([]),
        salesByHour: agruparPorHora([]),
        salesByMethod: [],
        tesoreria: { cajaUSD: 0, cajaBS: 0 }
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
      tesoreria: _tesoreria
    };
  }, [ventas, balancesApertura]);

  const renderTooltipFormatter = (value, name) => {
    const nameLower = name.toLowerCase();
    const esBs = nameLower.includes('bs') || nameLower.includes('pago móvil') || nameLower.includes('punto');
    if (esBs) return [`Bs ${(value * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`, name];
    return [`$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, name];
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Venta Neta (Flujo de Ventas solamente) */}
        <KPICard
          title="Venta Neta"
          value={`$${kpis.totalVentas.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext={`~ Bs ${(kpis.totalVentas * tasa).toLocaleString('es-VE', { minimumFractionDigits: 0 })}`}
          icon={TrendingUp}
          color={{ bg: 'bg-blue-500', text: 'text-blue-500', badge: 'bg-blue-50 text-blue-700 border border-blue-100' }}
        />

        <KPICard
          title="Fondo Divisas"
          value={`$${((tesoreria.usdCash || 0) + (tesoreria.usdDigital || 0)).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          subtext={`Físico: $${(tesoreria.usdCash || 0).toFixed(2)} | Dig: $${(tesoreria.usdDigital || 0).toFixed(2)}`}
          icon={Wallet}
          color={{ bg: 'bg-emerald-500', text: 'text-emerald-500', badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100' }}
        />

        <KPICard
          title="Fondo Bolívares"
          value={`Bs ${((tesoreria.vesCash || 0) + (tesoreria.vesDigital || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}
          subtext={`Físico: Bs ${(tesoreria.vesCash || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })} | Dig: Bs ${(tesoreria.vesDigital || 0).toLocaleString('es-VE', { maximumFractionDigits: 0 })}`}
          icon={Banknote}
          color={{ bg: 'bg-purple-500', text: 'text-purple-500', badge: 'bg-purple-50 text-purple-700 border border-purple-100' }}
        />

        <KPICard
          title="Hora Pico"
          value={kpis.peakHour}
          subtext="Máxima Afluencia"
          icon={Clock}
          color={{ bg: 'bg-orange-500', text: 'text-orange-500', badge: 'bg-orange-50 text-orange-700 border border-orange-100' }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px]">

        <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
            <TrendingUp size={18} className="text-blue-500" /> Tendencia del Flujo
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesByHour}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} interval={3} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94A3B8' }} tickFormatter={(value) => `$${value}`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col">
          <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-6 flex items-center gap-2 uppercase text-xs tracking-widest">
            <CreditCard size={18} className="text-emerald-500" /> Arqueo por Método
          </h3>
          <div className="flex-1 w-full min-h-0 relative">
            {salesByMethod.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByMethod}
                    cx="50%"
                    cy="42%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {salesByMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={renderTooltipFormatter} />
                  <Legend
                    layout="horizontal" verticalAlign="bottom" align="center" iconType="circle"
                    wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm italic">
                <CreditCard size={32} className="mb-2 opacity-20" />
                Sin movimientos hoy
              </div>
            )}

            {salesByMethod.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-14">
                <span className="text-2xl font-black text-slate-700 dark:text-white">
                  ${kpis.totalVentas.toFixed(2)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest">NETO</span>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="flex justify-end items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">
        <ArrowRight size={12} />
        <span>Sincronización en Tiempo Real • Tasa Activa: {tasa}</span>
      </div>
    </div>
  );
}