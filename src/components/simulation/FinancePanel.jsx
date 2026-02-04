import React, { useEffect, useState } from 'react';
import { Briefcase, PackagePlus, DollarSign, CalendarCheck, ShieldCheck, TrendingUp, Info, Activity, Zap, Layers } from 'lucide-react';
import { db } from '../../db';

export const FinancePanel = ({ vFinance }) => {
    const [stats, setStats] = useState({ empleados: 0, periodo: '...' });

    useEffect(() => {
        const fetchStats = async () => {
            const emp = await db.empleados_finanzas.count();
            const periodo = await db.periodos_nomina.where('status').equals('ABIERTO').first();
            setStats({
                empleados: emp,
                periodo: periodo ? `#${periodo.id} (Activo)` : 'Sin Periodo'
            });
        };
        fetchStats();
    }, [vFinance.isRunning]);

    return (
        <div className="animate-in fade-in slide-in-from-left-4 duration-500 space-y-6 text-left">
            {/* Header V2 */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none ring-4 ring-indigo-50 dark:ring-indigo-900/20">
                        <Briefcase size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white text-xl tracking-tighter uppercase">FINANCE 360&deg; SYNERGY</h3>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[9px] font-black rounded-full uppercase tracking-widest">Version 2.0</span>
                            <span className="w-1 h-1 bg-slate-300 dark:bg-slate-600 rounded-full" />
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">Ecosistema Blindado</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex gap-4">
                    <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Periodo Actual</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{stats.periodo}</p>
                    </div>
                    <div className="w-[1px] bg-slate-100 dark:bg-slate-700" />
                    <div className="text-right">
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Nómina Activa</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{stats.empleados} Pers.</p>
                    </div>
                </div>
            </div>

            {/* 🚀 MASTER SIMULATION BUTTON: QUANTUM 2.0 CYCLE */}
            <button
                disabled={vFinance.isRunning}
                onClick={vFinance.simularCicloCompleto}
                className="w-full group relative p-1 rounded-[2.5rem] bg-gradient-to-r from-indigo-600 via-blue-600 to-purple-600 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-indigo-500/30 overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm p-6 rounded-[2.3rem] flex items-center justify-between border border-white/20">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-100 dark:ring-indigo-900/40">
                            <Zap size={28} className={vFinance.isRunning ? 'animate-pulse' : 'animate-bounce'} />
                        </div>
                        <div>
                            <h4 className="font-black text-slate-800 dark:text-white text-lg tracking-tight uppercase">Quantum Master Cycle 360&deg;</h4>
                            <p className="text-xs text-slate-500 font-bold">Depuración total: Apertura &rarr; Consumo &rarr; Adelanto &rarr; Compra &rarr; Liquidación</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black uppercase text-indigo-500 tracking-[0.2em] mb-1">Stress Test</span>
                        <div className="w-12 h-12 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-indigo-600 animate-spin opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </button>

            {/* Matrix of Actions */}
            <div className="grid grid-cols-2 gap-4">
                {/* Action 1: Consumo */}
                <button
                    disabled={vFinance.isRunning}
                    onClick={vFinance.simularConsumo}
                    className="group bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 p-5 rounded-[2.5rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 active:scale-95 text-left"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                            <PackagePlus size={24} />
                        </div>
                        <TrendingUp size={16} className="text-slate-200 dark:text-slate-700 group-hover:text-blue-200" />
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">Consumo Interno</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-tight text-left">Inventario &rarr; Nómina (Carga Deuda)</p>
                </button>

                {/* Action 2: Adelanto */}
                <button
                    disabled={vFinance.isRunning}
                    onClick={vFinance.simularAdelanto}
                    className="group bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-400 p-5 rounded-[2.5rem] transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 active:scale-95 text-left"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300">
                            <DollarSign size={24} />
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[8px] font-black rounded-lg">VES/USD</span>
                    </div>
                    <h4 className="font-black text-slate-800 dark:text-white text-sm uppercase tracking-tight">Adelanto Sueldo</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-1 leading-tight text-left">Caja &rarr; Salida Real Efectivo</p>
                </button>

                {/* Action 3: Cierre Periodo */}
                <button
                    disabled={vFinance.isRunning}
                    onClick={vFinance.simularCierreGlobal}
                    className="group bg-slate-900 border-2 border-slate-800 hover:border-indigo-500 p-5 rounded-[2.5rem] transition-all duration-300 shadow-xl shadow-slate-900/20 active:scale-95 text-left relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-8 -mt-8 blur-2xl group-hover:bg-indigo-500/10 transition-colors" />

                    <div className="flex items-start justify-between mb-4 relative z-10">
                        <div className="p-3 bg-slate-800 rounded-2xl text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                            <CalendarCheck size={24} />
                        </div>
                        <ShieldCheck size={16} className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                    </div>
                    <h4 className="font-black text-white text-sm uppercase tracking-tight relative z-10">Liquidación Global</h4>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 leading-tight relative z-10 text-left">Periodo &rarr; Gasto Caja Neto</p>
                </button>

                {/* Action 4: Reimborso / Favor */}
                <div className="group bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 p-5 rounded-[2.5rem] opacity-50 cursor-not-allowed text-left">
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/40 rounded-2xl text-slate-300">
                            <Layers size={24} />
                        </div>
                        <Info size={14} className="text-slate-200" />
                    </div>
                    <h4 className="font-black text-slate-400 text-sm uppercase tracking-tight">Reembolsos</h4>
                    <p className="text-[10px] text-slate-300 font-bold mt-1 uppercase tracking-widest text-left">Coming Soon (Favor)</p>
                </div>
            </div>

            {/* Info Card V2 */}
            <div className="p-5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-800 border border-slate-100 dark:border-slate-700 rounded-3xl shadow-inner text-left">
                <div className="flex items-center gap-3 mb-3">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                    <h4 className="font-black text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-widest">Smart-Audit Instructions</h4>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    <div className="flex items-start gap-2">
                        <Activity size={14} className="text-indigo-500 mt-0.5" />
                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed"><strong>Quantum Master:</strong> Orquesta un ciclo de negocio real: Suministros &rarr; Ventas a Empleados &rarr; Adelantos &rarr; Pago de Nómina Neto. Ideal para detectar fugas contables.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
