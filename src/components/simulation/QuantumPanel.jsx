import React from 'react';
import { Activity, ShieldCheck, Microscope, DollarSign, PackagePlus, PlusCircle, Users } from 'lucide-react';

export const QuantumPanel = ({ vMain, vChaos, handleCrearHarina }) => {
    return (
        <div className="animate-in fade-in slide-in-from-left-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                    <Activity size={24} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Motor Quantum V10</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Simulación de Flujo Financiero Completo</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                <button
                    disabled={vMain.isRunning || vChaos.isRunning}
                    onClick={() => vMain.runDefinitiveSuite()}
                    className="bg-gradient-to-br from-purple-700 to-indigo-800 text-white p-6 rounded-3xl font-black shadow-xl transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02] disabled:opacity-50 group relative overflow-hidden"
                >
                    <ShieldCheck size={48} className="group-hover:animate-pulse" />
                    <span className="text-2xl tracking-tighter">DEFINITIVE SUITE V13</span>
                    <div className="text-xs font-bold bg-white/20 text-white px-3 py-1 rounded border border-white/20 uppercase">
                        Vuelto Discordia • Jerarquía • UX Lock • IGTF • Shadow Ledger
                    </div>
                </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase font-black text-slate-400 mb-4 tracking-widest text-center">Inyectores de Población</p>
                <div className="space-y-3">
                    <button
                        disabled={vMain.isRunning || vChaos.isRunning}
                        onClick={handleCrearHarina}
                        className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 p-4 rounded-2xl font-black flex items-center justify-center gap-3 border border-orange-200 dark:border-orange-800 transition-all"
                    >
                        <PackagePlus size={20} /> CREAR ENTORNO "HARINA PAN" (RESET)
                    </button>

                    <div className="grid grid-cols-3 gap-3">
                        {[10, 100, 1000].map(n => (
                            <button
                                key={n}
                                disabled={vMain.isRunning || vChaos.isRunning}
                                onClick={() => vMain.generarProductosMasivos(n)}
                                className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 p-3 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-slate-200 dark:border-slate-700 transition-all"
                            >
                                <PlusCircle size={16} className="mb-1" /> +{n} SKU
                            </button>
                        ))}
                    </div>

                    <button
                        disabled={vMain.isRunning || vChaos.isRunning}
                        onClick={() => vMain.generarClientesMasivos(50)}
                        className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-400 p-4 rounded-2xl font-black flex items-center justify-center gap-3 border border-indigo-200 dark:border-indigo-800 transition-all"
                    >
                        <Users size={20} /> GENERAR 50 CLIENTES REALES
                    </button>
                </div>
            </div>
        </div>
    );
};
