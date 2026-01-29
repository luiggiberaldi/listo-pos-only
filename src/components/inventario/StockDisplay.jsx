import React from 'react';
import { useStore } from '../../context/StoreContext';

export default function StockDisplay({ p }) {
  const { desglosarStock } = useStore();

  if (!p) return null;

  const stockTotal = parseFloat(p?.stock) || 0;

  // MODO PESO
  if (p.tipoUnidad === 'peso') {
    return (
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold ${stockTotal <= 5 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
        <div className={`w-2 h-2 rounded-full ${stockTotal <= 5 ? 'bg-red-500' : 'bg-slate-400'}`}></div>
        {stockTotal.toFixed(3)} Kg
      </div>
    );
  }

  // SIN STOCK (Cero absoluto)
  if (Math.abs(stockTotal) < 0.001) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 text-red-600 border border-red-100 text-[10px] font-bold uppercase tracking-wide">
        <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span> Agotado
      </span>
    );
  }

  // DESGLOSE JERÁRQUICO
  const textoDesglose = desglosarStock ? desglosarStock(stockTotal, p.jerarquia) : `${stockTotal}`;
  // Soportar ambos separadores por si acaso
  const partes = typeof textoDesglose === 'string' ? textoDesglose.split(/, | \/ /) : [String(stockTotal)];

  return (
    <div className="flex flex-wrap gap-2 items-center">
      {partes.map((parte, i) => {
        let estilo = "bg-white text-slate-600 border-slate-200";
        let dotColor = "bg-slate-400";

        const lowerParte = parte.toLowerCase();
        if (lowerParte.includes('bulto')) { estilo = "bg-purple-50 text-purple-700 border-purple-100"; dotColor = "bg-purple-500"; }
        if (lowerParte.includes('paq')) { estilo = "bg-blue-50 text-blue-700 border-blue-100"; dotColor = "bg-blue-500"; }

        return (
          <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-medium ${estilo}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
            {parte}
          </span>
        );
      })}
    </div>
  );
}