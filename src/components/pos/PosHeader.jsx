// ✅ REFACTORED - V. 4.0 (ZUSTAND DIRECT CONNECTION)
// Archivo: src/components/pos/PosHeader.jsx
// Antes: Recibía 9 props del padre. Ahora se conecta directamente a stores.

import React, { useEffect } from 'react';
import { Search, AlertTriangle, ShieldCheck } from 'lucide-react';
import { usePosSearchStore } from '../../stores/usePosSearchStore';
import { usePosCalcStore } from '../../stores/usePosCalcStore';
import { useConfigStore } from '../../stores/useConfigStore';
import { useInventoryStore } from '../../stores/useInventoryStore';

const PosHeader = React.forwardRef(({ onKeyDown }, ref) => {
  // 🧠 DIRECT STORE CONNECTION
  const busqueda = usePosSearchStore(s => s.busqueda);
  const setBusqueda = usePosSearchStore(s => s.setBusqueda);
  const categoriaActiva = usePosSearchStore(s => s.categoriaActiva);
  const setCategoriaActiva = usePosSearchStore(s => s.setCategoriaActiva);

  const categorias = useInventoryStore(s => s.categorias);

  const tasa = usePosCalcStore(s => s.tasa);
  const tasaCaida = usePosCalcStore(s => s.tasaCaida);
  const tasaReferencia = useConfigStore(s => s.configuracion?.tasaReferencia || 0);

  // ⚡ ENFOQUE INICIAL ÚNICO
  useEffect(() => {
    if (ref && ref.current) {
      ref.current.focus();
    }
  }, []);

  return (
    <div className="bg-surface-light dark:bg-surface-dark p-4 shadow-sm z-10 flex flex-col gap-3">
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 text-content-secondary" size={20} />
          <input
            ref={ref}
            type="text"
            placeholder="Escanear o buscar producto..."
            className="w-full pl-10 pr-12 py-3 bg-app-light dark:bg-app-dark border-2 border-transparent focus:bg-surface-light dark:focus:bg-surface-dark focus:border-primary rounded-xl outline-none transition-all text-lg font-medium text-content-main shadow-inner"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <div className="absolute right-3 top-3 text-content-secondary bg-surface-light dark:bg-surface-dark border border-border-subtle px-2 py-1 rounded text-xs font-mono">F2</div>
        </div>

        <div className={`flex flex-col justify-center items-end min-w-[100px] border-l border-border-subtle pl-4 ${tasaCaida ? 'animate-pulse' : ''}`}>
          <span className="text-[10px] uppercase font-bold text-content-secondary flex items-center gap-1">
            {tasaCaida ? <AlertTriangle size={12} className="text-status-danger" /> : <ShieldCheck size={10} className="text-status-success" />} Tasa BCV
          </span>
          {tasaCaida ? (
            <span className="text-xs font-black text-status-danger font-mono">⚠️ SIN CARGAR</span>
          ) : (
            <span className="text-xl font-black text-status-success font-mono">
              {parseFloat(tasa || 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
          {tasaReferencia > 0 && tasa < tasaReferencia && (
            <div className="bg-red-100 text-red-600 text-[9px] font-black px-1.5 py-0.5 rounded border border-red-200 whitespace-nowrap animate-pulse flex items-center gap-1 mt-1">
              <AlertTriangle size={8} /> MENOR A BCV ({tasaReferencia})
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {categorias.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoriaActiva(cat)}
            className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${categoriaActiva === cat ? 'bg-primary text-white shadow-md' : 'bg-surface-light text-content-secondary border border-border-subtle hover:bg-surface-hover hover:text-content-main'}`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
});

export default PosHeader;