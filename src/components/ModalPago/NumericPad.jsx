import React from 'react';
import { Delete, ArrowRight, XCircle, Zap } from 'lucide-react';

/**
 * ⌨️ NUMERIC PAD - TOUCH OPTIMIZED
 * Diseño Sidebar Glassmorphism para Modal de Pago.
 */
const NumericPad = ({ onValueChange, activeValue, onNext, onClear, onFillBalance, pendingAmount }) => {

    const handlePress = (key) => {
        let newValue = activeValue.toString();

        if (key === 'BACKSPACE') {
            newValue = newValue.slice(0, -1);
        } else if (key === '.') {
            if (!newValue.includes('.')) newValue += '.';
        } else if (key === '00') {
            newValue += '00';
        } else {
            // Si el valor actual es "0", reemplazarlo a menos que sea un punto
            if (newValue === '0') newValue = key;
            else newValue += key;
        }

        onValueChange(newValue);
    };

    const Key = ({ value, label, icon: Icon, variant = 'default', onClick, className = '' }) => (
        <button
            onClick={onClick || (() => handlePress(value))}
            className={`
        flex items-center justify-center p-5 rounded-2xl font-bold text-2xl transition-all active:scale-95 shadow-sm
        ${variant === 'default' ? 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 active:bg-slate-100' : ''}
        ${variant === 'action' ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-200 active:bg-blue-800' : ''}
        ${variant === 'danger' ? 'bg-red-50 text-red-500 hover:bg-red-100 border border-red-100 active:bg-red-200' : ''}
        ${variant === 'secondary' ? 'bg-slate-100 text-slate-500 hover:bg-slate-200 active:bg-slate-300' : ''}
        ${variant === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200 active:bg-emerald-800' : ''}
        ${className}
      `}
        >
            {Icon ? <Icon size={28} /> : (label || value)}
        </button>
    );

    return (
        <div className="flex flex-col gap-6 p-6 bg-slate-50/80 backdrop-blur-xl border-l border-slate-200 w-full sm:w-80 h-full animate-in slide-in-from-right-4 select-none">
            {/* Display / Header */}
            <div className="flex items-center justify-between">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Numeric Pad</span>
                    <span className="text-[9px] font-bold text-blue-500 uppercase">Express Input</span>
                </div>
                <button onClick={onClear} className="text-slate-300 hover:text-red-500 transition-all p-2 active:scale-75"><XCircle size={24} /></button>
            </div>

            {/* Smart Shortcuts */}
            {pendingAmount > 0 && (
                <button
                    onClick={onFillBalance}
                    className="w-full py-4 bg-emerald-50 border-2 border-emerald-100 rounded-2xl flex flex-col items-center justify-center gap-1 group active:scale-95 transition-all animate-in zoom-in-95"
                >
                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest opacity-60">Pagar Restante</span>
                    <div className="flex items-center gap-2 text-emerald-600">
                        <Zap size={18} fill="currentColor" />
                        <span className="text-2xl font-black font-numbers">${pendingAmount.toFixed(2)}</span>
                    </div>
                </button>
            )}

            <div className="grid grid-cols-3 gap-4 flex-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <Key key={num} value={num.toString()} />
                ))}
                <Key value="." label="." variant="secondary" />
                <Key value="0" />
                <Key value="BACKSPACE" icon={Delete} variant="secondary" />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Key value="00" label="00" variant="secondary" />
                <Key value="NEXT" icon={ArrowRight} variant="action" onClick={onNext} className="flex-1" />
            </div>

            <div className="pt-2 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-200/50 rounded-full">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">Vínculo Táctil Activo</span>
                </div>
            </div>
        </div>
    );
};

export default NumericPad;
