import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, Lock } from 'lucide-react';

// [V6] Color map for shimmer gradient — avoids Tailwind dynamic class issues
const SHIMMER_COLORS = {
    indigo: { bg: 'bg-indigo-500', shadow: 'shadow-indigo-500/20', shimmer: 'from-indigo-400/0 via-white/30 to-indigo-400/0', ring: 'ring-indigo-400/50' },
    emerald: { bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/20', shimmer: 'from-emerald-400/0 via-white/30 to-emerald-400/0', ring: 'ring-emerald-400/50' },
    rose: { bg: 'bg-rose-500', shadow: 'shadow-rose-500/20', shimmer: 'from-rose-400/0 via-white/30 to-rose-400/0', ring: 'ring-rose-400/50' },
};

export default function HoldToConfirmButton({ onConfirm, label = 'MANTENER PARA CONFIRMAR', color = 'indigo', disabled = false }) {
    const [isHolding, setIsHolding] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const intervalRef = useRef(null);
    const hasConfirmedRef = useRef(false);
    const HOLD_TIME = 800;
    const theme = SHIMMER_COLORS[color] || SHIMMER_COLORS.indigo;

    useEffect(() => {
        if (isHolding && !disabled && !hasConfirmedRef.current) {
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
            if (!hasConfirmedRef.current) setProgress(0);
        }

        return () => clearInterval(intervalRef.current);
    }, [isHolding, disabled]);

    const handleComplete = useCallback(() => {
        if (hasConfirmedRef.current) return;
        hasConfirmedRef.current = true;
        setIsHolding(false);
        setIsCompleted(true);
        clearInterval(intervalRef.current);

        // [V6] Haptic feedback on supported devices
        try { navigator?.vibrate?.(50); } catch (e) { }

        if (onConfirm) onConfirm();
        setTimeout(() => {
            hasConfirmedRef.current = false;
            setProgress(0);
            setIsCompleted(false);
        }, 1500);
    }, [onConfirm]);

    const startHold = useCallback(() => {
        if (!disabled && !hasConfirmedRef.current) setIsHolding(true);
    }, [disabled]);

    const stopHold = useCallback(() => {
        setIsHolding(false);
    }, []);

    return (
        <div className="relative w-full h-16 select-none">
            <button
                disabled={disabled}
                onMouseDown={startHold}
                onMouseUp={stopHold}
                onMouseLeave={stopHold}
                onTouchStart={startHold}
                onTouchEnd={stopHold}
                onTouchCancel={stopHold}
                className={`w-full h-full rounded-2xl relative overflow-hidden transition-all duration-300 ${disabled
                    ? 'bg-app-light dark:bg-app-dark cursor-not-allowed opacity-70'
                    : isCompleted
                        ? `${theme.bg} shadow-2xl ${theme.shadow} scale-[0.98] ring-4 ${theme.ring}`
                        : isHolding
                            ? `${theme.bg} shadow-2xl ${theme.shadow} scale-[0.97]`
                            : `${theme.bg} shadow-xl ${theme.shadow} hover:shadow-2xl hover:scale-[1.01] cursor-pointer active:scale-[0.98]`
                    }`}
            >
                {/* [V6] Shimmer gradient progress (replaces flat white overlay) */}
                <motion.div
                    className="absolute inset-0 origin-left"
                    style={{ width: `${progress}%` }}
                >
                    <div className={`absolute inset-0 bg-gradient-to-r ${theme.shimmer}`} />
                    <div className="absolute inset-0 bg-white/15" />
                    {/* Leading edge glow */}
                    <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/40 to-transparent blur-sm" />
                </motion.div>

                {/* Content */}
                <div className="relative z-10 flex items-center justify-center gap-3 text-white h-full">
                    {disabled ? (
                        <div className="text-content-secondary font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                            <Lock size={16} /> Completar Datos
                        </div>
                    ) : isCompleted ? (
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 15 }}
                            className="flex items-center gap-3"
                        >
                            <Check size={28} strokeWidth={4} />
                            <span className="font-black text-sm tracking-[0.2em]">CONFIRMADO ✓</span>
                        </motion.div>
                    ) : (
                        <>
                            {/* Pulse ring when holding */}
                            {isHolding && (
                                <motion.div
                                    className="absolute inset-0 rounded-2xl border-2 border-white/30"
                                    animate={{ scale: [1, 1.02, 1] }}
                                    transition={{ repeat: Infinity, duration: 0.5 }}
                                />
                            )}
                            <span className="font-black text-sm tracking-[0.2em]">{label}</span>
                        </>
                    )}
                </div>
            </button>
        </div>
    );
}
