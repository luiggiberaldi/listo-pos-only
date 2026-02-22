// 👻 GHOST SHIFT MODAL — V.1.0
// Modal de sugerencias AI que aparece automáticamente después de cada Cierre Z.

import { useNavigate } from 'react-router-dom';
import { X, Sparkles, TrendingUp, AlertTriangle } from 'lucide-react';

// ─── HELPERS ───

const PRIORITY_CONFIG = {
    alta: { color: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300', label: 'Alta' },
    media: { color: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800', dot: 'bg-amber-500', badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300', label: 'Media' },
    baja: { color: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800', dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300', label: 'Baja' },
};

const ACTION_ROUTES = {
    inventario: '/inventory',
    cuentas: '/accounts',
    finanzas: '/finanzas',
};

const ACTION_LABELS = {
    inventario: '→ Ir a Inventario',
    cuentas: '→ Ir a Cuentas',
    finanzas: '→ Ir a Finanzas',
};

function ScoreBar({ score }) {
    const color = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-500' : 'bg-red-500';
    const textColor = score >= 80 ? 'text-emerald-600 dark:text-emerald-400' : score >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
    const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '🔴';

    return (
        <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                    className={`h-full ${color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
                />
            </div>
            <span className={`text-lg font-black font-numbers ${textColor}`}>
                {emoji} {score}/100
            </span>
        </div>
    );
}

function SkeletonLoader() {
    return (
        <div className="animate-pulse space-y-4 p-6">
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-full" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full w-1/2" />
            <div className="mt-6 space-y-3">
                {[1, 2].map(i => (
                    <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-xl border border-slate-200 dark:border-slate-700" />
                ))}
            </div>
        </div>
    );
}

// ─── MAIN COMPONENT ───

/**
 * @param {object} props
 * @param {boolean} props.open          - Whether the modal is visible
 * @param {object|null} props.report    - AI report from generateShiftReport(), null = loading
 * @param {boolean} props.failed        - True if Groq call failed silently
 * @param {function} props.onClose      - Callback to close the modal
 */
export default function GhostShiftModal({ open, report, failed, onClose }) {
    const navigate = useNavigate();

    if (!open) return null;

    const handleAction = (accion) => {
        const route = ACTION_ROUTES[accion];
        if (route) {
            onClose();
            navigate(route);
        }
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-slate-700 animate-in zoom-in-95 duration-200 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-violet-50 dark:bg-violet-900/30 rounded-lg">
                            <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-none">
                                Análisis del Turno
                            </h2>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                {report?.cajaId || 'Ghost AI'} · Groq
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                {failed ? (
                    /* Silent failure state */
                    <div className="p-6 text-center text-slate-400">
                        <AlertTriangle size={32} className="mx-auto mb-3 opacity-40" />
                        <p className="text-sm">Análisis AI no disponible en este momento.</p>
                        <p className="text-xs mt-1 opacity-60">Verifica tu conexión o claves Groq.</p>
                    </div>
                ) : !report ? (
                    /* Loading skeleton */
                    <SkeletonLoader />
                ) : (
                    /* Report content */
                    <div className="p-6 space-y-5">
                        {/* Score */}
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                <TrendingUp size={12} /> Score del Turno
                            </p>
                            <ScoreBar score={report.score ?? 0} />
                        </div>

                        {/* Resumen */}
                        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                            {report.resumen}
                        </p>

                        {/* Alerta urgente */}
                        {report.alerta && (
                            <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm font-medium text-red-700 dark:text-red-300">{report.alerta}</p>
                            </div>
                        )}

                        {/* Sugerencias */}
                        {report.sugerencias?.length > 0 && (
                            <div className="space-y-3">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sugerencias</p>
                                {report.sugerencias.map((s, idx) => {
                                    const cfg = PRIORITY_CONFIG[s.prioridad] || PRIORITY_CONFIG.baja;
                                    return (
                                        <div
                                            key={idx}
                                            className={`p-3.5 rounded-xl border ${cfg.color} space-y-1.5`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg leading-none">{s.emoji}</span>
                                                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex-1">
                                                    {s.titulo}
                                                </span>
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                                    {cfg.label}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 ml-7 leading-relaxed">
                                                {s.detalle}
                                            </p>
                                            {s.accion && ACTION_ROUTES[s.accion] && (
                                                <button
                                                    onClick={() => handleAction(s.accion)}
                                                    className="ml-7 mt-1 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 transition-colors"
                                                >
                                                    {ACTION_LABELS[s.accion]}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="px-6 pb-5 pt-1">
                    <button
                        onClick={onClose}
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold text-sm transition-colors"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
