
import React, { memo } from 'react';
import { Layers, Package, Scale, Calculator, X, Minus, Plus, AlertTriangle } from 'lucide-react';

const CartItem = memo(({
    item,
    realIndex,
    lastAddedIndex,
    calculos,
    viewMode,
    isProcessing,
    onRemoveItem,
    handleQtyChangeSafe,
    handleInputChangeSafe,
    onChangeUnit, // 🆕
    getStep,
    getMinQty,
    carrito, // Necesario para calcular stock "consumido" por items duplicados
    isKeyboardSelected, // 🆕 Focus Zone highlighting
    onFocusItem // 🆕 Click-to-focus manually
}) => {

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

    // Logic from hook helpers
    const step = getStep(item.tipoUnidad);
    const minQty = getMinQty(item.tipoUnidad);
    const isMin = item.cantidad <= minQty;

    // 🛑 ALERTAS
    const isHighQty = item.cantidad >= 10 && item.tipoUnidad !== 'peso';
    const isHighValue = totalItem > 100;
    const isSuspicious = isHighQty || isHighValue;

    // Stock Logic
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

    // Solo aplicar borde azul suave si está seleccionado por teclado (o clic manual en este nuevo modo interactivo)
    const kbBorder = isKeyboardSelected ? 'border-primary ring-2 ring-primary/40 shadow-md ring-offset-1 bg-primary/5 dark:bg-primary/10 transition-colors' : '';

    // --- VISTA COMPACTA ---
    if (viewMode === 'list') {
        return (
            <div onClick={onFocusItem} className={`flex items-center gap-2 p-2 rounded-lg border bg-surface-light dark:bg-surface-dark transition-colors cursor-pointer ${kbBorder || (isExceeded ? 'border-status-danger bg-status-dangerBg/10' : (isSuspicious ? 'border-status-warning bg-status-warningBg/10' : 'border-border-subtle'))}`}>
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

    // --- VISTA TARJETAS (Default) ---
    return (
        <div onClick={onFocusItem} className={`relative bg-surface-light dark:bg-surface-dark p-3 rounded-xl border shadow-sm transition-all group animate-in slide-in-from-right-2 cursor-pointer ${kbBorder || (realIndex === lastAddedIndex ? 'border-primary ring-2 ring-primary/30 shadow-md z-10' : (isExceeded ? 'border-status-danger ring-1 ring-status-danger/30' : (isSuspicious ? 'border-status-warning ring-1 ring-status-warning/30 bg-status-warning/5' : 'border-border-subtle')))}`}>
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
                    <div className="text-[11px] text-primary font-black leading-none mb-0.5 font-mono bg-primary-light/30 px-1.5 py-0.5 rounded inline-block border border-primary-light">Bs {Math.round(totalItemBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    <div className="font-black text-xl text-content-main leading-none mt-0.5">${totalItem.toFixed(2)}</div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    // 🚀 PERFORMANCE: Only re-render if data actually changed.
    // Callbacks (onRemoveItem, handleQtyChangeSafe, etc.) are new refs every render
    // so we must not compare them.
    return prev.item === next.item &&
        prev.item?.cantidad === next.item?.cantidad &&
        prev.item?.unidadVenta === next.item?.unidadVenta &&
        prev.realIndex === next.realIndex &&
        prev.lastAddedIndex === next.lastAddedIndex &&
        prev.viewMode === next.viewMode &&
        prev.isProcessing === next.isProcessing &&
        prev.isKeyboardSelected === next.isKeyboardSelected &&
        prev.calculos?.tasa === next.calculos?.tasa;
});

export default CartItem;
