import React from 'react';
import { Monitor, Type, DollarSign, Settings, LayoutTemplate, Square, Calendar, BarChart2 } from 'lucide-react';

export const StudioSidebar = ({ config, setConfig, mockData, setMockData, handlePaperChange }) => {
    return (
        <div className="w-80 border-r border-slate-200 dark:border-slate-800 p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/30 font-sans space-y-8 flex-shrink-0">

            {/* DATOS DE PRUEBA */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                    <Monitor size={14} /> Datos de Prueba
                </label>

                <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Nombre Producto</label>
                    <input
                        type="text"
                        value={mockData.nombre}
                        onChange={(e) => setMockData({ ...mockData, nombre: e.target.value })}
                        className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                    />
                </div>

                <div className="flex gap-2">
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">Precio $</label>
                        <input
                            type="number" step="0.01"
                            value={mockData.precio}
                            onChange={(e) => setMockData({ ...mockData, precio: e.target.value })}
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">SKU</label>
                        <input
                            type="text"
                            value={mockData.codigo}
                            onChange={(e) => setMockData({ ...mockData, codigo: e.target.value })}
                            className="w-full text-xs p-2 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900"
                        />
                    </div>
                </div>
            </div>

            {/* PLANTILLA VISUAL */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <LayoutTemplate size={14} /> Plantilla Visual
                </label>
                <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                    {['modern', 'boutique'].map(t => (
                        <button
                            key={t}
                            onClick={() => setConfig({ ...config, designTemplate: t })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${config.designTemplate === t ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
            </div>

            {/* FORMATO PAPEL */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Monitor size={14} /> Formato de Papel
                </label>
                <div className="grid grid-cols-1 gap-2">
                    {['58mm', '80mm'].map(fmt => (
                        <button
                            key={fmt}
                            onClick={() => handlePaperChange(fmt)}
                            className={`px-4 py-3 rounded-xl text-sm font-bold border text-left transition-all ${config.papel === fmt ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 dark:ring-indigo-900' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-300'}`}
                        >
                            {`Rollo Térmico ${fmt}`}
                        </button>
                    ))}
                </div>
            </div>

            {/* MONEDA */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <DollarSign size={14} /> Estilo de Precio
                </label>
                <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                    {['usd', 'bs', 'mix'].map(m => (
                        <button
                            key={m}
                            onClick={() => {
                                let newSize = config.fontSize;
                                if (m !== 'mix') {
                                    newSize = 36; // Aumentar para precio único
                                } else {
                                    // Restaurar default seguro según papel al volver a mix
                                    newSize = config.papel === '58mm' ? 30 : 36;
                                }
                                setConfig({ ...config, moneda: m, fontSize: newSize });
                            }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${config.moneda === m ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            {m.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* FUENTE */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Type size={14} /> Tipografía
                </label>
                <div className="flex gap-2 p-1 bg-slate-200 dark:bg-slate-800 rounded-xl">
                    {['helvetica', 'times', 'courier'].map(f => (
                        <button
                            key={f}
                            onClick={() => setConfig({ ...config, fontFamily: f })}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize ${config.fontFamily === f ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            style={{ fontFamily: f }}
                        >
                            {f}
                        </button>
                    ))}
                </div>
            </div>



            {/* TAMAÑOS Y CONTROLES FINOS */}
            <div className="space-y-4">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                    <Settings size={14} /> Tamaños y Detalles
                </label>

                {/* Title Size */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">Título Producto</span>
                        <span className="text-xs font-mono text-indigo-500">{config.tituloSize}px</span>
                    </div>
                    <input
                        type="range" min="8" max="24" step="1"
                        value={config.tituloSize}
                        onChange={(e) => setConfig({ ...config, tituloSize: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                    />
                </div>

                {/* Font Size Primary */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">Precio Principal</span>
                        <span className="text-xs font-mono text-indigo-500">{config.fontSize}px</span>
                    </div>
                    <input
                        type="range" min="12" max="60" step="2"
                        value={config.fontSize}
                        onChange={(e) => setConfig({ ...config, fontSize: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                    />
                </div>

                {/* Font Size Secondary (Mix) */}
                {config.moneda === 'mix' && (
                    <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                        <div className="flex justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500">Precio Secundario</span>
                            <span className="text-xs font-mono text-indigo-500">{config.fontSizeSecondary}px</span>
                        </div>
                        <input
                            type="range" min="8" max="40" step="1"
                            value={config.fontSizeSecondary}
                            onChange={(e) => setConfig({ ...config, fontSizeSecondary: parseInt(e.target.value) })}
                            className="w-full accent-indigo-600 cursor-pointer"
                        />
                    </div>
                )}

                {/* Footer Size */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-500">Metadata (SKU/Fecha)</span>
                        <span className="text-xs font-mono text-indigo-500">{config.footerFontSize || 7}px</span>
                    </div>
                    <input
                        type="range" min="4" max="14" step="1"
                        value={config.footerFontSize || 7}
                        onChange={(e) => setConfig({ ...config, footerFontSize: parseInt(e.target.value) })}
                        className="w-full accent-indigo-600 cursor-pointer"
                    />
                </div>

                {/* CONTROLES DE JERARQUÍA */}
                <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-100 dark:border-indigo-800 space-y-4">
                    <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                            <LayoutTemplate size={14} /> Jerarquía
                        </label>
                        <button
                            onClick={() => setConfig({ ...config, _simulateHierarchy: !config._simulateHierarchy })}
                            className={`text-[10px] px-2 py-1 rounded border transition-all font-bold ${config._simulateHierarchy ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200'}`}
                        >
                            {config._simulateHierarchy ? 'SIMULANDO' : 'SIMULAR'}
                        </button>
                    </div>

                    {/* Scale */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500">Tamaño Badge</span>
                            <span className="text-[10px] font-mono text-indigo-500">{config.hierarchyScale || 1}x</span>
                        </div>
                        <input
                            type="range" min="0.5" max="1.5" step="0.1"
                            value={config.hierarchyScale || 1}
                            onChange={(e) => setConfig({ ...config, hierarchyScale: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>

                    {/* Position Y */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500">Posición Y</span>
                            <span className="text-[10px] font-mono text-indigo-500">{config.hierarchyY || 0}mm</span>
                        </div>
                        <input
                            type="range" min="-10" max="10" step="1"
                            value={config.hierarchyY || 0}
                            onChange={(e) => setConfig({ ...config, hierarchyY: parseInt(e.target.value) })}
                            className="w-full h-1 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                    </div>
                </div>

                {/* AJUSTE FINO */}
                <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-4">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Settings size={14} /> Ajuste Fino
                    </label>

                    {/* Title Offset */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500">Título Y</span>
                            <span className="text-[10px] font-mono text-indigo-500">{config.titleY || 0}mm</span>
                        </div>
                        <input
                            type="range" min="-10" max="10" step="1"
                            value={config.titleY || 0}
                            onChange={(e) => setConfig({ ...config, titleY: parseInt(e.target.value) })}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                        />
                    </div>

                    {/* Price Offset */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500">Precio $ Y</span>
                            <span className="text-[10px] font-mono text-indigo-500">{config.priceY || 0}mm</span>
                        </div>
                        <input
                            type="range" min="-10" max="10" step="1"
                            value={config.priceY || 0}
                            onChange={(e) => setConfig({ ...config, priceY: parseInt(e.target.value) })}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                        />
                    </div>

                    {/* Secondary Price Offset */}
                    {config.moneda === 'mix' && (
                        <div>
                            <div className="flex justify-between mb-1">
                                <span className="text-[10px] font-bold text-slate-500">Precio Bs Y</span>
                                <span className="text-[10px] font-mono text-indigo-500">{config.secondaryPriceY || 0}mm</span>
                            </div>
                            <input
                                type="range" min="-10" max="10" step="1"
                                value={config.secondaryPriceY || 0}
                                onChange={(e) => setConfig({ ...config, secondaryPriceY: parseInt(e.target.value) })}
                                className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                            />
                        </div>
                    )}

                    {/* Footer/Metadata Offset */}
                    <div>
                        <div className="flex justify-between mb-1">
                            <span className="text-[10px] font-bold text-slate-500">Metadata (SKU/Fecha) Y</span>
                            <span className="text-[10px] font-mono text-indigo-500">{config.footerY || 0}mm</span>
                        </div>
                        <input
                            type="range" min="-10" max="10" step="1"
                            value={config.footerY || 0}
                            onChange={(e) => setConfig({ ...config, footerY: parseInt(e.target.value) })}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-600"
                        />
                    </div>
                </div>

                {/* TOGGLES */}
                <div className="space-y-2">
                    {config.designTemplate === 'modern' && (
                        <button onClick={() => setConfig({ ...config, showBorder: !config.showBorder })} className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all">
                            <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2"><Square size={14} /> Mostrar Borde</span>
                            <div className={`w-10 h-5 rounded-full relative transition-colors ${config.showBorder ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${config.showBorder ? 'translate-x-5' : ''}`} />
                            </div>
                        </button>
                    )}

                    <button onClick={() => setConfig({ ...config, showDate: !config.showDate })} className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all">
                        <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2"><Calendar size={14} /> Fecha Impresión</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${config.showDate ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${config.showDate ? 'translate-x-5' : ''}`} />
                        </div>
                    </button>

                    <button onClick={() => setConfig({ ...config, showCode: !config.showCode })} className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-300 transition-all">
                        <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2"><BarChart2 size={14} /> Código SKU</span>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${config.showCode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${config.showCode ? 'translate-x-5' : ''}`} />
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
};
