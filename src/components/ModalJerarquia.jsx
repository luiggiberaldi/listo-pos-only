import React, { useState, useEffect } from 'react';
import { Package, Box, Layers, Check, AlertTriangle, Lock } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import Swal from 'sweetalert2';

export default function ModalJerarquia({ producto, onSelect, onClose }) {
  const { configuracion } = useStore();
  const tasaReal = parseFloat(configuracion.tasa) || 1;
  const permitirSinStock = configuracion.permitirSinStock;
  const stockActual = parseFloat(producto.stock) || 0;

  const opciones = [];

  if (producto.jerarquia?.unidad?.activo && producto.jerarquia.unidad.seVende !== false) {
    opciones.push({
      id: 'unidad',
      label: 'Unidad',
      precio: parseFloat(producto.jerarquia.unidad.precio) || 0,
      contenido: 1,
      icon: <Box size={32} />
    });
  }

  if (producto.jerarquia?.paquete?.activo && producto.jerarquia.paquete.seVende !== false) {
    opciones.push({
      id: 'paquete',
      label: 'Paquete',
      precio: parseFloat(producto.jerarquia.paquete.precio) || 0,
      contenido: parseFloat(producto.jerarquia.paquete.contenido) || 1,
      icon: <Package size={32} />
    });
  }

  if (producto.jerarquia?.bulto?.activo && producto.jerarquia.bulto.seVende !== false) {
    opciones.push({
      id: 'bulto',
      label: 'Bulto',
      precio: parseFloat(producto.jerarquia.bulto.precio) || 0,
      contenido: parseFloat(producto.jerarquia.bulto.contenido) || 1,
      icon: <Layers size={32} />
    });
  }

  const [selectedIndex, setSelectedIndex] = useState(0);

  // --- LÓGICA DE VALIDACIÓN Y SELECCIÓN ---
  const intentarSeleccionar = (opcion) => {
    const stockRequerido = opcion.contenido;
    const tieneStockSuficiente = stockActual >= stockRequerido;

    if (!tieneStockSuficiente) {
      if (!permitirSinStock) {
        const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 2000, timerProgressBar: false });
        Toast.fire({
          icon: 'error',
          title: 'Stock Insuficiente',
          text: `No hay inventario para este formato.`
        });
        return;
      } else {
        const Toast = Swal.mixin({ toast: true, position: 'bottom-end', showConfirmButton: false, timer: 1500, timerProgressBar: false });
        Toast.fire({
          icon: 'warning',
          title: 'Venta en Negativo',
          text: 'Inventario quedará en rojo.'
        });
      }
    }

    onSelect(opcion.id);
  };
  // ----------------------------------------

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowRight', 'ArrowLeft', 'Enter', 'Escape'].includes(e.key)) {
        e.stopPropagation();
        e.preventDefault();
      }

      if (e.key === 'ArrowRight') {
        setSelectedIndex((prev) => (prev + 1) % opciones.length);
      } else if (e.key === 'ArrowLeft') {
        setSelectedIndex((prev) => (prev - 1 + opciones.length) % opciones.length);
      } else if (e.key === 'Enter') {
        if (opciones[selectedIndex]) {
          intentarSeleccionar(opciones[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [selectedIndex, opciones, onClose]);

  if (opciones.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-slate-200 dark:border-slate-800">

        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Selecciona Formato</h2>
          <p className="text-slate-500 text-lg">Usa las flechas y confirma con ENTER</p>
        </div>

        <div className={`grid gap-4 ${opciones.length === 3 ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-2'}`}>
          {opciones.map((opcion, idx) => {
            const isSelected = idx === selectedIndex;
            const precioBs = opcion.precio * tasaReal;

            // Estado de Disponibilidad
            const stockRequerido = opcion.contenido;
            const insuficiente = stockActual < stockRequerido;
            const bloqueado = insuficiente && !permitirSinStock;

            return (
              <div
                key={opcion.id}
                onClick={() => intentarSeleccionar(opcion)}
                className={`
                  relative cursor-pointer rounded-xl p-6 border-2 transition-all duration-200 flex flex-col items-center gap-3 overflow-hidden
                  ${isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50 dark:bg-emerald-900/10 shadow-xl scale-105 z-10'
                    : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-emerald-300 opacity-90'}
                  ${bloqueado ? 'opacity-50 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800' : ''}
                `}
              >
                {/* ETIQUETA DE STOCK (ESQUINA SUPERIOR DERECHA) */}
                {insuficiente && (
                  <div className={`absolute top-0 right-0 px-2 py-1 text-[8px] font-black uppercase text-white tracking-wider rounded-bl-lg ${bloqueado ? 'bg-slate-500' : 'bg-red-500'}`}>
                    {bloqueado ? 'STOCK INSUFICIENTE' : 'SIN STOCK'}
                  </div>
                )}

                {/* ETIQUETA DE SELECCIONADO (ESQUINA SUPERIOR IZQUIERDA - CORREGIDA) */}
                {isSelected && (
                  <div className="absolute top-0 left-0 bg-emerald-600 text-white text-[9px] font-bold px-2 py-1 rounded-br-lg shadow-sm flex items-center gap-1">
                    <Check size={10} strokeWidth={4} /> SELECCIONADO
                  </div>
                )}

                <div className={`mt-2 ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                  {bloqueado ? <Lock size={32} /> : (insuficiente ? <AlertTriangle size={32} className="text-red-500" /> : opcion.icon)}
                </div>

                <div className="text-center">
                  <h3 className={`font-bold text-lg ${isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-300'}`}>
                    {opcion.label}
                  </h3>
                  {opcion.contenido > 1 && (
                    <p className={`text-xs font-mono mt-1 ${insuficiente ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                      Cont: {opcion.contenido}
                    </p>
                  )}
                </div>

                <div className="text-center">
                  <div className={`text-xl font-black ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`}>
                    ${opcion.precio.toFixed(2)}
                  </div>
                  <div className="text-xs font-bold text-green-600 font-mono mt-1">
                    Bs {precioBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={onClose} className="mt-8 w-full py-3 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors font-bold text-sm">
          CANCELAR (ESC)
        </button>
      </div>
    </div>
  );
}