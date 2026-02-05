import React from 'react';
import { DollarSign } from 'lucide-react';

export default function BigCurrencyInput({ value, onChange, currency = 'USD', onCurrencyChange, conversionRate = 1 }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <div className="relative group w-full max-w-sm mx-auto">
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 text-5xl font-black tracking-tighter transition-colors ${value ? 'text-slate-800' : 'text-slate-300'}`}>
                    {currency === 'USD' ? '$' : 'Bs'}
                </span>

                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full bg-transparent border-b-4 border-slate-100 py-4 pl-12 pr-4 text-7xl font-black tracking-tighter text-slate-800 outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-200 text-center"
                />
            </div>

            {/* Currency Toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
                {['USD', 'VES'].map(c => (
                    <button
                        key={c}
                        onClick={() => onCurrencyChange && onCurrencyChange(c)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${currency === c ? 'bg-white text-slate-800 shadow-sm scale-110' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        {c}
                    </button>
                ))}
            </div>

            {/* Conversion Hint */}
            {currency === 'VES' && value > 0 && (
                <div className="text-center animate-in fade-in slide-in-from-top-2">
                    <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-black shadow-sm border border-blue-100">
                        ≈ ${(parseFloat(value) / (conversionRate || 1)).toFixed(2)} USD
                    </span>
                </div>
            )}
        </div>
    );
}
