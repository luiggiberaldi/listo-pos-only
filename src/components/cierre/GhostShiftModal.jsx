// 👻 GHOST SHIFT MODAL — V.3.0 PREMIUM NATIVO
// Modal de análisis AI post-cierre Z — diseño premium con tokens de Listo POS.

import { useNavigate } from 'react-router-dom';
import { X, Sparkles, AlertTriangle, ArrowRight, Package, CreditCard, TrendingUp, BarChart2 } from 'lucide-react';

// ─── THEME ───

const PRIORITY = {
    alta: { ring: 'border-status-danger/30', bg: 'bg-status-danger/5 dark:bg-status-danger/10', text: 'text-status-danger', badge: 'bg-status-danger/10 text-status-danger', label: 'Alta' },
    media: { ring: 'border-status-warning/30', bg: 'bg-status-warning/5 dark:bg-status-warning/10', text: 'text-status-warning', badge: 'bg-status-warning/10 text-status-warning', label: 'Media' },
    baja: { ring: 'border-primary/30', bg: 'bg-primary/5 dark:bg-primary/10', text: 'text-primary', badge: 'bg-primary/10 text-primary', label: 'Baja' },
};

const TIPO_ICONS = {
    inventario: Package,
    credito: CreditCard,
    finanzas: TrendingUp,
    operacion: BarChart2,
};

const ACTION_ROUTES = {
    inventario: '/inventory',
    cuentas: '/accounts',
    finanzas: '/finanzas',
};

const ACTION_LABELS = {
    inventario: 'Ver Inventario',
    cuentas: 'Ver Cuentas',
    finanzas: 'Ver Finanzas',
};

// ─── SCORE RING ───
function ScoreRing({ score }) {
    const size = 96;
    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (Math.min(Math.max(score, 0), 100) / 100) * circ;

    const color = score >= 80 ? 'text-status-success' : score >= 60 ? 'text-status-warning' : 'text-status-danger';
    const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Regular' : 'Crítico';

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                {/* Background Ring */}
                <svg width={size} height={size} className="transform -rotate-90">
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        className="stroke-border-subtle opacity-30 dark:opacity-10"
                        strokeWidth={stroke}
                    />
                    {/* Foreground Ring */}
                    <circle
                        cx={size / 2} cy={size / 2} r={radius}
                        fill="none"
                        className={`stroke-current ${color}`}
                        strokeWidth={stroke}
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                    />
                </svg>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-content-main leading-none font-numbers">{score}</span>
                    <span className="text-[10px] font-bold text-content-secondary leading-none mt-1">/ 100</span>
                </div>
            </div>
            <span className={`text-sm font-bold ${color}`}>{label}</span>
        </div>
    );
}

// ─── SKELETON ───
function Skeleton() {
    return (
        <div className="animate-pulse space-y-6 p-8">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-border-subtle/50 dark:bg-slate-700" />
                <div className="flex-1 space-y-3">
                    <div className="h-5 bg-border-subtle/50 dark:bg-slate-700 rounded-full w-3/4" />
                    <div className="h-4 bg-border-subtle/30 dark:bg-slate-800 rounded-full w-full" />
                    <div className="h-4 bg-border-subtle/30 dark:bg-slate-800 rounded-full w-2/3" />
                </div>
            </div>
            <div className="space-y-4 pt-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-border-subtle/20 dark:bg-slate-800/50 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

// ─── SUGGESTION CARD ───
function SuggestionCard({ s, onAction }) {
    const p = PRIORITY[s.prioridad] || PRIORITY.baja;
    const Icon = TIPO_ICONS[s.tipo] || Sparkles;
    const hasAction = s.accion && ACTION_ROUTES[s.accion];

    return (
        <div className={`group relative rounded-2xl border ${p.ring} ${p.bg} p-5 hover:shadow-md transition-all duration-300 ${hasAction ? 'cursor-pointer hover:-translate-y-0.5' : ''}`}
            onClick={hasAction ? () => onAction(s.accion) : undefined}
        >
            <div className="flex items-start gap-4">
                {/* Icon Wrapper */}
                <div className="flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl bg-surface-light dark:bg-surface-dark shadow-sm border border-border-subtle flex items-center justify-center text-lg">
                    {s.emoji || <Icon size={20} className="text-content-secondary" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                        <span className="text-base font-bold text-content-main leading-tight">{s.titulo}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${p.badge}`}>
                            {p.label}
                        </span>
                    </div>
                    <p className="text-sm text-content-secondary leading-relaxed">{s.detalle}</p>
                </div>

                {/* Action arrow */}
                {hasAction && (
                    <div className="flex-shrink-0 mt-2 text-content-secondary/30 group-hover:text-primary transition-colors">
                        <ArrowRight size={18} />
                    </div>
                )}
            </div>

            {hasAction && (
                <div className="mt-4 ml-14 flex items-center">
                    <span className="text-sm font-bold text-primary group-hover:text-primary-hover transition-colors">
                        {ACTION_LABELS[s.accion]} &rarr;
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── MAIN MODAL ───

/**
 * @param {{ open: boolean, report: object|null, failed: boolean, onClose: function }} props
 */
export default function GhostShiftModal({ open, report, failed, onClose }) {
    const navigate = useNavigate();

    if (!open) return null;

    const handleAction = (accion) => {
        const route = ACTION_ROUTES[accion];
        if (route) { onClose(); navigate(route); }
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-app-dark/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            {/* Modal Container */}
            <div
                className="w-full sm:max-w-xl bg-surface-light dark:bg-surface-dark sm:rounded-[32px] rounded-t-[32px] shadow-2xl border border-border-subtle dark:border-slate-700/50 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-400 ease-out"
            >
                {/* Header (Sticky) */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-border-subtle dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-content-main leading-tight tracking-tight">
                                Análisis del Turno
                            </h2>
                            <p className="text-sm font-medium text-content-secondary mt-0.5">
                                {report?.cajaId || '···'} · Ghost AI
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-content-secondary hover:text-content-main hover:bg-app-light dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="overflow-y-auto overflow-x-hidden custom-scrollbar">
                    {failed ? (
                        <div className="p-12 text-center">
                            <AlertTriangle size={48} className="mx-auto mb-4 text-status-warning opacity-50" />
                            <p className="text-lg font-bold text-content-main">Análisis no disponible</p>
                            <p className="text-sm text-content-secondary mt-2">Verifica tu conexión o claves Groq.</p>
                        </div>

                    ) : !report ? (
                        <Skeleton />

                    ) : (
                        <div className="px-8 py-6 space-y-8">
                            {/* Score & Summary Grid */}
                            <div className="grid grid-cols-[auto_1fr] gap-8 items-center">
                                <ScoreRing score={report.score ?? 0} />

                                <div className="space-y-3">
                                    {report.alerta && (
                                        <div className="flex items-start gap-2 p-3 bg-status-danger/10 border border-status-danger/20 rounded-xl">
                                            <AlertTriangle size={18} className="text-status-danger flex-shrink-0 mt-0.5" />
                                            <p className="text-sm font-bold text-status-danger leading-tight">{report.alerta}</p>
                                        </div>
                                    )}
                                    <p className="text-base text-content-main font-medium leading-relaxed">
                                        {report.resumen}
                                    </p>
                                </div>
                            </div>

                            {/* Suggestions List */}
                            {report.sugerencias?.length > 0 && (
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-content-secondary uppercase tracking-[0.2em]">Sugerencias Priorizadas</p>
                                    <div className="space-y-4">
                                        {report.sugerencias.map((s, idx) => (
                                            <SuggestionCard key={idx} s={s} onAction={handleAction} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer (Sticky) */}
                <div className="p-6 border-t border-border-subtle dark:border-slate-800 bg-surface-light dark:bg-surface-dark rounded-b-[32px]">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-xl bg-app-light dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-content-main font-bold text-base transition-colors shadow-sm"
                    >
                        Cerrar Resumen
                    </button>
                </div>
            </div>
        </div>
    );
}
