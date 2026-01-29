import React, { useState, useEffect } from 'react';
import { Archive } from 'lucide-react';

export default function ProductStockInput({ form, productoEditar, getFactores, onStockChange }) {
  const [ingreso, setIngreso] = useState({ bultos: 0, paquetes: 0, unidades: 0 });

  useEffect(() => {
    // 🧠 Smart Stock Init: Solo ejecutar cuando el form esté sincronizado con el producto
    if (productoEditar && form && (form.id === productoEditar.id || form.codigo === productoEditar.codigo)) {
      let resto = parseFloat(productoEditar.stock) || 0;
      const { factorBulto, factorPaquete } = getFactores();

      let b = 0, p = 0, u = 0;

      if (form.tipoUnidad === 'peso') {
        u = resto;
      } else {
        // 1. Calcular Bultos
        if (form.jerarquia?.bulto?.activo) {
          b = Math.trunc(resto / factorBulto);
          resto = resto % factorBulto;
        }
        // 2. Calcular Paquetes
        if (form.jerarquia?.paquete?.activo) {
          p = Math.trunc(resto / factorPaquete);
          resto = resto % factorPaquete;
        }
        // 3. El resto a Unidades
        u = Math.round(resto * 100) / 100;
      }

      setIngreso({ bultos: b, paquetes: p, unidades: u });
    }
  }, [productoEditar, form]);

  const calcularStockTotal = () => {
    if (form.tipoUnidad === 'peso') return parseFloat(ingreso.unidades) || parseFloat(form.stock) || 0;

    const { factorBulto, factorPaquete } = getFactores();
    const b = parseInt(ingreso.bultos) || 0;
    const p = parseInt(ingreso.paquetes) || 0;
    const u = parseFloat(ingreso.unidades) || 0;

    // If all inputs are empty/zero, fallback to current stock (safety net), unless explicitly editing
    if (!b && !p && !u && productoEditar) return 0; // Explicitly 0 if user cleared everything
    if (!b && !p && !u) return parseFloat(form.stock) || 0;

    return (b * factorBulto) + (p * factorPaquete) + u;
  };

  useEffect(() => {
    onStockChange({
      total: calcularStockTotal(),
      breakdown: ingreso
    });
  }, [ingreso]);

  const preventScroll = (e) => e.target.blur();

  // UX Helper: Clear 0 on focus, Restore 0 on blur if empty
  const handleFocus = (e, field) => {
    if (ingreso[field] === 0 || ingreso[field] === '0') {
      setIngreso({ ...ingreso, [field]: '' });
    }
  };

  const handleBlur = (e, field) => {
    if (ingreso[field] === '') {
      setIngreso({ ...ingreso, [field]: 0 });
    }
  };

  const handleChange = (val, field) => {
    setIngreso({ ...ingreso, [field]: val });
  };

  const renderTotalJerarquico = (totalUnidades) => {
    if (form.tipoUnidad === 'peso') return `${totalUnidades.toFixed(3)} Kg`;

    const { factorBulto, factorPaquete } = getFactores();
    const items = [];
    let resto = totalUnidades;

    if (form.jerarquia?.bulto?.activo) {
      const bultos = Math.floor(resto / factorBulto);
      if (bultos > 0) items.push(`${bultos} Bultos`);
      resto = resto % factorBulto;
    }

    if (form.jerarquia?.paquete?.activo) {
      const paquetes = Math.floor(resto / factorPaquete);
      if (paquetes > 0) items.push(`${paquetes} Paq`);
      resto = resto % factorPaquete;
    }

    if (resto > 0 || items.length === 0) {
      items.push(`${resto} Unds`);
    }

    return items.join(' + ');
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800">

      <div className="flex justify-between items-end mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400">
            <Archive size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Inventario Inicial</h3>
            <p className="text-xs text-slate-400">Ingrese la cantidad física disponible</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{productoEditar ? 'Stock Actual' : 'Stock Inicial'}</div>
          <div className="text-xl font-mono font-bold text-slate-800 dark:text-white bg-white dark:bg-slate-800 px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
            {renderTotalJerarquico(calcularStockTotal())}
          </div>
        </div>
      </div>

      {form.tipoUnidad === 'unidad' ? (
        <div className="grid grid-cols-3 gap-4">
          {form.jerarquia?.bulto?.activo && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <label className="text-[10px] font-bold text-purple-500 uppercase block mb-2 text-center">Bultos</label>
              <input
                type="number"
                onWheel={preventScroll}
                className="w-full text-center text-2xl font-bold text-slate-700 dark:text-white bg-transparent outline-none placeholder:text-slate-200"
                placeholder="0"
                value={ingreso.bultos}
                onChange={e => handleChange(e.target.value, 'bultos')}
                onFocus={(e) => handleFocus(e, 'bultos')}
                onBlur={(e) => handleBlur(e, 'bultos')}
              />
            </div>
          )}
          {form.jerarquia?.paquete?.activo && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <label className="text-[10px] font-bold text-blue-500 uppercase block mb-2 text-center">Paquetes</label>
              <input
                type="number"
                onWheel={preventScroll}
                className="w-full text-center text-2xl font-bold text-slate-700 dark:text-white bg-transparent outline-none placeholder:text-slate-200"
                placeholder="0"
                value={ingreso.paquetes}
                onChange={e => handleChange(e.target.value, 'paquetes')}
                onFocus={(e) => handleFocus(e, 'paquetes')}
                onBlur={(e) => handleBlur(e, 'paquetes')}
              />
            </div>
          )}
          {(form.jerarquia?.unidad?.activo || (!form.jerarquia?.bulto?.activo && !form.jerarquia?.paquete?.activo)) && (
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-2 text-center">Unidades</label>
              <input
                type="number"
                onWheel={preventScroll}
                className="w-full text-center text-2xl font-bold text-slate-700 dark:text-white bg-transparent outline-none placeholder:text-slate-200"
                placeholder="0"
                value={ingreso.unidades}
                onChange={e => handleChange(e.target.value, 'unidades')}
                onFocus={(e) => handleFocus(e, 'unidades')}
                onBlur={(e) => handleBlur(e, 'unidades')}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <label className="text-xs font-bold text-slate-500 uppercase block mb-2 text-center">Peso Total (Kilogramos)</label>
          <input
            type="number"
            step="0.001"
            onWheel={preventScroll}
            className="w-full text-center text-3xl font-bold text-slate-800 dark:text-white bg-transparent outline-none placeholder:text-slate-200"
            placeholder="0.000"
            value={ingreso.unidades}
            onChange={e => handleChange(e.target.value, 'unidades')}
            onFocus={(e) => handleFocus(e, 'unidades')}
            onBlur={(e) => handleBlur(e, 'unidades')}
          />
        </div>
      )}
    </div>
  );
}