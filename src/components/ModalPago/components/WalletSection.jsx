import React from 'react';
import { Wallet } from 'lucide-react';

export default function WalletSection({
    isTouch,
    cliente,
    totalPagadoUSD,
    totalPagadoBS,
    tasaSegura,
    totalConIGTF,
    pagoSaldoFavor,
    setPagoSaldoFavor
}) {
    const saldoDisponible = parseFloat(cliente?.favor) || 0;
    if (saldoDisponible <= 0.01) return null;
    const pagadoOtros = totalPagadoUSD + (totalPagadoBS / tasaSegura);
    const faltaSinSaldo = Math.max(0, totalConIGTF - pagadoOtros);

    const handleUsarTodo = () => {
        console.log("⚡ Botón Usar Todo Clicked");
        console.log("Saldo Disponible:", saldoDisponible);
        console.log("Falta Sin Saldo:", faltaSinSaldo);
        console.log("Total Con IGTF:", totalConIGTF);
        console.log("Pagado Otros:", pagadoOtros);

        const aUsar = Math.min(saldoDisponible, faltaSinSaldo);
        console.log("A Usar (Calculado):", aUsar);

        setPagoSaldoFavor(aUsar.toFixed(2));
    };

    return (
        <div className={`${isTouch ? 'mb-8 p-6' : 'mb-6 p-4'} bg-primary-light border border-primary/20 rounded-xl flex flex-col sm:flex-row items-center gap-4 animate-in slide-in-from-top-4`}>
            <div className="flex items-center gap-3 flex-1">
                <div className={`${isTouch ? 'bg-primary/10 p-4' : 'bg-primary/10 p-3'} rounded-full text-primary`}>
                    <Wallet size={isTouch ? 32 : 24} />
                </div>
                <div>
                    <h4 className="font-bold text-primary/90 text-sm uppercase">Monedero Disponible</h4>
                    <div className={`${isTouch ? 'text-3xl' : 'text-2xl'} font-black text-primary font-numbers`}>${saldoDisponible.toFixed(2)}</div>
                </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary/60 font-bold">$</span>
                    <input
                        type="number"
                        value={pagoSaldoFavor}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (e.target.value === '' || (val >= 0 && val <= saldoDisponible)) {
                                setPagoSaldoFavor(e.target.value);
                            }
                        }}
                        placeholder="0.00"
                        className={`w-full pl-6 pr-3 ${isTouch ? 'py-4 text-xl' : 'py-2'} rounded-lg border-2 border-primary/30 focus:border-primary outline-none font-bold text-primary/90 text-right`}
                    />
                </div>
                <button
                    onClick={handleUsarTodo}
                    className={`${isTouch ? 'px-6 py-4 text-sm' : 'px-4 py-2 text-xs'} bg-primary hover:bg-primary/90 text-white font-bold rounded-lg transition-colors whitespace-nowrap`}
                >
                    ⚡ USAR TODO
                </button>
            </div>
        </div>
    );
}
