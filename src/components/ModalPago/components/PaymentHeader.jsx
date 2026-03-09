import React from 'react';
import { Calculator, DollarSign, Wallet, X } from 'lucide-react';

export default function PaymentHeader({ isTouch, modo, setModo, onClose }) {
    return (
        <div className={`${isTouch ? 'h-24 px-6' : 'h-16 px-4'} bg-app-light dark:bg-app-dark border-b border-border-subtle dark:border-slate-700 flex justify-between items-center shrink-0`}>
            <div className="flex flex-col">
                <h2 className={`${isTouch ? 'text-2xl' : 'text-xl'} font-bold text-content-main dark:text-content-inverse flex items-center gap-2`}>
                    <Calculator className={isTouch ? 'text-primary w-7 h-7' : 'text-primary'} />
                    Procesar Pago
                </h2>
                {isTouch && <span className="text-[10px] font-bold text-content-secondary uppercase tracking-widest -mt-1 ml-9">Modo Terminal Táctil</span>}
            </div>

            <div className={`flex bg-app-light dark:bg-app-dark p-1 rounded-xl ${isTouch ? 'scale-110 mx-4' : ''}`}>
                <button onClick={() => setModo('contado')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${modo === 'contado' ? 'bg-surface-light text-status-success shadow-sm' : 'text-content-secondary hover:text-content-main'}`}><DollarSign size={16} /> Contado</button>
                <button onClick={() => setModo('credito')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${modo === 'credito' ? 'bg-surface-light text-status-warning shadow-sm ring-2 ring-orange-200' : 'text-content-secondary hover:text-content-main'}`}><Wallet size={16} /> Crédito</button>
            </div>

            <button
                onClick={onClose}
                className={`${isTouch ? 'w-14 h-14' : 'w-10 h-10'} bg-app-light dark:bg-app-dark hover:bg-status-dangerBg hover:text-status-danger rounded-full transition-all flex items-center justify-center active:scale-90`}
            >
                <X size={isTouch ? 28 : 20} />
            </button>
        </div>
    );
}
