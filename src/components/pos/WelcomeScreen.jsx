import React, { useState, useEffect, useRef } from 'react';
import { Wallet, ArrowRight, Loader2, DollarSign, Store, ShieldCheck } from 'lucide-react';
import Swal from 'sweetalert2';
// import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export default function WelcomeScreen({ onAbrir }) {
  const [montoUSD, setMontoUSD] = useState('');
  const [montoBS, setMontoBS] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);



  useEffect(() => {
    // Auto-focus amigable
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!montoUSD && !montoBS) return;

    setIsLoading(true);
    try {
      // Enviar objeto con ambas monedas
      await onAbrir({
        usdCash: parseFloat(montoUSD || 0),
        vesCash: parseFloat(montoBS || 0)
      });

      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
      Toast.fire({ icon: 'success', title: '¡Turno Iniciado!', text: 'El sistema está listo para vender.' });
    } catch (error) {
      Swal.fire({
        title: 'No se pudo abrir',
        text: error.message,
        icon: 'error',
        confirmButtonColor: '#1e293b'
      });
      setTimeout(() => inputRef.current?.focus(), 200);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-app-light dark:bg-app-dark animate-in fade-in zoom-in-95 duration-500 overflow-y-auto">

      <div className="max-w-md w-full text-center">
        {/* ILUSTRACIÓN / ÍCONO */}
        <div className="relative mb-8 inline-block">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="relative bg-surface-light dark:bg-surface-dark p-6 rounded-3xl shadow-xl border border-border-subtle">
            <Store size={64} className="text-primary" />
            <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full border-4 border-surface-light dark:border-surface-dark">
              <ShieldCheck size={20} />
            </div>
          </div>
        </div>

        <h1 className="text-4xl font-black text-content-main mb-2 tracking-tight">
          ¡Hola de nuevo!
        </h1>
        <p className="text-content-secondary text-lg mb-10 leading-relaxed">
          La caja se encuentra cerrada.<br />
          Ingresa el fondo inicial en las monedas disponibles.
        </p>

        {/* FORMULARIO INTEGRADO */}
        <form onSubmit={handleSubmit} className="bg-surface-light dark:bg-surface-dark p-4 rounded-3xl shadow-xl border border-border-subtle flex flex-col gap-4 transition-all">

          {/* INPUT USD */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">
              $
            </div>
            <input
              ref={inputRef}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 USD"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xl font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
              value={montoUSD}
              onChange={(e) => setMontoUSD(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* INPUT BS */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-500 font-bold">
              Bs
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00 VES"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xl font-bold text-slate-800 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/50 outline-none transition-all"
              value={montoBS}
              onChange={(e) => setMontoBS(e.target.value)}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            disabled={(!montoUSD && !montoBS) || isLoading}
            className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-2 transition-all active:scale-95 mt-2 ${(!montoUSD && !montoBS) || isLoading
              ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/30'
              }`}
          >
            {isLoading ? <Loader2 size={24} className="animate-spin" /> : <ArrowRight size={24} />}
            <span>ABRIR CAJA</span>
          </button>
        </form>

        <p className="mt-6 text-xs text-content-secondary font-medium uppercase tracking-widest">
          Sistema Seguro FÉNIX v4.1
        </p>



      </div>
    </div>
  );
}