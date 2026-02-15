import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play, Pause, Square, FastForward, Calendar, TrendingUp,
  DollarSign, ShoppingCart, Zap, AlertCircle, ChevronDown,
  BarChart3, Clock, Trash2, Brain, Coffee, CreditCard, Copy, Check
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from 'recharts';

import {
  iniciarSimulacion,
  detenerSimulacion,
  pausarSimulacion,
  reanudarSimulacion,
  getSimState,
  getLogs
} from '../simulation/SimEngine';
import { limpiarDatosSimulacion, obtenerResumenSimulacion } from '../simulation/SimAnalyzer';
import { simTimekeeper } from '../simulation/SimTimekeeper';

// ── Estado inicial ──
const DEFAULT_CONFIG = {
  dias: 30,
  velocidad: 3,
  fechaInicio: new Date().toISOString().split('T')[0]
};

const SimulationPage = () => {
  // Config
  const [config, setConfig] = useState(DEFAULT_CONFIG);

  // Engine state
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState({ diaActual: 0, diasTotal: 0, porcentaje: 0 });
  const [timeState, setTimeState] = useState(simTimekeeper.getState());

  // Data
  const [logs, setLogs] = useState([]);
  const [dayHistory, setDayHistory] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [perfilActual, setPerfilActual] = useState(null);

  // UI
  const [showConfig, setShowConfig] = useState(true);
  const logContainerRef = useRef(null);

  // Subscribe to timekeeper
  useEffect(() => {
    return simTimekeeper.subscribe(state => setTimeState(state));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Handlers ──
  const handleStart = useCallback(async () => {
    setIsRunning(true);
    setIsPaused(false);
    setShowConfig(false);
    setDayHistory([]);
    setResumen(null);
    setLogs([]);

    await iniciarSimulacion({
      fechaInicio: config.fechaInicio,
      dias: config.dias,
      velocidad: config.velocidad,
      onLog: (entry) => {
        setLogs(prev => {
          const next = [...prev, entry];
          return next.length > 300 ? next.slice(-300) : next;
        });
      },
      onDayComplete: (dayData) => {
        setDayHistory(prev => [...prev, dayData]);
        setPerfilActual(dayData.perfil);
      },
      onProgress: (prog) => setProgress(prog)
    });

    // Simulación terminada
    setIsRunning(false);
    setIsPaused(false);

    // Obtener resumen final
    const sum = await obtenerResumenSimulacion();
    setResumen(sum);
  }, [config]);

  const handleStop = useCallback(() => {
    detenerSimulacion();
    setIsRunning(false);
    setIsPaused(false);
  }, []);

  const handlePause = useCallback(() => {
    if (isPaused) {
      reanudarSimulacion();
      setIsPaused(false);
    } else {
      pausarSimulacion();
      setIsPaused(true);
    }
  }, [isPaused]);

  const handleClean = useCallback(async () => {
    if (!window.confirm('¿Eliminar TODOS los datos de simulación? Esto no afecta datos reales.')) return;
    const result = await limpiarDatosSimulacion();
    setLogs(prev => [...prev, {
      time: '--:--', msg: `🧹 Limpieza: ${result.ventasEliminadas} ventas, ${result.logsEliminados} logs, ${result.productosEliminados} productos eliminados`,
      type: 'success', ts: Date.now()
    }]);
    setDayHistory([]);
    setResumen(null);
  }, []);

  // ── Log color helper ──
  const getLogColor = (type) => {
    const colors = {
      header: 'text-blue-400 font-bold',
      success: 'text-emerald-400',
      warn: 'text-amber-400',
      error: 'text-red-400',
      separator: 'text-slate-600',
      info: 'text-slate-300'
    };
    return colors[type] || colors.info;
  };

  // ── KPI últimos 5 días + chart data ──
  const last5Days = dayHistory.slice(-5);
  const totalVentasAcum = dayHistory.reduce((s, d) => s + d.ventas, 0);
  const totalUtilidadAcum = dayHistory.reduce((s, d) => s + d.utilidad, 0);
  const totalCreditos = dayHistory.reduce((s, d) => s + (d.creditos || 0), 0);
  const lastTasa = dayHistory.length > 0 ? dayHistory[dayHistory.length - 1].tasaCambio : 90;

  // Chart data for Recharts
  const chartData = useMemo(() => dayHistory.map(d => ({
    name: `D${d.dia}`,
    ventas: +d.ventas.toFixed(0),
    gastos: +d.gastos.toFixed(0),
    utilidad: +d.utilidad.toFixed(0),
    creditos: +(d.creditos || 0).toFixed(0),
    tasa: d.tasaCambio || 90,
  })), [dayHistory]);

  const acumData = useMemo(() => {
    let acum = 0;
    return dayHistory.map(d => {
      acum += d.utilidad;
      return { name: `D${d.dia}`, acumulado: +acum.toFixed(0) };
    });
  }, [dayHistory]);
  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 md:p-6">
      {/* HEADER */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-blue-600 flex items-center justify-center">
            <Zap size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Simulación Maestra</h1>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Minimarket AI-Driven · Groq LPU Engine</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── LEFT COLUMN: Controls + KPIs ── */}
        <div className="space-y-4">
          {/* Config Panel */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="flex items-center justify-between w-full text-sm font-bold text-slate-300 mb-2"
            >
              <span className="flex items-center gap-2"><Calendar size={14} /> Configuración</span>
              <ChevronDown size={14} className={`transition-transform ${showConfig ? 'rotate-180' : ''}`} />
            </button>

            {showConfig && (
              <div className="space-y-3 mt-3">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase">Fecha inicio</label>
                  <input
                    type="date"
                    value={config.fechaInicio}
                    onChange={e => setConfig(p => ({ ...p, fechaInicio: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    disabled={isRunning}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Días</label>
                    <select
                      value={config.dias}
                      onChange={e => setConfig(p => ({ ...p, dias: parseInt(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      disabled={isRunning}
                    >
                      <option value={1}>1 día</option>
                      <option value={7}>1 semana</option>
                      <option value={30}>1 mes</option>
                      <option value={90}>3 meses</option>
                      <option value={180}>6 meses</option>
                      <option value={365}>1 año</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase">Velocidad</label>
                    <select
                      value={config.velocidad}
                      onChange={e => setConfig(p => ({ ...p, velocidad: parseInt(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      disabled={isRunning}
                    >
                      <option value={1}>Ultra rápido (1s/día)</option>
                      <option value={3}>Rápido (3s/día)</option>
                      <option value={5}>Normal (5s/día)</option>
                      <option value={10}>Lento (10s/día)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-2 mt-4">
              {!isRunning ? (
                <button
                  onClick={handleStart}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-violet-900/30"
                >
                  <Play size={16} /> Iniciar
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePause}
                    className={`flex-1 flex items-center justify-center gap-2 font-bold py-3 rounded-xl transition-all ${isPaused ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'} text-white`}
                  >
                    {isPaused ? <><Play size={14} /> Reanudar</> : <><Pause size={14} /> Pausar</>}
                  </button>
                  <button
                    onClick={handleStop}
                    className="px-4 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-xl transition-all"
                  >
                    <Square size={14} />
                  </button>
                </>
              )}
              <button
                onClick={handleClean}
                disabled={isRunning}
                className="px-4 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold py-3 rounded-xl transition-all disabled:opacity-30"
                title="Limpiar datos simulados"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {isRunning && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-400 flex items-center gap-1">
                  <Clock size={12} /> {timeState.fechaFormateada}
                </span>
                <span className="text-blue-400 font-mono font-bold">
                  Día {progress.diaActual}/{progress.diasTotal}
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-600 to-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${progress.porcentaje}%` }}
                />
              </div>
              <p className="text-right text-[10px] text-slate-500 mt-1">{progress.porcentaje}%</p>
            </div>
          )}

          {/* AI Insight */}
          {perfilActual && (
            <div className="bg-slate-900 border border-violet-800/40 rounded-2xl p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-400 mb-2">
                <Brain size={14} /> Director AI ({perfilActual.source || 'LOCAL'})
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {perfilActual.humor || `Día ${perfilActual.tipo} — ${perfilActual.totalVentas} ventas estimadas`}
              </p>
              {perfilActual.eventos?.length > 0 && (
                <div className="mt-2 space-y-1">
                  {perfilActual.eventos.map((e, i) => (
                    <div key={i} className="flex items-center gap-1 text-[10px] text-amber-400">
                      <AlertCircle size={10} /> {e}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-2">
            <KPICard icon={<ShoppingCart size={16} />} label="Ventas hoy" value={`$${(dayHistory[dayHistory.length - 1]?.ventas || 0).toFixed(0)}`} color="emerald" />
            <KPICard icon={<TrendingUp size={16} />} label="Utilidad hoy" value={`$${(dayHistory[dayHistory.length - 1]?.utilidad || 0).toFixed(0)}`} color="blue" />
            <KPICard icon={<DollarSign size={16} />} label="Acumulado" value={`$${totalVentasAcum.toFixed(0)}`} color="violet" />
            <KPICard icon={<BarChart3 size={16} />} label="Días sim." value={dayHistory.length} color="amber" />
            <KPICard icon={<CreditCard size={16} />} label="Créditos" value={`$${totalCreditos.toFixed(0)}`} color="rose" />
            <KPICard icon={<DollarSign size={16} />} label="Tasa Bs/$" value={`${lastTasa}`} color="cyan" />
          </div>

          {/* Summary */}
          {resumen && (
            <div className="bg-slate-900 border border-emerald-800/40 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-emerald-400 mb-3 flex items-center gap-2">
                <BarChart3 size={14} /> Resumen Final
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <StatRow label="Días" val={resumen.diasSimulados} />
                <StatRow label="Transacciones" val={resumen.transaccionesTotales} />
                <StatRow label="Ventas totales" val={`$${resumen.totalVentas.toFixed(0)}`} />
                <StatRow label="Utilidad neta" val={`$${resumen.utilidadNeta.toFixed(0)}`} />
                <StatRow label="Ticket prom." val={`$${resumen.ticketPromedio.toFixed(2)}`} />
                <StatRow label="Ventas/día" val={`$${resumen.promedioVentasDia.toFixed(0)}`} />
              </div>
            </div>
          )}
        </div>

        {/* ── CENTER COLUMN: Charts + Timeline ── */}
        <div className="space-y-4">
          {/* Charts */}
          {chartData.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 size={14} /> Ventas por Día
              </h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={40} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Bar dataKey="ventas" fill="#10b981" radius={[4, 4, 0, 0]} name="Ventas $" />
                  <Bar dataKey="creditos" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Créditos $" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {acumData.length > 1 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
                <TrendingUp size={14} /> Utilidad Acumulada
              </h3>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={acumData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} width={45} />
                  <Tooltip
                    contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <defs>
                    <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="acumulado" stroke="#8b5cf6" fill="url(#gradProfit)" name="Utilidad $" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Day Timeline */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 max-h-[40vh] overflow-hidden flex flex-col">
            <h3 className="text-sm font-bold text-slate-300 mb-3 flex items-center gap-2">
              <FastForward size={14} /> Timeline de Días
            </h3>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
              {dayHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-600">
                  <Coffee size={32} className="mb-2" />
                  <p className="text-xs">Inicia la simulación para ver los datos</p>
                </div>
              ) : (
                dayHistory.map((day, i) => (
                  <div
                    key={i}
                    className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 hover:border-slate-600 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-slate-500 font-mono">Día {day.dia}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${day.perfil?.tipo === 'PICO' ? 'bg-amber-900/50 text-amber-400' :
                        day.perfil?.tipo === 'LENTO' ? 'bg-blue-900/50 text-blue-400' :
                          day.perfil?.tipo === 'QUINCENA' ? 'bg-emerald-900/50 text-emerald-400' :
                            day.perfil?.tipo === 'FERIADO' ? 'bg-red-900/50 text-red-400' :
                              'bg-slate-700/50 text-slate-400'
                        }`}>{day.perfil?.tipo || 'NORMAL'}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{day.fecha}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-emerald-400 font-bold">${day.ventas.toFixed(0)}</span>
                      <span className="text-slate-500">{day.transacciones} txns</span>
                      <span className={`font-bold ${day.utilidad >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                        {day.utilidad >= 0 ? '+' : ''}${day.utilidad.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Console Log ── */}
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 h-full max-h-[75vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
                <Zap size={14} className="text-amber-400" /> Consola
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 font-mono">{logs.length} entries</span>
                {logs.length > 0 && (
                  <button
                    onClick={() => {
                      const text = logs.map(l => `[${l.time}] ${l.msg}`).join('\n');
                      navigator.clipboard.writeText(text).then(() => {
                        const btn = document.getElementById('copy-log-btn');
                        if (btn) { btn.dataset.copied = 'true'; setTimeout(() => { btn.dataset.copied = 'false'; }, 2000); }
                      });
                    }}
                    id="copy-log-btn"
                    className="p-1 rounded-md hover:bg-slate-700/60 text-slate-500 hover:text-slate-300 transition-colors group"
                    title="Copiar log"
                  >
                    <Copy size={12} className="group-hover:hidden" />
                    <Check size={12} className="hidden group-hover:block text-emerald-400" />
                  </button>
                )}
              </div>
            </div>
            <div
              ref={logContainerRef}
              className="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-0.5 pr-1 scrollbar-thin"
            >
              {logs.length === 0 ? (
                <p className="text-slate-700 text-center py-8">Esperando simulación...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`${getLogColor(log.type)} ${log.type === 'separator' ? 'opacity-30' : ''}`}>
                    <span className="text-slate-600 mr-1.5">[{log.time}]</span>
                    {log.msg}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ──
const KPICard = ({ icon, label, value, color }) => {
  const colors = {
    emerald: 'from-emerald-900/40 to-emerald-950/40 border-emerald-800/30 text-emerald-400',
    blue: 'from-blue-900/40 to-blue-950/40 border-blue-800/30 text-blue-400',
    violet: 'from-violet-900/40 to-violet-950/40 border-violet-800/30 text-violet-400',
    amber: 'from-amber-900/40 to-amber-950/40 border-amber-800/30 text-amber-400',
    rose: 'from-rose-900/40 to-rose-950/40 border-rose-800/30 text-rose-400',
    cyan: 'from-cyan-900/40 to-cyan-950/40 border-cyan-800/30 text-cyan-400'
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} border rounded-xl p-3`}>
      <div className="flex items-center gap-1.5 mb-1 opacity-60">{icon}<span className="text-[10px]">{label}</span></div>
      <p className="text-lg font-black">{value}</p>
    </div>
  );
};

const StatRow = ({ label, val }) => (
  <div className="flex justify-between py-1 border-b border-slate-800/50">
    <span className="text-slate-500">{label}</span>
    <span className="text-white font-bold">{val}</span>
  </div>
);

export default SimulationPage;