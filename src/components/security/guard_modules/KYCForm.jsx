import React from 'react';
import { AlertTriangle, ShieldCheck, ChevronDown } from 'lucide-react';

export default function KYCForm({ kycData, onChange, error, onBack, onConfirm, submitting }) {
    return (
        <div className="flex-1 flex flex-col overflow-hidden relative">
            <div className="flex-1 overflow-y-auto p-8 flex items-center justify-center animate-in fade-in slide-in-from-right-10 duration-300">
                <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
                    <div className="mb-8 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Identificación del Suscriptor</h2>
                        <p className="text-slate-400 text-sm">
                            Para formalizar la licencia, ingrese los datos del titular o comercio responsable.
                            <br />Esta información aparecerá en su <strong>Certificado de Uso Legal</strong>.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Nombre Negocio */}
                        <div className="col-span-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre del Negocio / Razón Social *</label>
                            <input
                                type="text"
                                name="nombreNegocio"
                                value={kycData.nombreNegocio}
                                onChange={onChange}
                                placeholder="EJ: INVERSIONES EL EXITO C.A."
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase"
                            />
                        </div>

                        {/* Representante */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Nombre del Representante *</label>
                            <input
                                type="text"
                                name="nombreRepresentante"
                                value={kycData.nombreRepresentante}
                                onChange={onChange}
                                placeholder="EJ: JUAN PEREZ"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase"
                            />
                        </div>

                        {/* RIF/Cédula (Split Input) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">RIF o Cédula *</label>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <select
                                        value={kycData.rif ? kycData.rif.split('-')[0] : 'V'}
                                        onChange={(e) => {
                                            const type = e.target.value;
                                            const number = kycData.rif ? kycData.rif.split('-')[1] || '' : '';
                                            onChange({ target: { name: 'rif', value: `${type}-${number}` } });
                                        }}
                                        className="appearance-none bg-slate-950 border border-slate-700 rounded-lg pl-4 pr-10 py-3 text-white focus:border-emerald-500 outline-none font-bold cursor-pointer transition-colors hover:border-slate-500"
                                    >
                                        {['V', 'E', 'J', 'G', 'P', 'C'].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none text-white">
                                        <ChevronDown size={14} strokeWidth={3} />
                                    </div>
                                </div>
                                <input
                                    type="text"
                                    value={kycData.rif ? kycData.rif.split('-')[1] || '' : ''}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, ''); // Solo números
                                        const type = kycData.rif ? kycData.rif.split('-')[0] || 'V' : 'V';
                                        onChange({ target: { name: 'rif', value: `${type}-${val}` } });
                                    }}
                                    placeholder="12345678"
                                    maxLength={9}
                                    className="flex-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none uppercase font-mono tracking-wider"
                                />
                            </div>
                            <p className="text-[10px] text-slate-600 mt-1">Seleccione tipo (V, J, etc) y número.</p>
                        </div>

                        {/* Teléfono (Strict Mask) */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Teléfono / WhatsApp *</label>
                            <input
                                type="tel"
                                name="telefono"
                                value={kycData.telefono}
                                onChange={(e) => {
                                    let val = e.target.value.replace(/[^0-9]/g, ''); // Solo números

                                    // Validar inicio con 0
                                    if (val.length > 0 && val[0] !== '0') val = '0' + val;

                                    // Máscara 0412-1234567
                                    if (val.length > 4) {
                                        val = val.slice(0, 4) + '-' + val.slice(4);
                                    }

                                    // Limite 12 chars (04XX-XXXXXXX)
                                    if (val.length > 12) val = val.slice(0, 12);

                                    onChange({ target: { name: 'telefono', value: val } });
                                }}
                                placeholder="0412-1234567"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono tracking-wider"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Correo Electrónico (Opcional)</label>
                            <input
                                type="email"
                                name="email"
                                value={kycData.email}
                                onChange={onChange}
                                placeholder="cliente@ejemplo.com"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Mensaje de Error */}
                    {error && (
                        <div className="mt-6 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400 text-sm animate-pulse">
                            <AlertTriangle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-800 flex justify-between items-center">
                        <button
                            onClick={onBack}
                            className="text-slate-500 hover:text-slate-300 text-sm font-bold uppercase tracking-wider px-4 py-2"
                        >
                            ← Volver a leer
                        </button>
                    </div>
                </div>
            </div>

            {/* Footer Acción */}
            <div className="bg-slate-900 border-t border-slate-800 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 text-sm text-emerald-400">
                    <ShieldCheck size={18} />
                    Paso 2: Identificación Formal
                </div>

                <button
                    onClick={onConfirm}
                    disabled={submitting}
                    className="flex items-center gap-3 px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-900/30 active:scale-[0.98]"
                >
                    {submitting ? (
                        <span className="animate-pulse">PROCESANDO...</span>
                    ) : (
                        <>
                            <ShieldCheck size={18} />
                            CONFIRMAR Y FIRMAR
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
