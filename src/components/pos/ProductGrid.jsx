import React, { memo } from 'react';
import { ScanBarcode, Search, Plus, Save, Zap } from 'lucide-react';
import ProductCard from './ProductCard';

// 🛑 VIRTUALIZATION DISABLED Temporarily due to strict ESM/Vite/CJS Interop issues.
// We keep ProductCard extraction as it provides Memoization benefits (Performance Pillar #2).

export default function ProductGrid({
  filtrados,
  selectedIndex,
  setRef,
  onSelectProducto,
  tasa,
  permitirSinStock // 🆕
}) {
  return (
    <>
      <div className="flex-1 p-4 overflow-y-auto bg-app-light dark:bg-app-dark scroll-smooth">
        {filtrados.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-content-secondary gap-4 opacity-50 select-none">
            <div className="p-6 bg-surface-light dark:bg-surface-dark rounded-full"><ScanBarcode size={64} strokeWidth={1.5} /></div>
            <div className="text-center"><p className="text-xl font-bold text-content-main">Listo para Vender</p><p className="text-sm">Escanee un código o escriba para buscar</p></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-4 pb-20">
            {filtrados.map((p, idx) => (
              <ProductCard
                key={p.id}
                data={filtrados}
                index={idx}
                style={{}}
                onSelectProducto={onSelectProducto}
                tasa={tasa}
                setRef={setRef}
                permitirSinStock={permitirSinStock} // 🆕
              />
            ))}
          </div>
        )}
      </div>

      <div className="bg-surface-light dark:bg-surface-dark px-4 py-3 border-t border-border-subtle flex flex-wrap gap-4 justify-center text-[11px] uppercase font-bold text-content-secondary font-mono select-none shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <span className="flex items-center gap-1 bg-app-light dark:bg-app-dark px-2 py-1 rounded border border-border-subtle"><Search size={12} /> [F2] Buscar</span>
        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400 px-2 py-1 rounded border border-amber-100 dark:border-amber-900/50 font-bold"><Zap size={12} /> [*] Ciclar Unidad</span>
        <span className="flex items-center gap-1 bg-app-light dark:bg-app-dark px-2 py-1 rounded border border-border-subtle"><Plus size={12} /> [Enter] Agregar</span>
        <span className="flex items-center gap-1 bg-status-successBg text-status-success px-2 py-1 rounded border border-status-successBg"><Save size={12} /> [F9] Cobrar</span>
      </div>
    </>
  );
}