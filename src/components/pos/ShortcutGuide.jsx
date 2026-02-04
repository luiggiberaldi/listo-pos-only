import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Keyboard, ShoppingCart, Zap, MousePointer2, Command } from 'lucide-react';

const ShortcutKey = ({ children }) => (
    <span className="inline-flex items-center justify-center min-w-[28px] h-7 px-1.5 bg-slate-800 dark:bg-slate-700 text-white rounded-md text-[11px] font-black border-b-2 border-slate-950 shadow-sm mx-0.5">
        {children}
    </span>
);

const Section = ({ title, icon: Icon, children, color = "indigo" }) => (
    <div className="space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className={`p-1.5 rounded-lg bg-${color}-50 dark:bg-${color}-500/10 text-${color}-600 dark:text-${color}-400`}>
                <Icon size={18} strokeWidth={2.5} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">{title}</h3>
        </div>
        <div className="space-y-3">
            {children}
        </div>
    </div>
);

const Row = ({ keys, label }) => (
    <div className="flex items-center justify-between group">
        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {label}
        </span>
        <div className="flex items-center gap-1">
            {keys.map((k, i) => (
                <React.Fragment key={i}>
                    <ShortcutKey>{k}</ShortcutKey>
                    {i < keys.length - 1 && <span className="text-slate-300 text-[10px] mx-0.5">+</span>}
                </React.Fragment>
            ))}
        </div>
    </div>
);

export default function ShortcutGuide({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white/90 dark:bg-slate-900/90 w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-white/50 dark:border-slate-800/50 overflow-hidden ring-1 ring-slate-900/5"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                <Keyboard size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Centro de Atajos</h2>
                                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Domina la velocidad de tu punto de venta</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-500 transition-all active:scale-95"
                        >
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Grid Content */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 max-h-[60vh] overflow-y-auto custom-scrollbar">

                        {/* Venta y Flujo */}
                        <Section title="Flujo de Venta" icon={Zap} color="amber">
                            <Row keys={['F2']} label="Enfocar buscador" />
                            <Row keys={['F9']} label="Pestaña de cobrar" />
                            <Row keys={['F6']} label="Tickets en espera" />
                            <Row keys={['F4']} label="Limpiar cesta" />
                        </Section>

                        {/* Carrito */}
                        <Section title="Edición de Cesta" icon={ShoppingCart} color="indigo">
                            <Row keys={['+']} label="Aumentar cantidad item" />
                            <Row keys={['-']} label="Disminuir cantidad item" />
                            <Row keys={['Supr']} label="Eliminar último item" />
                            <Row keys={['*']} label="Multiplicar (Número + *)" />
                        </Section>

                        {/* Navegación */}
                        <Section title="Buscador y Grid" icon={MousePointer2} color="emerald">
                            <Row keys={['Enter']} label="Agregar / Procesar" />
                            <Row keys={['Esc']} label="Limpiar / Quitar foco" />
                            <Row keys={['↑', '↓', '←', '→']} label="Navegar entre productos" />
                        </Section>

                        {/* Poderes Especiales */}
                        <Section title="Trucos Maestros" icon={Command} color="rose">
                            <Row keys={['*']} label="Cambio de unidad (Buscador vacío)" />
                            <Row keys={['#', '+']} label="Venta Libre Exenta" />
                            <Row keys={['#', '-']} label="Venta Libre Gravada" />
                        </Section>

                    </div>

                    {/* Footer Footer */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                            Presiona <ShortcutKey>?</ShortcutKey> en cualquier momento para ver esta guía
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
