import React, { useState, useMemo } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  RefreshCw, Download, BarChart4, Save,
  CreditCard, Plus, Smartphone, Banknote, Wallet, Send, Bitcoin, Lock,
  DollarSign, Euro, ArrowRight, ChevronDown // ✅ Agregamos ChevronDown para los selects
} from 'lucide-react';
import ListaMetodos from '../../components/config/ListaMetodos';
import Swal from 'sweetalert2';
import CasheaIcon from '../../components/CasheaIcon';
import CustomSelect from '../../components/common/CustomSelect';

export default function ConfigFinanzas({ form, handleChange, handleGuardar, setForm, readOnly }) {
  // ✅ LÓGICA INTACTA: Usamos el contexto para acceder a la función real
  const { metodosPago, agregarMetodoPago, editarMetodoPago, toggleMetodoPago, eliminarMetodoPago, obtenerTasaBCV } = useStore();

  const [showModalMetodo, setShowModalMetodo] = useState(false);
  const [metodoForm, setMetodoForm] = useState({ id: null, nombre: '', tipo: 'BS', icono: 'CreditCard', activo: true, requiereRef: false, aplicaIGTF: false });
  const [localLoading, setLocalLoading] = useState(false);

  const metodosBs = metodosPago ? metodosPago.filter(m => m.tipo === 'BS') : [];
  const metodosDivisa = metodosPago ? metodosPago.filter(m => m.tipo === 'DIVISA') : [];
  const iconList = { CreditCard, Smartphone, Banknote, Wallet, Send, Bitcoin };
  const iconNombres = { CreditCard: 'TARJETA', Smartphone: 'TELÉFONO', Banknote: 'BILLETE', Wallet: 'BILLETERA', Send: 'ENVIAR', Bitcoin: 'BITCOIN' };

  // --- Lógica de Métodos (Sin cambios) ---
  const guardarMetodo = () => {
    if (readOnly) return;
    if (!metodoForm.nombre) return Swal.fire('Error', 'Nombre requerido', 'error');
    let resultado;
    if (metodoForm.id) resultado = editarMetodoPago(metodoForm.id, metodoForm);
    else resultado = agregarMetodoPago(metodoForm);

    if (resultado && resultado.success) {
      setShowModalMetodo(false);
      setMetodoForm({ id: null, nombre: '', tipo: 'BS', icono: 'CreditCard', activo: true, requiereRef: false });
    } else {
      Swal.fire('Error', resultado?.message || 'Error al guardar método', 'error');
    }
  };

  const handleToggleMetodo = (id) => {
    if (readOnly) return;
    const result = toggleMetodoPago(id);
    if (!result.success) Swal.fire({ icon: 'warning', title: 'Acción Bloqueada', text: result.message });
  };

  const handleBorrarMetodo = (id) => {
    if (readOnly) return;
    Swal.fire({ title: '¿Eliminar?', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' }).then((r) => {
      if (r.isConfirmed) eliminarMetodoPago(id);
    });
  };

  // --- Lógica de Tasa (Sin cambios) ---
  const cambiarTipoTasa = (tipo) => {
    if (readOnly) return;
    setForm(prev => ({ ...prev, tipoTasa: tipo }));
    // 🆕 Auto-sync al cambiar moneda para evitar confusión (Tasa anterior con Moneda nueva)
    // Usamos timeout para permitir que el estado local se actualice o pasamos el tipo directo
    setTimeout(() => ejecutarSincronizacion(tipo), 100);
  };

  // ✅ FUNCIÓN DE SINCRONIZACIÓN (Bypass intacto)
  const ejecutarSincronizacion = async (tipoOverride = null) => {
    setLocalLoading(true);
    try {
      // FIX: Si viene de onClick, tipoOverride es un Evento (Objeto). Ignorarlo.
      const tipo = (typeof tipoOverride === 'string') ? tipoOverride : form.tipoTasa;

      // FIX: obtenerTasaBCV solo recibe (forzar, monedaOverride, redondeoOverride)
      const nuevaTasa = await obtenerTasaBCV(true, tipo, form.modoRedondeo);
      if (nuevaTasa) {
        setForm(prev => ({
          ...prev,
          tasa: nuevaTasa,
          tipoTasa: tipo
        }));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLocalLoading(false);
    }
  };

  const monedaIcono = (form.tipoTasa || 'USD') === 'EUR' ? <Euro size={20} /> : <DollarSign size={20} />;
  const monedaTexto = (form.tipoTasa || 'USD') === 'EUR' ? 'Euro' : 'Dólar';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">

      {/* 🛠️ PARCHE CSS QUIRÚRGICO */}
      <style>{`
        /* 1. Solución para Títulos Cortados */
        .fix-listas-ui h3, 
        .fix-listas-ui h4, 
        .fix-listas-ui div[class*="truncate"] {
           overflow: visible !important;
           white-space: nowrap !important;
           text-overflow: clip !important;
           padding-right: 10px; 
        }
        
        /* 2. Solución para Artefacto Roto */
        .fix-listas-ui img:not([src]), 
        .fix-listas-ui img[src=""],
        .fix-listas-ui img[src="#"] {
           display: none !important;
        }
      `}</style>

      {/* === SECCIÓN ÚNICA: MÉTODOS DE PAGO (FULL WIDTH) === */}
      <div className="lg:col-span-12 flex flex-col h-full">

        {/* ===================================== */}
        {/* 💵 ZONA: TASA DE CAMBIO (RESTORED) */}
        {/* ===================================== */}
        {!readOnly && (
          <div className="mb-6 p-6 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-subtle dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-status-successBg text-status-success rounded-lg shadow-sm">
                  {monedaIcono}
                </div>
                <div>
                  <h3 className="font-bold text-lg text-content-main dark:text-content-inverse flex items-center gap-2">
                    Tasa de Cambio
                    {localLoading && <RefreshCw className="animate-spin text-content-secondary" size={14} />}
                  </h3>
                  <p className="text-sm text-content-secondary">Valor de referencia para conversiones</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-app-light dark:bg-slate-700 p-1 rounded-lg">
                <button
                  onClick={() => cambiarTipoTasa('USD')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${form.tipoTasa === 'USD' ? 'bg-surface-light dark:bg-slate-600 shadow-sm text-status-success border border-status-success/20' : 'text-content-secondary hover:text-content-main dark:text-slate-400'}`}
                >
                  USD ($)
                </button>
                <button
                  onClick={() => cambiarTipoTasa('EUR')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${form.tipoTasa === 'EUR' ? 'bg-surface-light dark:bg-slate-600 shadow-sm text-primary border border-primary/20' : 'text-content-secondary hover:text-content-main dark:text-slate-400'}`}
                >
                  EUR (€)
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-end">
              <div className="flex-1 w-full relative group">
                <label className="text-xs font-bold text-content-secondary uppercase mb-1 block group-focus-within:text-status-success transition-colors">
                  Valor Actual (Bs por {monedaTexto})
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.tasa || ''}
                  onChange={e => setForm(prev => ({ ...prev, tasa: parseFloat(e.target.value) || 0 }))}
                  className="w-full text-2xl font-black bg-surface-light dark:bg-slate-900 border-2 border-border-subtle dark:border-slate-700 rounded-xl px-4 py-3 focus:border-status-success focus:ring-4 focus:ring-status-success/10 outline-none transition-all text-content-main dark:text-content-inverse"
                  placeholder="0.00"
                />
                <div className="absolute right-4 top-10 text-status-success opacity-50 font-bold text-sm pointer-events-none">Bs.</div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  onClick={ejecutarSincronizacion}
                  disabled={localLoading}
                  className="flex-1 sm:flex-none h-[52px] bg-status-successBg hover:bg-status-success/20 text-status-success px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-status-success/30 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
                  title="Sincronizar con BCV/Paralelo"
                >
                  <RefreshCw size={18} className={localLoading ? 'animate-spin' : ''} />
                  {localLoading ? 'Sincronizando...' : 'Sincronizar'}
                </button>

                {/* ✏️ P2: Botón Manual */}
                <button
                  onClick={async () => {
                    const { value: nuevaTasa } = await Swal.fire({
                      title: 'Tasa Manual',
                      text: 'Introduce el valor en Bs',
                      input: 'number',
                      inputValue: form.tasa || '',
                      inputAttributes: { step: 'any', min: '0' },
                      showCancelButton: true,
                      confirmButtonText: 'Guardar',
                      confirmButtonColor: '#10b981',
                      background: '#1e293b', color: '#fff'
                    });
                    if (nuevaTasa) {
                      setForm(prev => ({ ...prev, tasa: parseFloat(nuevaTasa), fuenteTasa: 'Manual', fechaTasa: new Date().toISOString() }));
                      Swal.fire({ icon: 'success', title: `Bs ${nuevaTasa}`, timer: 1000, showConfirmButton: false });
                    }
                  }}
                  className="flex-1 sm:flex-none h-[52px] bg-app-light hover:bg-border-subtle text-content-main dark:text-content-inverse px-5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-border-subtle dark:border-slate-700 transition-all active:scale-95"
                  title="Establecer tasa manualmente"
                >
                  ✏️ Manual
                </button>
              </div>
            </div>

            {/* 🆕 MODO DE REDONDEO */}
            <div className="mt-4 flex items-center justify-between p-3 bg-app-light dark:bg-slate-700/50 rounded-xl border border-dashed border-border-subtle dark:border-slate-600">
              <span className="text-xs font-bold text-content-secondary uppercase">Modo Redondeo</span>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setForm(prev => ({ ...prev, modoRedondeo: 'exacto' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${form.modoRedondeo === 'exacto' ? 'bg-surface-light shadow text-status-success border border-status-success/30' : 'text-content-secondary hover:text-content-main'}`}
                >
                  Exacto
                </button>
                <button
                  onClick={() => setForm(prev => ({ ...prev, modoRedondeo: 'entero' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${form.modoRedondeo === 'entero' ? 'bg-surface-light shadow text-primary border border-primary/30' : 'text-content-secondary hover:text-content-main'}`}
                >
                  Entero (0)
                </button>
                <button
                  onClick={() => setForm(prev => ({ ...prev, modoRedondeo: 'multiplo5' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${form.modoRedondeo === 'multiplo5' ? 'bg-surface-light shadow text-purple-500 border border-purple-500/30' : 'text-content-secondary hover:text-content-main'}`}
                >
                  Múltiplo 5
                </button>
                <button
                  onClick={() => setForm(prev => ({ ...prev, modoRedondeo: 'multiplo10' }))}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${form.modoRedondeo === 'multiplo10' ? 'bg-surface-light shadow text-status-warning border border-status-warning/30' : 'text-content-secondary hover:text-content-main'}`}
                >
                  Múltiplo 10
                </button>
              </div>
            </div>

            {/* 💱 P2: Freshness Indicator + Source */}
            <div className="mt-4 pt-4 border-t border-border-subtle dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={form.autoUpdateTasa}
                      onChange={e => setForm(prev => ({ ...prev, autoUpdateTasa: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-status-success/30 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-status-success"></div>
                  </div>
                  <span className="text-sm font-medium text-content-main dark:text-content-inverse group-hover:text-status-success transition-colors">
                    Actualización Automática (Al abrir la app)
                  </span>
                </label>
              </div>

              {/* Freshness + Source row */}
              {form.fechaTasa && (() => {
                const hoursAgo = (Date.now() - new Date(form.fechaTasa).getTime()) / (1000 * 60 * 60);
                const freshIcon = hoursAgo < 4 ? '🟢' : hoursAgo < 12 ? '🟡' : '🔴';
                const freshLabel = hoursAgo < 4 ? 'Vigente' : hoursAgo < 12 ? 'Desactualizada' : 'Vencida';
                const timeLabel = hoursAgo < 1 ? `hace ${Math.round(hoursAgo * 60)} min` : hoursAgo < 24 ? `hace ${Math.round(hoursAgo)}h` : new Date(form.fechaTasa).toLocaleDateString();
                return (
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                    <span>{freshIcon} {freshLabel}</span>
                    <span className="text-slate-300">•</span>
                    <span>{timeLabel}</span>
                    <span className="text-slate-300">•</span>
                    <span className="font-semibold">Fuente: {form.fuenteTasa || 'N/A'}</span>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 🆕 ZONA DE IMPUESTOS GENERALES (IVA) */}
        {!readOnly && (
          <div className="mb-6 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Banknote size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Impuesto al Valor Agregado (IVA)</h3>
                <p className="text-sm text-slate-500">Habilita o deshabilita el cálculo de IVA en todo el sistema.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* TOGGLE HABILITAR IVA */}
              <div
                onClick={() => setForm(prev => ({ ...prev, ivaActivo: !prev.ivaActivo }))}
                className={`flex-1 w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.ivaActivo
                  ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'
                  }`}
              >
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-200 block">Habilitar IVA</span>
                  <span className="text-xs text-slate-400">{form.ivaActivo ? 'Activo — productos pueden marcarse como gravados' : 'Deshabilitado — no se cobra IVA en ningún producto'}</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${form.ivaActivo ? 'bg-primary' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${form.ivaActivo ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              {/* INPUT PORCENTAJE — Solo visible si IVA está activo */}
              <div className={`flex-1 w-full relative transition-opacity ${!form.ivaActivo && 'opacity-40 pointer-events-none'}`}>
                <label className="text-xs font-bold text-content-secondary uppercase mb-1 block">Tasa General (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.porcentajeIva !== undefined ? form.porcentajeIva : 16}
                  onChange={e => setForm({ ...form, porcentajeIva: parseFloat(e.target.value) })}
                  className="w-full text-lg font-black bg-surface-light dark:bg-slate-900 border-2 border-border-subtle dark:border-slate-700 rounded-xl px-4 py-3 focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-content-main dark:text-content-inverse"
                />
                <span className="absolute right-4 top-9 text-content-secondary font-bold">%</span>
              </div>
            </div>

            {/* NOTA CONTEXTUAL */}
            <div className="mt-4 flex items-center p-3 bg-primary-light/50 rounded-xl border border-primary/20 dark:bg-surface-dark dark:border-slate-700">
              <p className="text-xs text-primary dark:text-blue-300">
                {form.ivaActivo
                  ? <>ℹ️ <b>Nota:</b> Este porcentaje aplicará automáticamente a todos los productos marcados como "Gravados" y a los cálculos de reportes Z.</>
                  : <>⚠️ <b>IVA Deshabilitado:</b> No se cobrará impuesto en ninguna venta. Los productos no podrán marcarse como gravados.</>
                }
              </p>
            </div>
          </div>
        )}

        {/* 🆕 ZONA DE IMPUESTOS ADICIONALES (IGTF) */}
        {!readOnly && (
          <div className="mb-8 p-6 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-subtle dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-status-warningBg text-status-warning rounded-lg">
                <Bitcoin size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-content-main dark:text-content-inverse">Impuesto a Grandes Transacciones (IGTF)</h3>
                <p className="text-sm text-content-secondary">Configura el recargo porcentual para pagos en divisas.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* TOGGLE ACTIVAR */}
              <div
                onClick={() => setForm(prev => ({ ...prev, igtfActivo: !prev.igtfActivo }))}
                className={`flex-1 w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.igtfActivo
                  ? 'bg-status-warningBg border-status-warning/30 dark:bg-status-warning/10 dark:border-status-warning/40'
                  : 'bg-app-light border-border-subtle dark:bg-slate-800 dark:border-slate-700 hover:border-status-warning/30'
                  }`}
              >
                <div>
                  <span className="font-bold text-content-main dark:text-content-inverse block">Habilitar IGTF</span>
                  <span className="text-xs text-content-secondary">Cobrar recargo automático</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${form.igtfActivo ? 'bg-status-warning' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${form.igtfActivo ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              {/* INPUT PORCENTAJE */}
              <div className={`flex-1 w-full relative ${!form.igtfActivo && 'opacity-50 pointer-events-none'}`}>
                <label className="text-xs font-bold text-content-secondary uppercase mb-1 block">Porcentaje (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.igtfTasa || 3}
                  onChange={e => setForm({ ...form, igtfTasa: parseFloat(e.target.value) })}
                  className="w-full text-lg font-black bg-surface-light dark:bg-slate-900 border-2 border-border-subtle dark:border-slate-700 rounded-xl px-4 py-3 focus:border-status-warning focus:ring-4 focus:ring-status-warning/10 outline-none transition-all text-content-main dark:text-content-inverse"
                />
                <span className="absolute right-4 top-9 text-content-secondary font-bold">%</span>
              </div>
            </div>
          </div>
        )}

        {/* 🏪 ZONA DE CONFIGURACIÓN CASHEA */}
        {!readOnly && (
          <div className="mb-8 p-6 bg-surface-light dark:bg-surface-dark rounded-2xl shadow-sm border border-border-subtle dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 rounded-lg">
                <CasheaIcon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-content-main dark:text-content-inverse">Módulo Cashea (BNPL)</h3>
                <p className="text-sm text-content-secondary">Permite a tus clientes comprar ahora y pagar después con financiamiento Cashea.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* TOGGLE ACTIVAR */}
              <div
                onClick={() => setForm(prev => ({ ...prev, casheaActivo: !prev.casheaActivo }))}
                className={`flex-1 w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.casheaActivo
                  ? 'bg-purple-50 border-purple-200 dark:bg-purple-900/10 dark:border-purple-800'
                  : 'bg-app-light border-border-subtle dark:bg-slate-800 dark:border-slate-700 hover:border-purple-300'
                  }`}
              >
                <div>
                  <span className="font-bold text-content-main dark:text-content-inverse block">Habilitar Cashea</span>
                  <span className="text-xs text-content-secondary">Permitir este método de pago en caja</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${form.casheaActivo ? 'bg-purple-600' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${form.casheaActivo ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              {/* INPUT MONTO MÍNIMO */}
              <div className={`flex-1 w-full relative ${!form.casheaActivo && 'opacity-50 pointer-events-none'}`}>
                <label className="text-xs font-bold text-content-secondary uppercase mb-1 block">Monto Mínimo de Venta (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.casheaMinimo !== undefined && form.casheaMinimo !== null ? form.casheaMinimo : ''}
                  onChange={e => {
                      const val = e.target.value;
                      setForm({ ...form, casheaMinimo: val === '' ? '' : parseFloat(val) });
                  }}
                  onFocus={e => e.target.select()}
                  onBlur={() => {
                      if (form.casheaMinimo === '' || form.casheaMinimo === undefined || form.casheaMinimo === null) {
                          setForm({ ...form, casheaMinimo: 0 });
                      }
                  }}
                  className="w-full text-lg font-black bg-surface-light dark:bg-slate-900 border-2 border-border-subtle dark:border-slate-700 rounded-xl px-4 py-3 focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 outline-none transition-all text-content-main dark:text-content-inverse"
                />
                <span className="absolute right-4 top-9 text-content-secondary font-bold">$</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="font-black text-2xl text-content-main dark:text-content-inverse flex items-center gap-3">
              <CreditCard className="text-primary" size={32} /> Métodos de Pago
            </h3>
            <p className="text-content-secondary text-sm mt-1">Administra las formas de pago aceptadas en caja.</p>
          </div>
          {!readOnly && (
            <button
              onClick={() => { setMetodoForm({ id: null, nombre: '', tipo: 'BS', icono: 'CreditCard', activo: true, requiereRef: false }); setShowModalMetodo(true); }}
              className="bg-primary hover:bg-primary-hover text-content-inverse px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-primary/30 transition-all active:scale-95"
            >
              <Plus size={18} /> Nuevo Método
            </button>
          )}
        </div>

        {/* GRID DE LISTAS CON CLASE DE CORRECCIÓN APLICADA (fix-listas-ui) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1 fix-listas-ui">
          <ListaMetodos
            lista={metodosBs}
            titulo="BOLÍVARES (Bs)"
            colorBorde="border-t-primary"
            colorIcono="bg-primary-light text-primary"
            handleToggleMetodo={readOnly ? null : handleToggleMetodo}
            setMetodoForm={readOnly ? null : setMetodoForm}
            setShowModalMetodo={readOnly ? null : setShowModalMetodo}
            handleBorrarMetodo={readOnly ? null : handleBorrarMetodo}
          />
          <ListaMetodos
            lista={metodosDivisa}
            titulo="DIVISAS ($/€)"
            colorBorde="border-t-status-success"
            colorIcono="bg-status-successBg text-status-success"
            handleToggleMetodo={readOnly ? null : handleToggleMetodo}
            setMetodoForm={readOnly ? null : setMetodoForm}
            setShowModalMetodo={readOnly ? null : setShowModalMetodo}
            handleBorrarMetodo={readOnly ? null : handleBorrarMetodo}
          />
        </div>

        {!readOnly && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleGuardar}
              className="bg-primary hover:bg-primary-hover text-content-inverse font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all active:scale-95"
            >
              <Save size={20} /> GUARDAR CAMBIOS
            </button>
          </div>
        )}
      </div>

      {/* === MODAL ESTILIZADO (CORREGIDO) === */}
      {showModalMetodo && !readOnly && (
        <div className="fixed inset-0 bg-surface-dark/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl w-full max-w-md shadow-2xl border border-border-subtle dark:border-slate-700 scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-2xl mb-6 text-content-main dark:text-content-inverse">
              {metodoForm.id ? 'Editar Método' : 'Nuevo Método'}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-content-secondary uppercase mb-1.5 block">Nombre del Método</label>
                <input
                  className="w-full p-3 bg-app-light dark:bg-slate-700 border border-border-subtle dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary focus:bg-surface-light transition-all outline-none text-content-main dark:text-content-inverse"
                  value={metodoForm.nombre}
                  onChange={e => setMetodoForm({ ...metodoForm, nombre: e.target.value })}
                  autoFocus
                  placeholder="Ej: Pago Móvil"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-content-secondary uppercase mb-1.5 block">Moneda</label>
                  <CustomSelect
                    className="p-3 bg-app-light dark:bg-slate-700 border border-border-subtle dark:border-slate-600 text-content-main dark:text-content-inverse text-xs rounded-xl"
                    value={metodoForm.tipo}
                    onChange={val => setMetodoForm({ ...metodoForm, tipo: val })}
                    options={[
                      { value: "BS", label: "Bolívares" },
                      { value: "DIVISA", label: "Divisa" }
                    ]}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-content-secondary uppercase mb-1.5 block">Icono Visual</label>
                  <CustomSelect
                    className="p-3 bg-app-light dark:bg-slate-700 border border-border-subtle dark:border-slate-600 text-content-main dark:text-content-inverse text-xs rounded-xl"
                    value={metodoForm.icono}
                    onChange={val => setMetodoForm({ ...metodoForm, icono: val })}
                    options={Object.keys(iconList).map(ic => ({ value: ic, label: iconNombres[ic] || ic }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-app-light dark:bg-app-dark rounded-xl border border-border-subtle dark:border-slate-700 cursor-pointer hover:bg-surface-light transition-colors">
                <input
                  type="checkbox"
                  checked={metodoForm.requiereRef}
                  onChange={e => setMetodoForm({ ...metodoForm, requiereRef: e.target.checked })}
                  className="w-5 h-5 accent-primary rounded"
                />
                <div>
                  <span className="text-sm font-bold text-content-main dark:text-content-inverse block">Exigir Referencia</span>
                  <span className="text-xs text-content-secondary">Solicitar # de comprobante al cobrar.</span>
                </div>
              </label>

              {/* 🆕 CHECKBOX IGTF (Visible para todos) */}
              <label className="flex items-center gap-3 p-4 bg-status-warningBg dark:bg-status-warning/10 rounded-xl border border-status-warning/20 dark:border-status-warning/30 cursor-pointer hover:bg-status-warning/15 transition-colors">
                <input
                  type="checkbox"
                  checked={metodoForm.aplicaIGTF}
                  onChange={e => setMetodoForm({ ...metodoForm, aplicaIGTF: e.target.checked })}
                  className="w-5 h-5 accent-status-warning rounded"
                />
                <div>
                  <span className="text-sm font-bold text-content-main dark:text-content-inverse block">Aplica Impuesto IGTF (+{form.igtfTasa}%)</span>
                  <span className="text-xs text-content-secondary">Sumar recargo automáticamente</span>
                </div>
              </label>

              <div className="flex gap-3 pt-4 border-t border-border-subtle dark:border-slate-700 mt-2">
                <button
                  onClick={() => setShowModalMetodo(false)}
                  className="flex-1 py-3 bg-surface-light dark:bg-surface-dark border border-border-subtle dark:border-slate-700 hover:bg-app-light rounded-xl font-bold text-content-main dark:text-content-inverse transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarMetodo}
                  className="flex-1 py-3 bg-primary hover:bg-primary-hover text-content-inverse rounded-xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}