import React, { memo, useRef, useEffect } from 'react';
import { ScanBarcode, Search, Plus, Save, Zap } from 'lucide-react';
import { VirtuosoGrid } from 'react-virtuoso';
import ProductCard from './ProductCard';

// 🛑 VIRTUALIZATION DISABLED Temporarily due to strict ESM/Vite/CJS Interop issues.
// We keep ProductCard extraction as it provides Memoization benefits (Performance Pillar #2).

const ProductGrid = ({
  filtrados,
  selectedIndex,
  setRef,
  onSelectProducto,
  tasa,
  permitirSinStock,
  compactMode = false,
  isProcessing // 🆕
}) => {
  const virtuosoRef = useRef(null);

  // 🖱️ SCROLL SYNC: Keep focus visible
  useEffect(() => {
    if (virtuosoRef.current && selectedIndex >= 0) {
      virtuosoRef.current.scrollToIndex({
        index: selectedIndex,
        align: 'center', // Keep selected item in the middle
        behavior: 'smooth'
      });
    }
  }, [selectedIndex]);
  // 🚀 VIRTUALIZATION COMPONENTS
  const GridContainer = React.forwardRef(({ style, className, children, ...props }, ref) => (
    <div
      ref={ref}
      style={style}
      className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20 ${className || ''}`}
      {...props}
    >
      {children}
    </div>
  ));

  const ItemContainer = ({ children, ...props }) => (
    <div {...props} className="h-full">
      {children}
    </div>
  );

  return (
    <>
      <div className="flex-1 px-4 py-4 overflow-hidden bg-app-light dark:bg-app-dark">
        {filtrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-content-secondary gap-4 opacity-50 select-none">
            <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-full"><ScanBarcode size={64} strokeWidth={1.5} /></div>
            <div className="text-center"><p className="text-xl font-bold text-content-main">Listo para Vender</p><p className="text-sm">Escanee un código o escriba para buscar</p></div>
          </div>
        ) : (
          <VirtuosoGrid
            ref={virtuosoRef}
            style={{ height: '100%' }}
            totalCount={filtrados.length}
            components={{
              List: GridContainer,
              Item: ItemContainer
            }}
            overscan={200} // Pre-render pixels
            itemContent={(index) => {
              const p = filtrados[index];
              return (
                <ProductCard
                  key={p.id} // Stable Key
                  data={filtrados}
                  index={index}
                  // style handled by ItemContainer usually, but card is self-contained
                  style={{ height: '100%' }}
                  onSelectProducto={onSelectProducto}
                  tasa={tasa}
                  setRef={setRef}
                  permitirSinStock={permitirSinStock}
                  isProcessing={isProcessing} // 🆕 Pass status down
                  isVirtual={true}
                />
              );
            }}
          />
        )}
      </div>

      {!compactMode && (
        <div className="bg-surface-light dark:bg-surface-dark px-4 py-3 border-t border-border-subtle flex flex-wrap gap-4 justify-center text-[11px] uppercase font-bold text-content-secondary font-mono select-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <span className="flex items-center gap-1 bg-app-light dark:bg-app-dark px-2 py-1 rounded border border-border-subtle"><Search size={12} /> [F2] Buscar</span>
          <span className="flex items-center gap-1 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-1 rounded border border-amber-100 dark:border-amber-900/50 font-bold"><Zap size={12} /> [*] Ciclar Unidad</span>
          <span className="flex items-center gap-1 bg-app-light dark:bg-app-dark px-2 py-1 rounded border border-border-subtle"><Plus size={12} /> [Enter] Agregar</span>
          <span className="flex items-center gap-1 bg-status-successBg text-status-success px-2 py-1 rounded border border-status-successBg"><Save size={12} /> [F9] Cobrar</span>
        </div>
      )}
    </>
  );
};

const MemoizedProductGrid = memo(ProductGrid);
export default MemoizedProductGrid;