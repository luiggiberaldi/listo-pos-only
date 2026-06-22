import React, { memo } from 'react';
import ClienteSelector from '../ClienteSelector';
import TransactionSummary from './TransactionSummary';
import ChangeProcessor from './ChangeProcessor';
import math from '../../../utils/mathCore';
import CasheaIcon from '../../CasheaIcon';

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
    onFinishSelection,
    casheaActive,
    setCasheaActive,
    casheaPercent,
    setCasheaPercent,
    casheaAmountUsd
}) => {
    return (
        <div className={`${isTouch ? 'lg:w-[30%]' : 'lg:w-1/3'} bg-app-light dark:bg-app-dark border-r border-border-subtle dark:border-slate-700 flex flex-col overflow-hidden`}>

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

                {/* 🏪 TARJETA DE PAGO CASHEA */}
                {configuracion?.casheaActivo && totalUSD >= (configuracion?.casheaMinimo || 0) && clienteSeleccionado && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 rounded-xl space-y-3 shadow-sm animate-in fade-in duration-300">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CasheaIcon size={22} />
                                <span className="font-extrabold text-sm text-purple-950 dark:text-purple-300 uppercase tracking-wide">Pago Cashea</span>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={casheaActive}
                                    onChange={(e) => setCasheaActive(e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-purple-600"></div>
                            </label>
                        </div>

                        {casheaActive && (
                            <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                                <div>
                                    <label className="text-[10px] font-bold text-purple-800 dark:text-purple-400 uppercase tracking-tighter block mb-1">
                                        Cuota Inicial (%):
                                    </label>
                                    <div className="grid grid-cols-4 gap-1">
                                        {[30, 40, 50, 60].map((pct) => (
                                            <button
                                                key={pct}
                                                type="button"
                                                onClick={() => setCasheaPercent(pct)}
                                                className={`py-1 text-xs font-black rounded-lg transition-all ${
                                                    casheaPercent === pct
                                                        ? 'bg-purple-600 text-white shadow-md'
                                                        : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40 hover:bg-purple-100'
                                                }`}
                                            >
                                                {pct}%
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="p-2.5 bg-white dark:bg-slate-900 border border-purple-100 dark:border-purple-900/20 rounded-lg space-y-1.5 text-xs">
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-content-secondary">PAGA HOY (Inicial):</span>
                                        <span className="font-extrabold text-slate-800 dark:text-slate-200">
                                            ${math.round(totalUSD - casheaAmountUsd).toFixed(2)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center text-[11px]">
                                        <span className="text-content-secondary">FINANCIADO CASHEA:</span>
                                        <span className="font-black text-purple-600 dark:text-purple-400">
                                            ${casheaAmountUsd.toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-2">
                    <div className={`flex justify-between items-center px-2 ${isTouch ? 'text-sm' : 'text-[11px]'}`}>
                        <span className="text-content-secondary font-bold uppercase tracking-tighter">Monto Pagado:</span>
                        <span className="text-status-success font-extrabold font-numbers">${totalPagadoGlobalUSD.toFixed(2)}</span>
                    </div>

                    {/* 🛡️ LAYOUT SHIFT FIX: FIXED HEIGHT PROTOCOL */}
                    <div className={`relative w-full ${isTouch ? 'h-[480px]' : 'h-[360px]'} transition-all duration-300 overflow-hidden`}>

                        {/* 1. ESTADO: FALTA POR PAGAR (Contado) */}
                        <div className={`absolute inset-0 w-full flex flex-col transition-all duration-500 ease-out ${(modo === 'contado' && faltaPorPagar > 0.01)
                            ? 'opacity-100 scale-100 translate-y-0 z-10 pointer-events-auto'
                            : 'opacity-0 scale-95 translate-y-4 z-0 pointer-events-none'
                            }`}>
                            <div className={`h-full flex flex-col justify-center items-center text-center ${isTouch ? 'p-5' : 'p-3'} rounded-xl border-2 border-border-subtle dark:border-slate-700 bg-surface-light dark:bg-surface-dark text-content-main dark:text-content-inverse shadow-sm`}>
                                <p className="text-[10px] font-bold uppercase opacity-70 tracking-widest">Falta por Pagar</p>
                                <p className={`${isTouch ? 'text-5xl' : 'text-3xl'} font-black font-numbers text-content-main dark:text-content-inverse my-2 tracking-tight`}>
                                    ${faltaPorPagar.toFixed(2)}
                                </p>
                                <div className={`${isTouch ? 'text-xl' : 'text-base'} font-bold text-content-secondary font-numbers`}>
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
                            <div className={`h-full flex flex-col justify-center items-center text-center ${isTouch ? 'p-6' : 'p-4'} rounded-xl border-2 border-status-warning/30 bg-status-warningBg text-orange-800 shadow-sm`}>
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
