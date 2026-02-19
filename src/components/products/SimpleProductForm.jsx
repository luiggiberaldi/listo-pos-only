import React, { useRef, useEffect, useState } from 'react';
import { useStore } from '../../context/StoreContext';
import { Package, Scan, DollarSign, Tag, Save, X, Plus, Box, Layers, Scale, AlertTriangle } from 'lucide-react';
import Swal from 'sweetalert2';
import SmartCategorySelector from './SmartCategorySelector';

export default function SimpleProductForm({
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
    const barcodeInputRef = useRef(null);
    const nameInputRef = useRef(null);
    const priceInputRef = useRef(null);

    // State for Box Cost Input (to prevent fighting with auto-format)
    const [isEditingBoxCost, setIsEditingBoxCost] = useState(false);
    const [tempBoxCost, setTempBoxCost] = useState('');

    // Derived States
    const isPesaje = form.tipoUnidad === 'peso';
    const hasBulto = !isPesaje && form.jerarquia?.bulto?.activo;
    const bultoContent = parseFloat(form.jerarquia?.bulto?.contenido) || 1;

    // Auto-focus al abrir
    useEffect(() => {
        setTimeout(() => {
            if (barcodeInputRef.current) barcodeInputRef.current.focus();
        }, 100);
    }, []);

    const handleKeyDown = (e, nextRef) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            nextRef?.current?.focus();
        }
    };

    const handleQuickCategory = async () => {
        const { value: nombre } = await Swal.fire({
            title: 'Nueva Categoría',
            input: 'text',
            inputPlaceholder: 'Ej: Bebidas',
            showCancelButton: true
        });
        if (nombre) {
            await crearCategoria(nombre);
            updateField('categoria', nombre); // Auto-seleccionar
        }
    };

    // Toggle Box Mode
    const toggleBulto = () => {
        const newState = !hasBulto;
        updateJerarquia('bulto', 'activo', newState);
        if (newState) {
            if (!form.jerarquia?.bulto?.contenido || form.jerarquia?.bulto?.contenido === 1) {
                updateJerarquia('bulto', 'contenido', 12); // Default dozen
            }
            updateJerarquia('bulto', 'seVende', true);
        }
    };

    // Cost Logic
    const unitCost = parseFloat(form.costo) || 0;
    const boxCostDisplay = (unitCost * bultoContent).toFixed(2);

    const handleBoxCostChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        const newUnitCost = val / bultoContent;
        updateField('costo', newUnitCost);
    };

    // Profit Logic
    const unitPrice = parseFloat(form.precio) || 0;
    const boxPrice = parseFloat(form.jerarquia?.bulto?.precio) || 0;

    const unitGanancia = unitPrice - unitCost;
    const unitMargen = unitCost > 0 ? ((unitGanancia / unitCost) * 100).toFixed(1) : null;

    const boxGanancia = boxPrice - (unitCost * bultoContent);
    const boxMargen = (unitCost * bultoContent) > 0 ? ((boxGanancia / (unitCost * bultoContent)) * 100).toFixed(1) : null;

    // Stock Logic
    const stockTotal = parseFloat(form.stock) || 0;
    const stockCajas = hasBulto ? Math.floor(stockTotal / bultoContent) : 0;
    const stockUnidades = hasBulto ? (stockTotal % bultoContent) : stockTotal;

    const updateStock = (cajas, unidades) => {
        const total = (cajas * bultoContent) + unidades;
        updateField('stock', total);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-900/50 p-6 gap-6">

            {/* HEADER IN-FORM: Título Grande */}
            <div className="text-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h2 className="text-xl font-bold text-slate-700 dark:text-slate-200">
                    {productoEditar ? 'Edición Rápida' : 'Nuevo Producto (Bodega)'}
                </h2>
                <div className="flex justify-center items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <p className="text-xs text-slate-400 font-medium">Modo Simplificado</p>
                </div>
            </div>

            {/* 1. IDENTIDAD */}
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                <div className="flex gap-3">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Código de Barras</label>
                        <div className="relative">
                            <Scan className="absolute left-3 top-3 text-slate-400" size={18} />
                            <input
                                ref={barcodeInputRef}
                                type="text"
                                value={form.codigo}
                                onChange={(e) => updateField('codigo', e.target.value)}
                                onKeyDown={(e) => handleKeyDown(e, nameInputRef)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                                placeholder="Escanear..."
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nombre del Producto</label>
                    <input
                        ref={nameInputRef}
                        type="text"
                        value={form.nombre}
                        onChange={(e) => {
                            const val = e.target.value;
                            // Simple Title Case: Capitalize first letter of each word
                            const titleCased = val.replace(/\b\w/g, l => l.toUpperCase());
                            updateField('nombre', titleCased);
                        }}
                        onKeyDown={(e) => handleKeyDown(e, priceInputRef)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 text-lg font-bold placeholder:normal-case"
                        placeholder="Ej: Harina PAN 1kg"
                    />
                </div>

                <div>
                    <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-bold text-slate-500 uppercase">Categoría</label>
                        <button onClick={handleQuickCategory} className="text-blue-500 text-xs font-bold hover:underline">+ Crear</button>
                    </div>
                    {/* CATEGORY SELECTOR (SMART) */}
                    <SmartCategorySelector
                        value={form.categoria}
                        onChange={(val) => updateField('categoria', val)}
                        categories={categorias}
                        onQuickCreate={async (nombre) => {
                            if (!nombre) return null;
                            await crearCategoria(nombre);
                            return nombre;
                        }}
                    />
                </div>
            </div>

            {/* 1.5 TIPO DE PRODUCTO */}
            <div className="flex gap-2">
                <button
                    type="button"
                    onClick={() => updateField('tipoUnidad', 'unidad')}
                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${!isPesaje
                            ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                >
                    <Package size={18} />
                    Por Unidad
                </button>
                <button
                    type="button"
                    onClick={() => {
                        updateField('tipoUnidad', 'peso');
                        // Desactivar bulto al cambiar a pesaje
                        if (form.jerarquia?.bulto?.activo) {
                            updateJerarquia('bulto', 'activo', false);
                        }
                    }}
                    className={`flex-1 p-3 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all
                        ${isPesaje
                            ? 'border-amber-500 bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-500'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'}`}
                >
                    <Scale size={18} />
                    Por Peso (Kg)
                </button>
            </div>

            {/* 2. SWITCH "SMART BOX" (Oculto si pesaje) */}
            {!isPesaje && (
                <div
                    onClick={toggleBulto}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between group
                    ${hasBulto
                            ? 'bg-blue-50 border-blue-500 dark:bg-blue-900/20 dark:border-blue-500'
                            : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 hover:border-blue-300'
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${hasBulto ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-400 dark:bg-slate-700'}`}>
                            <Box size={24} />
                        </div>
                        <div>
                            <h3 className={`font-bold ${hasBulto ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                {hasBulto ? 'Venta por Bulto/Caja ACTIVADA' : '¿Se vende también por Caja/Bulto?'}
                            </h3>
                            {hasBulto && <p className="text-xs text-blue-600/70 dark:text-blue-400/60">Configura el contenido y precio de la caja</p>}
                        </div>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center
                    ${hasBulto ? 'border-blue-500 bg-blue-500' : 'border-slate-300'}`}>
                        {hasBulto && <Plus size={16} className="text-white" />}
                    </div>
                </div>
            )}

            {/* 3. ZONA DE PRECIOS (Dinámica) */}
            <div className="grid grid-cols-2 gap-4">

                {/* CAJA CARD (Si está activa) */}
                {hasBulto && (
                    <div className="col-span-2 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-200 dark:border-blue-800 animate-in slide-in-from-top-2">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1 block">Unidades/Caja</label>
                                <input
                                    type="number"
                                    value={form.jerarquia?.bulto?.contenido || ''}
                                    onChange={(e) => updateJerarquia('bulto', 'contenido', e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg font-bold text-center"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1 block">Costo Caja ($)</label>
                                <input
                                    type="number"
                                    value={isEditingBoxCost ? tempBoxCost : boxCostDisplay}
                                    onChange={(e) => {
                                        setTempBoxCost(e.target.value);
                                        handleBoxCostChange(e);
                                    }}
                                    onFocus={() => {
                                        setIsEditingBoxCost(true);
                                        setTempBoxCost(boxCostDisplay);
                                    }}
                                    onBlur={() => setIsEditingBoxCost(false)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-blue-300 dark:border-blue-700 rounded-lg"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase mb-1 block">Precio Caja ($)</label>
                                <input
                                    type="number"
                                    value={form.jerarquia?.bulto?.precio || ''}
                                    onChange={(e) => updateJerarquia('bulto', 'precio', e.target.value)}
                                    className="w-full px-3 py-2 bg-white dark:bg-slate-900 border-2 border-blue-500 dark:border-blue-500 rounded-lg font-black text-blue-700"
                                />
                                {parseFloat(form.jerarquia?.bulto?.precio) > 0 && (
                                    <div className={`text-xs text-right mt-1 font-bold ${boxMargen < 15 ? 'text-red-500' : 'text-green-500'}`}>
                                        Ganancia: {boxMargen}%
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* UNIDAD CARD (Siempre visible) */}
                <div className={`p-4 rounded-xl border transition-all ${hasBulto ? 'col-span-1 bg-white border-slate-200' : 'col-span-2 bg-emerald-50 border-emerald-200'}`}>
                    <label className={`text-xs font-bold uppercase mb-1 block ${isPesaje ? 'text-amber-700' : hasBulto ? 'text-slate-500' : 'text-emerald-700'}`}>
                        {isPesaje ? 'Precio por Kg ($)' : hasBulto ? 'Precio Unidad ($)' : 'Precio Venta ($)'}
                    </label>
                    <div className="relative">
                        <DollarSign className={`absolute left-3 top-3 ${hasBulto ? 'text-slate-400' : 'text-emerald-500'}`} size={20} />
                        <input
                            ref={priceInputRef}
                            type="number"
                            step="0.01"
                            value={form.precio}
                            onChange={(e) => updateField('precio', e.target.value)}
                            className={`w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-900 border-2 rounded-xl text-2xl font-black 
                                ${hasBulto
                                    ? 'border-slate-300 text-slate-700 focus:border-slate-500'
                                    : 'border-emerald-500 text-emerald-700 focus:ring-4 focus:ring-emerald-500/20'}`}
                            placeholder="0.00"
                        />
                    </div>

                    {/* BS DISPLAY */}
                    <div className="text-right mt-1">
                        <span className="text-xs font-bold text-slate-400">
                            Bs {((parseFloat(form.precio) || 0) * (tasa || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>

                    {parseFloat(form.precio) > 0 && unitMargen !== null && (
                        <div className={`text-xs text-right mt-1 font-bold ${unitMargen < 20 ? 'text-red-500' : 'text-green-500'}`}>
                            {isPesaje ? `Margen/Kg: ${unitMargen}%` : hasBulto ? `Ganancia Unitaria: ${unitMargen}%` : `Margen: ${unitMargen}%`}
                        </div>
                    )}
                </div>

                {/* COSTO UNITARIO (Si no es Bulto, ocupa espacio, si es Bulto se alinea) */}
                <div className={`p-4 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 ${hasBulto ? 'col-span-1' : 'col-span-2'}`}>
                    <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Costo Unitario ($)</label>
                    <input
                        type="number"
                        step="0.01"
                        value={form.costo}
                        onChange={(e) => updateField('costo', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-mono"
                        placeholder="0.00"
                    />
                </div>

            </div>

            {/* 4. STOCK INTELIGENTE */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 uppercase mb-3 block flex items-center gap-2">
                    {isPesaje ? <><Scale size={14} /> Stock en Kg</> : <><Package size={14} /> Inventario Inicial</>}
                </label>

                {hasBulto ? (
                    <div className="flex gap-4 items-end">
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-blue-500 uppercase mb-1">Cajas (x{bultoContent})</label>
                            <input
                                type="number"
                                min="0"
                                value={stockCajas}
                                onChange={(e) => updateStock(parseFloat(e.target.value) || 0, stockUnidades)}
                                className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg font-bold text-blue-700"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex items-center justify-center pb-3 text-slate-300 font-bold">+</div>
                        <div className="flex-1">
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Unidades Sueltas</label>
                            <input
                                type="number"
                                min="0"
                                value={stockUnidades}
                                onChange={(e) => updateStock(stockCajas, parseFloat(e.target.value) || 0)}
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600"
                                placeholder="0"
                            />
                        </div>
                        <div className="flex flex-col justify-end pb-2 text-right">
                            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Unidades</span>
                            <span className="text-xl font-black text-slate-700 dark:text-slate-200">{stockTotal}</span>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        {isPesaje
                            ? <Scale className="absolute left-3 top-2.5 text-amber-500" size={18} />
                            : <Package className="absolute left-3 top-2.5 text-slate-400" size={18} />
                        }
                        <input
                            type="number"
                            min="0"
                            step={isPesaje ? '0.001' : '1'}
                            value={form.stock || ''}
                            onChange={(e) => updateField('stock', e.target.value)}
                            className="w-full pl-10 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg text-lg font-bold"
                            placeholder={isPesaje ? '0.000' : '0'}
                        />
                        {isPesaje && (
                            <span className="absolute right-3 top-2.5 text-sm font-bold text-amber-600 dark:text-amber-400">Kg</span>
                        )}
                    </div>
                )}
            </div>

            {/* 5. STOCK MÍNIMO */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block flex items-center gap-2">
                    <AlertTriangle size={14} /> {isPesaje ? 'Stock Mínimo (Kg)' : 'Stock Mínimo'}
                </label>
                <input
                    type="number"
                    min="0"
                    step={isPesaje ? '0.1' : '1'}
                    value={form.stockMinimo || ''}
                    onChange={(e) => updateField('stockMinimo', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg font-mono"
                    placeholder={isPesaje ? '1.0' : '5'}
                />
                <p className="text-[10px] text-slate-400 mt-1">Recibirás alerta cuando el stock baje de este nivel</p>
            </div>

            <div className="flex-1"></div> {/* Spacer */}

        </div>
    );
}
