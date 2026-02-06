import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, X } from 'lucide-react';

const UpdateNotification = () => {
    const [updateStatus, setUpdateStatus] = useState(null); // 'available', 'downloading', 'ready', 'error'
    const [progress, setProgress] = useState(0);
    const [version, setVersion] = useState('');
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {


        // Escuchar eventos desde Electron via electronAPI (definido en preload)
        if (window.electronAPI) {
            window.electronAPI.onUpdateAvailable((data) => {
                setVersion(data.version);
                setUpdateStatus('available');
                setIsVisible(true);
            });

            window.electronAPI.onUpdateProgress((data) => {
                setUpdateStatus('downloading');
                setProgress(data.percent);
            });

            window.electronAPI.onUpdateDownloaded(() => {
                setUpdateStatus('ready');
                setProgress(100);
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

    const handleRestart = () => {
        if (window.electronAPI) {
            window.electronAPI.restartApp();
        }
    };

    const closeNotification = () => {
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 w-80 border border-gray-200 dark:border-gray-700 animate-in slide-in-from-bottom flex flex-col gap-3">

            <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <RefreshCw className={`w-5 h-5 text-blue-600 dark:text-blue-400 ${updateStatus === 'downloading' ? 'animate-spin' : ''}`} />
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
                            {updateStatus === 'available' && 'Nueva versión disponible'}
                            {updateStatus === 'downloading' && 'Descargando actualización...'}
                            {updateStatus === 'ready' && '¡Actualización lista!'}
                            {updateStatus === 'error' && 'Error al actualizar'}
                        </h4>
                        {version && <p className="text-xs text-gray-500">Versión {version}</p>}
                    </div>
                </div>
                <button onClick={closeNotification} className="text-gray-400 hover:text-gray-600">
                    <X className="w-4 h-4" />
                </button>
            </div>

            {(updateStatus === 'available' || updateStatus === 'downloading') && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
                    <div
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                    <p className="text-right text-xs text-gray-400 mt-1">{Math.round(progress)}%</p>
                </div>
            )}

            {updateStatus === 'ready' && (
                <button
                    onClick={handleRestart}
                    className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-bold flex items-center justify-center gap-2 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    Reiniciar para Instalar
                </button>
            )}
        </div>
    );
};

export default UpdateNotification;
