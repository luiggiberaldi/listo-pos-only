// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (UX OPTIMIZED FOR LARGE ORDERS)
// Archivo: src/components/pos/CartSidebar.jsx

import React, { useState, useMemo } from 'react';
import { ShoppingBasket, Layers, Package, Scale, Calculator, X, Minus, Plus, Save, Loader2, PauseCircle, Search, List, Grid, AlertTriangle } from 'lucide-react';

export default function CartSidebar({
  carrito,
  calculos,
  onRemoveItem,
  onChangeQty,
  onChangeUnit, // 🆕
  onCheckout,
  onHold,
  isProcessing
}) {
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'list'
  const [searchTerm, setSearchTerm] = useState('');

  const lastAddedIndex = carrito.length - 1;
  const getMinQty = (tipoUnidad) => (tipoUnidad === 'peso' ? 0.005 : 1);
  const getStep = (tipoUnidad) => (tipoUnidad === 'peso' ? 0.05 : 1);

  // 🔎 1. SMART FIND (Filtrado)
  const filteredCart = useMemo(() => {
    if (!searchTerm) return carrito;
    const term = searchTerm.toLowerCase();
    return carrito.filter(item => item.nombre.toLowerCase().includes(term));
  }, [carrito, searchTerm]);

  const handleQtyChangeSafe = (index, item, delta) => {
    if (isProcessing) return;
    const min = getMinQty(item.tipoUnidad);
    const nuevaCantidad = item.cantidad + delta;
    if (nuevaCantidad < min) return;
    const cantidadFinal = item.tipoUnidad === 'peso' ? Math.round(nuevaCantidad * 1000) / 1000 : Math.floor(nuevaCantidad);
    onChangeQty(index, cantidadFinal);
  };

  const handleInputChangeSafe = (index, item, valueStr) => {
    if (isProcessing) return;
    const min = getMinQty(item.tipoUnidad);
    let val = parseFloat(valueStr);
    if (isNaN(val)) val = min;
    if (val < min) val = min;
    onChangeQty(index, val);
  };

  // 🧠 SMART VIEW ZERO-UI: Bidireccional estricto (Sin botones)
  React.useEffect(() => {
    if (carrito.length > 4) {
      if (viewMode !== 'list') setViewMode('list');
    } else {
      if (viewMode !== 'cards') setViewMode('cards');
    }
  }, [carrito.length, viewMode]);

  // 📜 AUTO-SCROLL: Mantener último item visible
  const scrollContainerRef = React.useRef(null);

  React.useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [carrito.length, viewMode]);

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
        <div className="flex justify-between items-center">
          <h2 className="font-black text-xl flex items-center gap-2 text-content-main">
            <div className="bg-primary text-white p-2 rounded-lg shadow-primary/30 shadow-md"><ShoppingBasket size={20} /></div>
            Cesta ({carrito.length})
          </h2>
          {/* ZERO UI: Botones eliminados por automatización total */}
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
            // FIX: Encontrar index original para no romper callbacks
            const realIndex = carrito.indexOf(item);

            let Badge = null;
            if (item.unidadVenta === 'bulto') {
              Badge = <span className="text-[9px] font-black uppercase text-purple-700 bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Layers size={9} /> BULT x{item.jerarquia?.bulto?.contenido || 1}</span>;
            } else if (item.unidadVenta === 'paquete') {
              Badge = <span className="text-[9px] font-black uppercase text-blue-700 bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Package size={9} /> PACK x{item.jerarquia?.paquete?.contenido || 1}</span>;
            } else if (item.tipoUnidad === 'peso') {
              Badge = <span className="text-[9px] font-black uppercase text-orange-800 bg-orange-100 border border-orange-200 px-1.5 py-0.5 rounded flex items-center gap-1"><Scale size={9} /> PESO</span>;
            }

            const precioItem = parseFloat(item.precio) || 0;
            const totalItem = precioItem * (parseFloat(item.cantidad) || 0);
            const totalItemBs = calculos.carritoBS[realIndex] || (totalItem * calculos.tasa);
            const step = getStep(item.tipoUnidad);
            const minQty = getMinQty(item.tipoUnidad);
            const isMin = item.cantidad <= minQty;

            // 🛑 1. ALERTAS DE "DEDAZO" / STOCK  (Propuesta 2)
            const isHighQty = item.cantidad >= 10 && item.tipoUnidad !== 'peso';
            const isHighValue = totalItem > 100; // Umbral $100
            const isSuspicious = isHighQty || isHighValue;

            // Stock Logic (Propuesta 1)
            const stockActual = parseFloat(item.stock) || 0;
            const itemsMismoId = carrito.filter(i => i.id === item.id);
            let totalConsumo = 0;
            itemsMismoId.forEach(i => {
              let f = 1;
              if (i.unidadVenta === 'bulto') f = parseFloat(i.jerarquia?.bulto?.contenido || 1);
              else if (i.unidadVenta === 'paquete') f = parseFloat(i.jerarquia?.paquete?.contenido || 1);
              totalConsumo += (i.cantidad * f);
            });
            const isExceeded = item.tipoUnidad !== 'peso' && totalConsumo > stockActual;

            // --- VISTA COMPACTA (Propuesta 3) ---
            if (viewMode === 'list') {
              return (
                <div key={`${item.id}-${realIndex}`} className={`flex items-center gap-2 p-2 rounded-lg border bg-surface-light dark:bg-surface-dark transition-colors ${isExceeded ? 'border-status-danger bg-status-dangerBg/10' : (isSuspicious ? 'border-status-warning bg-status-warningBg/10' : 'border-border-subtle')}`}>
                  {/* THUMBNAIL MINI */}
                  <div className="w-12 h-12 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden relative">
                    {item.imagen ? (
                      <img src={item.imagen} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-300 dark:text-slate-600">
                        {item.nombre ? item.nombre.substring(0, 2).toUpperCase() : 'NA'}
                      </div>
                    )}
                  </div>

                  <div className="w-[80px] flex items-center gap-1">
                    <button onClick={() => handleQtyChangeSafe(realIndex, item, -step)} disabled={isMin || isProcessing} className="w-6 h-6 flex items-center justify-center rounded bg-app-light hover:bg-border-subtle disabled:opacity-30"><Minus size={12} /></button>
                    <span className={`flex-1 text-center font-mono font-bold text-sm ${isSuspicious ? 'text-status-warning' : ''}`}>{item.cantidad}</span>
                    <button onClick={() => handleQtyChangeSafe(realIndex, item, step)} disabled={isProcessing} className="w-6 h-6 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20"><Plus size={12} /></button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      {isExceeded && <span className="text-[9px] bg-status-danger text-white px-1 rounded font-bold">S/S</span>}
                      {isSuspicious && <AlertTriangle size={12} className="text-status-warning" />}
                      <span className="truncate text-sm font-medium text-content-main">{item.nombre}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-content-secondary">
                      {Badge}
                      <span>${precioItem.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-content-main">${totalItem.toFixed(2)}</div>
                    <button onClick={() => !isProcessing && onRemoveItem(realIndex)} className="text-xs text-status-danger hover:underline">Quitar</button>
                  </div>
                </div>
              );
            }

            // --- VISTA TARJETAS (Original Mejorada) ---
            return (
              <div key={`${item.id}-${realIndex}`} className={`relative bg-surface-light dark:bg-surface-dark p-3 rounded-xl border shadow-sm transition-all group animate-in slide-in-from-right-2 ${realIndex === lastAddedIndex ? 'border-primary ring-2 ring-primary/30 shadow-md z-10' : (isExceeded ? 'border-status-danger ring-1 ring-status-danger/30' : (isSuspicious ? 'border-status-warning ring-1 ring-status-warning/30 bg-status-warning/5' : 'border-border-subtle'))}`}>
                <div className="flex justify-between items-start mb-2 gap-2">
                  {/* THUMBNAIL (Card Mode) */}
                  <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-shrink-0 overflow-hidden relative">
                    {item.imagen ? (
                      <img src={item.imagen} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[10px] font-black text-slate-300 dark:text-slate-600">
                        {item.nombre ? item.nombre.substring(0, 2).toUpperCase() : 'NA'}
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {Badge}
                      {item.cantidad === 1 && item.tipoUnidad !== 'peso' && !isProcessing ? (
                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-md p-0.5 border border-slate-200 dark:border-slate-700">
                          {/* UNIDAD */}
                          <button
                            onClick={(e) => { e.stopPropagation(); onChangeUnit(realIndex, 'unidad'); }}
                            className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${(!item.unidadVenta || item.unidadVenta === 'unidad') ? 'bg-white shadow text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                          >U</button>

                          {/* PAQUETE */}
                          {item.jerarquia?.paquete?.activo && item.jerarquia.paquete.seVende !== false && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onChangeUnit(realIndex, 'paquete'); }}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${item.unidadVenta === 'paquete' ? 'bg-blue-50 text-blue-700 shadow border border-blue-100' : 'text-slate-400 hover:text-blue-600'}`}
                            >P</button>
                          )}

                          {/* BULTO */}
                          {item.jerarquia?.bulto?.activo && item.jerarquia.bulto.seVende !== false && (
                            <button
                              onClick={(e) => { e.stopPropagation(); onChangeUnit(realIndex, 'bulto'); }}
                              className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${item.unidadVenta === 'bulto' ? 'bg-purple-50 text-purple-700 shadow border border-purple-100' : 'text-slate-400 hover:text-purple-600'}`}
                            >B</button>
                          )}
                        </div>
                      ) : null}

                      {isExceeded && <span className="bg-status-danger text-white text-[9px] font-black px-1.5 rounded animate-pulse">S/S</span>}
                      {isSuspicious && <span className="bg-status-warning text-white text-[9px] font-black px-1.5 rounded flex items-center gap-1"><AlertTriangle size={8} /> ALTO</span>}
                    </div>
                    <h4 className="font-bold text-content-main leading-tight text-sm">{item.nombre}</h4>
                    <div className="text-[11px] text-content-secondary font-mono mt-1 flex items-center gap-1">
                      <Calculator size={10} className="inline" /> {item.cantidad} x ${precioItem.toFixed(2)}
                    </div>
                  </div>
                  <button onClick={() => !isProcessing && onRemoveItem(realIndex)} disabled={isProcessing} className="text-content-secondary hover:text-status-danger transition-colors p-1 disabled:opacity-30"><X size={16} /></button>
                </div>

                <div className="flex justify-between items-end mt-2 pt-2 border-t border-border-subtle">
                  <div className="flex items-center gap-1 bg-app-light dark:bg-app-dark rounded-lg p-0.5 border border-border-subtle">
                    <button onClick={() => handleQtyChangeSafe(realIndex, item, -step)} disabled={isMin || isProcessing} className={`w-7 h-7 flex items-center justify-center rounded-md shadow-sm transition-colors ${(isMin || isProcessing) ? 'bg-surface-light text-content-secondary cursor-not-allowed opacity-50' : 'bg-surface-light text-content-main hover:text-status-danger'}`}><Minus size={14} /></button>
                    <input type="number" min={minQty} step={step} value={item.cantidad} onChange={(e) => handleInputChangeSafe(realIndex, item, e.target.value)} disabled={isProcessing} className={`w-12 bg-transparent text-center font-mono font-bold text-sm text-content-main focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isSuspicious ? 'text-status-warning scale-110' : ''}`} />
                    <button onClick={() => handleQtyChangeSafe(realIndex, item, step)} disabled={isProcessing} className="w-7 h-7 flex items-center justify-center bg-surface-light rounded-md shadow-sm text-content-main hover:text-primary transition-colors disabled:opacity-50"><Plus size={14} /></button>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] text-primary font-black leading-none mb-0.5 font-mono bg-primary-light/30 px-1.5 py-0.5 rounded inline-block border border-primary-light">Bs {totalItemBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="font-black text-xl text-content-main leading-none mt-0.5">${totalItem.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Totales y Acciones */}
      <div className="p-5 bg-surface-light dark:bg-surface-dark border-t border-border-subtle shadow-[0_-4px_10px_-2px_rgba(0,0,0,0.05)] z-30">
        <div className="flex justify-between items-end mb-2">
          <span className="text-sm font-bold text-content-secondary">Subtotal</span>
          <span className="text-base font-bold text-content-main">${calculos.subtotalBase.toFixed(2)}</span>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-dashed border-border-subtle mb-4 gap-2">
          <div>
            <p className="text-xs text-content-secondary font-bold uppercase tracking-wider">Total $</p>
            <p className="text-4xl font-black text-content-main leading-none tracking-tight">${calculos.totalUSD.toFixed(2)}</p>
          </div>
          <div className="text-right bg-app-light dark:bg-app-dark p-3 rounded-xl border border-border-subtle flex-1 min-w-0">
            <p className="text-[10px] text-primary font-black uppercase tracking-widest mb-1">BOLÍVARES</p>
            <p className="text-3xl font-black text-primary leading-none truncate">
              {calculos.totalBS.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {/* BOTÓN PONER EN ESPERA (F6) */}
          <button
            onClick={onHold}
            disabled={carrito.length === 0 || isProcessing}
            className="px-4 py-4 bg-status-warningBg hover:bg-status-warningBg/80 text-status-warning border border-status-warning/30 rounded-xl font-bold flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Poner en Espera (F6)"
          >
            <PauseCircle size={24} />
          </button>

          {/* BOTÓN COBRAR (F9) */}
          <button
            onClick={onCheckout}
            disabled={carrito.length === 0 || isProcessing}
            className={`
                flex-1 py-4 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg 
                ${isProcessing
                ? 'bg-content-secondary cursor-wait shadow-none opacity-80'
                : 'bg-status-success hover:bg-emerald-500 active:scale-95 shadow-lg shadow-status-success/30'
              }
            `}
          >
            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
            {isProcessing ? 'PROCESANDO...' : 'COBRAR'}
            {!isProcessing && <span className="opacity-50 text-xs font-normal ml-1">F9</span>}
          </button>
        </div>
      </div>
    </div>
  );
}