import React, { useEffect } from 'react';
import { DollarSign, Banknote, Wallet, ArrowDown, Sparkles, X, Zap, CloudDownload, CloudUpload } from 'lucide-react';

/**
 * ChangeCalculator.jsx (Refactorizado: VUELTO MIX)
 * Permite distribuir el vuelto dinámicamente entre Efectivo USD, Efectivo BS y Monedero.
 */
export default function ChangeCalculator({
  cambioUSD,
  distVueltoUSD,
  distVueltoBS,
  handleVueltoDistChange,
  tasa,
  isCredited,
  onCreditChange,
  onUndoCredit,
  isTouch = false,
  onFocusInput // 🆕 Para conectar con Teclado Numérico
}) {
  // 🚀 No early return before hooks!

  // Cálculos en tiempo real - BLINDAJE FÉNIX (fixFloat)
  const fix = (n) => parseFloat((parseFloat(n) || 0).toFixed(2));

  const valUSD = fix(distVueltoUSD);
  const valBS = fix(distVueltoBS);
  const sumaFisica = fix(valUSD + (valBS / (tasa || 1)));

  // Lo que sobra va al monedero (si está activo el Mix) o queda pendiente
  const remanente = fix(cambioUSD - sumaFisica);

  const handleFillAllUSD = () => {
    handleVueltoDistChange('usd', fix(valUSD + remanente).toFixed(2));
  };

  const handleFillAllBS = () => {
    const totalBsValue = (valBS + (remanente * (tasa || 1)));
    handleVueltoDistChange('bs', totalBsValue.toFixed(2));
  };

  // ⌨️ SHORTCUT: SPACE TO FILL ALL
  useEffect(() => {
    const handleKeyDown = (e) => {
      const activeElem = document.activeElement;

      // ⌨️ ATAJO: ESPACIO PARA LLENAR TODO
      if (e.code === 'Space' && remanente > 0.01) {
        const isInput = activeElem.tagName === 'INPUT';
        if (!isInput || activeElem.placeholder === "0.00") {
          e.preventDefault();
          const currency = activeElem.dataset.currency;
          if (currency === "BS") handleFillAllBS();
          else handleFillAllUSD();
        }
      }

      // 🎹 NAVEGACIÓN ENTRE MONEDAS DE VUELTO
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        const isChangeInput = activeElem.dataset.currency;
        if (!isChangeInput) return; // Solo si estamos dentro de la calculadora

        e.preventDefault();

        if (e.key === 'ArrowRight') {
          // 🚀 SALTO DE REGRESO: Flecha Derecha -> Zona de Pagos
          if (onFocusInput) onFocusInput(null); // Reset focus state
          setTimeout(() => {
            const firstPaymentInput = document.querySelector('input[inputmode="decimal"]');
            if (firstPaymentInput) firstPaymentInput.focus();
          }, 10);
          return;
        }

        const nextId = activeElem.dataset.currency === "USD" ? 'CHANGE_BS' : 'CHANGE_USD';
        if (onFocusInput) onFocusInput(nextId);

        // Forzar foco físico
        setTimeout(() => {
          const nextInput = document.querySelector(`[data-currency="${nextId === 'CHANGE_BS' ? 'BS' : 'USD'}"]`);
          if (nextInput) nextInput.focus();
        }, 10);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [remanente, valUSD, valBS, tasa]);

  // Validación de tolerancia para "Cuadre Exacto"
  const esExacto = Math.abs(remanente) < 0.01;
  const faltaDinero = remanente > 0.01;
  const excede = remanente < -0.01;

  // Efecto para limpiar inputs si desactivamos el Mix (Opcional, depende de UX)
  // No lo hacemos para no perder datos si el usuario se arrepiente.

  const handleSetAllWallet = () => {
    handleVueltoDistChange('usd', '');
    handleVueltoDistChange('bs', '');
  };

  // 📉 ESCALADO PROGRESIVO (LÍQUIDO)
  const getDynamicFontSize = (val) => {
    if (!isTouch) return 'text-sm'; // 🔒 Desktop Stable
    if (!val) return 'text-2xl';
    const len = val.toString().length;
    if (len <= 5) return 'text-2xl';     // 1-5 digits: Grande
    if (len <= 8) return 'text-xl';      // 6-8 digits: Mediano
    if (len <= 11) return 'text-lg';
    if (len <= 14) return 'text-base';
    return 'text-sm font-bold';
  };

  if (cambioUSD < 0.001) return null;

  return (
    <div className={`rounded-xl border overflow-hidden animate-in fade-in transition-all duration-300 ${isCredited ? 'border-indigo-300 bg-indigo-50/30' : 'border-emerald-300 bg-emerald-50/30'}`}>

      {/* 1. ENCABEZADO DEL VUELTO OBLIGATORIO - COMPACTO */}
      {/* 1. ENCABEZADO DEL VUELTO OBLIGATORIO - COMPACTO */}
      <div className={`${isTouch ? 'px-6 py-5' : 'px-4 py-2'} flex ${isTouch ? 'flex-col' : 'justify-between items-center'} ${isCredited ? 'bg-indigo-50 border-b border-indigo-100' : 'bg-emerald-50 border-b border-emerald-100'}`}>

        {/* LAYOUT TOUCH: Vertical Puro */}
        {isTouch ? (
          <div className="flex flex-col gap-0.5 w-full">
            <div className="flex justify-between items-start">
              <p className="text-xs font-bold uppercase tracking-wide opacity-60 text-slate-700">Vuelto Total</p>
              {/* Solo mostramos badge si es Mix, si es Manual va limpio */}
              {isCredited && (
                <div className="flex items-center gap-1.5 px-3 py-1 text-xs bg-indigo-100 text-indigo-700 rounded-lg shadow-sm border border-indigo-200">
                  <Banknote size={14} />
                  <span className="font-bold uppercase">Multimoneda</span>
                </div>
              )}
            </div>

            <span className={`text-3xl font-black font-numbers leading-tight mt-1 ${isCredited ? 'text-indigo-900' : 'text-emerald-900'}`}>
              ${cambioUSD.toFixed(2)}
            </span>

            <span className="text-base font-bold text-slate-500 font-numbers">
              ~ Bs {Math.round(cambioUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
            </span>
          </div>
        ) : (
          /* LAYOUT DESKTOP: Horizontal (Original) */
          <>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide opacity-50 text-slate-700">Vuelto Total</p>
              <div className="flex items-baseline gap-2">
                <span className={`text-lg font-black font-numbers ${isCredited ? 'text-indigo-900' : 'text-emerald-900'}`}>${cambioUSD.toFixed(2)}</span>
                <span className="text-[10px] font-bold opacity-60">~ Bs {Math.round(cambioUSD * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Badges Desktop */}
            {isCredited ? (
              <div className="flex items-center gap-1.5 px-2 py-0.5 text-[9px] bg-indigo-100 text-indigo-700 rounded-lg shadow-sm border border-indigo-200">
                <Sparkles size={12} />
                <span className="font-bold uppercase">Multimoneda</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 opacity-50">
                <span className="text-[9px] font-bold uppercase text-emerald-800">Modo Manual</span>
              </div>
            )}
          </>
        )}
      </div>

      {/* 2. ÁREA DE MEZCLA (MIXER) - COMPACTA */}
      <div className={`${isTouch ? 'p-6 space-y-5' : 'p-3 space-y-2'}`}>
        {/* Gaveta A: EFECTIVO USD */}
        <div className="flex items-center gap-4">
          <div className={`${isTouch ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl'} flex items-center justify-center shadow-sm border ${isCredited ? 'bg-white border-indigo-100 text-indigo-600' : 'bg-emerald-100 border-emerald-200 text-emerald-700'}`}>
            <DollarSign size={isTouch ? 24 : 18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 relative group/input">
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              data-currency="USD" // ⌨️ Shortcut anchor
              className={`w-full bg-white border border-slate-200 rounded-2xl ${isTouch ? 'px-14 py-4 h-20' : 'pl-10 pr-20 py-2 h-12'} ${getDynamicFontSize(distVueltoUSD)} font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-200 font-numbers placeholder:text-slate-300 shadow-sm`}
              value={distVueltoUSD}
              onChange={(e) => {
                let val = e.target.value;
                // 🛡️ Guard: No more than 2 decimals
                if (val.includes('.') && val.split('.')[1].length > 2) return;
                if (parseFloat(val) < 0) return;
                handleVueltoDistChange('usd', val);
              }}
              onWheel={(e) => e.target.blur()} // 🛡️ Bloquea cambio por scroll
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
              }}
              onFocus={(e) => {
                if (Number(e.target.value) === 0) handleVueltoDistChange('usd', '');
                if (onFocusInput) onFocusInput('CHANGE_USD'); // 🟢 Conexión Teclado
              }}
            />

            {/* Acciones Internas (Derecha) */}
            <div className={`absolute ${isTouch ? 'right-4' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-2`}>
              <button
                onClick={handleFillAllUSD}
                disabled={remanente <= 0.01}
                className={`p-1.5 rounded-xl transition-all active:scale-90 ${remanente > 0.01 ? 'text-slate-300 hover:text-amber-500 hover:bg-slate-100' : 'text-slate-200 opacity-20'}`}
                title="Asignar Restante"
              >
                <Zap size={16} fill="currentColor" />
              </button>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border bg-slate-100 text-slate-400 border-slate-200`}>
                USD
              </span>
            </div>
          </div>
        </div>

        {/* Gaveta B: EFECTIVO BS */}
        <div className="flex items-center gap-4">
          <div className={`${isTouch ? 'w-12 h-12 rounded-2xl' : 'w-10 h-10 rounded-xl'} flex items-center justify-center shadow-sm border ${isCredited ? 'bg-white border-indigo-100 text-blue-600' : 'bg-blue-100 border-blue-200 text-blue-700'}`}>
            <Banknote size={isTouch ? 24 : 18} strokeWidth={2.5} />
          </div>
          <div className="flex-1 relative group/input">
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              data-currency="BS" // ⌨️ Shortcut anchor
              className={`w-full bg-white border border-slate-200 rounded-2xl ${isTouch ? 'px-14 py-4 h-20' : 'pl-10 pr-20 py-2 h-12'} ${getDynamicFontSize(distVueltoBS)} font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-colors duration-200 font-numbers placeholder:text-slate-300 shadow-sm`}
              value={distVueltoBS}
              onChange={(e) => {
                let val = e.target.value;
                // 🛡️ Guard: No more than 2 decimals
                if (val.includes('.') && val.split('.')[1].length > 2) return;
                if (parseFloat(val) < 0) return;
                handleVueltoDistChange('bs', val);
              }}
              onWheel={(e) => e.target.blur()} // 🛡️ Bloquea cambio por scroll
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') e.preventDefault();
              }}
              onFocus={(e) => {
                if (Number(e.target.value) === 0) handleVueltoDistChange('bs', '');
                if (onFocusInput) onFocusInput('CHANGE_BS'); // 🟢 Conexión Teclado
              }}
            />

            {/* Acciones Internas (Derecha) */}
            <div className={`absolute ${isTouch ? 'right-4' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-2`}>
              <button
                onClick={handleFillAllBS}
                disabled={remanente <= 0.01}
                className={`p-1.5 rounded-xl transition-all active:scale-90 ${remanente > 0.01 ? 'text-slate-300 hover:text-amber-500 hover:bg-slate-100' : 'text-slate-200 opacity-20'}`}
                title="Asignar Restante en Bs"
              >
                <Zap size={16} fill="currentColor" />
              </button>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border bg-slate-100 text-slate-400 border-slate-200`}>
                BS
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SEPARADOR DINÁMICO - Solo en Touch para guía visual */}
      {isTouch && (
        <div className="flex justify-center -my-3 relative z-10 text-slate-300 opacity-50">
          <ArrowDown size={14} />
        </div>
      )}

      {/* 3. RESULTADO / ACCIÓN */}
      {isCredited ? (
        // --- MODO VUELTO MIX (Gaveta C: WALLET) ---
        // --- MODO VUELTO MIX (Gaveta C: WALLET) ---
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-4 shadow-lg text-white animate-in slide-in-from-bottom-2 relative overflow-hidden group border border-indigo-500/50">
          {/* Background Icon */}
          <div className="absolute -right-6 -bottom-6 p-4 opacity-10 group-hover:opacity-20 transition-opacity rotate-12">
            <Wallet size={100} />
          </div>

          <div className="flex flex-col items-center text-center relative z-10 gap-3">
            <div className="w-full">
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 mb-0.5">Restante a Monedero</p>
              {remanente >= 0 ? (
                <h3 className="text-3xl font-black font-numbers tracking-tight drop-shadow-sm">${remanente.toFixed(2)}</h3>
              ) : (
                <h3 className="text-xl font-bold text-red-200 flex justify-center items-center gap-2">
                  <span className="bg-red-500/20 px-2 py-0.5 rounded text-[10px] border border-red-500/30">EXCESO</span>
                  ${Math.abs(remanente).toFixed(2)}
                </h3>
              )}
              <p className="text-[9px] text-indigo-200 mt-1 leading-tight opacity-80 mx-auto max-w-[200px]">
                Saldo a favor para futuras compras.
              </p>
            </div>

            <div className="w-full flex flex-col gap-2 items-center border-t border-white/10 pt-3">
              <button
                onClick={handleSetAllWallet}
                className="w-full bg-white hover:bg-indigo-50 text-xs font-black text-indigo-700 px-4 py-2 rounded-xl shadow-lg shadow-indigo-900/20 transition-all active:scale-95 flex justify-center items-center gap-2 whitespace-nowrap"
                disabled={Math.abs(cambioUSD - remanente) < 0.01}
              >
                <ArrowDown size={14} strokeWidth={3} /> TODO AQUÍ
              </button>
              <button
                onClick={onUndoCredit}
                className="text-[10px] font-bold text-indigo-200 hover:text-white transition-colors hover:underline underline-offset-2 decoration-indigo-300/50"
              >
                CANCELAR DISTRIBUCIÓN
              </button>
            </div>
          </div>
        </div>
      ) : (
        // --- MODO MANUAL (SIMPLE) ---
        <div className="pt-2">
          {faltaDinero ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-red-500 uppercase flex items-center gap-1"><X size={14} /> Falta entregar:</span>
              <div className="text-right leading-none">
                <div className="text-base font-black text-red-600 font-numbers">${remanente.toFixed(2)}</div>
                <div className="text-[10px] font-bold text-red-400">~ Bs {Math.round(remanente * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}</div>
              </div>
            </div>
          ) : excede ? (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-3 flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-orange-500 uppercase">Excede por:</span>
              <span className="text-base font-black text-orange-600 font-numbers">${Math.abs(remanente).toFixed(2)}</span>
            </div>
          ) : (
            <div className="bg-emerald-100/50 border border-emerald-200 rounded-xl p-3 flex justify-center items-center mb-3 text-emerald-700 font-bold gap-2 text-sm">
              <Sparkles size={16} /> ¡Vuelto Exacto!
            </div>
          )}

          {/* ACTIVADOR DEL MIX */}
          {faltaDinero && (
            <button
              onClick={onCreditChange}
              className={`w-full ${isTouch ? 'py-5 text-base' : 'py-3 text-sm'} bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group active:scale-95`}
            >
              <Wallet size={isTouch ? 24 : 18} className="group-hover:-rotate-12 transition-transform" />
              DISTRIBUIR VUELTO
            </button>
          )}

          {esExacto && (
            <p className="text-center text-[10px] text-emerald-600 font-medium opacity-80">Todo será entregado en efectivo.</p>
          )}
        </div>
      )}

    </div>
  );
}