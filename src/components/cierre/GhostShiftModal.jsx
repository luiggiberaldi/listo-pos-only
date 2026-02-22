// 👻 GHOST SHIFT MODAL — V.4.0 PREMIUM NATIVO + 6 MEJORAS
// 1) Sugerencias ordenadas Alta→Media→Baja
// 2) Card Alta con borde izquierdo grueso rojo
// 3) Score Ring con contexto descriptivo
// 4) Animación stagger en cards
// 5) Timestamp del análisis en header
// 6) Dos botones: Descartar + Guardar Nota

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, AlertTriangle, ArrowRight, Package, CreditCard, TrendingUp, BarChart2, BookmarkPlus, Check } from 'lucide-react';

// ─── CONSTANTS ───

const PRIORITY_ORDER = { alta: 0, media: 1, baja: 2 };

const PRIORITY = {
    alta: { ring: 'border-status-danger/30', bg: 'bg-status-dangerBg dark:bg-status-danger/15', text: 'text-status-danger', badge: 'bg-status-danger text-white', label: 'ALTA', borderLeft: 'border-l-4 border-l-status-danger' },
    media: { ring: 'border-status-warning/30', bg: 'bg-status-warningBg/60 dark:bg-status-warning/10', text: 'text-status-warning', badge: 'bg-status-warning text-white', label: 'MEDIA', borderLeft: '' },
    baja: { ring: 'border-primary/20', bg: 'bg-primary-light/40 dark:bg-primary/10', text: 'text-primary', badge: 'bg-primary/10 text-primary', label: 'BAJA', borderLeft: '' },
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

// ─── HELPERS ───

/** #3 — Contexto descriptivo del score */
function getScoreContext(score, report) {
    if (score >= 90) return 'Turno sin anomalías significativas. Todo en orden.';
    if (score >= 75) return 'Buen turno con algunas áreas de mejora menores.';
    if (score >= 60) return 'Se detectaron puntos de atención que requieren revisión.';
    return 'Turno con alertas críticas. Requiere atención inmediata.';
}

/** #5 — Formatear timestamp relativo */
function formatTimestamp(ts) {
    if (!ts) return null;
    const now = Date.now();
    const diff = Math.floor((now - ts) / 1000);
    const date = new Date(ts);
    const time = date.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
    const day = date.toLocaleDateString('es', { day: 'numeric', month: 'short' });

    if (diff < 60) return `Justo ahora · ${day}`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min · ${day}`;
    return `${time} · ${day}`;
}

/** #6 — Guardar nota a localStorage */
function saveReportNote(report) {
    try {
        const key = 'ghost_shift_notes';
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        const note = {
            cajaId: report.cajaId,
            score: report.score,
            resumen: report.resumen,
            sugerencias: report.sugerencias?.length || 0,
            savedAt: Date.now(),
            generatedAt: report.generatedAt,
        };
        // Keep last 10 notes
        existing.unshift(note);
        if (existing.length > 10) existing.length = 10;
        localStorage.setItem(key, JSON.stringify(existing));
        return true;
    } catch { return false; }
}

// ─── SCORE RING (#3 — con contexto) ───
function ScoreRing({ score, report }) {
    const size = 96;
    const stroke = 8;
    const radius = (size - stroke) / 2;
    const circ = 2 * Math.PI * radius;
    const offset = circ - (Math.min(Math.max(score, 0), 100) / 100) * circ;

    const color = score >= 80 ? 'text-status-success' : score >= 60 ? 'text-status-warning' : 'text-status-danger';
    const label = score >= 80 ? 'Excelente' : score >= 60 ? 'Regular' : 'Crítico';
    const context = getScoreContext(score, report);

    return (
        <div className="flex items-center gap-6">
            {/* Ring */}
            <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                <div className="relative" style={{ width: size, height: size }}>
                    <svg width={size} height={size} className="transform -rotate-90">
                        <circle
                            cx={size / 2} cy={size / 2} r={radius}
                            fill="none"
                            className="stroke-border-subtle opacity-30 dark:opacity-10"
                            strokeWidth={stroke}
                        />
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-content-main leading-none font-numbers">{score}</span>
                        <span className="text-[10px] font-bold text-content-secondary leading-none mt-1">/ 100</span>
                    </div>
                </div>
                <span className={`text-sm font-bold ${color}`}>{label}</span>
            </div>

            {/* Context + Summary (#3) */}
            <div className="flex-1 space-y-2">
                <p className="text-sm text-content-secondary italic leading-snug">{context}</p>
                {report?.alerta && (
                    <div className="flex items-start gap-2 p-2.5 bg-status-dangerBg dark:bg-status-danger/10 border border-status-danger/20 rounded-xl">
                        <AlertTriangle size={14} className="text-status-danger flex-shrink-0 mt-0.5" />
                        <p className="text-xs font-bold text-status-danger leading-tight">{report.alerta}</p>
                    </div>
                )}
                <p className="text-sm text-content-main font-medium leading-relaxed">{report?.resumen}</p>
            </div>
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
                    <div className="h-4 bg-border-subtle/30 dark:bg-slate-800 rounded-full w-2/3" />
                    <div className="h-5 bg-border-subtle/50 dark:bg-slate-700 rounded-full w-3/4" />
                    <div className="h-4 bg-border-subtle/30 dark:bg-slate-800 rounded-full w-full" />
                </div>
            </div>
            <div className="h-px bg-border-subtle/30" />
            <div className="space-y-4 pt-2">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-border-subtle/20 dark:bg-slate-800/50 rounded-2xl" />
                ))}
            </div>
        </div>
    );
}

// ─── SUGGESTION CARD (#2 — borde grueso para Alta) ───
function SuggestionCard({ s, onAction, delay }) {
    const p = PRIORITY[s.prioridad] || PRIORITY.baja;
    const Icon = TIPO_ICONS[s.tipo] || Sparkles;
    const hasAction = s.accion && ACTION_ROUTES[s.accion];
    const isAlta = s.prioridad === 'alta';

    return (
        <div
            className={`
                group relative rounded-2xl border ${p.ring} ${p.bg} p-5
                hover:shadow-md transition-all duration-300
                ${isAlta ? p.borderLeft : ''}
                ${hasAction ? 'cursor-pointer hover:-translate-y-0.5' : ''}
                opacity-0 animate-fade-in
            `}
            style={{ animationDelay: `${delay}ms`, animationFillMode: 'forwards' }}
            onClick={hasAction ? () => onAction(s.accion) : undefined}
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`flex-shrink-0 mt-0.5 w-10 h-10 rounded-xl shadow-sm border border-border-subtle flex items-center justify-center text-lg ${isAlta ? 'bg-status-dangerBg dark:bg-status-danger/20' : 'bg-surface-light dark:bg-surface-dark'}`}>
                    {s.emoji || <Icon size={20} className={isAlta ? 'text-status-danger' : 'text-content-secondary'} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
                        <span className="text-base font-bold text-content-main leading-tight">{s.titulo}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${p.badge}`}>
                            {p.label}
                        </span>
                    </div>
                    <p className="text-sm text-content-secondary leading-relaxed">{s.detalle}</p>
                </div>

                {/* Arrow */}
                {hasAction && (
                    <div className="flex-shrink-0 mt-2 text-content-secondary/30 group-hover:text-primary transition-colors">
                        <ArrowRight size={18} />
                    </div>
                )}
            </div>

            {hasAction && (
                <div className="mt-3 ml-14">
                    <span className="text-sm font-bold text-primary group-hover:text-primary-hover transition-colors">
                        {ACTION_LABELS[s.accion]} &rarr;
                    </span>
                </div>
            )}
        </div>
    );
}

// ─── MAIN MODAL ───

export default function GhostShiftModal({ open, report, failed, onClose }) {
    const navigate = useNavigate();
    const [saved, setSaved] = useState(false);

    if (!open) return null;

    const handleAction = (accion) => {
        const route = ACTION_ROUTES[accion];
        if (route) { onClose(); navigate(route); }
    };

    // #6 — Guardar nota
    const handleSave = () => {
        if (report && saveReportNote(report)) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        }
    };

    // #1 — Ordenar sugerencias: Alta → Media → Baja
    const sortedSugerencias = report?.sugerencias
        ? [...report.sugerencias].sort((a, b) => (PRIORITY_ORDER[a.prioridad] ?? 9) - (PRIORITY_ORDER[b.prioridad] ?? 9))
        : [];

    // #5
    const timestamp = formatTimestamp(report?.generatedAt);

    return (
        <div
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center sm:p-4 bg-app-dark/60 backdrop-blur-sm transition-opacity"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-full sm:max-w-xl bg-surface-light dark:bg-surface-dark sm:rounded-[32px] rounded-t-[32px] shadow-2xl border border-border-subtle dark:border-slate-700/50 flex flex-col max-h-[90vh]">

                {/* ─── Header + Timestamp (#5) ─── */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-border-subtle dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-content-main leading-tight tracking-tight">
                                Análisis del Turno
                            </h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <p className="text-sm font-medium text-content-secondary">
                                    {report?.cajaId || '···'} · Ghost AI
                                </p>
                                {timestamp && (
                                    <>
                                        <span className="text-content-secondary/30">·</span>
                                        <p className="text-xs text-content-secondary/60">{timestamp}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-content-secondary hover:text-content-main hover:bg-app-light dark:hover:bg-slate-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* ─── Body ─── */}
                <div className="overflow-y-auto overflow-x-hidden custom-scrollbar flex-1">
                    {failed ? (
                        <div className="p-12 text-center">
                            <AlertTriangle size={48} className="mx-auto mb-4 text-status-warning opacity-50" />
                            <p className="text-lg font-bold text-content-main">Análisis no disponible</p>
                            <p className="text-sm text-content-secondary mt-2">Verifica tu conexión o claves Groq.</p>
                        </div>

                    ) : !report ? (
                        <Skeleton />

                    ) : (
                        <div className="px-8 py-6 space-y-7">
                            {/* Score + Contexto (#3) */}
                            <ScoreRing score={report.score ?? 0} report={report} />

                            {/* Divider */}
                            <div className="h-px bg-border-subtle dark:bg-slate-800" />

                            {/* Sugerencias Ordenadas (#1) con Stagger (#4) */}
                            {sortedSugerencias.length > 0 && (
                                <div className="space-y-4">
                                    <p className="text-xs font-black text-content-secondary uppercase tracking-[0.2em]">
                                        Sugerencias Priorizadas
                                    </p>
                                    <div className="space-y-4">
                                        {sortedSugerencias.map((s, idx) => (
                                            <SuggestionCard
                                                key={idx}
                                                s={s}
                                                onAction={handleAction}
                                                delay={idx * 120}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ─── Footer: 2 botones (#6) ─── */}
                <div className="px-6 py-5 border-t border-border-subtle dark:border-slate-800 bg-surface-light dark:bg-surface-dark rounded-b-[32px]">
                    <div className="flex gap-3">
                        {/* Descartar */}
                        <button
                            onClick={onClose}
                            className="flex-1 py-3.5 rounded-xl bg-app-light dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-content-secondary font-bold text-sm transition-colors"
                        >
                            Descartar
                        </button>

                        {/* Guardar Nota */}
                        {report && !failed && (
                            <button
                                onClick={handleSave}
                                disabled={saved}
                                className={`flex-1 py-3.5 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${saved
                                        ? 'bg-status-success text-white'
                                        : 'bg-primary hover:bg-primary-hover text-white shadow-sm'
                                    }`}
                            >
                                {saved ? (
                                    <>
                                        <Check size={16} />
                                        Guardado
                                    </>
                                ) : (
                                    <>
                                        <BookmarkPlus size={16} />
                                        Guardar Nota
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
