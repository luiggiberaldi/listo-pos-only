import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, Zap, CheckCircle2, AlertTriangle, Shield, Cpu, Wifi, Clock, ArrowDownCircle } from 'lucide-react';

const ConfigActualizaciones = () => {
    const [systemInfo, setSystemInfo] = useState({ version: '...' });
    const [status, setStatus] = useState('idle'); // idle, checking, available, downloading, ready, up-to-date, error
    const [downloadProgress, setDownloadProgress] = useState(0);
    const [newVersion, setNewVersion] = useState(null);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getSystemInfo().then(info => setSystemInfo(info));

            window.electronAPI.onCheckingForUpdate(() => setStatus('checking'));
            window.electronAPI.onUpdateAvailable((info) => {
                setStatus('available');
                setNewVersion(info.version);
            });
            window.electronAPI.onUpdateNotAvailable(() => {
                setStatus('up-to-date');
                setTimeout(() => setStatus('idle'), 5000);
            });
            window.electronAPI.onUpdateProgress((info) => {
                setStatus('downloading');
                setDownloadProgress(info.percent);
            });
            window.electronAPI.onUpdateDownloaded(() => {
                setStatus('ready');
                setDownloadProgress(100);
            });
            window.electronAPI.onUpdateError((err) => {
                console.error(err);
                setStatus('error');
            });
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

            {/* ═══ HERO: Versión + Estado ═══ */}
            <div className="bg-surface-light dark:bg-surface-dark rounded-3xl border border-border-subtle dark:border-slate-700/60 shadow-lg shadow-primary/5 relative overflow-hidden">

                {/* Ornamento decorativo */}
                <div className="absolute top-0 right-0 w-72 h-72 bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] -mr-20 -mt-20 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-status-success/5 rounded-full blur-[80px] -ml-12 -mb-12 pointer-events-none" />

                <div className="relative z-10 p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

                        {/* Información de versión */}
                        <div className="flex items-center gap-5">
                            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center shrink-0">
                                <Shield size={28} className="text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-3 mb-1.5">
                                    <span className="px-3 py-1 bg-primary-light dark:bg-primary/20 text-primary rounded-lg text-[10px] font-black uppercase tracking-[0.15em]">
                                        Versión Actual
                                    </span>
                                    <span className="px-2.5 py-0.5 bg-status-successBg dark:bg-status-success/15 text-status-success rounded-md text-[10px] font-bold uppercase tracking-wider">
                                        Estable
                                    </span>
                                </div>
                                <h2 className="text-4xl font-black text-content-main dark:text-content-inverse tracking-tight font-numbers">
                                    v{systemInfo.version}
                                </h2>
                            </div>
                        </div>

                        {/* Acciones de estado */}
                        <div className="flex flex-col items-end gap-3">
                            {status === 'idle' && (
                                <button
                                    onClick={handleCheck}
                                    className="px-6 py-3.5 bg-primary hover:bg-primary-hover text-content-inverse rounded-xl font-bold flex items-center gap-2.5 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-primary/25"
                                >
                                    <RefreshCw size={18} /> Buscar Actualizaciones
                                </button>
                            )}

                            {status === 'checking' && (
                                <div className="flex items-center gap-3 px-6 py-3.5 bg-app-light dark:bg-app-dark text-content-secondary rounded-xl font-bold">
                                    <RefreshCw size={18} className="animate-spin text-primary" /> Verificando...
                                </div>
                            )}

                            {status === 'up-to-date' && (
                                <div className="flex items-center gap-3 px-6 py-3.5 bg-status-successBg dark:bg-status-success/15 text-status-success rounded-xl font-bold">
                                    <CheckCircle2 size={18} /> Todo Actualizado
                                </div>
                            )}

                            {status === 'available' && (
                                <div className="flex flex-col gap-2.5 items-end">
                                    <span className="text-primary font-bold flex items-center gap-2 text-sm">
                                        <Zap size={16} fill="currentColor" /> v{newVersion} disponible
                                    </span>
                                    <button
                                        onClick={handleDownload}
                                        className="px-6 py-3.5 bg-primary hover:bg-primary-hover text-content-inverse rounded-xl font-bold flex items-center gap-2.5 shadow-lg shadow-primary/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                                    >
                                        <Download size={18} /> Descargar v{newVersion}
                                    </button>
                                </div>
                            )}

                            {status === 'downloading' && (
                                <div className="w-72">
                                    <div className="flex justify-between text-xs font-bold text-content-secondary mb-2">
                                        <span className="flex items-center gap-1.5">
                                            <ArrowDownCircle size={14} className="text-primary animate-bounce" /> Descargando...
                                        </span>
                                        <span className="text-primary font-numbers">{Math.round(downloadProgress)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-app-light dark:bg-app-dark rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary to-primary-hover rounded-full transition-all duration-300 ease-out"
                                            style={{ width: `${downloadProgress}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {status === 'ready' && (
                                <button
                                    onClick={handleRestart}
                                    className="px-6 py-3.5 bg-status-success hover:brightness-110 text-content-inverse rounded-xl font-bold flex items-center gap-2.5 shadow-lg shadow-status-success/30 transition-all duration-200 hover:scale-[1.03] active:scale-[0.97]"
                                >
                                    <RefreshCw size={18} /> Reiniciar e Instalar
                                </button>
                            )}

                            {status === 'error' && (
                                <div className="flex flex-col items-end gap-2">
                                    <div className="flex items-center gap-3 px-6 py-3.5 bg-status-dangerBg dark:bg-status-danger/15 text-status-danger rounded-xl font-bold">
                                        <AlertTriangle size={18} /> Error de Conexión
                                    </div>
                                    <button
                                        onClick={handleCheck}
                                        className="text-xs text-content-secondary hover:text-primary transition-colors font-medium"
                                    >
                                        Reintentar →
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══ INFO CARDS ═══ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Canal de Distribución */}
                <div className="p-5 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-subtle dark:border-slate-700/60 group hover:border-primary/30 transition-all duration-300">
                    <div className="w-11 h-11 bg-primary/10 dark:bg-primary/15 rounded-xl flex items-center justify-center text-primary mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Wifi size={20} />
                    </div>
                    <h3 className="font-bold text-content-main dark:text-content-inverse text-sm">Canal Seguro</h3>
                    <p className="text-content-secondary text-xs mt-1.5 leading-relaxed">
                        Distribución directa con verificación de integridad automática. Las descargas se validan antes de instalarse.
                    </p>
                </div>

                {/* Mantenimiento */}
                <div className="p-5 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-subtle dark:border-slate-700/60 group hover:border-primary/30 transition-all duration-300">
                    <div className="w-11 h-11 bg-status-success/10 dark:bg-status-success/15 rounded-xl flex items-center justify-center text-status-success mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Clock size={20} />
                    </div>
                    <h3 className="font-bold text-content-main dark:text-content-inverse text-sm">Auto-Mantenimiento</h3>
                    <p className="text-content-secondary text-xs mt-1.5 leading-relaxed">
                        Las actualizaciones críticas se verifican al iniciar. Las menores se instalan manualmente desde aquí.
                    </p>
                </div>

                {/* Sistema */}
                <div className="p-5 bg-surface-light dark:bg-surface-dark rounded-2xl border border-border-subtle dark:border-slate-700/60 group hover:border-primary/30 transition-all duration-300">
                    <div className="w-11 h-11 bg-status-warning/10 dark:bg-status-warning/15 rounded-xl flex items-center justify-center text-status-warning mb-4 group-hover:scale-110 transition-transform duration-300">
                        <Cpu size={20} />
                    </div>
                    <h3 className="font-bold text-content-main dark:text-content-inverse text-sm">Sin Interrupciones</h3>
                    <p className="text-content-secondary text-xs mt-1.5 leading-relaxed">
                        Las descargas son en segundo plano. Solo se requiere reinicio al momento de instalar.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfigActualizaciones;
