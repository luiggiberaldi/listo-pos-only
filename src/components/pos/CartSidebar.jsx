// ✅ REFACTORED - V. 5.0 (ZUSTAND DIRECT CONNECTION)
// Archivo: src/components/pos/CartSidebar.jsx
// Antes: Recibía 12 props. Ahora se conecta directamente a stores.

import React, { memo } from 'react';
import { ShoppingBasket, Layers, Package, Scale, Calculator, X, Minus, Plus, Save, Loader2, PauseCircle, Search, AlertTriangle } from 'lucide-react';
import { useCartSidebar } from '../../hooks/useCartSidebar';
import { Assistant } from '../ghost/Assistant';
import CartItem from './CartItem';
import { useCartStore } from '../../stores/useCartStore';
import { usePosCalcStore } from '../../stores/usePosCalcStore';
import { usePosActionsStore } from '../../stores/usePosActionsStore';
import { useUIStore } from '../../stores/useUIStore';

const CartSidebar = ({
  cartSelectedIndex,  // Keyboard navigation (from usePosKeyboard)
  focusCartItem       // Keyboard navigation callback
}) => {
  // 🧠 DIRECT STORE CONNECTION
  const carrito = useCartStore(s => s.carrito);
  const isProcessing = useUIStore(s => s.isProcessing);

  // Calculations
  const subtotalBase = usePosCalcStore(s => s.subtotalBase);
  const totalUSD = usePosCalcStore(s => s.totalUSD);
  const totalBS = usePosCalcStore(s => s.totalBS);
  const tasaInvalida = usePosCalcStore(s => s.tasaInvalida);
  const carritoBS = usePosCalcStore(s => s.carritoBS);

  // Build calculos object for CartItem compatibility
  const calculos = { subtotalBase, totalUSD, totalBS, carritoBS };

  // Actions
  const eliminarItem = usePosActionsStore(s => s.eliminarItem);
  const cambiarCant = usePosActionsStore(s => s.cambiarCant);
  const cambiarUnidad = usePosActionsStore(s => s.cambiarUnidad);
  const cobrar = usePosActionsStore(s => s.cobrar);
  const espera = usePosActionsStore(s => s.espera);

  // Use Custom Hook for Logic
  const {
    viewMode,
    searchTerm,
    setSearchTerm,
    scrollContainerRef,
    filteredCart,
    handleQtyChangeSafe,
    handleInputChangeSafe,
    getStep,
    getMinQty
  } = useCartSidebar({ carrito, onChangeQty: cambiarCant, isProcessing });

  const lastAddedIndex = carrito.length - 1;

  return (
    <div className="w-[450px] bg-surface-light dark:bg-surface-dark border-l border-border-subtle flex flex-col shadow-2xl z-20 relative transition-all">

      {/* CAPA DE BLOQUEO */}
      {isProcessing && (
        <div className="absolute inset-0 bg-surface-light/50 dark:bg-surface-dark/50 backdrop-blur-sm z-50 flex items-center justify-center cursor-wait">
          <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl shadow-xl flex flex-col items-center animate-bounce">
            <Loader2 size={32} className="animate-spin text-primary" />
            <span className="text-xs font-bold mt-2 text-content-main">PROCESANDO...</span>
          </div>
        </div>
      )}

      {/* Header Optimizado */}
      <div className="p-4 bg-surface-light dark:bg-surface-dark border-b border-border-subtle space-y-3">
        <div className="flex justify-between items-center bg-app-light dark:bg-app-dark p-1 rounded-xl pr-3">
          <h2 className="font-black text-xl flex items-center gap-2 text-content-main">
            <div className="bg-primary text-white p-2 rounded-lg shadow-primary/30 shadow-md"><ShoppingBasket size={20} /></div>
            Cesta ({carrito.length})
          </h2>
          <Assistant variant="inline" />
        </div>

        {/* Buscador de Cesta */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary" />
          <input
            type="text"
            placeholder="Buscar en la cesta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-app-light dark:bg-app-dark pl-9 pr-3 py-2 rounded-lg text-sm border border-border-subtle focus:ring-2 focus:ring-primary/50 focus:outline-none placeholder:text-content-secondary/50"
          />
        </div>
      </div>

      {/* Lista de Items */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-app-light dark:bg-app-dark scroll-smooth"
      >
        {carrito.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-content-secondary/30 gap-3">
            <ShoppingBasket size={64} strokeWidth={1} />
            <p className="text-sm font-bold text-content-secondary/50">Tu cesta está vacía</p>
          </div>
        ) : (
          filteredCart.map((item) => {
            const realIndex = carrito.indexOf(item);

            return (
              <CartItem
                key={`${item.id}-${realIndex}`}
                item={item}
                realIndex={realIndex}
                lastAddedIndex={lastAddedIndex}
                calculos={calculos}
                viewMode={viewMode}
                isProcessing={isProcessing}
                onRemoveItem={eliminarItem}
                handleQtyChangeSafe={handleQtyChangeSafe}
                handleInputChangeSafe={handleInputChangeSafe}
                onChangeUnit={cambiarUnidad}
                getStep={getStep}
                getMinQty={getMinQty}
                carrito={carrito}
                isKeyboardSelected={realIndex === cartSelectedIndex}
                onFocusItem={() => focusCartItem && focusCartItem(realIndex)}
              />
            );
          })
        )}
      </div>

      {/* Footer Totales y Acciones */}
      <div className="p-5 bg-surface-light dark:bg-surface-dark border-t border-border-subtle shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-30">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-content-secondary">Subtotal</span>
          <span className="text-base font-bold text-content-main">${subtotalBase.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-dashed border-border-subtle mb-4 gap-2">
          <div>
            <p className="text-xs text-content-secondary font-bold uppercase tracking-wider">Total $</p>
            <p className="text-4xl font-black text-content-main leading-none tracking-tight">${totalUSD.toFixed(2)}</p>
          </div>
          <div className="text-right bg-app-light dark:bg-app-dark p-3 rounded-xl border border-border-subtle flex-1 min-w-0">
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">BOLÍVARES</p>
            <p className="text-3xl font-black text-primary leading-none truncate">
              {Math.round(totalBS).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* BOTÓN PONER EN ESPERA (F6) */}
          <button
            onClick={() => espera(totalUSD)}
            disabled={carrito.length === 0 || isProcessing}
            className="px-4 py-4 bg-status-warningBg hover:bg-status-warningBg/80 text-status-warning border border-status-warning/30 rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Poner en Espera (F6)"
          >
            <PauseCircle size={24} />
          </button>

          {/* BOTÓN COBRAR (F9) */}
          <button
            onClick={cobrar}
            disabled={carrito.length === 0 || isProcessing || tasaInvalida}
            className={`
                flex-1 py-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg 
                ${tasaInvalida
                ? 'bg-red-500/50 cursor-not-allowed opacity-50'
                : isProcessing
                  ? 'bg-content-secondary cursor-wait shadow-none opacity-80'
                  : 'bg-status-success hover:bg-emerald-500 active:scale-95 shadow-lg shadow-status-success/30'
              }
            `}
            title={tasaInvalida ? 'Tasa de cambio no configurada. Ve a Configuración.' : 'Cobrar (F9)'}
          >
            {tasaInvalida ? <AlertTriangle size={20} /> : isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {tasaInvalida ? 'BLOQUEADO' : isProcessing ? 'PROCESANDO...' : 'COBRAR'}
            {!isProcessing && !tasaInvalida && <span className="opacity-50 text-xs font-normal ml-1">F9</span>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(CartSidebar);