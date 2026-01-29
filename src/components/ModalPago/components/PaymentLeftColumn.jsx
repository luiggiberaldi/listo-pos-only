import React from 'react';
import { AlertTriangle } from 'lucide-react';
import ClienteSelector from '../ClienteSelector';
import ChangeCalculator from '../ChangeCalculator';

export default function PaymentLeftColumn({
    isTouch,
    totalUSD,
    totalImpuesto,
    totalBS,
    montoIGTF,
    tasaSegura,
    configuracion,
    clienteSeleccionado,
    setClienteSeleccionado,
    clientes,
    agregarCliente,
    modo,
    proyeccion,
    totalPagadoGlobalUSD,
    faltaPorPagar,
    cambioUSD,
    distVueltoUSD,
    distVueltoBS,
    handleVueltoDistChange,
    isChangeCredited,
    handleCreditChange,
    setIsChangeCredited,
    deudaCliente,
    onFocusInput,
    isVueltoValido, // 🛡️
    clientSearchTrigger, // 🚀
    onFinishSelection // 🚀
}) {
    return (
        <div className={`${isTouch ? 'lg:w-[30%]' : 'lg:w-1/3'} bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden`}>
            {/* 📌 STICKY HEADER: TOTAL FACTURA */}
            {/* 📌 STICKY HEADER: TOTAL FACTURA - SLIM MODE */}
            <div className={`${isTouch ? 'p-4 pb-2' : 'p-4 pb-1'} shrink-0 bg-slate-50 z-20 shadow-sm relative`}>
                <div className={`text-center ${isTouch ? 'p-4' : 'p-3'} bg-app-dark text-white rounded-2xl shadow-lg relative overflow-hidden group`}>
                    <p className="text-slate-200 text-[9px] font-bold uppercase tracking-wider mb-0.5 opacity-60">Total a Pagar</p>

                    <div className="flex flex-col items-center">
                        <div className={`${isTouch ? 'text-4xl' : 'text-3xl'} font-extrabold tracking-tight font-numbers text-white`}>
                            ${totalUSD.toFixed(2)}
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <div className={`${isTouch ? 'text-sm' : 'text-[11px]'} font-bold text-emerald-400 font-numbers`}>
                                Bs {totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2 })}
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

            {/* 📜 CONTENT (LEFT) - ZERO SCROLL OPTIMIZED */}
            <div className={`flex-1 overflow-y-auto ${isTouch ? 'px-4 pb-4 pt-2 space-y-4' : 'px-4 pb-4 pt-1 space-y-2'}`} data-client-selector>
                <ClienteSelector
                    clienteSeleccionado={clienteSeleccionado}
                    setClienteSeleccionado={setClienteSeleccionado}
                    clientes={clientes}
                    agregarCliente={agregarCliente}
                    modo={modo}
                    proyeccion={proyeccion}
                    isTouch={isTouch}
                    isLocked={isChangeCredited}
                    isCompact={true} // 🚀 Mandatory for Zero-Scroll
                    isErrorMode={!isVueltoValido} // 🛡️ Reactive Highlight
                    clientSearchTrigger={clientSearchTrigger} // 🚀
                    onFinishSelection={onFinishSelection} // 🚀
                />

                <div className="space-y-2">
                    <div className={`flex justify-between items-center px-2 ${isTouch ? 'text-sm' : 'text-[11px]'}`}>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Monto Pagado:</span>
                        <span className="text-emerald-600 font-extrabold font-numbers">${totalPagadoGlobalUSD.toFixed(2)}</span>
                    </div>
                    {/* 🛡️ LAYOUT SHIFT FIX: FIXED HEIGHT PROTOCOL - UPDATED FOR VUELTO MIX (EXPANDED) */}
                    <div className={`relative w-full ${isTouch ? 'h-[480px]' : 'h-[360px]'} transition-all duration-300 overflow-hidden`}>

                        {/* 1. ESTADO: FALTA POR PAGAR (Contado) */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-500 ease-out ${(modo === 'contado' && faltaPorPagar > 0.01)
                            ? 'opacity-100 scale-100 translate-y-0 z-10 pointer-events-auto'
                            : 'opacity-0 scale-95 translate-y-4 z-0 pointer-events-none'
                            }`}>
                            <div className={`h-full flex flex-col justify-center items-center text-center ${isTouch ? 'p-5' : 'p-3'} rounded-xl border-2 border-slate-200 bg-white text-slate-600 shadow-sm`}>
                                <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Falta por Pagar</p>
                                <p className={`${isTouch ? 'text-5xl' : 'text-3xl'} font-black font-numbers text-slate-800 my-2 tracking-tight`}>
                                    ${faltaPorPagar.toFixed(2)}
                                </p>
                                <div className={`${isTouch ? 'text-xl' : 'text-base'} font-bold text-slate-400 font-numbers`}>
                                    Bs {(faltaPorPagar * tasaSegura).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* 2. ESTADO: CALCULADORA DE VUELTO (Contado - Pagado) */}
                        <div className={`absolute inset-0 w-full transition-all duration-500 ease-out ${(modo === 'contado' && faltaPorPagar <= 0.01)
                            ? 'opacity-100 scale-100 translate-y-0 z-10 pointer-events-auto'
                            : 'opacity-0 scale-95 -translate-y-4 z-0 pointer-events-none'
                            }`}>
                            <ChangeCalculator
                                cambioUSD={cambioUSD}
                                distVueltoUSD={distVueltoUSD}
                                distVueltoBS={distVueltoBS}
                                handleVueltoDistChange={handleVueltoDistChange}
                                tasa={tasaSegura}
                                isCredited={isChangeCredited}
                                onCreditChange={handleCreditChange}
                                onUndoCredit={() => setIsChangeCredited(false)}
                                isTouch={isTouch}
                                onFocusInput={onFocusInput}
                            />
                        </div>

                        {/* 3. ESTADO: QUEDA DEBIENDO (Crédito) */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-500 ease-out ${(modo !== 'contado')
                            ? 'opacity-100 scale-100 translate-y-0 z-10 pointer-events-auto'
                            : 'opacity-0 scale-95 translate-y-4 z-0 pointer-events-none'
                            }`}>
                            <div className={`h-full flex flex-col justify-center ${isTouch ? 'p-6' : 'p-4'} rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-800 shadow-sm`}>
                                <p className="text-[10px] font-bold uppercase opacity-70">Queda Debiendo</p>
                                <p className={`${isTouch ? 'text-5xl' : 'text-4xl'} font-extrabold font-numbers my-2`}>
                                    ${deudaCliente.toFixed(2)}
                                </p>
                                <div className={`${isTouch ? 'text-lg' : 'text-base'} font-bold text-orange-800 opacity-70`}>
                                    Bs {(deudaCliente * tasaSegura).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
