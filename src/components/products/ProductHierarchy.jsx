import React, { useState, useEffect } from 'react';
import { Container, Package, Box, CheckSquare, ArrowRight, Scan, MessageSquare, Info } from 'lucide-react';

/**
 * NivelConfig - Card Rediseñada
 */
const NivelConfig = ({ nivel, label, icon, colorBorder, colorText, colorBg, form, updateJerarquia, tasa, getFactores, updateField }) => {

    const { factorBulto, factorPaquete } = getFactores();
    const factorTotal = nivel === 'bulto' ? factorBulto : nivel === 'paquete' ? factorPaquete : 1;
    const costoVisual = form.costo ? (form.costo * factorTotal) : 0;

    const datosNivel = form.jerarquia?.[nivel] || {};
    const seVende = datosNivel.seVende ?? true;
    const precioVenta = seVende ? (parseFloat(datosNivel.precio) || 0) : 0;

    const ganancia = precioVenta - costoVisual;
    const margen = costoVisual > 0 ? ((ganancia / costoVisual) * 100) : 100;

    const [precioBs, setPrecioBs] = useState('');

    useEffect(() => {
        const p = parseFloat(datosNivel.precio);
        if (isNaN(p)) {
            if (precioBs !== '') setPrecioBs('');
            return;
        }

        const calculatedBsNum = p * tasa;
        if (parseFloat(precioBs) !== parseFloat(calculatedBsNum.toFixed(2))) {
            setPrecioBs(calculatedBsNum.toFixed(2));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [datosNivel.precio, tasa]);

    const handleBsChange = (val) => {
        setPrecioBs(val);
        const numBs = parseFloat(val);
        if (!isNaN(numBs) && tasa > 0) {
            const numUsd = (numBs / tasa).toFixed(6);
            updateJerarquia(nivel, 'precio', numUsd);
        } else {
            updateJerarquia(nivel, 'precio', '');
        }
    };

    const preventScroll = (e) => e.target.blur();

    const handleCantidadChange = (newVal) => {
        const nuevaCantidad = parseFloat(newVal);
        if (nuevaCantidad > 0 && costoVisual > 0 && nivel !== 'unidad') {
            let nuevoFactorTotal = 0;
            if (nivel === 'bulto') {
                const undPorPaq = form.jerarquia?.paquete?.activo ? (parseFloat(form.jerarquia?.paquete?.contenido) || 1) : 1;
                nuevoFactorTotal = nuevaCantidad * undPorPaq;
            } else if (nivel === 'paquete') {
                nuevoFactorTotal = nuevaCantidad;
            }

            if (nuevoFactorTotal > 0) {
                const nuevoCostoUnitario = costoVisual / nuevoFactorTotal;
                updateField('costo', nuevoCostoUnitario);
            }
        }
        updateJerarquia(nivel, 'contenido', newVal);
    };

    return (
        <div className={`p-5 rounded-2xl border mb-4 transition-all relative overflow-hidden ${colorBorder} bg-white dark:bg-slate-900 shadow-sm`}>

            {/* Badge de Factor */}
            <div className={`absolute top-0 right-0 px-3 py-1 rounded-bl-xl text-[10px] font-bold ${colorBg} ${colorText}`}>
                1 {label} = {factorTotal.toFixed(0)} Unds
            </div>

            {/* Header de Tarjeta */}
            <div className="flex items-center gap-3 mb-5">
                <div className={`p-2 rounded-lg ${colorBg} ${colorText}`}>
                    {icon}
                </div>
                <div>
                    <h4 className={`font-bold text-sm ${colorText}`}>Configuración {label}</h4>
                    <div className="flex items-center gap-2 mt-1">
                        {nivel !== 'unidad' && (
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${seVende ? 'bg-slate-800 border-slate-800 dark:bg-white dark:border-white' : 'border-slate-300 bg-transparent'}`}>
                                    {seVende && <CheckSquare size={10} className="text-white dark:text-slate-900" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={seVende} onChange={() => updateJerarquia(nivel, 'seVende', !seVende)} />
                                <span className={`text-[10px] font-bold ${seVende ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 line-through'}`}>Vender en Caja</span>
                            </label>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                {/* Columna Izquierda: Contenido */}
                {nivel !== 'unidad' && (
                    <div className="w-24">
                        <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5 text-center">Contiene</label>
                        <div className="flex flex-col items-center">
                            <input
                                type="number"
                                onWheel={preventScroll}
                                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-center font-bold text-lg dark:bg-slate-800 dark:text-white outline-none focus:border-blue-400 transition-colors"
                                value={datosNivel.contenido || ''}
                                onChange={e => handleCantidadChange(e.target.value)}
                            />
                            <span className="text-[9px] font-bold text-slate-400 mt-1 uppercase">{nivel === 'bulto' && form.jerarquia?.paquete?.activo ? 'Paquetes' : 'Unidades'}</span>
                        </div>
                    </div>
                )}

                {/* Separador Visual */}
                {nivel !== 'unidad' && <div className="h-16 w-px bg-slate-100 dark:bg-slate-800 mt-2"></div>}

                {/* Columna Central: Costo Ref */}
                <div className="flex-1">
                    <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">Costo Ref.</label>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <span className="font-bold text-slate-600 dark:text-slate-400 text-sm">${costoVisual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Bs {(costoVisual * tasa).toFixed(2)}</span>
                    </div>
                </div>

                {/* Icono Flecha */}
                <div className="mt-7 text-slate-300">
                    <ArrowRight size={16} />
                </div>

                {/* Columna Derecha: Precio Venta */}
                <div className="flex-[1.5]">
                    {seVende ? (
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Precio Venta</label>
                                {precioVenta > 0 && (
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-bold ${margen < 20 ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
                                        {margen.toFixed(0)}%
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-2.5 text-slate-400 text-[10px] font-bold">$</span>
                                    <input
                                        type="number"
                                        step="any"
                                        onWheel={preventScroll}
                                        className="w-full pl-5 p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900 text-sm font-bold text-emerald-700 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                                        value={datosNivel.precio || ''}
                                        onChange={e => updateJerarquia(nivel, 'precio', e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="relative flex-1">
                                    <span className="absolute left-2.5 top-2.5 text-slate-300 text-[10px] font-bold">Bs</span>
                                    <input
                                        type="number"
                                        step="any"
                                        onWheel={preventScroll}
                                        className="w-full pl-6 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-bold text-slate-500 outline-none focus:border-slate-400 transition-all"
                                        value={precioBs}
                                        onChange={e => handleBsChange(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="mt-1 text-right">
                                <span className="text-[10px] text-emerald-600/70 font-medium">Ganancia: +${ganancia.toFixed(2)}</span>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[66px] flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">No Disponible en Venta</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default function ProductHierarchy({ form, updateJerarquia, tasa, getFactores, updateField }) {
    const isBultoActive = form.jerarquia?.bulto?.activo;
    const isPaqueteActive = form.jerarquia?.paquete?.activo;
    const isUnidadActive = form.jerarquia?.unidad?.activo;
    const defaultScan = form.defaultScannedUnit || 'ASK'; // 'ASK', 'UND', 'PAQ', 'BUL'

    // 🛑 RESET AUTOMÁTICO SI SE DESHABILITA LA OPCIÓN ELEGIDA
    useEffect(() => {
        const current = form.defaultScannedUnit;
        if (current === 'UND' && (!isUnidadActive || form.jerarquia?.unidad?.seVende === false)) updateField('defaultScannedUnit', 'ASK');
        if (current === 'PAQ' && (!isPaqueteActive || form.jerarquia?.paquete?.seVende === false)) updateField('defaultScannedUnit', 'ASK');
        if (current === 'BUL' && (!isBultoActive || form.jerarquia?.bulto?.seVende === false)) updateField('defaultScannedUnit', 'ASK');
    }, [isUnidadActive, isPaqueteActive, isBultoActive, form.jerarquia, form.defaultScannedUnit, updateField]);

    // Calcular opciones activas y vendibles
    const activeOptionsCount = [
        isUnidadActive && form.jerarquia?.unidad?.seVende !== false,
        isPaqueteActive && form.jerarquia?.paquete?.seVende !== false,
        isBultoActive && form.jerarquia?.bulto?.seVende !== false
    ].filter(Boolean).length;


    return (
        <div className="space-y-6">

            {/* 🆕 SMART SCAN SELECTOR (Solo visible si hay > 1 opción vendible) */}
            {activeOptionsCount > 1 && (
                <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 relative overflow-hidden group animate-in fade-in">

                    <div className="flex items-center gap-3 mb-3 relative z-10">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                            <Scan size={18} />
                        </div>
                        <div>
                            <h4 className="font-bold text-sm text-slate-800 dark:text-white">Acción al Escanear</h4>
                            <p className="text-[10px] text-slate-500 font-medium">Define qué sucede al leer el código de barras</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 relative z-10">
                        {[
                            { id: 'ASK', label: 'Preguntar', icon: MessageSquare }, // Added Icon
                            { id: 'UND', label: 'Unidad', icon: Box, disabled: !isUnidadActive || form.jerarquia?.unidad?.seVende === false },
                            { id: 'PAQ', label: 'Paquete', icon: Package, disabled: !isPaqueteActive || form.jerarquia?.paquete?.seVende === false },
                            { id: 'BUL', label: 'Bulto', icon: Container, disabled: !isBultoActive || form.jerarquia?.bulto?.seVende === false },
                        ].map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                disabled={opt.disabled}
                                onClick={() => updateField('defaultScannedUnit', opt.id)}
                                className={`
                                    py-2 px-1 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 h-[50px]
                                    ${defaultScan === opt.id
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 transform scale-[1.02]'
                                        : 'bg-white dark:bg-slate-800 text-slate-400 hover:bg-slate-50 border border-slate-100 dark:border-slate-700 hover:border-slate-200'}
                                    ${opt.disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}
                                `}
                            >
                                {opt.icon && <opt.icon size={16} strokeWidth={2.5} />}
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {defaultScan !== 'ASK' && (
                        <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-indigo-600 dark:text-indigo-400 font-bold relative z-10 animate-in fade-in slide-in-from-top-1">
                            <Info size={12} strokeWidth={2.5} />
                            <span>Se agregará 1 {defaultScan === 'UND' ? 'Unidad' : defaultScan === 'PAQ' ? 'Paquete' : 'Bulto'} automáticamente.</span>
                        </div>
                    )}
                </div>
            )}

            {/* HIERARCHY TOGGLES */}
            <div className="flex gap-3 bg-slate-50 dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <button type="button" onClick={() => updateJerarquia('bulto', 'activo', !isBultoActive)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isBultoActive ? 'bg-white dark:bg-slate-800 text-purple-600 shadow-sm ring-1 ring-purple-100 dark:ring-purple-900' : 'text-slate-400 hover:bg-white/50'}`}><Container size={14} /> Bultos</button>
                <button type="button" onClick={() => updateJerarquia('paquete', 'activo', !isPaqueteActive)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isPaqueteActive ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm ring-1 ring-blue-100 dark:ring-blue-900' : 'text-slate-400 hover:bg-white/50'}`}><Package size={14} /> Paquetes</button>
                <button type="button" onClick={() => updateJerarquia('unidad', 'activo', !isUnidadActive)} className={`flex-1 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${isUnidadActive ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-400 hover:bg-white/50'}`}><Box size={14} /> Unidades</button>
            </div>

            <div className="space-y-4">
                {isBultoActive && (
                    <NivelConfig nivel="bulto" label="Bulto" icon={<Container size={18} />} colorBorder="border-purple-100 dark:border-purple-900/30" colorText="text-purple-600 dark:text-purple-400" colorBg="bg-purple-50 dark:bg-purple-900/20" form={form} updateJerarquia={updateJerarquia} tasa={tasa} getFactores={getFactores} updateField={updateField} />
                )}

                {isPaqueteActive && (
                    <NivelConfig nivel="paquete" label="Paquete" icon={<Package size={18} />} colorBorder="border-blue-100 dark:border-blue-900/30" colorText="text-blue-600 dark:text-blue-400" colorBg="bg-blue-50 dark:bg-blue-900/20" form={form} updateJerarquia={updateJerarquia} tasa={tasa} getFactores={getFactores} updateField={updateField} />
                )}

                {isUnidadActive && (
                    <NivelConfig nivel="unidad" label="Unidad" icon={<Box size={18} />} colorBorder="border-slate-200 dark:border-slate-800" colorText="text-slate-600 dark:text-slate-400" colorBg="bg-slate-100 dark:bg-slate-800" form={form} updateJerarquia={updateJerarquia} tasa={tasa} getFactores={getFactores} updateField={updateField} />
                )}
            </div>
        </div>
    );
}