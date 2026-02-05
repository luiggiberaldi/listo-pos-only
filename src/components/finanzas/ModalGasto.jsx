import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, DollarSign, Package } from 'lucide-react';
import MoneyExpenseView from './components/MoneyExpenseView';
import GoodsConsumptionView from './components/GoodsConsumptionView';

export default function ModalGasto({ isOpen, onClose }) {
    const [mode, setMode] = useState('MONEY');
    const activeColor = mode === 'MONEY' ? 'indigo' : 'emerald';

    useEffect(() => {
        if (!isOpen) {
            setMode('MONEY');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md transition-all">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    transition={{ type: "spring", duration: 0.4 }}
                    className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col border border-white/50 ring-1 ring-slate-900/5 h-full"
                >
                    {/* Header */}
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10 shrink-0">
                        <div>
                            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                                <div className={`p-2.5 rounded-2xl text-white shadow-lg shadow-${activeColor}-500/30 transition-colors duration-300 bg-${activeColor}-600`}>
                                    <FileText size={24} strokeWidth={2.5} />
                                </div>
                                <span>Registro de Salidas</span>
                            </h2>
                            <p className="text-slate-500 text-sm font-medium mt-1 ml-1 opacity-80">Gestión contable de egresos</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-rose-500 transition-all active:scale-95">
                            <X size={24} strokeWidth={2.5} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex border-b border-slate-100 bg-slate-50/50 p-1.5 gap-2 shrink-0">
                        {[
                            { id: 'MONEY', label: 'Salida de Dinero', icon: DollarSign, color: 'indigo' },
                            { id: 'GOODS', label: 'Consumo de Mercancía', icon: Package, color: 'emerald' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setMode(tab.id)}
                                className={`flex-1 p-3.5 text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all rounded-xl relative overflow-hidden group ${mode === tab.id
                                    ? 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
                                    : 'text-slate-400 hover:bg-white/60 hover:text-slate-600'
                                    }`}
                            >
                                <tab.icon
                                    size={18}
                                    className={`transition-colors duration-300 ${mode === tab.id ? `text-${tab.color}-600` : 'group-hover:text-slate-500'}`}
                                    strokeWidth={2.5}
                                />
                                {tab.label}
                                {mode === tab.id && (
                                    <div className={`absolute bottom-0 left-0 right-0 h-1 bg-${tab.color}-500 rounded-b-xl`} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Content Views */}
                    {mode === 'MONEY' ? (
                        <MoneyExpenseView onClose={onClose} />
                    ) : (
                        <GoodsConsumptionView onClose={onClose} />
                    )}

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
