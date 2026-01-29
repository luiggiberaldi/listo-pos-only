import React from 'react';
import { Calculator, DollarSign, Wallet, X } from 'lucide-react';

export default function PaymentHeader({ isTouch, modo, setModo, onClose }) {
    return (
        <div className={`${isTouch ? 'h-24 px-6' : 'h-16 px-4'} bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0`}>
            <div className="flex flex-col">
                <h2 className={`${isTouch ? 'text-2xl' : 'text-xl'} font-bold text-slate-800 flex items-center gap-2`}>
                    <Calculator className={isTouch ? 'text-blue-600 w-7 h-7' : 'text-blue-600'} />
                    Procesar Pago
                </h2>
                {isTouch && <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest -mt-1 ml-9">Modo Terminal Táctil</span>}
            </div>

            <div className={`flex bg-slate-200 p-1 rounded-xl ${isTouch ? 'scale-110 mx-4' : ''}`}>
                <button onClick={() => setModo('contado')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${modo === 'contado' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><DollarSign size={16} /> Contado</button>
                <button onClick={() => setModo('credito')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${modo === 'credito' ? 'bg-white text-orange-600 shadow-sm ring-2 ring-orange-200' : 'text-slate-500 hover:text-slate-700'}`}><Wallet size={16} /> Crédito</button>
            </div>

            <button
                onClick={onClose}
                className={`${isTouch ? 'w-14 h-14' : 'w-10 h-10'} bg-slate-200 hover:bg-red-100 hover:text-red-500 rounded-full transition-all flex items-center justify-center active:scale-90`}
            >
                <X size={isTouch ? 28 : 20} />
            </button>
        </div>
    );
}
