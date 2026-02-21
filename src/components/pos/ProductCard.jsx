import React, { memo } from 'react';
import { Lock } from 'lucide-react';

const ProductCard = memo(({ data, index, style, onSelectProducto, tasa, setRef, permitirSinStock, isProcessing, selectedIndex }) => { // 🆕
    const p = data[index]; // Extract product from virtual array
    const stock = p.stock || 0;
    const isAgotado = stock <= 0;
    const isPoco = stock <= 5; // Low stock threshold
    const precioVisual = p.precio || 0;

    // 🔓 DESBLOQUEO DE VENTA SIN STOCK
    const isBlocked = (isAgotado && !permitirSinStock) || isProcessing; // 🛑 DISABLED IF PROCESSING
    const isFocused = index === selectedIndex; // 🎯 HIGHLIGHT IF SELECTED BY KEYBOARD

    let stockLabel = 'DISPONIBLE';
    let stockColor = 'bg-status-successBg text-status-success';

    if (isAgotado) {
        stockLabel = 'AGOTADO';
        stockColor = 'bg-status-dangerBg text-status-danger';
    } else {
        if (p.tipoUnidad === 'peso') {
            stockLabel = `${stock.toFixed(3)} Kg`;
            stockColor = isPoco ? 'bg-status-warningBg text-status-warning' : 'bg-primary-light text-primary';
        } else if (isPoco) {
            stockLabel = `QUEDAN ${stock}`;
            stockColor = 'bg-status-warningBg text-status-warning';
        } else {
            stockLabel = `${stock} UNDS`;
        }
    }

    return (
        <div style={{ ...style, padding: '6px' }}> {/* Padding wrapper para el gap del grid */}
            <div
                ref={el => setRef && setRef(el, index)}
                onClick={() => !isBlocked && onSelectProducto(p)}
                className={`
          relative bg-surface-light dark:bg-surface-dark border rounded-xl p-3 transition-all flex flex-col justify-between h-full group select-none shadow-sm 
          ${isBlocked ? 'opacity-60 cursor-not-allowed grayscale' : 'cursor-pointer hover:border-primary/50 hover:shadow-md active:scale-95'}
          ${isFocused ? 'ring-4 ring-primary/40 border-primary scale-[1.02] shadow-lg z-10 bg-primary/5' : 'border-border-subtle'}
        `}
            >
                {/* 🖼️ POS 2.0 OPTION 1: SQUARE CONTAIN */}
                <div className="aspect-square -mx-3 -mt-3 mb-3 bg-white dark:bg-slate-800 rounded-t-xl overflow-hidden relative group/header p-4 border-b border-slate-100 dark:border-slate-700/50">
                    {p.imagen ? (
                        <img
                            src={p.imagen}
                            className="w-full h-full object-contain transition-transform duration-500"
                            alt=""
                            loading="lazy"
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                            <div className="text-3xl font-black text-slate-200 dark:text-slate-600 select-none">
                                {p.nombre ? p.nombre.substring(0, 2).toUpperCase() : '??'}
                            </div>
                        </div>
                    )}

                    {/* Floating Badge */}
                    <div className={`absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wide flex items-center gap-1 shadow-sm backdrop-blur-md ${stockColor} bg-opacity-90`}>
                        {isAgotado && <Lock size={8} />} {stockLabel}
                    </div>
                </div>

                <div className="flex flex-col justify-between flex-1">
                    <h3 className="font-bold text-content-main text-sm line-clamp-2 leading-snug mb-2" title={p.nombre}>
                        {p.nombre}
                    </h3>

                    <div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-lg font-extrabold text-content-main">${precioVisual.toFixed(2)}</span>
                            {p.tipoUnidad === 'peso' && <span className="text-[10px] text-content-secondary">/Kg</span>}
                        </div>
                        <div className="text-sm font-black text-primary mt-0.5">
                            Bs {Math.round(precioVisual * tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparator for max performance (optional, default shall diff props)
    // Re-render only if index product changes or tasa changes.
    return prevProps.data[prevProps.index] === nextProps.data[nextProps.index] &&
        prevProps.tasa === nextProps.tasa &&
        prevProps.isProcessing === nextProps.isProcessing;
});

export default ProductCard;
