import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X, Clock, Zap } from 'lucide-react';

const UpdateNotification = () => {
    const [updateStatus, setUpdateStatus] = useState(null); // 'available', 'downloading', 'ready', 'error'
    const [progress, setProgress] = useState(0);
    const [version, setVersion] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.onUpdateAvailable((data) => {
                setVersion(data.version);
                setUpdateStatus('available');
                setIsVisible(true);
            });

            window.electronAPI.onUpdateProgress((data) => {
                setUpdateStatus('downloading');
                setProgress(data.percent);
                setIsVisible(true); // Asegurar que se vea mientras descarga
            });

            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateStatus('ready');
                setProgress(100);
                setIsVisible(true);
            });

            window.electronAPI.onUpdateError((err) => {
                console.error("Update Error:", err);
                setUpdateStatus('error');
            });
        }

        return () => {
            if (window.electronAPI && window.electronAPI.removeAllUpdateListeners) {
                window.electronAPI.removeAllUpdateListeners();
            }
        };
    }, []);

    const handleDownload = () => {
        if (window.electronAPI) {
            setUpdateStatus('downloading');
            window.electronAPI.downloadUpdate();
        }
    };

    const handleRestart = () => {
        if (window.electronAPI) {
            window.electronAPI.restartApp();
        }
    };

    const handleInstallOnClose = () => {
        setIsVisible(false);
        // autoInstallOnAppQuit is already true in main process
    };

    const closeNotification = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[9999] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-5 w-80 border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom flex flex-col gap-4 font-sans">

            {/* HEADER */}
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-full ${updateStatus === 'error' ? 'bg-red-100 text-red-600' : 'bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300'}`}>
                        {updateStatus === 'downloading' ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : updateStatus === 'ready' ? (
                            <Zap className="w-5 h-5" />
                        ) : (
                            <Download className="w-5 h-5" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">
                            {updateStatus === 'available' && 'Nueva versión detectada'}
                            {updateStatus === 'downloading' && 'Descargando actualización...'}
                            {updateStatus === 'ready' && 'Actualización lista'}
                            {updateStatus === 'error' && 'Error de actualización'}
                        </h4>
                        {version && (
                            <p className="text-xs text-slate-500 font-medium mt-0.5">Versión v{version}</p>
                        )}
                    </div>
                </div>
                <button onClick={closeNotification} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* CONTENT BY STATUS */}

            {/* 1. DISPONIBLE (Preguntar si descargar) */}
            {updateStatus === 'available' && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                        Hay una nueva versión disponible. ¿Deseas descargarla ahora o programarla para después?
                    </p>
                    <div className="flex gap-2 mt-2">
                        <button
                            onClick={closeNotification}
                            className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-bold transition-colors"
                        >
                            Más tarde
                        </button>
                        <button
                            onClick={handleDownload}
                            className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors flex items-center justify-center gap-1.5"
                        >
                            <Download className="w-3 h-3" />
                            Descargar
                        </button>
                    </div>
                </div>
            )}

            {/* 2. DESCARGANDO (Barra de progreso) */}
            {updateStatus === 'downloading' && (
                <div className="w-full">
                    <div className="w-full bg-slate-100 rounded-full h-1.5 dark:bg-slate-700 overflow-hidden">
                        <div
                            className="bg-indigo-600 h-full transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between items-center mt-1.5">
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider animate-pulse">Descargando...</span>
                        <span className="text-[10px] font-mono text-slate-400">{Math.round(progress)}%</span>
                    </div>
                </div>
            )}

            {/* 3. LISTA (Instalar ahora o al salir) */}
            {updateStatus === 'ready' && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-emerald-600 font-medium">
                        La actualización se ha descargado correctamente.
                    </p>
                    <div className="flex flex-col gap-2 mt-1">
                        <button
                            onClick={handleRestart}
                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-transform active:scale-95"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Reiniciar e Instalar Ahora
                        </button>

                        <button
                            onClick={handleInstallOnClose}
                            className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors"
                        >
                            <Clock className="w-3.5 h-3.5" />
                            Instalar al cerrar la App
                        </button>
                    </div>
                </div>
            )}

            {updateStatus === 'error' && (
                <p className="text-xs text-red-500">
                    Ocurrió un error. Intenta reiniciar la aplicación más tarde.
                </p>
            )}
        </div>
    );
};

export default UpdateNotification;
