// ============================================================
// 🧪 SYSTEM TESTER VIEW — Premium E2E Testing Dashboard
// ============================================================

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { SystemTester } from './SystemTester';
import {
    FlaskConical, Play, Square, Copy, CheckCircle2, XCircle, AlertTriangle,
    Zap, Clock, ChevronDown, ChevronUp, TerminalSquare, Brain, Trash2
} from 'lucide-react';

const SUITE_ICONS = {
    caja: '🏪', venta: '🛒', gasto: '💸', consumo: '☕',
    nomina: '👔', vaca: '🐄', anulacion: '❌', cierre: '🔒',
    credito: '💳', pagosMixtos: '💲', rbac: '🔐', tickets: '🎟️'
};

export default function SystemTesterView() {
    const [isRunning, setIsRunning] = useState(false);
    const [isStressRunning, setIsStressRunning] = useState(false);
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState(null);
    const [summary, setSummary] = useState(null);
    const [stressMetrics, setStressMetrics] = useState(null);
    const [copied, setCopied] = useState(false);
    const [expandedAI, setExpandedAI] = useState(true);
    const [activeMode, setActiveMode] = useState('e2e'); // 'e2e' | 'stress'
    const logsEndRef = useRef(null);
    const logsContainerRef = useRef(null);

    // Auto-scroll logs
    useEffect(() => {
        if (logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    const handleRunAll = useCallback(async () => {
        setIsRunning(true);
        setLogs([]);
        setSummary(null);
        setCopied(false);

        try {
            const result = await SystemTester.runAll({
                onLog: (entry) => setLogs(prev => [...prev, entry]),
                onProgress: (p) => setProgress(p),
                onComplete: (s) => {
                    setSummary(s);
                    setProgress(null);
                }
            });
        } catch (err) {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `💥 Error fatal: ${err.message}`, type: 'fail' }]);
        }
        setIsRunning(false);
    }, []);

    const handleRunSuite = useCallback(async (suiteKey) => {
        setIsRunning(true);
        setLogs([]);
        setSummary(null);
        setCopied(false);

        try {
            const result = await SystemTester.runSuite(suiteKey, {
                onLog: (entry) => setLogs(prev => [...prev, entry]),
            });
            setSummary(result);
        } catch (err) {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `💥 ${err.message}`, type: 'fail' }]);
        }
        setIsRunning(false);
    }, []);

    const handleStop = useCallback(() => {
        SystemTester.stop();
        setIsRunning(false);
    }, []);

    const handleCopy = useCallback(async () => {
        const text = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const ta = document.createElement('textarea');
            ta.value = text;
            ta.style.position = 'fixed';
            ta.style.opacity = '0';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [logs]);

    const handleRunStress = useCallback(async () => {
        setIsStressRunning(true);
        setIsRunning(true);
        setLogs([]);
        setSummary(null);
        setStressMetrics(null);
        setCopied(false);
        try {
            const result = await SystemTester.runStress({
                onLog: (entry) => setLogs(prev => [...prev, entry]),
                onProgress: (p) => setProgress(p),
                onComplete: (s) => {
                    setSummary(s);
                    setStressMetrics(s.metrics || null);
                    setProgress(null);
                }
            });
        } catch (err) {
            setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `💥 Error stress: ${err.message}`, type: 'fail' }]);
        }
        setIsRunning(false);
        setIsStressRunning(false);
    }, []);

    const handleClear = useCallback(() => {
        setLogs([]);
        setSummary(null);
        setProgress(null);
        setCopied(false);
        setStressMetrics(null);
    }, []);

    const suites = SystemTester.getSuites();
    const stressSuites = SystemTester.getStressSuites();

    const logColors = {
        pass: 'text-emerald-400',
        fail: 'text-rose-400',
        warn: 'text-amber-400',
        info: 'text-slate-400',
        section: 'text-indigo-400 font-bold',
        ai: 'text-cyan-400',
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6 space-y-4">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30">
                        <FlaskConical size={20} />
                    </div>
                    <div>
                        <h1 className="text-lg font-black tracking-tight">System Tester</h1>
                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">E2E Real Service Testing</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mode switcher */}
                    <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
                        <button onClick={() => setActiveMode('e2e')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeMode === 'e2e' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}>E2E</button>
                        <button onClick={() => setActiveMode('stress')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${activeMode === 'stress' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-slate-200'
                                }`}>🔥 Stress</button>
                    </div>
                    {isRunning ? (
                        <button onClick={handleStop}
                            className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-600/30">
                            <Square size={14} /> Detener
                        </button>
                    ) : activeMode === 'e2e' ? (
                        <button onClick={handleRunAll}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/30 animate-pulse hover:animate-none">
                            <Play size={14} /> Run All
                        </button>
                    ) : (
                        <button onClick={handleRunStress}
                            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold transition-all shadow-lg shadow-orange-600/30 animate-pulse hover:animate-none">
                            <Zap size={14} /> Run Stress
                        </button>
                    )}
                </div>
            </div>

            {/* ── Suite Buttons ── */}
            {activeMode === 'e2e' ? (
                <div className="flex flex-wrap gap-2">
                    {suites.map(s => (
                        <button
                            key={s.key}
                            onClick={() => handleRunSuite(s.key)}
                            disabled={isRunning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all border border-slate-700 hover:border-slate-500"
                        >
                            <span>{SUITE_ICONS[s.key]}</span>
                            <span>{s.name.replace(/^[^\s]+\s/, '')}</span>
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex flex-wrap gap-2">
                    {stressSuites.map(s => (
                        <button
                            key={s.key}
                            onClick={handleRunStress}
                            disabled={isRunning}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/50 hover:bg-rose-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-xs font-bold transition-all border border-rose-800/40 hover:border-rose-600/60 text-rose-300"
                        >
                            <span>{s.name.split(' ')[0]}</span>
                            <span>{s.name.split(' ').slice(1).join(' ')}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* ── Progress Bar ── */}
            {progress && (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-slate-400">
                            <Zap size={12} className="inline mr-1 text-amber-400" />
                            {progress.name}
                        </span>
                        <span className="text-xs font-mono text-slate-500">
                            {progress.current}/{progress.total}
                        </span>
                    </div>
                    <div className="h-1.5 bg-slate-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${(progress.current / progress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* ── Stats Bar ── */}
            {summary && (
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-slate-800/80 rounded-xl p-3 text-center border border-slate-700">
                        <p className="text-2xl font-black text-white">{summary.total || (summary.passed + summary.failed)}</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Total</p>
                    </div>
                    <div className="bg-emerald-950/50 rounded-xl p-3 text-center border border-emerald-800/30">
                        <p className="text-2xl font-black text-emerald-400">{summary.passed}</p>
                        <p className="text-[9px] text-emerald-500 uppercase font-bold">Pass</p>
                    </div>
                    <div className="bg-rose-950/50 rounded-xl p-3 text-center border border-rose-800/30">
                        <p className="text-2xl font-black text-rose-400">{summary.failed}</p>
                        <p className="text-[9px] text-rose-500 uppercase font-bold">Fail</p>
                    </div>
                    <div className="bg-slate-800/80 rounded-xl p-3 text-center border border-slate-700">
                        <p className="text-2xl font-black text-slate-300">{summary.elapsed || '—'}s</p>
                        <p className="text-[9px] text-slate-500 uppercase font-bold">Tiempo</p>
                    </div>
                </div>
            )}

            {/* ── AI Analysis Panel ── */}
            {summary?.aiAnalysis && (
                <div className="bg-gradient-to-br from-cyan-950/40 to-indigo-950/40 rounded-xl border border-cyan-700/30 overflow-hidden">
                    <button
                        onClick={() => setExpandedAI(!expandedAI)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-all"
                    >
                        <div className="flex items-center gap-2">
                            <Brain size={16} className="text-cyan-400" />
                            <span className="text-sm font-bold text-cyan-300">Análisis AI (Groq)</span>
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

            {/* ── Stress Metrics Panel ── */}
            {stressMetrics && (
                <div className="bg-gradient-to-br from-orange-950/30 to-rose-950/30 rounded-xl border border-orange-700/30 overflow-hidden">
                    <div className="px-4 py-3 flex items-center gap-2 border-b border-orange-700/20">
                        <Zap size={14} className="text-orange-400" />
                        <span className="text-sm font-bold text-orange-300">Métricas de Performance</span>
                    </div>
                    <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
                        {stressMetrics.race && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">⚡ Race Condition</p>
                                <p className="text-xs text-slate-300">✅ {stressMetrics.race.successes} completadas</p>
                                <p className="text-xs text-rose-400">❌ {stressMetrics.race.failures} rechazadas</p>
                                <p className="text-[10px] text-slate-600">{stressMetrics.race.elapsed}ms</p>
                            </div>
                        )}
                        {stressMetrics.throughput && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">📈 Throughput</p>
                                <p className={`text-sm font-black ${stressMetrics.throughput.opsPerSec >= 30 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {stressMetrics.throughput.opsPerSec} ops/seg
                                </p>
                                <p className="text-[10px] text-slate-600">{stressMetrics.throughput.n} ventas en {stressMetrics.throughput.elapsed}s</p>
                            </div>
                        )}
                        {stressMetrics.drift && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">💰 Balance Drift</p>
                                <p className={`text-sm font-black ${parseFloat(stressMetrics.drift.drift) <= 0.01 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    ${stressMetrics.drift.drift}
                                </p>
                                <p className="text-[10px] text-slate-600">deriva total (200 ops)</p>
                            </div>
                        )}
                        {stressMetrics.exhaustion && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">🏔️ Exhaustion</p>
                                <p className={`text-xs font-bold ${stressMetrics.exhaustion.rejected ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {stressMetrics.exhaustion.rejected ? '✅ Rechazo OK' : '❌ No rechazó'}
                                </p>
                                <p className="text-[10px] text-slate-600">Stock final: {stressMetrics.exhaustion.stockFinal}</p>
                            </div>
                        )}
                        {stressMetrics.index && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">🔍 Index Query</p>
                                <p className={`text-sm font-black ${parseFloat(stressMetrics.index.queryTime) < 200 ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {stressMetrics.index.queryTime}ms
                                </p>
                                <p className="text-[10px] text-slate-600">{stressMetrics.index.n} entries</p>
                            </div>
                        )}
                        {stressMetrics.memory && !stressMetrics.memory.skipped && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">🧠 Heap Growth</p>
                                <p className={`text-sm font-black ${parseFloat(stressMetrics.memory.growthMB) < 30 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    +{stressMetrics.memory.growthMB} MB
                                </p>
                                <p className="text-[10px] text-slate-600">{stressMetrics.memory.perSaleMB} MB/venta</p>
                            </div>
                        )}
                        {stressMetrics.memory?.skipped && (
                            <div className="bg-slate-900/60 rounded-lg p-2.5">
                                <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">🧠 Memory</p>
                                <p className="text-xs text-slate-500">N/A (no Chromium)</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── Log Console ── */}
            <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">

                {/* Console Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                        <TerminalSquare size={14} className="text-slate-500" />
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Log Console</span>
                        {logs.length > 0 && (
                            <span className="text-[9px] bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                                {logs.length} entries
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleClear}
                            disabled={isRunning || logs.length === 0}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-30"
                            title="Limpiar"
                        >
                            <Trash2 size={13} />
                        </button>
                        <button
                            onClick={handleCopy}
                            disabled={logs.length === 0}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${copied
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600 disabled:opacity-30'
                                }`}
                        >
                            {copied ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                            {copied ? 'Copiado!' : 'Copiar'}
                        </button>
                    </div>
                </div>

                {/* Log Feed */}
                <div
                    ref={logsContainerRef}
                    className="max-h-[50vh] overflow-y-auto p-3 font-mono text-xs space-y-0.5 custom-scrollbar select-text"
                >
                    {logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3 select-none">
                            <FlaskConical size={32} className="text-slate-700" />
                            <p className="text-slate-600 text-sm font-bold">Presiona "Run All" para iniciar los tests</p>
                            <p className="text-slate-700 text-[10px]">8 suites • Servicios reales • Análisis AI</p>
                        </div>
                    ) : (
                        logs.map((entry, i) => (
                            <div key={i} className={`flex gap-2 ${logColors[entry.type] || 'text-slate-400'}`}>
                                <span className="text-slate-600 shrink-0">[{entry.time}]</span>
                                <span className="break-all">{entry.msg}</span>
                            </div>
                        ))
                    )}
                    <div ref={logsEndRef} />
                </div>
            </div>

            {/* ── Results Detail (if available) ── */}
            {summary?.results && summary.results.length > 0 && (
                <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                    <div className="px-4 py-2 bg-slate-800/50 border-b border-slate-700">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Detalle de Tests</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-2 space-y-1">
                        {summary.results.map((r, i) => (
                            <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs ${r.passed ? 'bg-emerald-950/30' : 'bg-rose-950/30'}`}>
                                {r.passed
                                    ? <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                    : <XCircle size={12} className="text-rose-500 shrink-0" />
                                }
                                <span className={`font-bold ${r.passed ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    [{r.suite}]
                                </span>
                                <span className="text-slate-300 truncate">{r.test}</span>
                                {!r.passed && r.detail && (
                                    <span className="text-rose-500/70 text-[10px] ml-auto shrink-0">
                                        {r.detail.substring(0, 60)}
                                    </span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Footer ── */}
            <p className="text-center text-[9px] text-slate-700 font-mono uppercase">
                Listo POS • System Tester v1.0 • {new Date().getFullYear()}
            </p>
        </div>
    );
}
