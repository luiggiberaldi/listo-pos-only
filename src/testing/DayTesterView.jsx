// ============================================================
// 📅 DAY TESTER VIEW — Full Work Day Scenario Dashboard
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { DayTester } from './DayTester';
import {
    CalendarDays, Play, Square, Copy, CheckCircle2, XCircle,
    Sun, Flame, Zap, Brain, ChevronDown, ChevronUp, BarChart3,
    Calendar, Sunrise, Lock
} from 'lucide-react';

const SCENARIO_META = {
    tranquilo: {
        icon: Sun, color: 'emerald', label: '☀️ Día Tranquilo',
        desc: '20 ventas mixtas, 2 gastos, cierre limpio',
        detail: 'El escenario base. Verifica coherencia financiera en condiciones normales.'
    },
    intenso: {
        icon: Flame, color: 'orange', label: '🔥 Día Intenso',
        desc: '40 ventas, créditos, abonos, nómina',
        detail: 'Alto tráfico con créditos y cobranza. Verifica cadena crédito → abono → saldo.'
    },
    incidentes: {
        icon: Zap, color: 'rose', label: '⚡ Día con Incidentes',
        desc: 'Anulaciones, stock agotado, crédito full',
        detail: 'El día que pone a prueba la resiliencia. Verifica rechazos y reversiones.'
    },
    apertura: {
        icon: Sunrise, color: 'indigo', label: '🌅 Día de Apertura',
        desc: 'Caja desde cero, 15 ventas, corte Z oficial',
        detail: 'Test de ciclo completo: abre caja fresh, opera, cierra con corte Z y restaura tu sesión.'
    },
};

const COLOR_MAP = {
    emerald: {
        bg: 'bg-emerald-950/40', border: 'border-emerald-700/40',
        btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30',
        icon: 'text-emerald-400', badge: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/40'
    },
    orange: {
        bg: 'bg-orange-950/40', border: 'border-orange-700/40',
        btn: 'bg-orange-600 hover:bg-orange-500 shadow-orange-600/30',
        icon: 'text-orange-400', badge: 'bg-orange-900/60 text-orange-300 border-orange-700/40'
    },
    rose: {
        bg: 'bg-rose-950/40', border: 'border-rose-700/40',
        btn: 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30',
        icon: 'text-rose-400', badge: 'bg-rose-900/60 text-rose-300 border-rose-700/40'
    },
    indigo: {
        bg: 'bg-indigo-950/40', border: 'border-indigo-700/40',
        btn: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30',
        icon: 'text-indigo-400', badge: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/40'
    },
};

const LOG_COLORS = {
    pass: 'text-emerald-400', fail: 'text-rose-400',
    warn: 'text-amber-400', info: 'text-slate-400',
    section: 'text-indigo-400 font-bold', ai: 'text-cyan-400',
    day: 'text-yellow-300 font-bold', money: 'text-lime-400',
};

const WEEK_DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const DAY_SCENARIOS = ['tranquilo', 'intenso', 'incidentes', 'apertura', 'intenso'];

export default function DayTesterView() {
    const [isRunning, setIsRunning] = useState(false);
    const [activeScenario, setActiveScenario] = useState(null);
    const [logs, setLogs] = useState([]);
    const [summary, setSummary] = useState(null);
    const [copied, setCopied] = useState(false);
    const [expandedAI, setExpandedAI] = useState(true);
    const [expandedWeekAI, setExpandedWeekAI] = useState(true);
    const [expandedMetrics, setExpandedMetrics] = useState(true);
    const [allResults, setAllResults] = useState(null);
    const [weekReport, setWeekReport] = useState(null);
    const [weekProgress, setWeekProgress] = useState(null); // { day, total, dia, key }
    const logsRef = useRef(null);
    const logsEndRef = useRef(null);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const appendLog = useCallback((entry) => setLogs(prev => [...prev, entry]), []);

    // ── Handlers ──
    const handleRunScenario = useCallback(async (key) => {
        setIsRunning(true); setActiveScenario(key);
        setLogs([]); setSummary(null); setCopied(false);
        setAllResults(null); setWeekReport(null); setWeekProgress(null);
        try {
            await DayTester.runScenario(key, { onLog: appendLog, onComplete: (s) => setSummary(s) });
        } catch (err) {
            appendLog({ time: new Date().toLocaleTimeString(), msg: `💥 ${err.message}`, type: 'fail' });
        }
        setIsRunning(false);
    }, [appendLog]);

    const handleRunAll = useCallback(async () => {
        setIsRunning(true); setActiveScenario('all');
        setLogs([]); setSummary(null); setCopied(false);
        setAllResults(null); setWeekReport(null); setWeekProgress(null);
        try {
            const results = await DayTester.runAll({ onLog: appendLog });
            setAllResults(results);
            if (results.length > 0) setSummary(results[results.length - 1]);
        } catch (err) {
            appendLog({ time: new Date().toLocaleTimeString(), msg: `💥 ${err.message}`, type: 'fail' });
        }
        setIsRunning(false);
    }, [appendLog]);

    const handleRunWeek = useCallback(async () => {
        setIsRunning(true); setActiveScenario('week');
        setLogs([]); setSummary(null); setCopied(false);
        setAllResults(null); setWeekReport(null); setWeekProgress(null);
        try {
            const report = await DayTester.runWeek({
                onLog: appendLog,
                onWeekProgress: (p) => setWeekProgress(p),
                onDayComplete: () => { },
                onWeekComplete: (r) => setWeekReport(r),
            });
            setWeekReport(report);
        } catch (err) {
            appendLog({ time: new Date().toLocaleTimeString(), msg: `💥 ${err.message}`, type: 'fail' });
        }
        setIsRunning(false);
        setWeekProgress(null);
    }, [appendLog]);

    const handleStop = useCallback(() => {
        DayTester.stop(); setIsRunning(false); setWeekProgress(null);
    }, []);

    const handleCopy = useCallback(() => {
        const text = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }, [logs]);

    const totalPass = weekReport ? weekReport.totals.pass
        : allResults ? allResults.reduce((a, r) => a + r.passed, 0)
            : summary?.passed || 0;
    const totalFail = weekReport ? weekReport.totals.fail
        : allResults ? allResults.reduce((a, r) => a + r.failed, 0)
            : summary?.failed || 0;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 space-y-4">

            {/* ── Header ── */}
            <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-600/30">
                        <CalendarDays size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight">Day Tester <span className="text-yellow-500">3.0</span></h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Simulación Completa • Balance Isolation • Corte Z</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {isRunning ? (
                        <button onClick={handleStop} className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/30">
                            <Square size={14} /> Detener
                        </button>
                    ) : (
                        <>
                            <button onClick={handleRunAll} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-yellow-600/30">
                                <Play size={14} /> 4 Días
                            </button>
                            <button onClick={handleRunWeek} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-600/40">
                                <Calendar size={14} /> Semana (5 días)
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ── Week Progress ── */}
            {weekProgress && (
                <div className="bg-indigo-950/60 border border-indigo-700/40 rounded-xl p-4 flex items-center gap-4">
                    <Calendar size={20} className="text-indigo-400 shrink-0" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-indigo-200">{weekProgress.dia} — {weekProgress.key}</p>
                        <div className="flex gap-1 mt-2">
                            {WEEK_DAYS.map((d, i) => (
                                <div key={d} className={`h-2 flex-1 rounded-full transition-all ${i < weekProgress.day - 1 ? 'bg-emerald-500' : i === weekProgress.day - 1 ? 'bg-indigo-400 animate-pulse' : 'bg-slate-700'}`} />
                            ))}
                        </div>
                        <p className="text-[10px] text-indigo-400 mt-1">Día {weekProgress.day}/5</p>
                    </div>
                </div>
            )}

            {/* ── Week Cumulative Metrics ── */}
            {weekReport && weekReport.totals.ventas > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-white">{weekReport.totals.ventas}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Ventas semana</p>
                    </div>
                    <div className="bg-emerald-950/50 border border-emerald-800/30 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-emerald-400">${weekReport.totals.ingresoUSD.toFixed(0)}</p>
                        <p className="text-[9px] text-emerald-600 uppercase font-bold">Ingreso USD</p>
                    </div>
                    <div className="bg-rose-950/50 border border-rose-800/30 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-rose-400">${weekReport.totals.gastos.toFixed(0)}</p>
                        <p className="text-[9px] text-rose-600 uppercase font-bold">Gastos</p>
                    </div>
                    <div className="bg-lime-950/50 border border-lime-800/30 rounded-xl p-3 text-center">
                        <p className="text-xl font-black text-lime-400">${weekReport.totals.netaUSD.toFixed(0)}</p>
                        <p className="text-[9px] text-lime-600 uppercase font-bold">Neta USD</p>
                    </div>
                </div>
            )}

            {/* ── Scenario Cards ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                {Object.entries(SCENARIO_META).map(([key, meta]) => {
                    const c = COLOR_MAP[meta.color];
                    const Icon = meta.icon;
                    const result = allResults?.find(r => r.scenario === key)
                        || weekReport?.days?.filter(d => d.key === key).at(-1);
                    return (
                        <div key={key} className={`rounded-xl border p-4 space-y-3 ${c.bg} ${c.border} transition-all ${activeScenario === key && isRunning ? 'ring-2 ring-white/20' : ''}`}>
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-2">
                                    <Icon size={18} className={c.icon} />
                                    <span className="font-bold text-sm text-white">{meta.label}</span>
                                </div>
                                {result && (
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${result.failed === 0 ? 'bg-emerald-900/60 text-emerald-300 border-emerald-700/40' : 'bg-rose-900/60 text-rose-300 border-rose-700/40'}`}>
                                        {result.failed === 0 ? `✅ ${result.passed}` : `❌ ${result.failed} fail`}
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-slate-400">{meta.desc}</p>
                            <p className="text-[10px] text-slate-500 leading-relaxed">{meta.detail}</p>
                            <button
                                onClick={() => handleRunScenario(key)}
                                disabled={isRunning}
                                className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${c.btn}`}
                            >
                                <Play size={12} /> {activeScenario === key && isRunning ? 'Ejecutando...' : 'Ejecutar'}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* ── Week Report Panel ── */}
            {weekReport && (
                <div className="bg-indigo-950/40 border border-indigo-700/30 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-800/30">
                        <div className="flex items-center gap-2">
                            <Calendar size={16} className="text-indigo-400" />
                            <span className="text-sm font-bold text-indigo-200">Reporte Semanal (Lunes — Viernes)</span>
                        </div>
                        <span className={`text-[11px] font-black px-3 py-1 rounded-full ${weekReport.totals.fail === 0 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-400'}`}>
                            {weekReport.totals.fail === 0 ? '🟢 SEMANA OK' : `🔴 ${weekReport.totals.fail} fallos`}
                        </span>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-5 gap-2 mb-3">
                        {weekReport.days.map((d, i) => (
                            <div key={i} className={`rounded-lg p-2 border text-center ${d.failed === 0 ? 'bg-emerald-950/40 border-emerald-800/30' : 'bg-rose-950/40 border-rose-800/30'}`}>
                                <p className="text-[9px] font-bold uppercase text-slate-400">{d.dia}</p>
                                <p className="text-sm font-black mt-1">{d.failed === 0 ? '✅' : '❌'}</p>
                                <p className="text-[9px] text-slate-500">{d.passed}P/{d.failed}F</p>
                            </div>
                        ))}
                    </div>
                    <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                            <p className="text-lg font-black text-white">{weekReport.totals.total}</p>
                            <p className="text-[9px] text-slate-500">Checks</p>
                        </div>
                        <div className="bg-emerald-950/50 rounded-lg p-2 text-center">
                            <p className="text-lg font-black text-emerald-400">{weekReport.totals.pass}</p>
                            <p className="text-[9px] text-emerald-600">Pass</p>
                        </div>
                        <div className="bg-rose-950/50 rounded-lg p-2 text-center">
                            <p className="text-lg font-black text-rose-400">{weekReport.totals.fail}</p>
                            <p className="text-[9px] text-rose-600">Fail</p>
                        </div>
                        <div className="bg-slate-800/60 rounded-lg p-2 text-center">
                            <p className="text-lg font-black text-slate-300">{weekReport.totals.elapsed}s</p>
                            <p className="text-[9px] text-slate-500">Total</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Week AI Analysis Panel ── */}
            {weekReport && (
                <div className="bg-gradient-to-br from-violet-950/50 to-indigo-950/50 rounded-xl border border-violet-700/30 overflow-hidden">
                    <button onClick={() => setExpandedWeekAI(!expandedWeekAI)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-2">
                            <Brain size={16} className="text-violet-400" />
                            <span className="text-sm font-bold text-violet-200">Informe Semanal de IA — 5 Días (Groq)</span>
                        </div>
                        {expandedWeekAI ? <ChevronUp size={14} className="text-violet-400" /> : <ChevronDown size={14} className="text-violet-400" />}
                    </button>
                    {expandedWeekAI && (
                        <div className="px-4 pb-4 text-sm text-violet-100/80 whitespace-pre-wrap leading-relaxed">
                            {weekReport.aiAnalysis
                                ? weekReport.aiAnalysis
                                : <span className="text-violet-500 italic text-xs">Análisis semanal no disponible (Groq omitido o en progreso)</span>
                            }
                        </div>
                    )}
                </div>
            )}

            {/* ── Stats bar ── */}
            {(summary || allResults) && !weekReport && (
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-800/80 rounded-xl p-3 text-center border border-slate-700">
                        <p className="text-2xl font-black text-white">{totalPass + totalFail}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Checks</p>
                    </div>
                    <div className="bg-emerald-950/50 rounded-xl p-3 text-center border border-emerald-800/30">
                        <p className="text-2xl font-black text-emerald-400">{totalPass}</p>
                        <p className="text-[9px] text-emerald-500 uppercase font-bold">Pass</p>
                    </div>
                    <div className="bg-rose-950/50 rounded-xl p-3 text-center border border-rose-800/30">
                        <p className="text-2xl font-black text-rose-400">{totalFail}</p>
                        <p className="text-[9px] text-rose-500 uppercase font-bold">Fail</p>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-3 text-center border border-slate-700">
                        <p className="text-2xl font-black text-slate-300">{summary?.elapsed || '-'}s</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Tiempo</p>
                    </div>
                </div>
            )}

            {/* ── Day Metrics Panel ── */}
            {summary?.dayMetrics && Object.keys(summary.dayMetrics).length > 0 && !weekReport && (
                <div className="bg-gradient-to-br from-slate-800/60 to-slate-900/60 rounded-xl border border-slate-700 overflow-hidden">
                    <button onClick={() => setExpandedMetrics(!expandedMetrics)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-2">
                            <BarChart3 size={16} className="text-lime-400" />
                            <span className="text-sm font-bold text-lime-300">Métricas del Día</span>
                        </div>
                        {expandedMetrics ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                    </button>
                    {expandedMetrics && (
                        <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-2">
                            {Object.entries(summary.dayMetrics).map(([k, v]) => (
                                <div key={k} className="bg-slate-900/60 rounded-lg p-2 border border-slate-700/50">
                                    <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">{k.replace(/([A-Z])/g, ' $1').trim()}</p>
                                    <p className="text-sm font-bold text-white">
                                        {typeof v === 'number' ? (v % 1 === 0 ? v : `$${v.toFixed(2)}`) : String(v)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ── AI Analysis Panel ── */}
            {summary?.aiAnalysis && (
                <div className="bg-gradient-to-br from-cyan-950/40 to-indigo-950/40 rounded-xl border border-cyan-700/30 overflow-hidden">
                    <button onClick={() => setExpandedAI(!expandedAI)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all">
                        <div className="flex items-center gap-2">
                            <Brain size={16} className="text-cyan-400" />
                            <span className="text-sm font-bold text-cyan-300">Análisis AI del Día (Groq)</span>
                        </div>
                        {expandedAI ? <ChevronUp size={14} className="text-cyan-400" /> : <ChevronDown size={14} className="text-cyan-400" />}
                    </button>
                    {expandedAI && (
                        <div className="px-4 pb-4 text-sm text-cyan-100/80 whitespace-pre-wrap leading-relaxed">
                            {summary.aiAnalysis}
                        </div>
                    )}
                </div>
            )}

            {/* ── Log Panel ── */}
            {logs.length > 0 && (
                <div className="bg-slate-900/80 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700 bg-slate-800/50">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">📋 Log del Día</span>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-500">{logs.length} entradas</span>
                            <button
                                onClick={handleCopy}
                                title="Copiar log completo"
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold transition-all border border-slate-600"
                            >
                                {copied
                                    ? <><CheckCircle2 size={12} className="text-emerald-400" /><span className="text-emerald-400">Copiado</span></>
                                    : <><Copy size={12} /><span>Copiar</span></>
                                }
                            </button>
                        </div>
                    </div>
                    {/* Selectable text area */}
                    <div
                        ref={logsRef}
                        className="h-80 overflow-y-auto p-3 font-mono text-[11px] space-y-0.5 select-text cursor-text"
                    >
                        {logs.map((l, i) => (
                            <div key={i} className={`leading-5 ${LOG_COLORS[l.type] || 'text-slate-400'}`}>
                                <span className="text-slate-600 mr-2 select-all">[{l.time}]</span>
                                {l.msg}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>
                </div>
            )}

            {/* ── Empty State ── */}
            {logs.length === 0 && !isRunning && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-16 h-16 bg-yellow-950/50 rounded-2xl flex items-center justify-center mb-4 border border-yellow-800/30">
                        <CalendarDays size={28} className="text-yellow-600" />
                    </div>
                    <p className="text-slate-400 font-bold">Sin escenarios ejecutados</p>
                    <p className="text-slate-600 text-sm mt-1">Ejecuta un día, los 3 días, o toda la semana laboral</p>
                </div>
            )}
        </div>
    );
}
