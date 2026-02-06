import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowRight, AlertCircle, Lock } from 'lucide-react';
import LoginAvatar from './LoginAvatar';

const PIN_LENGTH = 6;

export default function LoginPinModal({
    isOpen,
    onClose,
    selectedUser,
    pin,
    setPin,
    handlePinSubmit,
    isProcessing,
    error,
    codeInputRef
}) {
    // --- ENFOQUE AUTOMÁTICO ROBUSTO ---
    useEffect(() => {
        if (isOpen && selectedUser) {
            const focusInput = () => codeInputRef.current?.focus();
            focusInput();

            const t1 = setTimeout(focusInput, 100);
            const t2 = setTimeout(focusInput, 300);

            return () => { clearTimeout(t1); clearTimeout(t2); };
        }
    }, [isOpen, selectedUser]);

    return (
        <AnimatePresence>
            {isOpen && selectedUser && (
                <motion.div
                    initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    animate={{ opacity: 1, backdropFilter: 'blur(10px)' }}
                    exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                    className="fixed inset-0 z-50 bg-slate-950/80 flex items-center justify-center p-4"
                    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-surface-dark border border-border-subtle p-8 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-visible"
                    >
                        {/* 🟢 CLOSE BUTTON */}
                        <button
                            onClick={onClose}
                            className="absolute -top-12 right-0 text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full hover:bg-white/20 z-50"
                            tabIndex={-1}
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center">
                            <LoginAvatar user={selectedUser} size="large" className="mb-6 shadow-2xl ring-4 ring-slate-800" />
                            <h2 className="text-2xl font-bold text-white mb-1">{selectedUser.nombre}</h2>
                            <p className="text-primary text-xs font-black uppercase tracking-widest mb-8 bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
                                {selectedUser.rol || 'EMPLEADO'}
                            </p>

                            <form onSubmit={handlePinSubmit} className="w-full relative">
                                {/* 🟢 INPUT: Transparente pero funcional */}
                                <input
                                    ref={codeInputRef}
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={PIN_LENGTH}
                                    value={pin}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '');
                                        setPin(val);
                                    }}
                                    onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit(e)}
                                    onBlur={(e) => {
                                        if (!isProcessing && selectedUser) e.target.focus();
                                    }}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-text z-10"
                                    autoFocus
                                />

                                {/* PUNTOS VISUALES */}
                                <motion.div
                                    animate={error ? { x: [-10, 10, -10, 10, 0], color: '#ef4444' } : { x: 0, color: '#ffffff' }}
                                    className="flex justify-center gap-4 mb-8 pointer-events-none"
                                >
                                    {[...Array(PIN_LENGTH)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`w-3 h-3 rounded-full transition-all duration-200 ${i < pin.length
                                                ? (error ? 'bg-status-danger scale-125' : 'bg-content-inverse scale-125 shadow-[0_0_12px_rgba(255,255,255,0.5)]')
                                                : 'bg-content-secondary border border-border-subtle'
                                                }`}
                                        />
                                    ))}
                                </motion.div>

                                {/* 🟢 BUTTON */}
                                <style>{`
                                    .btn-ingresar {
                                        width: 100%;
                                        height: 60px;
                                        border-radius: 16px;
                                        cursor: pointer;
                                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                                        background: linear-gradient(135deg, rgba(46, 142, 255, 0.6) 0%, rgba(46, 142, 255, 0.2) 100%);
                                        border: 2px solid rgba(46, 142, 255, 0.5); 
                                        box-shadow: 0 0 15px rgba(46, 142, 255, 0.3); 
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        position: relative;
                                        z-index: 20;
                                        overflow: hidden;
                                    }
                                    .btn-ingresar:hover:not(:disabled) {
                                        background: linear-gradient(135deg, #2e8eff 0%, rgba(46, 142, 255, 0.8) 100%);
                                        border-color: #60a5fa;
                                        box-shadow: 0 0 35px rgba(46, 142, 255, 0.8), 0 0 10px rgba(255, 255, 255, 0.4);
                                        transform: translateY(-2px) scale(1.02);
                                    }
                                    .btn-ingresar:active:not(:disabled) {
                                        transform: translateY(1px);
                                        box-shadow: 0 0 20px rgba(46, 142, 255, 0.6);
                                    }
                                    .btn-ingresar:disabled {
                                        opacity: 0.6;
                                        cursor: default;
                                        background: rgba(46, 142, 255, 0.15);
                                        border-color: rgba(46, 142, 255, 0.15);
                                        box-shadow: none;
                                        animation: breathe 3s infinite ease-in-out;
                                    }
                                    @keyframes breathe {
                                        0%, 100% { border-color: rgba(46, 142, 255, 0.2); }
                                        50% { border-color: rgba(46, 142, 255, 0.5); box-shadow: 0 0 10px rgba(46, 142, 255, 0.1); }
                                    }
                                    .btn-ingresar-inner {
                                        width: calc(100% - 6px);
                                        height: calc(100% - 6px);
                                        border-radius: 13px;
                                        background-color: #020617; 
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        gap: 12px;
                                        color: #e0f2fe; 
                                        font-weight: 800;
                                        letter-spacing: 2px;
                                        font-size: 14px;
                                        position: relative;
                                        z-index: 2;
                                        transition: background-color 0.3s;
                                    }
                                    .btn-ingresar:hover:not(:disabled) .btn-ingresar-inner {
                                        background-color: #0f172a; 
                                    }
                                    .btn-ingresar-inner svg {
                                        width: 20px;
                                        height: 20px;
                                        stroke-width: 3px;
                                        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
                                        filter: drop-shadow(0 0 2px rgba(255,255,255,0.5));
                                    }
                                    .btn-ingresar:hover:not(:disabled) .btn-ingresar-inner svg {
                                        transform: translateX(6px) scale(1.1);
                                        color: #60a5fa;
                                        filter: drop-shadow(0 0 5px #60a5fa);
                                    }
                                `}</style>

                                <button
                                    type="submit"
                                    disabled={isProcessing || pin.length < PIN_LENGTH}
                                    className="btn-ingresar group"
                                >
                                    <div className="btn-ingresar-inner">
                                        {isProcessing ? (
                                            <span className="animate-pulse">ACCEDIENDO...</span>
                                        ) : (
                                            <>INGRESAR <ArrowRight /></>
                                        )}
                                    </div>
                                </button>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="absolute -bottom-16 left-0 w-full"
                                    >
                                        <div className="bg-slate-950 border border-red-500 text-red-500 text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl">
                                            <AlertCircle size={18} />
                                            <span>CREDENCIALES INCORRECTAS</span>
                                        </div>
                                    </motion.div>
                                )}
                            </form>

                            <div className="mt-8 flex justify-center">
                                <p className="text-xs text-slate-400 flex items-center gap-2 font-medium">
                                    <Lock size={12} /> Presiona <strong className="text-white bg-slate-700 px-1.5 rounded text-[10px] tracking-wider border border-slate-600">ESC</strong> para cambiar de usuario
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
