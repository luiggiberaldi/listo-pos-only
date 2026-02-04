import React from 'react';
import { Skull, Zap, Scale, Settings, Database } from 'lucide-react';
import { useConfigContext } from '../../context/ConfigContext';

export const ChaosPanel = ({ vMain, vChaos, injectors }) => {
    const { configuracion, updateConfiguracion } = useConfigContext();
    const { injectScaleProduct, injectCorruptProduct, setNegativeStock } = injectors;

    return (
        <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl text-red-600">
                    <Skull size={24} />
                </div>
                <div>
                    <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter">Stress Test Suite</h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Buscando el Punto de Quiebre</p>
                </div>
            </div>

            <button
                disabled={vMain.isRunning || vChaos.isRunning}
                onClick={vChaos.runChaosTest}
                className="w-full bg-gradient-to-r from-red-600 to-rose-700 text-white p-6 rounded-3xl font-black shadow-xl flex flex-col items-center justify-center gap-2 hover:scale-[1.01] transition-all relative overflow-hidden group"
            >
                <div className="absolute inset-0 bg-white/10 animate-pulse group-hover:bg-white/20 transition-all"></div>
                <Zap size={32} />
                <span className="text-xl tracking-tighter">INICIAR CHAOS TEST V4.0</span>
                <p className="text-[10px] font-bold opacity-80 uppercase">Suite de Validación Automática</p>
            </button>

            <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                <p className="text-[10px] uppercase font-black text-red-400 mb-4 tracking-widest text-center">Laboratorio de Inyecciones Manuales</p>
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={injectScaleProduct}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-emerald-200 dark:border-emerald-800 transition-all"
                    >
                        <Scale size={20} className="mb-2" /> INYECTAR SKU BALANZA
                    </button>

                    <button
                        onClick={injectCorruptProduct}
                        className="bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-red-200 dark:border-red-800 transition-all"
                    >
                        <Skull size={20} className="mb-2" /> INYECTAR PRODUCTO CORRUPTO
                    </button>

                    <button
                        onClick={setNegativeStock}
                        className="bg-orange-50 hover:bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400 p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border border-orange-200 dark:border-orange-800 transition-all"
                    >
                        <Settings size={20} className="mb-2" /> FORZAR STOCK NEGATIVO
                    </button>

                    <label className={`cursor-pointer p-4 rounded-2xl font-black text-xs flex flex-col items-center justify-center border transition-all ${configuracion.permitirSinStock ? 'bg-blue-600 border-blue-700 text-white shadow-lg' : 'bg-slate-50 border-slate-200 text-slate-400 dark:bg-slate-800/50 dark:border-slate-700'}`}>
                        <input type="checkbox" className="hidden" checked={configuracion.permitirSinStock || false} onChange={e => updateConfiguracion({ permitirSinStock: e.target.checked })} />
                        <Database size={20} className="mb-2" />
                        {configuracion.permitirSinStock ? 'VENDER SIN STOCK: ON' : 'VENDER SIN STOCK: OFF'}
                    </label>
                </div>
            </div>
        </div>
    );
};
