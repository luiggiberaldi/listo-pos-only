import React from 'react';
import Swal from 'sweetalert2';
import {
  DollarSign, Banknote, Smartphone, CreditCard, Wallet, Send, Bitcoin, Zap, Hash, Keyboard
} from 'lucide-react';

const ICON_MAP = { CreditCard, Smartphone, Banknote, Wallet, Send, Bitcoin, DollarSign };

/**
 * 🎨 HELPER: Estilos de Marca Auténticos
 */
const getBrandStyles = (name, type) => {
  const n = name.toLowerCase();
  if (n.includes('zelle')) return {
    text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', ring: 'focus:ring-purple-100',
    iconBg: 'bg-purple-100', activeRing: 'ring-purple-500/20 active-border-purple'
  };
  if (n.includes('binance') || n.includes('usdt')) return {
    text: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', ring: 'focus:ring-yellow-100',
    iconBg: 'bg-yellow-100', activeRing: 'ring-yellow-500/20 active-border-yellow'
  };
  if (n.includes('pago móvil') || type === 'BS') return {
    text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', ring: 'focus:ring-blue-100',
    iconBg: 'bg-blue-100', activeRing: 'ring-blue-500/20 active-border-blue'
  };
  // Default USD
  return {
    text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', ring: 'focus:ring-emerald-100',
    iconBg: 'bg-emerald-100', activeRing: 'ring-emerald-500/20 active-border-emerald'
  };
};

/**
 * ✅ SUB-COMPONENTE: INPUT DE PAGO INTELIGENTE
 */
const InputPago = React.forwardRef(({ label, icon: Icon, value, onChange, onAutoFill, moneda, onKeyDown, disabled, requiereRef, refPago, onChangeRef, tasa, isTouch, onFocus, isSelected, onFocusRef }, ref) => {

  const equivalenciaUSD = (moneda === 'BS' && value && tasa > 0)
    ? (parseFloat(value) / tasa).toFixed(2)
    : null;

  const brand = getBrandStyles(label, moneda);
  const isActive = value && parseFloat(value) > 0;

  // Condición para mostrar referencia: Requerido Y Monto > 0
  const showRef = requiereRef && isActive;

  // 📱 TOUCH ADAPTATIONS
  // 📱 TOUCH ADAPTATIONS
  const paddingY = isTouch ? 'py-5' : 'py-3';
  const heightClass = isTouch ? 'h-20' : 'h-14'; // 🔒 FIXED HEIGHT to prevent jumps
  const iconSize = isTouch ? 24 : 18;

  // 📉 ESCALADO PROGRESIVO (LÍQUIDO)
  const getDynamicFontSize = (val) => {
    // ⚠️ GUARD: Solo aplicar en modo táctil
    if (!isTouch) return 'text-lg';

    if (!val) return 'text-2xl';
    const len = val.toString().length;

    if (len <= 5) return 'text-2xl';     // 1-5: Grande
    if (len <= 8) return 'text-xl';      // 6-8: Mediano
    if (len <= 11) return 'text-lg';     // 9-11: Estándar
    if (len <= 14) return 'text-base';   // 12-14: Compacto
    return 'text-sm font-bold';          // 15+: Emergencia
  };

  const textSize = getDynamicFontSize(value);
  const labelSize = isTouch ? 'text-xs' : 'text-[10px]';
  const buttonSize = isTouch ? 'p-3' : 'p-1.5';
  const badgeSize = isTouch ? 'text-xs px-3 py-1' : 'text-[9px] px-1.5 py-0.5';

  return (
    <div className={`relative group transition-all duration-300 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
      {/* Label Flotante */}
      <div className={`flex justify-between items-center ${isTouch ? 'mb-2' : 'mb-1'} ml-1`}>
        <label className={`${labelSize} font-bold uppercase tracking-wider transition-colors ${isActive ? brand.text : 'text-slate-400'}`}>
          {label}
        </label>
      </div>

      <div className="flex flex-col">
        <div className="relative flex-1 group/input z-10">
          {/* Icono Izquierda con Branding */}
          <div className={`absolute ${isTouch ? 'left-6' : 'left-4'} top-1/2 -translate-y-1/2 transition-all duration-300 group-focus-within/input:scale-110 pointer-events-none ${isActive ? brand.text : 'text-slate-300'}`}>
            <Icon size={iconSize} strokeWidth={isActive ? 2.5 : 2} />
          </div>

          {/* Input Principal */}
          <input
            ref={ref}
            type="text"
            onFocus={onFocus}
            className={`w-full ${isTouch ? '!pl-14 !pr-24' : '!pl-12 !pr-20'} ${heightClass} rounded-xl outline-none transition-colors duration-200 font-bold text-content-main font-numbers ${textSize} shadow-sm
              ${isSelected
                ? `border-2 ${brand.border} ${brand.bg} ring-4 ${brand.activeRing}`
                : isActive
                  ? `border-2 ${brand.border} ${brand.bg} ring-1 ${brand.activeRing}`
                  : 'border-2 border-slate-200 bg-white hover:border-slate-300 focus:border-slate-400 focus:ring-4 focus:ring-slate-50'
              }
            `}
            placeholder="0.00"
            value={value}
            onChange={(e) => {
              let val = e.target.value;

              // 1. Aceptar números, puntos, comas Y disparadores ($, d, D, *)
              if (!/^[0-9.,$dD*]*$/.test(val)) return;

              // 2. Normalizar coma a punto
              val = val.replace(',', '.');

              // 3. MAGIC CONVERSION: Check for trailing triggers
              const lastChar = val.slice(-1);
              if (['$', 'd', 'D', '*'].includes(lastChar)) {
                const rawNum = parseFloat(val.slice(0, -1));
                if (!isNaN(rawNum)) {
                  // Calc: USD Amount * Rate
                  // Only apply conversion if we are in a BS field (or if logic demands it)
                  // If in USD field, "converting" USD to USD is just stripping the char.
                  const converted = moneda === 'BS'
                    ? (rawNum * tasa).toFixed(2)
                    : rawNum.toFixed(2);

                  // Bubble up the converted change
                  onChange({ target: { value: converted } });
                  return;
                }
              }

              // 4. Prevent multiple dots
              const dots = val.match(/\./g);
              if (dots && dots.length > 1) return;

              // Bubble up normal change
              onChange({ target: { value: val } });
            }}
            onKeyDown={(e) => {
              // 🎹 ATAJOS DE TECLADO ⚡
              if (e.key === ' ' || e.code === 'Space') { // Espacio -> Llenar todo
                e.preventDefault();
                if (onAutoFill) onAutoFill();
              }
              if (e.key === 'Escape') { // Escape -> Limpiar
                e.preventDefault();
                onChange({ target: { value: '' } });
              }
              if (onKeyDown) onKeyDown(e);
            }}
            disabled={disabled}
            inputMode="decimal"
          />

          {/* Acciones Internas (Derecha) */}
          <div className={`absolute ${isTouch ? 'right-4' : 'right-2'} top-1/2 -translate-y-1/2 flex items-center gap-2`}>
            {!disabled && (
              <button
                onClick={onAutoFill}
                className={`${buttonSize} rounded-xl transition-all active:scale-90 ${isActive ? 'text-slate-400 hover:text-amber-500 hover:bg-white/50' : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'}`}
                title="Completar Saldo"
                tabIndex="-1"
              >
                <Zap size={isTouch ? 24 : 16} fill="currentColor" />
              </button>
            )}

            <span className={`${badgeSize} font-black rounded-lg cursor-default select-none border items-center flex
              ${isActive ? `bg-white/50 ${brand.text} ${brand.border}` : 'bg-slate-100 text-slate-400 border-slate-200'}
            `}>
              {moneda}
            </span>
          </div>

          {/* Equivalencia Flotante (Solo BS) */}
          {equivalenciaUSD && (
            <div className={`absolute -bottom-3 right-4 translate-y-full ${isTouch ? 'text-sm px-4 py-1.5' : 'text-[9px] px-2 py-0.5'} font-black text-blue-600 animate-in fade-in slide-in-from-top-1 bg-white rounded-full border-2 border-blue-100 shadow-md z-20`}>
              ${equivalenciaUSD}
            </div>
          )}
        </div>

        {/* Input Referencia Inteligente (Animado - Vertical Stack) */}
        {requiereRef && (
          <div
            className={`transition-all duration-300 ease-out origin-top w-full ${showRef ? 'max-h-20 opacity-100 scale-100' : 'max-h-0 opacity-0 scale-95 overflow-hidden'}`}
            style={{ marginTop: equivalenciaUSD && showRef ? '1.5rem' : '0.5rem' }}
          >
            <div className="relative h-12">
              <div className={`absolute ${isTouch ? 'left-5' : 'left-3'} top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none`}><Hash size={isTouch ? 20 : 13} /></div>
              <input
                type="text"
                className={`w-full h-full ${isTouch ? '!pl-12 !pr-4' : '!pl-9 !pr-3'} border rounded-xl outline-none font-mono font-bold shadow-sm transition-all
                  ${isActive ? `${brand.border} bg-white text-slate-600 focus:ring-2 ${brand.ring}` : 'border-slate-200'} ${isTouch ? 'text-lg' : 'text-[11px]'}
                `}
                placeholder={isTouch ? "Referencia" : "# Referencia..."}
                value={refPago || ''}
                onChange={onChangeRef}
                onFocus={onFocusRef}
                maxLength={8}
                tabIndex={showRef ? 0 : -1}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default function PaymentForm({
  metodosDivisa,
  metodosBs,
  pagos,
  handleInputChange,
  llenarSaldo,
  referencias,
  handleRefChange,
  inputRefs,
  handleInputKeyDown,
  modo,
  tasa,
  sumarBillete,
  isTouch = false,
  onFocusInput,
  activeInputId,
  onFocusRef
}) {

  const renderQuickCash = ({ id, brand }) => (
    <div className={`flex flex-wrap gap-2 ${isTouch ? 'mt-4' : 'mt-2'} animate-in fade-in duration-500 px-1`}>
      {[1, 5, 10, 20, 50, 100].map(den => (
        <button
          key={den}
          type="button"
          onClick={() => sumarBillete(id, den)}
          className={`flex-1 font-bold rounded-xl border-2 shadow-sm transition-all active:scale-95 flex items-center justify-center
            ${isTouch ? 'py-4 text-xl min-w-[60px] min-h-[60px]' : 'text-xs py-1.5 min-w-[35px]'}
            bg-white text-slate-600 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50 active:bg-emerald-100
          `}
        >
          {den}
        </button>
      ))}
    </div>
  );

  // ℹ️ HELPER: Mostrar guía de atajos
  const showShortcutsGuide = () => {
    Swal.fire({
      title: 'Atajos de Teclado ⌨️',
      html: `
        <div class="text-left text-sm space-y-4">
          <div class="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <h4 class="font-bold text-slate-700 mb-2 flex items-center gap-2">⚡ Velocidad y Navegación</h4>
            <ul class="space-y-1 text-slate-600">
              <li><kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">C</kbd> : Buscar / Asignar Cliente.</li>
              <li><kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">Enter</kbd> : (Buscador) Elegir primer cliente y saltar a pago.</li>
              <li><kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">←</kbd> <kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">→</kbd> : Saltar entre Métodos de Pago y Vueltos.</li>
              <li><kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">↑</kbd> <kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">↓</kbd> : Navegar entre filas (Pagos o Vueltos).</li>
              <li><kbd class="px-2 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">Espacio</kbd> : Llenar con saldo restante.</li>
              <li><kbd class="px-1.5 py-0.5 rounded bg-white border shadow-sm text-xs font-bold font-mono">Esc</kbd> : Limpiar campo / Cerrar Buscador.</li>
            </ul>
          </div>
          
          <div class="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
            <h4 class="font-bold text-indigo-700 mb-2 flex items-center gap-2">💱 Conversión Mágica (USD -> BS)</h4>
            <p class="text-xs text-indigo-600 mb-2">Escribe en dólares y termina con:</p>
            <ul class="space-y-1 text-indigo-600">
              <li><kbd class="px-2 py-0.5 rounded bg-white border border-indigo-200 shadow-sm text-xs font-bold font-mono">*</kbd> : Ideal teclado numérico.</li>
              <li><kbd class="px-2 py-0.5 rounded bg-white border border-indigo-200 shadow-sm text-xs font-bold font-mono">D</kbd> : Ideal laptop.</li>
            </ul>
          </div>
        </div>
      `,
      confirmButtonText: '¡Entendido!',
      confirmButtonColor: '#10b981' // Emerald-500
    });
  };

  return (
    <div className={`grid grid-cols-1 ${isTouch ? 'md:grid-cols-2 gap-8' : 'sm:grid-cols-2 gap-4 lg:gap-6'} items-start`}>
      {/* TARJETA DIVISAS */}
      <div className={`bg-emerald-50/20 border border-emerald-100/60 rounded-3xl ${isTouch ? 'p-8' : 'p-4 sm:p-5'} flex flex-col gap-6 backdrop-blur-sm min-h-full transition-all`}>
        <h3 className={`font-bold text-emerald-900 flex items-center gap-2 ${isTouch ? 'text-lg' : 'text-sm'} uppercase tracking-wide border-b border-emerald-100 pb-3`}>
          <div className={`${isTouch ? 'p-2' : 'p-1.5'} bg-emerald-100 rounded-xl text-emerald-700`}><DollarSign size={isTouch ? 24 : 16} strokeWidth={3} /></div>
          Divisas ($)
        </h3>

        <div className={`space-y-${isTouch ? '8' : '4'}`}>
          {metodosDivisa.map((m, idx) => {
            const Icon = ICON_MAP[m.icono] || DollarSign;
            const esEfectivo = m.nombre.toLowerCase().includes('efectivo') || m.icono === 'Banknote' || m.icono === 'DollarSign';
            const brand = getBrandStyles(m.nombre, 'USD');

            return (
              <div key={m.id} className={`${isTouch ? 'mb-4 last:mb-0' : ''}`}>
                <InputPago ref={el => inputRefs.current[idx] = el}
                  label={m.nombre} icon={Icon}
                  value={pagos[m.id] || ''}
                  onChange={e => handleInputChange(m.id, e.target.value)}
                  onAutoFill={() => llenarSaldo(m.id, 'USD')}
                  moneda="USD"
                  onKeyDown={(e) => handleInputKeyDown(e, idx, m.id, 'USD')}
                  requiereRef={m.requiereRef}
                  refPago={referencias[m.id]}
                  onChangeRef={(e) => handleRefChange(m.id, e.target.value)}
                  disabled={false}
                  tasa={tasa}
                  isTouch={isTouch}
                  onFocus={() => onFocusInput(m.id)}
                  isSelected={activeInputId === m.id}
                  onFocusRef={() => onFocusRef(m.id)}
                />
                {esEfectivo && renderQuickCash({ id: m.id, brand })}
              </div>
            )
          })}
        </div>
      </div>

      {/* TARJETA BOLÍVARES */}
      <div className={`bg-blue-50/20 border border-blue-100/60 rounded-3xl ${isTouch ? 'p-8' : 'p-4 sm:p-5'} flex flex-col gap-6 backdrop-blur-sm min-h-full transition-all`}>
        <div className={`flex ${isTouch ? 'flex-col items-start gap-2' : 'justify-between items-center'} border-b border-blue-100 pb-3`}>
          <h3 className={`font-bold text-blue-900 flex items-center gap-2 ${isTouch ? 'text-lg' : 'text-sm'} uppercase tracking-wide`}>
            <div className={`${isTouch ? 'p-2' : 'p-1.5'} bg-blue-100 rounded-xl text-blue-700`}><Banknote size={isTouch ? 24 : 16} strokeWidth={3} /></div>
            Bolívares (Bs)
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={showShortcutsGuide}
              className={`p-2 rounded-xl text-blue-400 hover:text-blue-600 hover:bg-blue-100 transition-colors`}
              title="Ver Atajos de Teclado"
            >
              <Keyboard size={isTouch ? 24 : 18} />
            </button>
            <div className={`${isTouch ? 'px-4 py-2' : 'px-2.5 py-1'} bg-white text-blue-700 rounded-xl border border-blue-100 flex items-center gap-1.5 shadow-sm`}>
              <span className="text-[9px] font-bold uppercase opacity-60">Tasa:</span>
              <span className={`${isTouch ? 'text-lg' : 'text-sm'} font-black font-numbers`}>{tasa.toFixed(2)}</span>
            </div>
          </div>
        </div>

        <div className={`space-y-${isTouch ? '8' : '4'}`}>
          {metodosBs.map((m, idx) => {
            const realIdx = idx + metodosDivisa.length;
            const Icon = ICON_MAP[m.icono] || Banknote;
            return (
              <div key={m.id} className={`${isTouch ? 'mb-4 last:mb-0' : ''}`}>
                <InputPago key={m.id} ref={el => inputRefs.current[realIdx] = el}
                  label={m.nombre} icon={Icon}
                  value={pagos[m.id] || ''}
                  onChange={e => handleInputChange(m.id, e.target.value)}
                  onAutoFill={() => llenarSaldo(m.id, 'BS')}
                  moneda="BS"
                  onKeyDown={(e) => handleInputKeyDown(e, realIdx, m.id, 'BS')}
                  requiereRef={m.requiereRef}
                  refPago={referencias[m.id]}
                  onChangeRef={(e) => handleRefChange(m.id, e.target.value)}
                  disabled={false}
                  tasa={tasa}
                  isTouch={isTouch}
                  onFocus={() => onFocusInput(m.id)}
                  isSelected={activeInputId === m.id}
                  onFocusRef={() => onFocusRef(m.id)}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  );
}