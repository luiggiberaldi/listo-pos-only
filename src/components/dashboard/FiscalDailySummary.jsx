import React, { useMemo } from 'react';
import { calcularKPIs } from '../../utils/reportUtils';
import { TrendingUp, TrendingDown, DollarSign, Percent, Scale, PieChart } from 'lucide-react';

export default function FiscalDailySummary({ ventas, config, gastos = [] }) { // [UPDATED]

    const kpis = useMemo(() => {
        const taxRate = config?.porcentajeIva !== undefined ? parseFloat(config.porcentajeIva) : 16;
        const baseKPIs = calcularKPIs(ventas, taxRate);

        // Calcular Gastos
        const totalGastos = gastos.reduce((sum, g) => {
            if (g.tipo === 'CONSUMO_INTERNO') {
                // Consumo interno: unidades × costo unitario snapshot
                const unidades = parseFloat(g.cantidad) || 0;
                const costoUnitario = parseFloat(g.meta?.costoSnapshot) || 0;
                return sum + (unidades * costoUnitario);
            }
            // GASTO_CAJA / GASTO_REVERTIDO: monto directo
            const amount = parseFloat(g.cantidad || 0);
            const moneda = g.meta?.moneda || g.referencia || 'USD';
            if (moneda === 'VES') {
                // 🛡️ CORRECCIÓN HISTÓRICA: Usar Tasa Snapshot
                const tasaHistorica = parseFloat(g.meta?.tasaSnapshot) || (config.tasa || 1);
                return sum + (amount / tasaHistorica);
            }
            return sum + amount;
        }, 0);

        return {
            ...baseKPIs,
            totalGastos,
            ganancia: baseKPIs.ganancia - totalGastos // Neto real
        };
    }, [ventas, config, gastos]);

    const formatCurrency = (val) => {
        return `$ ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0)}`;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden mb-6 animate-in fade-in slide-in-from-top-4 duration-500">

            {/* HEADER */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white flex items-center gap-2 text-lg">
                        <Scale className="text-blue-600" size={20} />
                        RESULTADOS DEL PERÍODO
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Rentabilidad auditada (Lógica Fiscal)</p>
                </div>
                <div className="text-right hidden sm:block">
                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        {ventas.length} Transacciones
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-700">

                {/* 1. VENTAS BRUTAS */}
                <div className="p-6 relative group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ventas Brutas</p>
                    <h4 className="text-2xl font-black text-slate-800 dark:text-white font-numbers tracking-tight">
                        {formatCurrency(kpis.totalVentas)}
                    </h4>
                    <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-bold text-red-500/80 uppercase tracking-widest">
                            Impuestos
                        </span>
                        <span className="text-[10px] font-bold text-red-500 bg-red-50 dark:bg-red-900/20 px-1.5 py-0.5 rounded">
                            -${(kpis.totalImpuesto + kpis.totalIGTF).toFixed(2)}
                        </span>
                    </div>
                    <div className="absolute top-6 right-6 p-2 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                        <DollarSign size={18} />
                    </div>
                </div>

                {/* 2. INGRESO NETO (BASE) */}
                <div className="p-6 relative group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest mb-1">Ingreso Neto (Base)</p>
                    <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 font-numbers tracking-tight">
                        {formatCurrency(kpis.ventaNeta)}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-2">
                        Dinero real del negocio
                    </p>
                    <div className="absolute top-6 right-6 p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-lg group-hover:bg-blue-100 transition-all">
                        <PieChart size={18} />
                    </div>
                </div>

                {/* 3. COSTOS */}
                <div className="p-6 relative group hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest mb-1">Costo Mercancía</p>
                    <h4 className="text-2xl font-black text-orange-600 dark:text-orange-400 font-numbers tracking-tight">
                        {formatCurrency(kpis.totalCostos)}
                    </h4>
                    <p className="text-[10px] font-medium text-slate-400 mt-2">
                        Reposición de inventario
                    </p>
                    <div className="absolute top-6 right-6 p-2 bg-orange-50 dark:bg-orange-900/20 text-orange-500 rounded-lg group-hover:bg-orange-100 transition-all">
                        <TrendingDown size={18} />
                    </div>
                </div>

                {/* 4. GANANCIA (PROFIT) */}
                <div className={`p-6 relative group transition-colors ${kpis.ganancia >= 0 ? 'bg-emerald-50/50 hover:bg-emerald-100/50 dark:bg-emerald-900/10' : 'bg-red-50/50'}`}>
                    <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${kpis.ganancia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {kpis.ganancia >= 0 ? 'Ganancia Neta' : 'Pérdida Neta'}
                    </p>
                    <h4 className={`text-3xl font-black font-numbers tracking-tight ${kpis.ganancia >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-600'}`}>
                        {formatCurrency(kpis.ganancia)}
                    </h4>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${kpis.ganancia >= 0 ? 'bg-emerald-200/50 text-emerald-800' : 'bg-red-200/50 text-red-800'}`}>
                            <Percent size={10} /> {kpis.margen}% Margen
                        </span>
                        {kpis.totalGastos > 0 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 bg-orange-100 text-orange-700 border border-orange-200">
                                -{formatCurrency(kpis.totalGastos)} Gastos
                            </span>
                        )}
                    </div>
                    <div className={`absolute top-6 right-6 p-2 rounded-lg transition-all ${kpis.ganancia >= 0 ? 'bg-emerald-200 text-emerald-700' : 'bg-red-200 text-red-700'}`}>
                        <TrendingUp size={18} />
                    </div>
                </div>

            </div>
        </div>
    );
}
