import React from 'react';
import { motion } from 'framer-motion';

// [V2] Responsive BigCurrencyInput with pulse animation on input
export default function BigCurrencyInput({ value, onChange, currency = 'USD', onCurrencyChange, conversionRate = 1 }) {
    const handleChange = (e) => {
        const raw = e.target.value;
        const filtered = raw.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
        onChange(filtered);
    };

    const handleKeyDown = (e) => {
        if (['e', 'E', '+', '-'].includes(e.key)) {
            e.preventDefault();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center py-6 md:py-8 space-y-4">
            <div className="relative group w-full max-w-sm mx-auto">
                {/* [V2] Animated currency symbol */}
                <motion.span
                    key={currency}
                    initial={{ y: -10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className={`absolute left-0 top-1/2 -translate-y-1/2 text-4xl md:text-5xl font-black tracking-tighter transition-colors ${value ? 'text-slate-800' : 'text-slate-300'}`}
                >
                    {currency === 'USD' ? '$' : 'Bs'}
                </motion.span>

                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="0.00"
                    autoFocus
                    className="w-full bg-transparent border-b-4 border-slate-100 py-4 pl-10 md:pl-14 pr-4 text-5xl md:text-7xl font-black tracking-tighter text-slate-800 outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-200 text-center"
                />

                {/* [V2] Subtle underline pulse when value changes */}
                {value && (
                    <motion.div
                        key={value}
                        initial={{ scaleX: 0.5, opacity: 1 }}
                        animate={{ scaleX: 1, opacity: 0 }}
                        transition={{ duration: 0.4 }}
                        className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500/30 origin-center rounded-full"
                    />
                )}
            </div>

            {/* Currency Toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
                {['USD', 'VES'].map(c => (
                    <button
                        key={c}
                        onClick={() => onCurrencyChange && onCurrencyChange(c)}
                        className={`px-5 py-2 rounded-lg text-xs font-black transition-all duration-200 ${currency === c
                                ? 'bg-white text-slate-800 shadow-md scale-105'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-white/50'
                            }`}
                    >
                        {c === 'VES' ? 'Bs' : c}
                    </button>
                ))}
            </div>

            {/* Conversion Hint */}
            {currency === 'VES' && value > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                >
                    <span className="bg-blue-50 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black shadow-sm border border-blue-100">
                        ≈ ${(parseFloat(value) / (conversionRate || 1)).toFixed(2)} USD
                    </span>
                </motion.div>
            )}
        </div>
    );
}
