import React from 'react';
import { Box, Save, Lock } from 'lucide-react';

export default function ConfigInventario({ form, setForm, handleGuardar, readOnly }) {
  
  // Wrapper seguro para el toggle
  const toggleStockPermission = () => {
    if (readOnly) return; // 🛡️ DETENER SI ES SOLO LECTURA
    setForm({ ...form, permitirSinStock: !form.permitirSinStock });
  };

  return (
    <div className={`bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 max-w-2xl mx-auto ${readOnly ? 'opacity-90' : ''}`}>
      
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-bold text-slate-700 dark:text-white flex items-center gap-2">
            <Box className="text-orange-500" /> Reglas de Inventario
        </h3>
        {readOnly && <Lock size={16} className="text-slate-400"/>}
      </div>

      <div className={`bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between transition-opacity ${readOnly ? 'opacity-70' : ''}`}>
        <div>
          <span className="text-base font-bold text-slate-800 dark:text-white block">Vender sin Stock (Venta en Negativo)</span>
          <span className="text-xs text-slate-500 block mt-1">Permite agregar productos al carrito aunque el inventario esté en cero.</span>
        </div>
        
        {/* TOGGLE BLINDADO */}
        <div 
            className={`w-14 h-8 rounded-full relative transition-colors shadow-inner ${readOnly ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${form.permitirSinStock ? 'bg-emerald-500' : 'bg-slate-300'}`} 
            onClick={toggleStockPermission}
        >
          <div className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-md transition-transform ${form.permitirSinStock ? 'translate-x-6' : ''}`}></div>
        </div>
      </div>

      {!readOnly && (
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
            <button onClick={handleGuardar} className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                <Save size={18} /> GUARDAR PREFERENCIA
            </button>
        </div>
      )}
    </div>
  );
}