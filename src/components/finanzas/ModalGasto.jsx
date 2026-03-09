import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, DollarSign, Package } from 'lucide-react';
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
            <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-surface-dark/60 backdrop-blur-sm transition-all">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
                    className="w-full max-w-6xl h-[90vh] md:h-[85vh] flex flex-col relative"
                >
                    {/* [V7] Floating Navigation Tabs — responsive, inside modal on mobile */}
                    <div className="flex items-center justify-between mb-3 md:mb-0 md:absolute md:-top-16 md:left-1/2 md:-translate-x-1/2 z-50">
                        <div className="flex bg-white/10 backdrop-blur-md border border-white/20 p-1 md:p-1.5 rounded-xl md:rounded-2xl gap-1 md:gap-2 shadow-2xl">
                            {[
                                { id: 'MONEY', label: 'Dinero', icon: DollarSign },
                                { id: 'GOODS', label: 'Inventario', icon: Package }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setMode(tab.id)}
                                    className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black tracking-wide flex items-center gap-1.5 md:gap-2 transition-all duration-200 ${mode === tab.id
                                        ? 'bg-white text-content-main shadow-xl scale-105'
                                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                                        }`}
                                >
                                    <tab.icon size={14} strokeWidth={3} className="md:w-4 md:h-4" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* [V7] Close button — inline on mobile, floating on desktop */}
                        <button
                            onClick={onClose}
                            className="p-2.5 md:p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/10 transition-all active:scale-90 ml-3 md:absolute md:-right-16 md:top-0"
                        >
                            <X size={18} strokeWidth={3} />
                        </button>
                    </div>

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
