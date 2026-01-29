import React, { useState } from 'react';
import { ShieldCheck, Copy, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ModalRecoveryCode({ code, onConfirm }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-surface-dark border border-primary/30 max-w-md w-full rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                >
                    {/* Background decoration */}
                    <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6 ring-4 ring-primary/5">
                            <ShieldCheck size={32} className="text-primary" />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight">CÓDIGO DE RECUPERACIÓN</h2>
                        <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                            Este es tu <strong className="text-white">Código de Rescate (PUK)</strong> único.
                            Es la <span className="text-status-danger font-bold">ÚNICA FORMA</span> de recuperar el acceso si olvidas el PIN del Dueño.
                        </p>

                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 w-full flex items-center justify-between group mb-6 relative">
                            <div className="font-mono text-2xl font-black text-primary tracking-widest w-full text-center">
                                {code}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="absolute right-4 p-2 text-slate-500 hover:text-white transition-colors"
                                title="Copiar al portapapeles"
                            >
                                {copied ? <CheckCircle size={18} className="text-emerald-500" /> : <Copy size={18} />}
                            </button>
                        </div>

                        {/* FACTORY PIN INFO */}
                        <div className="mb-6 p-3 bg-blue-500/10 border border-blue-500/30 rounded-xl w-full flex flex-col items-center">
                            <span className="text-blue-400 text-[10px] uppercase font-bold tracking-widest mb-1">PIN DE FÁBRICA (DUEÑO)</span>
                            <span className="text-2xl font-black text-white tracking-widest">123456</span>
                        </div>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 flex items-start gap-3 w-full text-left mb-8">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-amber-200/80 text-xs font-medium">
                                Guarda este código en un lugar seguro (fuera de este dispositivo). No podrás verlo nuevamente.
                            </p>
                        </div>

                        <button
                            onClick={onConfirm}
                            className="w-full py-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 active:scale-95 flex items-center justify-center gap-2"
                        >
                            <CheckCircle size={20} />
                            <span>ENTENDIDO, LO HE GUARDADO</span>
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
