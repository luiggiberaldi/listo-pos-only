import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import {
  RefreshCw, Download, BarChart4, Save,
  CreditCard, Plus, Smartphone, Banknote, Wallet, Send, Bitcoin, Lock,
  DollarSign, Euro, ArrowRight, ChevronDown // ✅ Agregamos ChevronDown para los selects
} from 'lucide-react';
import ListaMetodos from '../../components/config/ListaMetodos';
import Swal from 'sweetalert2';

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
  };

  // ✅ FUNCIÓN DE SINCRONIZACIÓN (Bypass intacto)
  const ejecutarSincronizacion = async () => {
    setLocalLoading(true);
    try {
      const nuevaTasa = await obtenerTasaBCV(true, form.modoRedondeo, form.tipoTasa);
      if (nuevaTasa) {
        setForm(prev => ({
          ...prev,
          tasa: nuevaTasa,
          tipoTasa: form.tipoTasa
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

        {/* 🆕 ZONA DE IMPUESTOS GENERALES (IVA) */}
        {!readOnly && (
          <div className="mb-6 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Banknote size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Impuesto al Valor Agregado (IVA)</h3>
                <p className="text-sm text-slate-500">Define la tasa impositiva general para productos gravados.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              <div className="flex-1 w-full relative">
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Tasa General (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.porcentajeIva !== undefined ? form.porcentajeIva : 16}
                  onChange={e => setForm({ ...form, porcentajeIva: parseFloat(e.target.value) })}
                  className="w-full text-lg font-black bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:border-blue-500 focus:ring-0 outline-none transition-all"
                />
                <span className="absolute right-4 top-9 text-slate-400 font-bold">%</span>
              </div>
              <div className="flex-1 w-full flex items-center p-4 bg-blue-50/50 rounded-xl border border-blue-100 dark:bg-slate-800 dark:border-slate-700">
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  ℹ️ <b>Nota:</b> Este porcentaje aplicará automáticamente a todos los productos marcados como "Gravados" y a los cálculos de reportes Z.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 🆕 ZONA DE IMPUESTOS ADICIONALES (IGTF) */}
        {!readOnly && (
          <div className="mb-8 p-6 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                <Bitcoin size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Impuesto a Grandes Transacciones (IGTF)</h3>
                <p className="text-sm text-slate-500">Configura el recargo porcentual para pagos en divisas.</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6 items-center">
              {/* TOGGLE ACTIVAR */}
              <div
                onClick={() => setForm(prev => ({ ...prev, igtfActivo: !prev.igtfActivo }))}
                className={`flex-1 w-full flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer ${form.igtfActivo
                  ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/10 dark:border-orange-800'
                  : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-orange-300'
                  }`}
              >
                <div>
                  <span className="font-bold text-slate-700 dark:text-slate-200 block">Habilitar IGTF</span>
                  <span className="text-xs text-slate-400">Cobrar recargo automático</span>
                </div>
                <div className={`w-12 h-6 rounded-full relative transition-colors ${form.igtfActivo ? 'bg-orange-500' : 'bg-slate-300'}`}>
                  <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${form.igtfActivo ? 'translate-x-6' : ''}`} />
                </div>
              </div>

              {/* INPUT PORCENTAJE */}
              <div className={`flex-1 w-full relative ${!form.igtfActivo && 'opacity-50 pointer-events-none'}`}>
                <label className="text-xs font-bold text-slate-400 uppercase mb-1 block">Porcentaje (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.igtfTasa || 3}
                  onChange={e => setForm({ ...form, igtfTasa: parseFloat(e.target.value) })}
                  className="w-full text-lg font-black bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 focus:border-orange-500 focus:ring-0 outline-none transition-all"
                />
                <span className="absolute right-4 top-9 text-slate-400 font-bold">%</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end mb-6">
          <div>
            <h3 className="font-black text-2xl text-slate-800 dark:text-white flex items-center gap-3">
              <CreditCard className="text-blue-600" size={32} /> Métodos de Pago
            </h3>
            <p className="text-slate-500 text-sm mt-1">Administra las formas de pago aceptadas en caja.</p>
          </div>
          {!readOnly && (
            <button
              onClick={() => { setMetodoForm({ id: null, nombre: '', tipo: 'BS', icono: 'CreditCard', activo: true, requiereRef: false }); setShowModalMetodo(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-500/30 transition-all active:scale-95"
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
            colorBorde="border-t-blue-500"
            colorIcono="bg-blue-50 text-blue-600"
            handleToggleMetodo={readOnly ? null : handleToggleMetodo}
            setMetodoForm={readOnly ? null : setMetodoForm}
            setShowModalMetodo={readOnly ? null : setShowModalMetodo}
            handleBorrarMetodo={readOnly ? null : handleBorrarMetodo}
          />
          <ListaMetodos
            lista={metodosDivisa}
            titulo="DIVISAS ($/€)"
            colorBorde="border-t-emerald-500"
            colorIcono="bg-emerald-50 text-emerald-600"
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
              className="bg-slate-900 hover:bg-black text-white font-bold py-4 px-8 rounded-xl flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all active:scale-95"
            >
              <Save size={20} /> GUARDAR CAMBIOS
            </button>
          </div>
        )}
      </div>

      {/* === MODAL ESTILIZADO (CORREGIDO) === */}
      {showModalMetodo && !readOnly && (
        <div className="fixed inset-0 bg-slate-900/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl w-full max-w-md shadow-2xl border border-white/20 scale-100 animate-in zoom-in-95 duration-200">
            <h3 className="font-black text-2xl mb-6 text-slate-800 dark:text-white">
              {metodoForm.id ? 'Editar Método' : 'Nuevo Método'}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nombre del Método</label>
                <input
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none dark:bg-slate-700 dark:text-white dark:border-slate-600"
                  value={metodoForm.nombre}
                  onChange={e => setMetodoForm({ ...metodoForm, nombre: e.target.value })}
                  autoFocus
                  placeholder="Ej: Pago Móvil"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Moneda</label>
                  {/* ✅ CORRECCIÓN VISUAL: Select customizado con icono en posición correcta */}
                  <div className="relative">
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white dark:border-slate-600 pr-10"
                      value={metodoForm.tipo}
                      onChange={e => setMetodoForm({ ...metodoForm, tipo: e.target.value })}
                    >
                      <option value="BS">Bolívares</option>
                      <option value="DIVISA">Divisa</option>
                    </select>
                    {/* Flecha posicionada en right-4 para evitar que esté "muy a la derecha" */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Icono Visual</label>
                  {/* ✅ CORRECCIÓN VISUAL: Select customizado con icono en posición correcta */}
                  <div className="relative">
                    <select
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl appearance-none focus:ring-2 focus:ring-blue-500 outline-none dark:bg-slate-700 dark:text-white dark:border-slate-600 pr-10"
                      value={metodoForm.icono}
                      onChange={e => setMetodoForm({ ...metodoForm, icono: e.target.value })}
                    >
                      {Object.keys(iconList).map(ic => <option key={ic} value={ic}>{iconNombres[ic] || ic}</option>)}
                    </select>
                    {/* Flecha posicionada en right-4 */}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                      <ChevronDown size={16} />
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700 cursor-pointer hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={metodoForm.requiereRef}
                  onChange={e => setMetodoForm({ ...metodoForm, requiereRef: e.target.checked })}
                  className="w-5 h-5 accent-blue-600 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Exigir Referencia</span>
                  <span className="text-xs text-slate-400">Solicitar # de comprobante al cobrar.</span>
                </div>
              </label>

              {/* 🆕 CHECKBOX IGTF (Visible para todos) */}
              <label className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-xl border border-orange-100 dark:border-orange-800 cursor-pointer hover:bg-orange-100 transition-colors">
                <input
                  type="checkbox"
                  checked={metodoForm.aplicaIGTF}
                  onChange={e => setMetodoForm({ ...metodoForm, aplicaIGTF: e.target.checked })}
                  className="w-5 h-5 accent-orange-500 rounded"
                />
                <div>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300 block">Aplica Impuesto IGTF (+{form.igtfTasa}%)</span>
                  <span className="text-xs text-slate-400">Sumar recargo automáticamente</span>
                </div>
              </label>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700 mt-2">
                <button
                  onClick={() => setShowModalMetodo(false)}
                  className="flex-1 py-3 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl font-bold text-slate-600 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarMetodo}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 transition-all active:scale-95"
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