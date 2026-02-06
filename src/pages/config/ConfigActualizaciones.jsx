import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Zap, CheckCircle2, AlertTriangle, Cloud, Server } from 'lucide-react';
import { useStore } from '../../context/StoreContext'; // For permissions if needed, usually open

const ConfigActualizaciones = () => {
    const [systemInfo, setSystemInfo] = useState({ version: '...' });
    const [status, setStatus] = useState('idle'); // idle, checking, available, downloading, ready, up-to-date, error
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [newVersion, setNewVersion] = useState(null);

    useEffect(() => {
        // Load System Info
        if (window.electronAPI) {
            window.electronAPI.getSystemInfo().then(info => setSystemInfo(info));

            // Subscribe to events
            const removeCheck = window.electronAPI.onCheckingForUpdate(() => setStatus('checking'));

            const removeAvailable = window.electronAPI.onUpdateAvailable((info) => {
                setStatus('available');
                setNewVersion(info.version);
            });

            const removeNotAvailable = window.electronAPI.onUpdateNotAvailable(() => {
                setStatus('up-to-date');
                setTimeout(() => setStatus('idle'), 5000); // Reset after 5s
            });

            const removeProgress = window.electronAPI.onUpdateProgress((info) => {
                setStatus('downloading');
                setDownloadProgress(info.percent);
            });

            const removeDownloaded = window.electronAPI.onUpdateDownloaded(() => {
                setStatus('ready');
                setDownloadProgress(100);
            });

            const removeError = window.electronAPI.onUpdateError((err) => {
                console.error(err);
                setStatus('error');
            });

            return () => {
                // Cleanup isn't strictly necessary for one-off listeners if we assume component unmounts, 
                // but polite to do. However, electronAPI currently doesn't expose individual remove listeners easily 
                // without complex logic (we only have removeAll). 
                // Safest to just leave them be or use removeAllUpdateListeners carefully (but that kills global notification too).
                // Actually, listeners are additive in Electron. 
                // We will rely on React's unmount. 
                // Note: The global UpdateNotification also listens. Both will receive events. That is desired.
            };
        }
    }, []);

    const handleCheck = () => {
        if (window.electronAPI) {
            setStatus('checking');
            window.electronAPI.checkForUpdates();
        }
    };

    const handleDownload = () => {
        if (window.electronAPI) {
            setStatus('downloading');
            window.electronAPI.downloadUpdate();
        }
    };

    const handleRestart = () => {
        if (window.electronAPI) {
            window.electronAPI.restartApp();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HERO CARD */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 dark:bg-indigo-900/20 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-black uppercase tracking-widest">
                                Versión Actual
                            </span>
                        </div>
                        <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-2">
                            v{systemInfo.version}
                        </h2>
                        <p className="text-slate-500 font-medium">
                            Canal de Actualización: <span className="text-indigo-600 font-bold">Producción (Stable)</span>
                        </p>
                    </div>

                    {/* STATUS INDICATOR */}
                    <div className="flex flex-col items-end gap-3">
                        {status === 'idle' && (
                            <button
                                onClick={handleCheck}
                                className="px-6 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-slate-900/20"
                            >
                                <RefreshCw size={20} /> buscar Actualizaciones
                            </button>
                        )}

                        {status === 'checking' && (
                            <div className="flex items-center gap-3 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold animate-pulse">
                                <RefreshCw size={20} className="animate-spin" /> Verificando...
                            </div>
                        )}

                        {status === 'up-to-date' && (
                            <div className="flex items-center gap-3 px-6 py-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-xl font-bold">
                                <CheckCircle2 size={20} /> Todo Actualizado
                            </div>
                        )}

                        {status === 'available' && (
                            <div className="flex flex-col gap-2 items-end">
                                <span className="text-indigo-600 font-bold flex items-center gap-2">
                                    <Zap size={18} fill="currentColor" /> Nueva versión v{newVersion}
                                </span>
                                <button
                                    onClick={handleDownload}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all animate-bounce"
                                >
                                    <Download size={20} /> Descargar v{newVersion}
                                </button>
                            </div>
                        )}

                        {status === 'downloading' && (
                            <div className="w-64">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
                                    <span>Descargando...</span>
                                    <span>{Math.round(downloadProgress)}%</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                                </div>
                            </div>
                        )}

                        {status === 'ready' && (
                            <button
                                onClick={handleRestart}
                                className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30 transition-all"
                            >
                                <RefreshCw size={20} /> Reiniciar e Instalar
                            </button>
                        )}

                        {status === 'error' && (
                            <div className="flex items-center gap-3 px-6 py-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-xl font-bold">
                                <AlertTriangle size={20} /> Error al buscar
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* INFO GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-100 transition-colors">
                    <div className="w-12 h-12 bg-blue-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                        <Cloud size={24} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Servidor de Actualizaciones</h3>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                        Conectado a <strong>GitHub Releases</strong> (luiggiberaldi/listo-pos-only).
                        Las descargas son seguras y verificadas.
                    </p>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 group hover:border-indigo-100 transition-colors">
                    <div className="w-12 h-12 bg-purple-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-purple-600 mb-4 group-hover:scale-110 transition-transform">
                        <Server size={24} />
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-lg">Mantenimiento Automático</h3>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">
                        El sistema busca actualizaciones críticas en cada inicio. Las actualizaciones menores pueden instalarse manualmente aquí.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfigActualizaciones;
