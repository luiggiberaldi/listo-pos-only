// ✅ SYSTEM IMPLEMENTATION - V. 3.1 (CURRENCY CONTROL)
// Archivo: src/pages/config/ConfigTicket.jsx
// Autorizado por Auditor en Fase 3 (Financial Granularity)

import React from 'react';
import {
    Printer, Type, Scissors, Save, LayoutTemplate,
    MoveHorizontal, MoveVertical, Percent, Droplets, Image as ImageIcon,
    Coins, CreditCard
} from 'lucide-react';
import TicketPreview from '../../components/config/TicketPreview';

export default function ConfigTicket({ form, setForm, handleGuardar, readOnly }) {

    const ControlSlider = ({ label, icon: Icon, value, onChange, min, max, step, unit = '' }) => (
        <div className="mb-4">
            <div className="flex justify-between mb-1">
                <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                    {Icon && <Icon size={12} />} {label}
                </label>
                <span className="text-xs font-mono font-bold text-emerald-600">{value}{unit}</span>
            </div>
            <input
                type="range"
                min={min} max={max} step={step}
                value={value}
                onChange={(e) => !readOnly && onChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
                disabled={readOnly}
            />
        </div>
    );

    const Switch = ({ label, checked, onChange }) => (
        <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">{label}</span>
            <button
                type="button" role="switch" aria-checked={checked}
                onClick={() => !readOnly && onChange(!checked)}
                className={`w-9 h-5 rounded-full transition-colors relative ${checked ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'} ${readOnly ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                disabled={readOnly}
            >
                <span className={`block w-3 h-3 bg-white rounded-full shadow-md transform transition-transform absolute top-1 left-1 ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
        </div>
    );

    const SelectControl = ({ label, value, onChange, options }) => (
        <div className="mb-4">
            <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">{label}</label>
            <select
                value={value}
                onChange={(e) => !readOnly && onChange(e.target.value)}
                className="w-full p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-bold border-none outline-none focus:ring-2 focus:ring-emerald-500"
                disabled={readOnly}
            >
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
            </select>
        </div>
    );

    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 h-full">

            {/* 1. PANEL DE CONFIGURACIÓN (IZQUIERDA) */}
            <div className="space-y-6 overflow-y-auto pr-2 custom-scrollbar pb-20">

                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
                    <div className="p-3 bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 rounded-xl">
                        <Printer size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-white">Diseñador de Tickets</h2>
                        <p className="text-xs text-slate-400">Personaliza la geometría y estilo de impresión.</p>
                    </div>
                </div>

                {/* NUEVA SECCIÓN: ECONOMÍA Y MONEDA */}
                <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm border-l-4 border-l-emerald-500">
                    <h3 className="text-sm font-black text-slate-700 dark:text-white mb-4 flex items-center gap-2 uppercase">
                        <Coins size={16} className="text-emerald-500" /> Economía & Moneda
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <SelectControl
                            label="Precio en Productos"
                            value={form.ticketCurrencyItems || 'usd'}
                            onChange={(v) => setForm({ ...form, ticketCurrencyItems: v })}
                            options={[
                                { value: 'usd', label: 'Solo Dólares ($)' },
                                { value: 'bs', label: 'Solo Bolívares (Bs)' },
                                { value: 'both', label: 'Ambos / Mixto' }
                            ]}
                        />
                        <SelectControl
                            label="Totales Finales"
                            value={form.ticketCurrencyTotals || 'both'}
                            onChange={(v) => setForm({ ...form, ticketCurrencyTotals: v })}
                            options={[
                                { value: 'usd', label: 'Solo Dólares ($)' },
                                { value: 'bs', label: 'Solo Bolívares (Bs)' },
                                { value: 'both', label: 'Ambos / Mixto' }
                            ]}
                        />
                        <div className="col-span-2">
                            <Switch label="Mostrar Tasa de Cambio" checked={form.ticketMostrarTasa} onChange={(v) => setForm({ ...form, ticketMostrarTasa: v })} />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN GEOMETRÍA */}
                <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-700 dark:text-white mb-4 flex items-center gap-2 uppercase">
                        <LayoutTemplate size={16} className="text-blue-500" /> Geometría
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                        <ControlSlider
                            label="Margen Lateral (X)" icon={MoveHorizontal} unit="mm"
                            value={form.ticketMarginX || 0} onChange={(v) => setForm({ ...form, ticketMarginX: v })}
                            min={0} max={15} step={1}
                        />
                        <ControlSlider
                            label="Margen Superior (Y)" icon={MoveVertical} unit="mm"
                            value={form.ticketMarginY || 0} onChange={(v) => setForm({ ...form, ticketMarginY: v })}
                            min={0} max={10} step={1}
                        />
                        <div className="col-span-2">
                            <ControlSlider
                                label="Corte de Papel (Feed)" icon={Scissors} unit="px"
                                value={form.ticketFeedCut || 0} onChange={(v) => setForm({ ...form, ticketFeedCut: v })}
                                min={0} max={100} step={5}
                            />
                        </div>
                        <div className="col-span-2">
                            <SelectControl
                                label="Estilo de Separadores"
                                value={form.ticketSeparatorStyle || 'dashed'}
                                onChange={(v) => setForm({ ...form, ticketSeparatorStyle: v })}
                                options={[
                                    { value: 'dashed', label: 'Guiones (- - -)' },
                                    { value: 'dotted', label: 'Puntos (. . .)' },
                                    { value: 'solid', label: 'Sólido (___)' },
                                    { value: 'double', label: 'Doble (===)' }
                                ]}
                            />
                        </div>
                    </div>
                </section>

                {/* SECCIÓN TIPOGRAFÍA */}
                <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-700 dark:text-white mb-4 flex items-center gap-2 uppercase">
                        <Type size={16} className="text-purple-500" /> Tipografía
                    </h3>

                    <div className="mb-4">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">Familia de Fuente</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['classic', 'modern', 'condensed'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => !readOnly && setForm({ ...form, ticketFontFamily: f })}
                                    className={`p-2 rounded-lg text-[10px] font-bold uppercase border-2 transition-all ${form.ticketFontFamily === f ? 'border-purple-500 bg-purple-50 text-purple-600' : 'border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                >
                                    {f === 'classic' ? 'Clásica' : f === 'modern' ? 'Moderna' : 'Compacta'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <ControlSlider
                            label="Tamaño Fuente" unit="px"
                            value={form.ticketFontSize || 11} onChange={(v) => setForm({ ...form, ticketFontSize: v })}
                            min={9} max={16} step={0.5}
                        />
                        <ControlSlider
                            label="Espaciado" unit="x"
                            value={form.ticketLineHeight || 1.1} onChange={(v) => setForm({ ...form, ticketLineHeight: v })}
                            min={0.8} max={2.0} step={0.1}
                        />
                    </div>
                </section>

                {/* SECCIÓN IDENTIDAD */}
                <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-700 dark:text-white mb-4 flex items-center gap-2 uppercase">
                        <ImageIcon size={16} className="text-pink-500" /> Marca
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <ControlSlider
                            label="Tamaño Logo" icon={Percent} unit="%"
                            value={form.ticketLogoWidth || 60} onChange={(v) => setForm({ ...form, ticketLogoWidth: v })}
                            min={10} max={150} step={5}
                        />
                        <ControlSlider
                            label="Contraste" unit=""
                            value={form.ticketLogoContrast || 1.0} onChange={(v) => setForm({ ...form, ticketLogoContrast: v })}
                            min={0.5} max={2.0} step={0.1}
                        />
                    </div>

                    <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <Droplets size={12} /> Marca de Agua
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                            <ControlSlider
                                label="Tamaño" unit="%"
                                value={form.ticketWatermarkSize || 70} onChange={(v) => setForm({ ...form, ticketWatermarkSize: v })}
                                min={20} max={200} step={10}
                            />
                            <ControlSlider
                                label="Opacidad" unit=""
                                value={form.ticketWatermarkOpacity || 0.1} onChange={(v) => setForm({ ...form, ticketWatermarkOpacity: v })}
                                min={0} max={0.5} step={0.05}
                            />
                            <div className="col-span-2">
                                <ControlSlider
                                    label="Posición Y" icon={MoveVertical} unit="px"
                                    value={form.ticketWatermarkY || 0} onChange={(v) => setForm({ ...form, ticketWatermarkY: v })}
                                    min={-200} max={200} step={10}
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECCIÓN CONTENIDO */}
                <section className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-sm font-black text-slate-700 dark:text-white mb-4 uppercase">Datos</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3 gap-2">
                        <Switch label="Logo" checked={form.ticketMostrarLogo} onChange={(v) => setForm({ ...form, ticketMostrarLogo: v })} />
                        <Switch label="Dirección" checked={form.ticketDireccion} onChange={(v) => setForm({ ...form, ticketDireccion: v })} />
                        <Switch label="RIF/NIT" checked={form.ticketRif} onChange={(v) => setForm({ ...form, ticketRif: v })} />
                        <Switch label="Cliente" checked={form.ticketMostrarCliente} onChange={(v) => setForm({ ...form, ticketMostrarCliente: v })} />
                        <Switch label="Vendedor" checked={form.ticketMostrarVendedor} onChange={(v) => setForm({ ...form, ticketMostrarVendedor: v })} />
                        <Switch label="Impuestos" checked={form.ticketImpuestos} onChange={(v) => setForm({ ...form, ticketImpuestos: v })} />
                        <Switch label="Desglose IGTF" checked={form.ticketMostrarIGTF} onChange={(v) => setForm({ ...form, ticketMostrarIGTF: v })} />
                    </div>

                    <div className="mt-4 space-y-3">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mensaje Cabecera</label>
                            <textarea
                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono resize-none focus:ring-2 focus:ring-cyan-500 outline-none"
                                rows={2}
                                value={form.ticketHeaderMsg || ''}
                                onChange={(e) => setForm({ ...form, ticketHeaderMsg: e.target.value })}
                                disabled={readOnly}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Mensaje Pie de Página</label>
                            <textarea
                                className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono resize-none focus:ring-2 focus:ring-cyan-500 outline-none"
                                rows={2}
                                value={form.ticketFooterMsg || ''}
                                onChange={(e) => setForm({ ...form, ticketFooterMsg: e.target.value })}
                                disabled={readOnly}
                                placeholder="Si lo dejas vacío, se usará el legal."
                            />
                        </div>
                    </div>
                </section>

                {!readOnly && (
                    <button onClick={handleGuardar} className="w-full py-4 bg-slate-900 dark:bg-white dark:text-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all">
                        <Save size={18} /> Guardar Configuración 3.1
                    </button>
                )}
            </div>

            {/* 2. ZONA DE PREVISUALIZACIÓN (DERECHA) */}
            <div className="hidden xl:block h-full relative">
                <div className="sticky top-0 h-full bg-slate-100 dark:bg-black/20 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
                    <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                        <span className="text-xs font-black uppercase text-slate-400">Vista Previa en Vivo</span>
                        <div className="flex gap-2">
                            <span className="w-3 h-3 rounded-full bg-red-400" />
                            <span className="w-3 h-3 rounded-full bg-yellow-400" />
                            <span className="w-3 h-3 rounded-full bg-green-400" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-hidden relative">
                        <TicketPreview form={form} />
                    </div>
                </div>
            </div>
        </div>
    );
}