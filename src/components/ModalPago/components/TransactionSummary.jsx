import React, { memo } from 'react';
import { AlertTriangle } from 'lucide-react';
import math from '../../../utils/mathCore';

const TransactionSummary = ({
    totalUSD,
    totalBS,
    totalImpuesto,
    montoIGTF,
    isTouch
}) => {
    // Optimization: Memoized display to prevent flicker

    return (
        <div className={`${isTouch ? 'p-4 pb-2' : 'p-4 pb-1'} shrink-0 bg-slate-50 z-20 shadow-sm relative`}>
            <div className={`text-center ${isTouch ? 'p-4' : 'p-3'} bg-app-dark text-white rounded-2xl shadow-lg relative overflow-hidden group`}>
                <p className="text-slate-200 text-[9px] font-bold uppercase tracking-wider mb-0.5 opacity-60">Total a Pagar</p>

                <div className="flex flex-col items-center">
                    <div className={`${isTouch ? 'text-4xl' : 'text-3xl'} font-extrabold tracking-tight font-numbers text-white`}>
                        ${totalUSD.toFixed(2)}
                    </div>

                    <div className="flex items-center gap-2 mt-0.5">
                        <div className={`${isTouch ? 'text-sm' : 'text-[11px]'} font-bold text-emerald-400 font-numbers`}>
                            Bs {math.round(totalBS).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                        {totalImpuesto > 0 && (
                            <span className="text-[10px] text-blue-300/60 font-medium">
                                (IVA: ${totalImpuesto.toFixed(2)})
                            </span>
                        )}
                    </div>
                </div>

                {montoIGTF > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center animate-in slide-in-from-bottom-1">
                        <span className="text-[9px] font-bold text-orange-400/80 flex items-center gap-1 uppercase">
                            <AlertTriangle size={10} /> IGTF
                        </span>
                        <span className={`${isTouch ? 'text-base' : 'text-sm'} font-black text-white font-numbers`}>+${montoIGTF.toFixed(2)}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default memo(TransactionSummary);
