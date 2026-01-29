import React from 'react';
import { X, Save, User, FileText, Phone, Mail, MapPin } from 'lucide-react';

export default function ModalClienteForm({ isOpen, onClose, cliente, onGuardar }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop with Blur */}
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Card */}
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                            {cliente ? <User className="text-primary" /> : <User className="text-primary" />}
                            {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {cliente ? 'Modifica los datos del cliente existente' : 'Registra un nuevo cliente en el sistema'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Form Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="cliente-form" onSubmit={onGuardar} className="space-y-5">

                        {/* Nombre y Documento */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <User size={12} /> Nombre Completo
                                </label>
                                <input
                                    required
                                    name="nombre"
                                    defaultValue={cliente?.nombre}
                                    onChange={(e) => {
                                        // 📝 Auto-Title Case
                                        const val = e.target.value;
                                        e.target.value = val.replace(/\b\w/g, l => l.toUpperCase());
                                    }}
                                    placeholder="Ej: Juan Pérez"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-bold text-slate-800 dark:text-white placeholder:text-slate-300 transition-all capitalize"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <FileText size={12} /> Documento ID
                                </label>
                                <input
                                    required
                                    name="documento"
                                    defaultValue={cliente?.documento}
                                    placeholder="V-12345678"
                                    maxLength={15}
                                    onChange={(e) => {
                                        // 🛡️ Smart ID Formatter
                                        let val = e.target.value.toUpperCase();
                                        // Allow only V, E, J, G, P and numbers/dash
                                        val = val.replace(/[^VEJGP0-9-]/g, '');

                                        // Auto-prefix if user types only numbers
                                        if (/^\d{1,8}$/.test(val) && val.length > 0) {
                                            // Optional: Don't force it immediately to avoid annoyance, 
                                            // but standardizing 'V-' is requested.
                                            // Let's just enforce uppercasing and valid chars for now.
                                        }
                                        e.target.value = val;
                                    }}
                                    onBlur={(e) => {
                                        // Auto-Fix on Blur: Add 'V-' if missing and looks like a CI
                                        let val = e.target.value.toUpperCase();
                                        if (/^\d+$/.test(val) && val.length > 4) {
                                            e.target.value = `V-${val}`;
                                        }
                                    }}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-mono text-slate-700 dark:text-slate-200 placeholder:text-slate-300 transition-all uppercase"
                                />
                            </div>
                        </div>

                        {/* Contacto */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <Phone size={12} /> Teléfono
                                </label>
                                <input
                                    name="telefono"
                                    defaultValue={cliente?.telefono}
                                    placeholder="0412-1234567"
                                    maxLength={12}
                                    onChange={(e) => {
                                        // 📞 Phone Masking logic could be complex. 
                                        // Simple approach: Allow numbers and dashes.
                                        e.target.value = e.target.value.replace(/[^0-9-]/g, '');
                                    }}
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                    <Mail size={12} /> Email (Opcional)
                                </label>
                                <input
                                    name="email"
                                    type="email"
                                    defaultValue={cliente?.email}
                                    placeholder="cliente@email.com"
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium transition-all"
                                />
                            </div>
                        </div>

                        {/* Dirección */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                                <MapPin size={12} /> Dirección Física
                            </label>
                            <textarea
                                name="direccion"
                                defaultValue={cliente?.direccion}
                                placeholder="Dirección detallada de habitación o fiscal..."
                                className="w-full p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm font-medium h-24 resize-none transition-all"
                            />
                        </div>

                    </form>
                </div>

                {/* Footer actions */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 text-slate-500 font-bold hover:bg-white dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-white rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-600 transition-all text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="cliente-form"
                        className="flex-[2] py-3 px-4 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
                    >
                        <Save size={18} />
                        {cliente ? 'Guardar Cambios' : 'Registrar Cliente'}
                    </button>
                </div>

            </div>
        </div>
    );
}
