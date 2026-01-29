import React from 'react';
import { Printer, CheckCircle, Wallet, Search } from 'lucide-react';

export default function PaymentFooter({
    isTouch,
    modo,
    faltaPorPagar,
    clienteSeleccionado,
    totalPagadoGlobalUSD,
    onProcesar,
    setActiveInputId, // Optional for Touch
    isVueltoValido = true, // 🛡️ FÉNIX GUARD
    remanenteVueltoUSD = 0,
    onResolveError // 🚀 Missing shortcut prop
}) {
    const isErrorVuelto = !isVueltoValido && modo === 'contado';
    return (
        <div className={`${isTouch ? 'p-6 gap-6' : 'p-4 gap-4'} bg-white border-t border-slate-200 flex justify-end items-center shrink-0 z-10`}>
            <button
                onClick={() => {
                    if (isTouch && setActiveInputId) setActiveInputId(null);
                    onProcesar(true);
                }}
                className={`${isTouch ? 'px-8 py-5 text-lg' : 'px-6 py-4'} rounded-xl font-bold text-slate-600 border-2 border-slate-200 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center gap-2 active:scale-95`}
            >
                <Printer size={isTouch ? 24 : 20} /> IMPRIMIR <span className="text-xs bg-slate-200 px-1.5 rounded font-mono">F10</span>
            </button>

            <button
                onClick={() => {
                    if (isTouch && setActiveInputId) setActiveInputId(null);
                    if (isErrorVuelto && onResolveError) {
                        onResolveError();
                    } else {
                        onProcesar(false);
                    }
                }}
                disabled={(modo === 'contado' && faltaPorPagar > 0.01) || (modo === 'credito' && (!clienteSeleccionado || faltaPorPagar <= 0.01))}
                className={`
                    ${isTouch ? 'px-12 py-5 text-2xl' : 'px-10 py-4 text-xl'} rounded-xl font-black flex items-center gap-2 shadow-xl transition-all transform active:scale-95 flex-1 max-w-sm justify-center group
                    ${((modo === 'contado' && faltaPorPagar > 0.01) || (modo === 'credito' && (!clienteSeleccionado || faltaPorPagar <= 0.01)))
                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed text-base'
                        : modo === 'credito' ? 'bg-orange-600 hover:bg-orange-700 text-white' : 'bg-primary hover:bg-primary-hover text-white'}
                    ${isErrorVuelto ? '!bg-red-600 !text-white !cursor-pointer ring-4 ring-red-100 animate-pulse' : ''}
                `}
            >
                {isErrorVuelto ? <Search size={isTouch ? 28 : 24} className="group-hover:scale-110 transition-transform" /> : (modo === 'credito' ? <Wallet size={isTouch ? 28 : 24} /> : <CheckCircle size={isTouch ? 28 : 24} />)}
                <div className="flex flex-col items-center leading-none">
                    <span className={isErrorVuelto ? 'text-xs opacity-80 mb-1' : ''}>
                        {isErrorVuelto
                            ? (remanenteVueltoUSD < -0.01 ? 'DISTRIBUCIÓN EXCEDIDA' : 'FALTA ASIGNAR VUELTO')
                            : ''
                        }
                    </span>
                    <span className="uppercase">
                        {isErrorVuelto
                            ? 'RESOLVER AHORA'
                            : modo === 'contado'
                                ? 'PAGAR (LISTO)'
                                : (faltaPorPagar <= 0.01)
                                    ? 'TOTAL CUBIERTO'
                                    : totalPagadoGlobalUSD > 0.01 ? 'PROCESAR CON ABONO' : 'FIAR TOTALMENTE'
                        }
                    </span>
                </div>
            </button>
        </div>
    );
}
