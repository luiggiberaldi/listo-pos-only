import React, { useState, useEffect, useRef } from 'react';
import { X, Scale, DollarSign, Banknote, Check, AlertTriangle, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Swal from 'sweetalert2';

export default function ModalPesaje({ producto, tasa, onConfirm, onClose }) {
  const { configuracion } = useStore();
  const permitirSinStock = configuracion.permitirSinStock;
  const stockActual = parseFloat(producto.stock) || 0;

  const [peso, setPeso] = useState('');
  const [totalUSD, setTotalUSD] = useState('');
  const [totalBS, setTotalBS] = useState('');
  
  const usdRef = useRef(null);
  const bsRef = useRef(null);
  const kgRef = useRef(null);

  const precioPorKg = parseFloat(producto.precio) || 0;

  useEffect(() => {
    if (usdRef.current) { usdRef.current.focus(); usdRef.current.select(); }
  }, []);

  const handlePesoChange = (val) => {
    setPeso(val);
    const p = parseFloat(val);
    if (!isNaN(p) && precioPorKg > 0) {
      const usd = p * precioPorKg;
      setTotalUSD(usd.toFixed(2));
      setTotalBS((usd * tasa).toFixed(2));
    } else {
      setTotalUSD(''); setTotalBS('');
    }
  };

  const handleUSDChange = (val) => {
    setTotalUSD(val);
    const usd = parseFloat(val);
    if (!isNaN(usd) && precioPorKg > 0) {
      const p = usd / precioPorKg;
      setPeso(p.toFixed(3));
      setTotalBS((usd * tasa).toFixed(2));
    } else {
      setPeso(''); setTotalBS('');
    }
  };

  const handleBSChange = (val) => {
    setTotalBS(val);
    const bs = parseFloat(val);
    if (!isNaN(bs) && tasa > 0 && precioPorKg > 0) {
      const usd = bs / tasa;
      const p = usd / precioPorKg;
      setTotalUSD(usd.toFixed(2));
      setPeso(p.toFixed(3));
    } else {
      setPeso(''); setTotalUSD('');
    }
  };

  const handleConfirm = (e) => {
    e?.preventDefault();
    const pesoFinal = parseFloat(peso);
    const precioFinal = parseFloat(totalUSD);

    if (pesoFinal > 0) {
      // --- VALIDACIÓN DE STOCK BLINDADA ---
      if (pesoFinal > stockActual) {
          if (!permitirSinStock) {
              // BLOQUEO (Política Estricta)
              Swal.fire({
                  toast: true, position: 'bottom-end', showConfirmButton: false, timer: 3000,
                  icon: 'error',
                  title: 'Peso Excedido',
                  text: `Solo tienes ${stockActual.toFixed(3)} Kg disponibles.`
              });
              return;
          } else {
              // ADVERTENCIA (Política Flexible)
              Swal.fire({
                  toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000,
                  icon: 'warning',
                  title: 'Stock en Negativo',
                  text: 'Estás vendiendo más de lo que hay.'
              });
          }
      }
      // ------------------------------------

      onConfirm({ peso: pesoFinal, precioTotal: precioFinal });
    }
  };

  const handleInputKeyDown = (e, currentInput) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (currentInput === 'usd') bsRef.current?.focus(); if (currentInput === 'bs') kgRef.current?.focus(); if (currentInput === 'kg') usdRef.current?.focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); if (currentInput === 'kg') bsRef.current?.focus(); if (currentInput === 'bs') usdRef.current?.focus(); if (currentInput === 'usd') kgRef.current?.focus(); }
    if (e.key === 'Enter') handleConfirm(e);
    if (e.key === 'Escape') onClose();
  };

  const handleContainerKeyDown = (e) => { if (e.key === 'Escape') onClose(); };

  // Cálculo visual de estado de stock
  const isStockLow = stockActual <= 1 && stockActual > 0;
  const isStockEmpty = stockActual <= 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[80] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col">
        
        <div className="bg-slate-800 p-4 flex justify-between items-center text-white shrink-0 relative">
            <h2 className="font-bold text-lg flex items-center gap-2"><Scale className="text-blue-400"/> Balanza Digital</h2>
            
            {/* VISUALIZADOR DE STOCK EN BALANZA */}
            <div className={`absolute right-12 top-4 text-xs font-mono px-2 py-0.5 rounded border ${isStockEmpty ? 'bg-red-900 text-red-200 border-red-700' : (isStockLow ? 'bg-amber-900 text-amber-200 border-amber-700' : 'bg-slate-700 text-slate-300 border-slate-600')}`}>
                Stock: {stockActual.toFixed(3)} Kg
            </div>

            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 space-y-5" onKeyDown={handleContainerKeyDown}>
          <div className="text-center mb-4"><h3 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{producto.nombre}</h3><div className="text-sm text-slate-500 font-bold mt-1">Precio: ${precioPorKg.toFixed(2)} / Kg</div></div>
          
          <div className="relative"><label className="text-xs font-bold text-green-600 uppercase mb-1 block">Monto a Vender ($)</label><div className="relative"><DollarSign size={20} className="absolute left-3 top-3.5 text-green-500" /><input ref={usdRef} type="number" step="0.5" className="w-full pl-10 p-3 border-2 border-green-200 dark:border-green-900 rounded-xl font-bold text-2xl text-slate-800 dark:text-white focus:border-green-500 outline-none bg-white dark:bg-slate-950 transition-all shadow-sm focus:ring-2 focus:ring-green-200" placeholder="0.00" value={totalUSD} onChange={e => handleUSDChange(e.target.value)} onKeyDown={(e) => handleInputKeyDown(e, 'usd')} onFocus={(e) => e.target.select()}/></div></div>
          
          <div className="relative"><label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Monto en Bolívares (Bs)</label><div className="relative"><Banknote size={20} className="absolute left-3 top-3.5 text-slate-400" /><input ref={bsRef} type="number" step="1" className="w-full pl-10 p-3 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-lg text-slate-700 dark:text-slate-300 focus:border-blue-400 outline-none bg-slate-50 dark:bg-slate-900 transition-all focus:ring-2 focus:ring-blue-200" placeholder="0.00" value={totalBS} onChange={e => handleBSChange(e.target.value)} onKeyDown={(e) => handleInputKeyDown(e, 'bs')} onFocus={(e) => e.target.select()}/></div></div>
          
          <div className="h-px bg-slate-200 dark:bg-slate-700 my-2"></div>
          
          <div className="relative">
              <label className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1 block">Peso Resultante (Kg)</label>
              <div className="relative">
                  <Scale size={20} className="absolute left-3 top-3.5 text-blue-500" />
                  <input ref={kgRef} type="number" step="0.005" className="w-full pl-10 p-3 border-2 border-blue-100 dark:border-slate-700 rounded-xl font-mono text-xl font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/10 focus:border-blue-500 outline-none transition-all focus:ring-2 focus:ring-blue-200" placeholder="0.000" value={peso} onChange={e => handlePesoChange(e.target.value)} onKeyDown={(e) => handleInputKeyDown(e, 'kg')} onFocus={(e) => e.target.select()}/>
                  <span className="absolute right-4 top-4 text-xs font-bold text-blue-400">Kg</span>
              </div>
          </div>

          <button onClick={handleConfirm} className="w-full mt-4 py-4 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2">
              <Check size={20} /> CONFIRMAR Y AGREGAR
          </button>
        </div>
      </div>
    </div>
  );
}