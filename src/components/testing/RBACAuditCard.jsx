import React from 'react';
import { ShieldCheck, PlayCircle, Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function RBACAuditCard({ validator }) {
    const { logs, runFullAudit, isRunning } = validator;

    return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center min-h-[400px] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="w-full text-center">
                {!isRunning ? (
                    <div className="w-full">
                        <button
                            onClick={runFullAudit}
                            className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white p-6 rounded-3xl font-black shadow-2xl transition-all flex flex-col items-center justify-center gap-2 hover:scale-[1.02] group relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors"></div>
                            <ShieldCheck size={32} className="text-white group-hover:animate-pulse" />
                            <span className="text-lg tracking-tighter">AUDITORÍA RBAC V2</span>
                            <div className="text-[9px] font-bold bg-black/20 text-white px-2 py-0.5 rounded border border-white/20">TEST GRANULAR</div>
                        </button>

                        <div className="mt-4 p-4 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 text-violet-800 dark:text-violet-300 text-xs text-left">
                            <strong>🕵️‍♂️ OBJETIVO:</strong> Crear un "Sujeto de Prueba", intentar acceder a zonas prohibidas y validar que el sistema bloquee correctamente.
                        </div>
                    </div>
                ) : (
                    <button disabled className="bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 px-8 py-8 rounded-3xl font-black w-full shadow-inner flex flex-col items-center justify-center gap-3 cursor-not-allowed">
                        <Loader2 size={30} className="animate-spin text-violet-500" />
                        <span className="text-xs tracking-widest uppercase">Auditando Permisos...</span>
                    </button>
                )}
            </div>

            {/* LIVE LOGS PREVIEW */}
            {logs.length > 0 && (
                <div className="mt-6 w-full animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest flex items-center gap-2">
                            <ShieldCheck size={12} />
                            Log de Auditoría
                        </span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(logs.join('\n'));
                                // Optional feedback logic could go here if we had local state for it, 
                                // but relying on visual click feedback is often enough for dev tools.
                            }}
                            className="text-[10px] font-bold text-violet-500 hover:text-violet-700 bg-violet-50 hover:bg-violet-100 px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                        >
                            📋 Copiar Log
                        </button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto bg-slate-50 dark:bg-black/20 rounded-xl p-3 border border-slate-200 dark:border-slate-800 text-[10px] font-mono shadow-inner custom-scrollbar">
                        {logs.map((log, i) => (
                            <div key={i} className={`mb-1 break-words leading-relaxed border-b border-slate-100 dark:border-slate-800/50 pb-1 last:border-0 ${log.includes('✅') ? 'text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-900/10 px-1 rounded' :
                                log.includes('❌') ? 'text-red-600 dark:text-red-400 font-bold bg-red-50/50 dark:bg-red-900/10 px-1 rounded' :
                                    log.includes('⚠️') ? 'text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-900/10 px-1 rounded' :
                                        'text-slate-500 dark:text-slate-400'
                                }`}>
                                {log}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
