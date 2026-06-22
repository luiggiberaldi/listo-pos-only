import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Package, Scan, DollarSign, Tag, Save, X, Plus, Box, Scale, AlertTriangle, ChevronRight, ChevronLeft, Check, Droplet } from 'lucide-react';
import Swal from 'sweetalert2';
import SmartCategorySelector from './SmartCategorySelector';

const CATEGORY_SUGGESTIONS = {
  // Bebidas
  'coca': 'Bebidas', 'pepsi': 'Bebidas', 'malta': 'Bebidas', 'jugo': 'Bebidas', 'refresco': 'Bebidas', 'chinotto': 'Bebidas', 'agua': 'Bebidas', 'te': 'Bebidas', 'cerveza': 'Bebidas', 'ron': 'Bebidas', 'vino': 'Bebidas', 'bebida': 'Bebidas', 'nestea': 'Bebidas', 'frescolita': 'Bebidas',
  // Víveres / Abarrotes
  'arroz': 'Abarrotes', 'harina': 'Abarrotes', 'pasta': 'Abarrotes', 'aceite': 'Abarrotes', 'azucar': 'Abarrotes', 'sal': 'Abarrotes', 'cafe': 'Abarrotes', 'lenteja': 'Abarrotes', 'caraota': 'Abarrotes', 'margarina': 'Abarrotes', 'mayonesa': 'Abarrotes', 'salsa': 'Abarrotes', 'vinagre': 'Abarrotes', 'avena': 'Abarrotes', 'atun': 'Abarrotes', 'sardina': 'Abarrotes', 'granos': 'Abarrotes', 'pan': 'Abarrotes', 'ketchup': 'Abarrotes',
  // Limpieza
  'jabon': 'Limpieza', 'detergente': 'Limpieza', 'cloro': 'Limpieza', 'desinfectante': 'Limpieza', 'suavizante': 'Limpieza', 'lavaplatos': 'Limpieza', 'esponja': 'Limpieza', 'limpiador': 'Limpieza',
  // Higiene / Cuidado Personal
  'crema': 'Higiene', 'shampoo': 'Higiene', 'desodorante': 'Higiene', 'papel': 'Higiene', 'toalla': 'Higiene', 'cepillo': 'Higiene', 'colgate': 'Higiene', 'acondicionador': 'Higiene',
  // Lácteos / Charcutería
  'leche': 'Lácteos', 'queso': 'Charcutería', 'jamon': 'Charcutería', 'mantequilla': 'Lácteos', 'yogurt': 'Lácteos', 'suero': 'Lácteos', 'crema de leche': 'Lácteos', 'mortadela': 'Charcutería', 'salchicha': 'Charcutería', 'tocineta': 'Charcutería',
  // Golosinas
  'chocolate': 'Golosinas', 'galleta': 'Golosinas', 'caramelo': 'Golosinas', 'chicle': 'Golosinas', 'papitas': 'Golosinas', 'doritos': 'Golosinas', 'susy': 'Golosinas', 'cocosette': 'Golosinas', 'pirulin': 'Golosinas', 'oreo': 'Golosinas'
};

const getCategorySuggestion = (name) => {
  if (!name) return null;
  const clean = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  for (const [key, category] of Object.entries(CATEGORY_SUGGESTIONS)) {
    if (clean.includes(key)) {
      return category;
    }
  }
  return null;
};

export default function ProductWizardForm({
  form,
  updateField,
  onSave,
  onCancel,
  productoEditar,
  categorias,
  tasa,
  updateJerarquia
}) {
  const { crearCategoria } = useStore();
  const [step, setStep] = useState(1);
  const [suggestedCategory, setSuggestedCategory] = useState(null);

  // Focus Refs
  const barcodeInputRef = useRef(null);
  const nameInputRef = useRef(null);
  const priceInputRef = useRef(null);
  const costInputRef = useRef(null);
  const stockInputRef = useRef(null);

  // Box states
  const isPesaje = form.tipoUnidad === 'peso';
  const isLitro = form.tipoUnidad === 'litro';
  const isDecimalUnit = isPesaje || isLitro;
  const hasBulto = !isDecimalUnit && form.jerarquia?.bulto?.activo;
  const bultoContent = parseFloat(form.jerarquia?.bulto?.contenido) || 1;

  // Auto-focus on step change
  useEffect(() => {
    setTimeout(() => {
      if (step === 1) {
        if (barcodeInputRef.current) barcodeInputRef.current.focus();
      } else if (step === 3) {
        if (priceInputRef.current) priceInputRef.current.focus();
      } else if (step === 4) {
        if (stockInputRef.current) stockInputRef.current.focus();
      }
    }, 150);
  }, [step]);

  // Handle key navigations
  const handleKeyDown = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  // Profit calculations
  const unitCost = parseFloat(form.costo) || 0;
  const unitPrice = parseFloat(form.precio) || 0;
  const unitGanancia = unitPrice - unitCost;
  const unitMargen = unitCost > 0 ? ((unitGanancia / unitCost) * 100).toFixed(1) : null;

  const boxCost = unitCost * bultoContent;
  const boxPrice = parseFloat(form.jerarquia?.bulto?.precio) || 0;
  const boxGanancia = boxPrice - boxCost;
  const boxMargen = boxCost > 0 ? ((boxGanancia / boxCost) * 100).toFixed(1) : null;

  // Stock values
  const stockTotal = parseFloat(form.stock) || 0;
  const stockCajas = hasBulto ? Math.floor(stockTotal / bultoContent) : 0;
  const stockUnidades = hasBulto ? (stockTotal % bultoContent) : stockTotal;

  const updateStock = (cajas, unidades) => {
    const total = (cajas * bultoContent) + unidades;
    updateField('stock', total);
  };

  // Suggest Category
  const handleNameChange = (val) => {
    const titleCased = val.replace(/\b\w/g, l => l.toUpperCase());
    updateField('nombre', titleCased);

    const suggestion = getCategorySuggestion(val);
    setSuggestedCategory(suggestion);
  };

  const applySuggestedCategory = async () => {
    if (!suggestedCategory) return;
    if (!categorias.includes(suggestedCategory.toUpperCase())) {
      await crearCategoria(suggestedCategory.toUpperCase());
    }
    updateField('categoria', suggestedCategory.toUpperCase());
    setSuggestedCategory(null);
  };

  // Step Validation
  const validateStep = () => {
    if (step === 1) {
      if (!form.nombre || form.nombre.trim() === '') {
        Swal.fire('Nombre Requerido', 'Por favor ingresa el nombre del producto para continuar.', 'warning');
        return false;
      }
    }
    if (step === 3) {
      const priceVal = parseFloat(form.precio) || 0;
      if (priceVal <= 0) {
        Swal.fire('Precio Requerido', 'El precio de venta debe ser mayor a 0.', 'warning');
        return false;
      }
      if (hasBulto) {
        const boxPriceVal = parseFloat(form.jerarquia?.bulto?.precio) || 0;
        if (boxPriceVal <= 0) {
          Swal.fire('Precio de Caja Requerido', 'Ingresa un precio de venta para el bulto/caja.', 'warning');
          return false;
        }
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(prev => Math.min(prev + 1, 4));
    }
  };

  const prevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  // Toggle Box Mode
  const toggleBulto = () => {
    const newState = !hasBulto;
    updateJerarquia('bulto', 'activo', newState);
    if (newState) {
      if (!form.jerarquia?.bulto?.contenido || form.jerarquia?.bulto?.contenido === 1) {
        updateJerarquia('bulto', 'contenido', 12);
      }
      updateJerarquia('bulto', 'seVende', true);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/50">

      {/* 🚀 WIZARD STEP HEADER PROGRESS BAR */}
      <div className="px-8 py-5 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          {[
            { num: 1, label: 'Identidad' },
            { num: 2, label: 'Presentación' },
            { num: 3, label: 'Precios' },
            { num: 4, label: 'Inventario' }
          ].map((s, idx, arr) => (
            <React.Fragment key={s.num}>
              <div className="flex flex-col items-center relative z-10 group cursor-pointer" onClick={() => { if (s.num < step || validateStep()) setStep(s.num); }}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-md
                  ${step === s.num
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/30 scale-110'
                    : step > s.num
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
                >
                  {step > s.num ? <Check size={16} /> : s.num}
                </div>
                <span className={`text-[10px] font-bold mt-2 tracking-tight transition-colors
                  ${step === s.num ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`}
                >
                  {s.label}
                </span>
              </div>
              {idx < arr.length - 1 && (
                <div className="flex-1 h-1 mx-4 rounded-full relative -top-3 overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-blue-600 transition-all duration-500 ease-out"
                    style={{ width: step > s.num ? '100%' : '0%' }}
                  />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 📦 WIZARD BODY CONTENT */}
      <div className="flex-1 overflow-y-auto px-8 py-8 flex justify-center items-start">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-950 p-8 rounded-3xl shadow-xl border border-slate-100 dark:border-slate-800 transition-all duration-300 animate-in fade-in slide-in-from-bottom-6">
          
          {/* STEP 1: IDENTIDAD */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                  1. Identificación del Producto
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Comencemos por escanear y nombrar tu producto.</p>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Código de Barras (Opcional)</label>
                  <div className="relative group">
                    <Scan className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={20} />
                    <input
                      ref={barcodeInputRef}
                      type="text"
                      value={form.codigo}
                      onChange={(e) => updateField('codigo', e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, () => nameInputRef.current.focus())}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-600 transition-all font-mono text-lg"
                      placeholder="Escanea el código de barras aquí..."
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase mb-1.5 block">Nombre del Producto</label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={form.nombre}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, nextStep)}
                    className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/20 focus:border-blue-600 transition-all text-lg font-bold"
                    placeholder="Ej: Harina PAN 1kg"
                  />
                  {suggestedCategory && (
                    <div className="mt-3 flex items-center justify-between p-3 bg-violet-50/50 dark:bg-violet-900/10 border border-violet-100 dark:border-violet-800/50 rounded-xl animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center gap-2">
                        <Tag className="text-violet-500" size={16} />
                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          Sugerencia: Categoría <strong className="text-violet-600 dark:text-violet-400">{suggestedCategory}</strong>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={applySuggestedCategory}
                        className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] rounded-lg transition-colors shadow-md shadow-violet-500/20"
                      >
                        APLICAR
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                    <button
                      type="button"
                      onClick={async () => {
                        const { value: nombre } = await Swal.fire({
                          title: 'Nueva Categoría',
                          input: 'text',
                          inputPlaceholder: 'Ej: Lácteos',
                          showCancelButton: true,
                          confirmButtonColor: '#2563eb'
                        });
                        if (nombre) {
                          await crearCategoria(nombre.toUpperCase());
                          updateField('categoria', nombre.toUpperCase());
                        }
                      }}
                      className="text-blue-600 text-xs font-bold hover:underline"
                    >
                      + Nueva
                    </button>
                  </div>
                  <SmartCategorySelector
                    value={form.categoria}
                    onChange={(val) => updateField('categoria', val)}
                    categories={categorias}
                    onQuickCreate={async (nombre) => {
                      if (!nombre) return null;
                      await crearCategoria(nombre.toUpperCase());
                      return nombre.toUpperCase();
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: PRESENTACIÓN */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                  2. Tipo de Venta y Presentación
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">¿Cómo vendes este artículo en tu negocio?</p>
              </div>

              <div className="space-y-6">
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => updateField('tipoUnidad', 'unidad')}
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center gap-3 transition-all duration-300
                      ${form.tipoUnidad === 'unidad'
                        ? 'border-blue-500 bg-blue-50/50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 shadow-md'
                        : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'}`}
                  >
                    <Package size={32} />
                    <span>POR UNIDAD</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateField('tipoUnidad', 'peso');
                      if (form.jerarquia?.bulto?.activo) updateJerarquia('bulto', 'activo', false);
                    }}
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center gap-3 transition-all duration-300
                      ${isPesaje
                        ? 'border-amber-500 bg-amber-50/50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 shadow-md'
                        : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'}`}
                  >
                    <Scale size={32} />
                    <span>POR PESO (KG)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      updateField('tipoUnidad', 'litro');
                      if (form.jerarquia?.bulto?.activo) updateJerarquia('bulto', 'activo', false);
                    }}
                    className={`flex-1 p-5 rounded-2xl border-2 font-black text-sm flex flex-col items-center justify-center gap-3 transition-all duration-300
                      ${isLitro
                        ? 'border-sky-500 bg-sky-50/50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400 shadow-md'
                        : 'border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200'}`}
                  >
                    <Droplet size={32} />
                    <span>POR LITRO (LT)</span>
                  </button>
                </div>

                {!isDecimalUnit && (
                  <div
                    onClick={toggleBulto}
                    className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex items-center justify-between group
                      ${hasBulto
                        ? 'bg-blue-50/50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                        : 'bg-slate-50/50 border-slate-150 dark:bg-slate-900/50 dark:border-slate-800 hover:border-blue-200'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl transition-colors ${hasBulto ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                        <Box size={28} />
                      </div>
                      <div>
                        <h4 className={`font-black text-sm ${hasBulto ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>
                          ¿Vender también por Caja/Bulto?
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">Actívalo si vendes al mayor y al detal.</p>
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all
                      ${hasBulto ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                      {hasBulto && <Check size={16} className="text-white" />}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: COSTOS Y PRECIOS */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                  3. Costos, Precios y Rentabilidad
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Define los montos para asegurar tus ganancias.</p>
              </div>

              <div className="space-y-6">
                {/* SI TIENE CAJA ACTIVA */}
                {hasBulto && (
                  <div className="p-5 bg-blue-50/50 dark:bg-blue-900/15 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-4 animate-in slide-in-from-top-3">
                    <h4 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest">Ajustes del Mayor (Caja)</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Unidades / Caja</label>
                        <input
                          type="number"
                          value={form.jerarquia?.bulto?.contenido || ''}
                          onChange={(e) => updateJerarquia('bulto', 'contenido', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg font-bold text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Costo Caja ($)</label>
                        <input
                          type="number"
                          value={boxCost.toFixed(2)}
                          disabled
                          className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-400 font-mono text-center"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Precio Caja ($)</label>
                        <input
                          type="number"
                          value={form.jerarquia?.bulto?.precio || ''}
                          onChange={(e) => updateJerarquia('bulto', 'precio', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-lg font-black text-blue-600 text-center"
                        />
                      </div>
                    </div>
                    {boxPrice > 0 && boxMargen !== null && (
                      <div className="flex justify-between items-center text-xs border-t border-blue-100 dark:border-blue-800/50 pt-2 font-bold">
                        <span className="text-slate-500">Rentabilidad Caja:</span>
                        <span className={`${boxMargen < 15 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          Ganancia {boxMargen}% (+${boxGanancia.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-5 bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl">
                    <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase mb-2 block">
                      {isPesaje ? 'Precio Venta por Kg ($)' : isLitro ? 'Precio Venta por Litro ($)' : 'Precio Venta ($)'}
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3.5 text-emerald-600" size={24} />
                      <input
                        ref={priceInputRef}
                        type="number"
                        step="0.01"
                        value={form.precio}
                        onChange={(e) => updateField('precio', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, () => costInputRef.current.focus())}
                        className="w-full pl-10 pr-3 py-3 border-2 border-emerald-500/80 rounded-xl text-3xl font-black text-emerald-700 focus:ring-4 focus:ring-emerald-500/10 outline-none bg-white dark:bg-slate-900"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="text-right mt-2">
                      <span className="text-xs font-bold text-slate-400">
                        Bs {((parseFloat(form.precio) || 0) * (tasa || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col justify-between">
                    <div>
                      <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Costo Unitario ($)</label>
                      <input
                        ref={costInputRef}
                        type="number"
                        step="0.01"
                        value={form.costo}
                        onChange={(e) => updateField('costo', e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, nextStep)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-lg font-bold font-mono"
                        placeholder="0.00"
                      />
                    </div>
                    {unitPrice > 0 && unitMargen !== null && (
                      <div className="mt-3 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black
                          ${unitMargen < 20 ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20'}`}
                        >
                          Margen: {unitMargen}% (+${unitGanancia.toFixed(2)})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: INVENTARIO */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full"></div>
                  4. Inventario Inicial y Alertas
                </h3>
                <p className="text-xs text-slate-400 mt-1 font-medium">Registra tus existencias para control de stock.</p>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 rounded-2xl">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-3 block flex items-center gap-2">
                    {isPesaje ? (
                      <Scale size={16} className="text-amber-500" />
                    ) : isLitro ? (
                      <Droplet size={16} className="text-sky-500" />
                    ) : (
                      <Package size={16} className="text-blue-500" />
                    )}
                    Cantidad en Stock
                  </label>

                  {hasBulto ? (
                    <div className="flex gap-4 items-end">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">Cajas (x{bultoContent})</label>
                        <input
                          ref={stockInputRef}
                          type="number"
                          min="0"
                          value={stockCajas}
                          onChange={(e) => updateStock(parseFloat(e.target.value) || 0, stockUnidades)}
                          className="w-full px-3 py-2 bg-blue-50/50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg font-bold text-blue-600 text-center"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex items-center justify-center pb-2.5 text-slate-300 font-bold">+</div>
                      <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase mb-1 block">Unidades Sueltas</label>
                        <input
                          type="number"
                          min="0"
                          value={stockUnidades}
                          onChange={(e) => updateStock(stockCajas, parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-center font-bold"
                          placeholder="0"
                        />
                      </div>
                      <div className="flex flex-col justify-end pb-1.5 text-right border-l border-slate-100 dark:border-slate-800 pl-4">
                        <span className="text-[9px] text-slate-400 font-bold uppercase block">Total</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white leading-tight">{stockTotal}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        ref={stockInputRef}
                        type="number"
                        min="0"
                        step={isDecimalUnit ? '0.001' : '1'}
                        value={form.stock || ''}
                        onChange={(e) => updateField('stock', e.target.value)}
                        className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xl font-bold font-mono"
                        placeholder={isDecimalUnit ? '0.000' : '0'}
                      />
                      {isDecimalUnit && (
                        <span className="absolute right-4 top-3.5 font-bold text-amber-600 dark:text-amber-400">
                          {isLitro ? 'Lt' : 'Kg'}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-5 bg-orange-50/20 dark:bg-orange-950/5 border border-orange-200/50 dark:border-orange-900/30 rounded-2xl">
                  <label className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase mb-2 block flex items-center gap-1.5">
                    <AlertTriangle size={14} /> Alerta Stock Mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step={isDecimalUnit ? '0.1' : '1'}
                    value={form.stockMinimo || ''}
                    onChange={(e) => updateField('stockMinimo', e.target.value)}
                    className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-orange-600 font-bold"
                    placeholder={isDecimalUnit ? '1.0' : '5'}
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">El sistema te notificará cuando tu inventario caiga por debajo de este límite.</p>
                </div>
              </div>
            </div>
          )}

          {/* 🔘 WIZARD NAVIGATION FOOTER */}
          <div className="flex gap-4 mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex-1 py-3.5 px-6 rounded-xl font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
              >
                <ChevronLeft size={16} />
                Atrás
              </button>
            ) : (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3.5 px-6 rounded-xl font-bold text-slate-400 hover:bg-slate-50 border border-slate-150 dark:border-slate-800 dark:text-slate-500 dark:hover:bg-slate-800 transition-all"
              >
                Cancelar
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex-[2] py-3.5 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                Siguiente
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={onSave}
                className="flex-[2] py-3.5 px-6 bg-slate-900 hover:bg-black dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white rounded-xl font-black shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all transform active:scale-95"
              >
                <Save size={18} />
                {productoEditar ? 'Guardar Cambios' : 'Crear Producto'}
              </button>
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
