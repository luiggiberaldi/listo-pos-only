import React, { memo } from 'react';
import ClienteSelector from '../ClienteSelector';
import TransactionSummary from './TransactionSummary';
import ChangeProcessor from './ChangeProcessor';
import math from '../../../utils/mathCore';

const PaymentLeftColumn = ({
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
    isVueltoValido,
    clientSearchTrigger,
    onFinishSelection
}) => {
    return (
        <div className={`${isTouch ? 'lg:w-[30%]' : 'lg:w-1/3'} bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden`}>

            {/* 📌 MODULO 1: RESUMEN DE TRANSACCIÓN (Sticky Header) */}
            <TransactionSummary
                totalUSD={totalUSD}
                totalBS={totalBS}
                totalImpuesto={totalImpuesto}
                montoIGTF={montoIGTF}
                isTouch={isTouch}
            />

            {/* 📜 CONTENT (LEFT) - ZERO SCROLL OPTIMIZED */}
            <div className={`flex-1 overflow-y-auto ${isTouch ? 'px-4 pb-4 pt-2 space-y-4' : 'px-4 pb-4 pt-1 space-y-2'}`} data-client-selector>

                {/* 📌 MODULO 2: SELECTOR DE CLIENTES */}
                <ClienteSelector
                    clienteSeleccionado={clienteSeleccionado}
                    setClienteSeleccionado={setClienteSeleccionado}
                    clientes={clientes}
                    agregarCliente={agregarCliente}
                    modo={modo}
                    proyeccion={proyeccion}
                    isTouch={isTouch}
                    isLocked={isChangeCredited}
                    isCompact={true}
                    isErrorMode={!isVueltoValido}
                    clientSearchTrigger={clientSearchTrigger}
                    onFinishSelection={onFinishSelection}
                />

                <div className="space-y-2">
                    <div className={`flex justify-between items-center px-2 ${isTouch ? 'text-sm' : 'text-[11px]'}`}>
                        <span className="text-slate-400 font-bold uppercase tracking-tighter">Monto Pagado:</span>
                        <span className="text-emerald-600 font-extrabold font-numbers">${totalPagadoGlobalUSD.toFixed(2)}</span>
                    </div>

                    {/* 🛡️ LAYOUT SHIFT FIX: FIXED HEIGHT PROTOCOL */}
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
                                    Bs {math.round(faltaPorPagar * tasaSegura).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                        {/* 2. ESTADO: CHANGE PROCESSOR (Vuelto / Monedero) */}
                        <ChangeProcessor
                            isVisible={modo === 'contado' && faltaPorPagar <= 0.01}
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

                        {/* 3. ESTADO: QUEDA DEBIENDO (Crédito) */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-500 ease-out ${(modo !== 'contado')
                            ? 'opacity-100 scale-100 translate-y-0 z-10 pointer-events-auto'
                            : 'opacity-0 scale-95 translate-y-4 z-0 pointer-events-none'
                            }`}>
                            <div className={`h-full flex flex-col justify-center items-center text-center ${isTouch ? 'p-6' : 'p-4'} rounded-xl border-2 border-orange-200 bg-orange-50 text-orange-800 shadow-sm`}>
                                <p className="text-[10px] font-bold uppercase opacity-70">Queda Debiendo</p>
                                <p className={`${isTouch ? 'text-5xl' : 'text-4xl'} font-extrabold font-numbers my-2`}>
                                    ${deudaCliente.toFixed(2)}
                                </p>
                                <div className={`${isTouch ? 'text-lg' : 'text-base'} font-bold text-orange-800 opacity-70`}>
                                    Bs {math.round(deudaCliente * tasaSegura).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(PaymentLeftColumn);
