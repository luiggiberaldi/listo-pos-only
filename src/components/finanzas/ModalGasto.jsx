import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, DollarSign, Package } from 'lucide-react';
import MoneyExpenseView from './components/MoneyExpenseView';
import GoodsConsumptionView from './components/GoodsConsumptionView';

export default function ModalGasto({ isOpen, onClose }) {
    const [mode, setMode] = useState('MONEY');

    // Reset mode when opening
    useEffect(() => {
        if (isOpen) setMode('MONEY');
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-all">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="w-full max-w-6xl h-[85vh] flex flex-col relative"
                >
                    {/* Floating Navigation Tabs (Top Center) */}
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex bg-white/10 backdrop-blur-md border border-white/20 p-1.5 rounded-2xl gap-2 shadow-2xl z-50">
                        {[
                            { id: 'MONEY', label: 'Dinero', icon: DollarSign },
                            { id: 'GOODS', label: 'Inventario', icon: Package }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setMode(tab.id)}
                                className={`px-6 py-2.5 rounded-xl text-sm font-black tracking-wide flex items-center gap-2 transition-all ${mode === tab.id
                                        ? 'bg-white text-slate-900 shadow-xl scale-105'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <tab.icon size={16} strokeWidth={3} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Close Button (Top Right) */}
                    <button
                        onClick={onClose}
                        className="absolute -top-12 -right-2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 z-50"
                    >
                        <X size={20} strokeWidth={3} />
                    </button>

                    {/* Content View */}
                    <div className="flex-1 min-h-0 relative">
                        <AnimatePresence mode='wait'>
                            {mode === 'MONEY' ? (
                                <motion.div key="money" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="h-full w-full">
                                    <MoneyExpenseView onClose={onClose} />
                                </motion.div>
                            ) : (
                                <motion.div key="goods" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="h-full w-full">
                                    <GoodsConsumptionView onClose={onClose} />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
}
