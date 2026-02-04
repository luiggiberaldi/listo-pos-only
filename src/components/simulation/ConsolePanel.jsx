import React, { useRef, useEffect, useState } from 'react';
import { Terminal, Check, Clipboard } from 'lucide-react';

export const ConsolePanel = ({ activeTab, logs, isRunning }) => {
    const logsEndRef = useRef(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    const handleCopyLogs = () => {
        if (logs.length === 0) return;
        const cleanLogs = logs.join('\n');
        navigator.clipboard.writeText(cleanLogs)
            .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
    };

    return (
        <div className="w-full lg:w-2/5">
            <div className="bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col h-[600px]">
                <div className="bg-slate-900 px-4 py-3 flex justify-between items-center border-b border-slate-800">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-mono">
                        <Terminal size={14} />
                        <span className="uppercase tracking-widest font-bold">
                            {activeTab === 'sim' ? 'QUANTUM_SIM' : activeTab === 'chaos' ? 'CHAOS_STRESS' : activeTab === 'finance' ? 'FINANCE_SYNERGY' : 'SECURITY_AUDIT'}
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        {isRunning && <span className="text-[10px] text-green-400 font-bold px-2 py-0.5 bg-green-900/30 rounded-full border border-green-800 animate-pulse">● RUNNING</span>}
                        <button onClick={handleCopyLogs} className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] uppercase font-bold">
                            {copied ? <Check size={14} className="text-green-500" /> : <Clipboard size={14} />}
                            {copied ? 'COPIADO' : 'COPIAR LOG'}
                        </button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto flex-1 font-mono text-xs custom-scrollbar space-y-1 bg-slate-950">
                    {logs.map((log, i) => {
                        let color = 'text-slate-400';
                        if (log.includes('header') || log.includes('===') || log.includes('MOTOR')) color = 'text-emerald-400 font-bold border-b border-emerald-900/30 pb-1 mt-2 mb-1';
                        else if (log.includes('FATAL') || log.includes('💀')) color = 'text-red-500 font-bold bg-red-900/10 p-1';
                        else if (log.includes('ERROR') || log.includes('❌')) color = 'text-red-400 font-bold';
                        else if (log.includes('EXITOSO') || log.includes('✅') || log.includes('ÉXITO')) color = 'text-emerald-400 font-bold';
                        else if (log.includes('Identidad')) color = 'text-amber-400';
                        else if (log.includes('TASA')) color = 'text-cyan-400 font-bold';

                        return (
                            <div key={i} className={`break-words whitespace-pre-wrap ${color} animate-in fade-in slide-in-from-bottom-1 duration-300`}>
                                {log}
                            </div>
                        )
                    })}
                    <div ref={logsEndRef} />
                </div>
            </div>
        </div>
    );
};
