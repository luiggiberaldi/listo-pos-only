import React, { useState, useEffect } from 'react';
import { Box, Scale, DollarSign, CheckSquare, Square, TrendingUp } from 'lucide-react';
import { fixFloat } from '../../utils/mathUtils';

export default function ProductPricing({ form, updateField, tasa, getFactores, showCosts = false }) {
    const [costoInputUSD, setCostoInputUSD] = useState('');
    const [costoInputBS, setCostoInputBS] = useState('');
    const [precioPesoBS, setPrecioPesoBS] = useState('');

    const obtenerFactorMaximo = () => {
        if (form.tipoUnidad === 'peso') return 1;
        const paqPorBulto = parseFloat(form.jerarquia?.bulto?.contenido) || 1;
        const undPorPaq = parseFloat(form.jerarquia?.paquete?.contenido) || 1;
        if (form.jerarquia?.bulto?.activo) return paqPorBulto * (form.jerarquia?.paquete?.activo ? undPorPaq : 1);
        else if (form.jerarquia?.paquete?.activo) return undPorPaq;
        return 1;
    };

    const getNombreJerarquia = () => {
        if (form.tipoUnidad === 'peso') return "POR KILO";
        if (form.jerarquia?.bulto?.activo) return "DEL BULTO";
        if (form.jerarquia?.paquete?.activo) return "DEL PAQUETE";
        return "DE LA UNIDAD";
    };

    useEffect(() => {
        const factor = obtenerFactorMaximo();
        const costoVisual = (form.costo || 0) * factor;
        const precioVisualUSD = parseFloat(form.precio) || 0;

        const visualClean = fixFloat(costoVisual);
        if (parseFloat(costoInputUSD) !== visualClean) {
            setCostoInputUSD(costoVisual > 0 ? visualClean : '');
        }

        const calculatedCostoBs = costoVisual * tasa;
        if (parseFloat(costoInputBS) !== parseFloat(calculatedCostoBs.toFixed(2))) {
            setCostoInputBS(costoVisual > 0 ? calculatedCostoBs.toFixed(2) : '');
        }

        if (form.tipoUnidad === 'peso') {
            const calculatedPrecioBs = precioVisualUSD * tasa;
            if (parseFloat(precioPesoBS) !== parseFloat(calculatedPrecioBs.toFixed(2))) {
                setPrecioPesoBS(precioVisualUSD > 0 ? calculatedPrecioBs.toFixed(2) : '');
            }
        }
    }, [form.costo, form.jerarquia, tasa, form.tipoUnidad, form.precio]);

    const handleCostoUSD = (val) => {
        setCostoInputUSD(val);
        const num = parseFloat(val);
        const factor = obtenerFactorMaximo();
        const costoUnitario = factor > 0 && !isNaN(num) ? (num / factor) : 0;
        updateField('costo', costoUnitario);
    };

    const handleCostoBS = (val) => {
        setCostoInputBS(val);
        const numBs = parseFloat(val);
        if (!isNaN(numBs)) {
            const numUsd = numBs / tasa;
            const factor = obtenerFactorMaximo();
            const costoUnitario = factor > 0 ? (numUsd / factor) : 0;
            updateField('costo', costoUnitario);
        } else {
            updateField('costo', 0);
        }
    };

    const handlePrecioPesoUSD = (val) => {
        updateField('precio', val);
    };

    const handlePrecioPesoBS = (val) => {
        setPrecioPesoBS(val);
        const numBs = parseFloat(val);
        if (!isNaN(numBs)) {
            const numUsd = fixFloat(numBs / tasa);
            updateField('precio', numUsd);
        } else {
            updateField('precio', '');
        }
    };

    const preventScroll = (e) => e.target.blur();
    const margenPeso = form.precio && form.costo && form.costo > 0 ? (((form.precio - form.costo) / form.costo) * 100).toFixed(1) : 100;

    return (
        <div className="space-y-6">

            {/* SEGMENTED CONTROL (TABS) */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                    type="button"
                    onClick={() => updateField('tipoUnidad', 'unidad')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${form.tipoUnidad === 'unidad' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Box size={16} /> Por Unidad/Bulto
                </button>
                <button
                    type="button"
                    onClick={() => updateField('tipoUnidad', 'peso')}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all ${form.tipoUnidad === 'peso' ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    <Scale size={16} /> Por Peso (Kg)
                </button>
            </div>

            {/* TARJETA DE COSTO FINANCIERO (RBAC PROTECTED) */}
            {showCosts && (
                <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                            Costo de Compra <span className="text-slate-400 font-normal">({getNombreJerarquia()})</span>
                        </label>
                        <TrendingUp size={16} className="text-slate-300" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-slate-400 font-bold">$</div>
                            <input
                                type="number"
                                step="any"
                                onWheel={preventScroll}
                                className="w-full pl-8 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-lg text-slate-800 dark:text-white outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                                placeholder="0.00"
                                value={costoInputUSD}
                                onChange={e => handleCostoUSD(e.target.value)}
                            />
                            <div className="absolute right-3 top-4 text-[10px] font-bold text-slate-300">USD</div>
                        </div>
                        <div className="relative group">
                            <div className="absolute left-3 top-3.5 text-slate-400 font-bold">Bs</div>
                            <input
                                type="number"
                                step="any"
                                onWheel={preventScroll}
                                className="w-full pl-9 p-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-lg text-slate-600 dark:text-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                                placeholder="0.00"
                                value={costoInputBS}
                                onChange={e => handleCostoBS(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* SECCIÓN ESPECIAL PARA PESO */}
            {form.tipoUnidad === 'peso' && (
                <div className="p-5 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/10 animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Precio Venta (Kg)</label>
                        <div className="bg-white dark:bg-slate-900 px-2 py-1 rounded-lg shadow-sm border border-indigo-100 dark:border-indigo-900/50">
                            <span className="text-[10px] text-slate-400 uppercase font-bold mr-2">Margen</span>
                            <span className={`text-xs font-bold ${parseFloat(margenPeso) < 20 ? 'text-red-500' : 'text-emerald-500'}`}>{margenPeso}%</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                            <DollarSign size={16} className="absolute left-3 top-3.5 text-indigo-500" />
                            <input
                                type="number"
                                step="any"
                                onWheel={preventScroll}
                                className="w-full pl-8 p-3 bg-white dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900 rounded-xl font-bold text-xl text-indigo-700 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="0.00"
                                value={form.precio}
                                onChange={e => handlePrecioPesoUSD(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <div className="absolute left-3 top-3.5 text-xs font-bold text-slate-400">Bs</div>
                            <input
                                type="number"
                                step="any"
                                onWheel={preventScroll}
                                className="w-full pl-9 p-3 bg-white/50 dark:bg-slate-950/50 border border-indigo-100 dark:border-indigo-900/50 rounded-xl font-bold text-lg text-slate-500 dark:text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                placeholder="0.00"
                                value={precioPesoBS}
                                onChange={e => handlePrecioPesoBS(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* CHECKBOX IVA */}
            <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${form.aplicaIva ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-900/10 dark:border-blue-800' : 'border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-950 dark:border-slate-800'}`}>
                <div className="relative flex items-center justify-center">
                    <input
                        type="checkbox"
                        className="peer appearance-none w-6 h-6 border-2 border-slate-300 rounded-lg checked:bg-blue-600 checked:border-blue-600 transition-all"
                        checked={form.aplicaIva}
                        onChange={() => updateField('aplicaIva', !form.aplicaIva)}
                    />
                    <CheckSquare size={16} className="absolute text-white scale-0 peer-checked:scale-100 transition-transform" strokeWidth={3} />
                </div>
                <div className="flex-1">
                    <p className="font-bold text-sm text-slate-700 dark:text-slate-200">Aplicar Impuesto (IVA)</p>
                    <p className="text-xs text-slate-400 mt-0.5">{form.aplicaIva ? 'Se sumará 16% al total en caja' : 'Producto exento de impuestos'}</p>
                </div>
            </label>
        </div>
    );
}