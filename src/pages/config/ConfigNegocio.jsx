// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (STRUCTURED GRID & PREVIEW)
// Archivo: src/pages/config/ConfigNegocio.jsx
// Mejora Visual: Layout 2x2, Input Masks, Thermal Preview

import React, { useState } from 'react';
import {
    Building2, Save, Lock, Store, FileBadge, Phone,
    MapPin, Copy, CheckCircle2, AlertCircle, Quote, Printer
} from 'lucide-react';
import Swal from 'sweetalert2';

export default function ConfigNegocio({ form, handleChange, handleGuardar, readOnly }) {
    const [copiedField, setCopiedField] = useState(null);

    // 📋 Lógica de Copiado Rápido
    const handleCopy = (text, fieldId) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedField(fieldId);
        setTimeout(() => setCopiedField(null), 2000);
    };

    // 🛡️ Validación antes de Guardar
    const preGuardar = () => {
        if (!form.nombre || form.nombre.trim() === '') {
            Swal.fire('Falta Información', 'El Nombre del Comercio es obligatorio.', 'warning');
            return;
        }
        handleGuardar();
    };

    // 👺 MÁSCARAS DE ENTRADA (Input Masks)
    const handleMaskedChange = (e) => {
        const { name, value } = e.target;
        let newValue = value;

        // Máscara para RIF: Auto-Upper y formato simple
        if (name === 'rif') {
            newValue = value.toUpperCase();
            // Si el usuario no escribe el prefijo, podríamos sugerirlo, 
            // pero por ahora solo forzamos mayúsculas y caracteres válidos
        }

        // Máscara para Teléfono: (0414) 123-4567
        if (name === 'telefono') {
            // Eliminar todo lo que no sea número
            const numbers = value.replace(/\D/g, '');
            // Formatear
            if (numbers.length <= 4) {
                newValue = numbers;
            } else if (numbers.length <= 7) {
                newValue = `(${numbers.slice(0, 4)}) ${numbers.slice(4)}`;
            } else {
                newValue = `(${numbers.slice(0, 4)}) ${numbers.slice(4, 7)}-${numbers.slice(7, 11)}`;
            }
        }

        // Propagar cambio
        handleChange({ target: { name, value: newValue } });
    };

    const getInitials = () => {
        const name = form.nombre || 'Mi Negocio';
        return name.substring(0, 2).toUpperCase();
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">

            {/* 1. HERO SECTION COMPACTO */}
            <div className="relative overflow-hidden rounded-[2rem] shadow-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700 p-8 text-white flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
                    <span className="text-2xl font-black">{getInitials()}</span>
                </div>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">{form.nombre || 'TU COMERCIO'}</h1>
                    <p className="text-slate-400 font-medium text-sm flex items-center gap-2">
                        <span className="bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-emerald-500/30">
                            Sede Principal
                        </span>
                        {form.rif || 'J-00000000-0'}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                {/* 2. FORMULARIO PRINCIPAL (Grid Rule Support) */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                        <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-lg shadow-blue-600/20">
                            <Store size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white">Datos del Negocio</h3>
                            <p className="text-xs text-slate-500 font-medium">Información visible en facturas y reportes</p>
                        </div>
                    </div>

                    <div className="space-y-6">

                        {/* FILA 1: NOMBRE (ANCHO COMPLETO) */}
                        <FloatingInput
                            label="Nombre Legal / Razón Social"
                            value={form.nombre}
                            name="nombre"
                            onChange={handleChange}
                            readOnly={readOnly}
                            onCopy={handleCopy}
                            copiedField={copiedField}
                            icon={Building2}
                            required
                            placeholder="Ej: Inversiones Globales C.A."
                        />

                        {/* FILA 2: RIF | TELÉFONO (DOS COLUMNAS) */}
                        <div className="grid grid-cols-1 2xl:grid-cols-2 gap-6">
                            <FloatingInput
                                label="RIF / Documento"
                                value={form.rif}
                                name="rif"
                                onChange={handleMaskedChange}
                                readOnly={readOnly}
                                onCopy={handleCopy}
                                copiedField={copiedField}
                                icon={FileBadge}
                                placeholder="J-12345678-0"
                            />
                            <FloatingInput
                                label="Teléfono"
                                value={form.telefono}
                                name="telefono"
                                onChange={handleMaskedChange}
                                readOnly={readOnly}
                                onCopy={handleCopy}
                                copiedField={copiedField}
                                icon={Phone}
                                placeholder="(0412) 123-4567"
                            />
                        </div>

                        {/* FILA 3: DIRECCIÓN (ANCHO COMPLETO) */}
                        <div className="relative group">
                            <div className="absolute top-6 left-4 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none z-10">
                                <MapPin size={20} />
                            </div>
                            {readOnly ? (
                                <div className="w-full p-4 pl-12 bg-slate-50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 font-medium min-h-[80px] flex items-center">
                                    {form.direccion || 'Sin dirección registrada'}
                                </div>
                            ) : (
                                <div className="relative">
                                    <textarea
                                        className="w-full px-4 pt-6 pb-2 pl-12 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-bold resize-none min-h-[100px] peer"
                                        name="direccion"
                                        value={form.direccion || ''}
                                        onChange={handleChange}
                                        placeholder=" " // Espacio para activar peer-placeholder-shown
                                    />
                                    <label className={`
                                absolute left-12 top-2 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all duration-200 pointer-events-none
                                peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:top-6 peer-placeholder-shown:text-slate-400
                                peer-focus:top-2 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:text-blue-500
                                ${form.direccion ? 'top-2 text-[10px] font-black uppercase' : ''}
                            `}>
                                        Dirección Fiscal
                                    </label>
                                </div>
                            )}
                        </div>

                    </div>
                </div>

                {/* 3. LIVE TICKET PREVIEW (Printer Logic) */}
                <div className="lg:col-span-5 space-y-6">

                    {/* A. CAJA VINCULACIÓN APP (FUNCTIONAL) */}
                    <VinculacionAppCard />

                    <div className="sticky top-6">
                        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl shadow-black/50 border border-slate-800 relative z-0">
                            {/* Header Preview */}
                            <div className="flex items-center justify-between mb-4 text-slate-400">
                                <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                    <Printer size={14} /> Vista Previa
                                </span>
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            </div>

                            {/* THERMAL PAPER VISUAL */}
                            <div className="bg-[#fffdf0] text-slate-900 font-mono text-xs leading-tight p-6 rounded-lg shadow-inner transform rotate-1 origin-top-left transition-transform hover:rotate-0 duration-300 relative mx-auto max-w-[320px]">
                                {/* Jagged Edge Top */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-[radial-gradient(circle_at_bottom,_transparent_2px,_#fffdf0_2px)] bg-[length:6px_4px] -mt-1 rotate-180"></div>

                                <div className="flex flex-col items-center text-center space-y-2 opacity-90">
                                    {/* LOGO SIMULADO */}
                                    <div className="mb-2">
                                        <h2 className="text-xl font-black tracking-tighter text-slate-900">LISTO POS</h2>
                                        <p className="text-[8px] uppercase tracking-widest text-slate-500">SYSTEMS</p>
                                    </div>

                                    <p className="font-bold uppercase text-sm px-4">
                                        {form.nombre || 'NOMBRE DEL NEGOCIO'}
                                    </p>

                                    <p className="text-[10px]">
                                        RIF: {form.rif || 'J-XXXXXXXX-X'}
                                    </p>

                                    <p className="text-[10px] font-bold">
                                        Telf: {form.telefono || '(0000) 000-0000'}
                                    </p>

                                    <p className="text-[10px] px-2 text-center leading-tight">
                                        {form.direccion || 'Dirección del Comercio...'}
                                    </p>

                                    <div className="w-full border-b border-dashed border-slate-400 my-2"></div>

                                    <div className="flex justify-between w-full text-[10px]">
                                        <span>CAJA: 01</span>
                                        <span>{new Date().toLocaleDateString()}</span>
                                    </div>

                                    <div className="w-full border-b border-dashed border-slate-400 my-2"></div>

                                    <p className="text-center italic text-[10px] pt-2">
                                        "*** Gracias por su compra ***"
                                    </p>
                                </div>

                                {/* Jagged Edge Bottom */}
                                <div className="absolute bottom-0 left-0 w-full h-1 bg-[radial-gradient(circle_at_bottom,_transparent_2px,_#fffdf0_2px)] bg-[length:6px_4px] -mb-1"></div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* FLOAT ACTION BAR */}
            {!readOnly && (
                <div className="fixed bottom-6 right-6 z-50">
                    <button
                        onClick={preGuardar}
                        className="pl-6 pr-8 py-4 bg-emerald-500 text-white rounded-full font-black text-sm uppercase tracking-widest shadow-2xl shadow-emerald-500/40 hover:-translate-y-1 hover:shadow-emerald-500/50 transition-all flex items-center gap-3 active:scale-95 border-2 border-white/10"
                    >
                        <div className="bg-white/20 p-1.5 rounded-full backdrop-blur-sm">
                            <Save size={18} className="text-white" />
                        </div>
                        Guardar Cambios
                    </button>
                </div>
            )}

        </div>
    );
}

// 📱 COMPONENTE DE VINCULACIÓN (Separado para usar Hooks)
import { useAuthContext } from '../../context/AuthContext';
import { useListoGoSync } from '../../hooks/sync/useListoGoSync';

const VinculacionAppCard = () => {
    const { getSystemID } = useAuthContext();
    const { lastSyncStatus } = useListoGoSync();

    const systemID = getSystemID();
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${systemID}&size=150x150&color=000000&bgcolor=ffffff`;

    const copyToClipboard = () => {
        navigator.clipboard.writeText(systemID);
        const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000,
            timerProgressBar: true
        });
        Toast.fire({
            icon: 'success',
            title: 'ID Copiado al portapapeles'
        });
    };

    // Status Indicator Logic
    const isSyncing = lastSyncStatus === 'bg-syncing';
    const isOk = lastSyncStatus === 'ok';
    const isError = lastSyncStatus === 'error';

    return (
        <div className="bg-slate-900 rounded-[2rem] p-6 shadow-2xl shadow-emerald-500/10 border border-slate-800 relative z-0 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>

            <div className="flex items-center gap-4 mb-6">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
                    <Phone size={24} />
                </div>
                <div>
                    <h3 className="text-white font-bold text-lg">Listo GO App</h3>
                    <p className="text-slate-400 text-xs">Monitoreo en tiempo real</p>
                </div>
            </div>

            <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-800 flex items-center justify-between gap-4 relative">
                <div className="overflow-hidden flex-1">
                    <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">ID DE VINCULACIÓN</p>
                    <p
                        onClick={copyToClipboard}
                        className="text-lg 2xl:text-xl font-black text-white tracking-widest font-mono truncate cursor-pointer hover:text-emerald-400 transition-colors py-1"
                        title="Click para copiar"
                    >
                        {systemID || "NO-ID"}
                    </p>
                </div>
                <div className="h-16 w-16 bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden p-1 shadow-lg shadow-black/50">
                    <img src={qrUrl} alt="QR Code" className="w-full h-full object-contain mix-blend-multiply" />
                </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
                <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider ${isError ? 'text-red-400' : 'text-emerald-400'}`}>
                    <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-emerald-500 animate-ping' : isError ? 'bg-red-500' : 'bg-emerald-500'}`}></span>
                    {isSyncing ? 'Sincronizando...' : isError ? 'Error de Sync' : 'En Línea'}
                </div>
                <button onClick={copyToClipboard} className="text-xs font-bold text-slate-500 hover:text-white transition-colors">
                    COPIAR ID
                </button>
            </div>
        </div>
    );
};

// 💎 COMPONENTE INPUT PREMIUM (Con soporte mejorado de placeholder)
const FloatingInput = ({
    label, icon: Icon, value = '', name, onChange, readOnly,
    placeholder, type = "text", onCopy, copiedField, required
}) => {
    const isFilled = value && value.toString().length > 0;

    return (
        <div className="relative group">
            {/* Input Container */}
            <div className={`
                relative flex items-center bg-slate-50 dark:bg-slate-950 border-2 rounded-2xl transition-all duration-300
                ${isFilled ? 'border-slate-200 dark:border-slate-800' : 'border-slate-100 dark:border-slate-800'}
                focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 focus-within:bg-white dark:focus-within:bg-slate-900
            `}>

                {/* Icon Wrapper */}
                <div className="pl-4 pr-3 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                    <Icon size={20} />
                </div>

                {/* Input Area */}
                <div className="flex-1 relative pt-6 pb-2">
                    <input
                        type={type}
                        name={name}
                        value={value}
                        onChange={onChange}
                        readOnly={readOnly}
                        disabled={readOnly}
                        className="w-full bg-transparent outline-none text-slate-800 dark:text-white font-bold text-sm placeholder:text-transparent peer"
                        placeholder="space" // Trick for peer-placeholder-shown
                    />

                    {/* Floating Label */}
                    <label className={`
                        absolute left-0 top-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 transition-all duration-200 pointer-events-none
                        peer-placeholder-shown:text-sm peer-placeholder-shown:font-medium peer-placeholder-shown:normal-case peer-placeholder-shown:top-6 peer-placeholder-shown:text-slate-400
                        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-black peer-focus:uppercase peer-focus:text-blue-500
                    `}>
                        {label} {required && <span className="text-red-500">*</span>}
                    </label>

                    {/* Hint/Mask Placeholder (Visible only when focused and empty) */}
                    {!isFilled && (
                        <span className="absolute left-0 top-6 text-sm font-medium text-slate-300 pointer-events-none opacity-0 peer-focus:opacity-100 transition-opacity">
                            {placeholder}
                        </span>
                    )}
                </div>

                {/* Actions (Copy/Validation) */}
                <div className="pr-2 flex items-center gap-1">
                    {onCopy && isFilled && (
                        <button
                            type="button"
                            onClick={() => onCopy(value, name)}
                            className="p-2 rounded-xl text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-emerald-500 transition-all opacity-0 group-hover:opacity-100"
                            title="Copiar"
                        >
                            {copiedField === name ? <CheckCircle2 size={18} className="text-emerald-500" /> : <Copy size={18} />}
                        </button>
                    )}
                    {required && !isFilled && !readOnly && (
                        <span className="text-amber-500 p-2 animate-pulse"><AlertCircle size={18} /></span>
                    )}
                </div>
            </div>
        </div>
    );
};