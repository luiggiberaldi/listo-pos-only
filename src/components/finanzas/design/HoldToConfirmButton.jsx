import React, { useState, useRef, useEffect } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

export default function HoldToConfirmButton({ onConfirm, label = 'MANTENER PARA CONFIRMAR', color = 'indigo', disabled = false }) {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);
    const HOLD_TIME = 800; // ms

    useEffect(() => {
        if (isHolding && !disabled) {
            const startTime = Date.now();
            intervalRef.current = setInterval(() => {
                const elapsed = Date.now() - startTime;
                const newProgress = Math.min((elapsed / HOLD_TIME) * 100, 100);
                setProgress(newProgress);

                if (newProgress >= 100) {
                    handleComplete();
                }
            }, 10);
        } else {
            clearInterval(intervalRef.current);
            setProgress(0);
        }

        return () => clearInterval(intervalRef.current);
    }, [isHolding, disabled]);

    const handleComplete = () => {
        setIsHolding(false);
        clearInterval(intervalRef.current);
        if (onConfirm) onConfirm();
    };

    return (
        <div className="relative w-full h-16 select-none">
            <button
                disabled={disabled}
                onMouseDown={() => setIsHolding(true)}
                onMouseUp={() => setIsHolding(false)}
                onMouseLeave={() => setIsHolding(false)}
                className={`w-full h-full rounded-2xl relative overflow-hidden transition-all active:scale-[0.98] ${disabled ? 'bg-slate-100 cursor-not-allowed opacity-70' : `bg-${color}-500 shadow-xl shadow-${color}-500/20 cursor-pointer`}`}
            >
                {/* Background Progress */}
                <motion.div
                    className={`absolute inset-0 bg-white/20 origin-left`}
                    style={{ width: `${progress}%` }}
                />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-center gap-3 text-white">
                    {disabled ? (
                        <div className="text-slate-300 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <Lock size={16} /> Completar Datos
                        </div>
                    ) : (
                        <>
                            {progress >= 100 ? <Check size={28} strokeWidth={4} className="animate-in zoom-in spin-in" /> : null}
                            <span className="font-black text-sm tracking-[0.2em]">{progress >= 100 ? 'CONFIRMADO' : label}</span>
                        </>
                    )}
                </div>
            </button>
        </div>
    );
}
