import React, { useState, useEffect } from 'react';
import { Cloud, Wifi, WifiOff, Save, ShieldAlert, Key, Database } from 'lucide-react';
import Swal from 'sweetalert2';

const ConfigConexiones = () => {
    // Estado híbrido: Muestra lo que está usándose (sea de .env o de custom-env)
    const [config, setConfig] = useState({
        VITE_FIREBASE_API_KEY: '',
        VITE_FIREBASE_PROJECT_ID: '',
        VITE_GEMINI_API_KEY: '', // Para Ghost AI
        VITE_GH_TOKEN: '' // Para Updates (opcional, suele ser token público/compilado)
    });

    const [isCustom, setIsCustom] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadConfig = async () => {
            // 1. Cargar lo compilado (Fallbacks)
            const envCompiled = {
                VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || '',
                VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
                VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || ''
            };

            // 2. Intentar cargar override desde disco (Electron)
            if (window.electronAPI && window.electronAPI.getCustomEnv) {
                const custom = await window.electronAPI.getCustomEnv();
                if (custom && Object.keys(custom).length > 0) {
                    setConfig({ ...envCompiled, ...custom });
                    setIsCustom(true);
                } else {
                    setConfig(envCompiled);
                }
            } else {
                setConfig(envCompiled);
            }
            setLoading(false);
        };
        loadConfig();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setConfig(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        if (!window.electronAPI || !window.electronAPI.saveCustomEnv) {
            Swal.fire('Error', 'Esta función requiere la App de Escritorio', 'error');
            return;
        }

        const success = await window.electronAPI.saveCustomEnv(config);
        if (success) {
            setIsCustom(true);
            Swal.fire({
                title: 'Conexión Guardada',
                text: 'Las credenciales se han guardado localmente. Reinicia la aplicación para aplicar todos los cambios.',
                icon: 'success',
                confirmButtonText: 'Reiniciar Ahora',
                showCancelButton: true,
                cancelButtonText: 'Más tarde'
            }).then((result) => {
                if (result.isConfirmed) {
                    window.electronAPI.restartApp();
                }
            });
        } else {
            Swal.fire('Error', 'No se pudo guardar la configuración', 'error');
        }
    };

    const handleReset = async () => {
        await window.electronAPI.saveCustomEnv({}); // Borrar archivo
        window.location.reload();
    };

    if (loading) return <div className="p-8 text-center text-slate-400">Cargando credenciales...</div>;

    const isMissingKeys = !config.VITE_FIREBASE_API_KEY || !config.VITE_GEMINI_API_KEY;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* HERO STATUS */}
            <div className={`rounded-3xl p-8 border shadow-xl relative overflow-hidden transition-colors ${isMissingKeys
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                }`}>
                <div className="flex items-start justify-between relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            {isMissingKeys ? (
                                <span className="px-3 py-1 bg-red-200 text-red-700 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <WifiOff size={14} /> Conexión Limitada
                                </span>
                            ) : (
                                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Wifi size={14} /> Conexión Activa
                                </span>
                            )}
                            {isCustom && (
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-black uppercase tracking-widest flex items-center gap-2">
                                    <Database size={14} /> Personalizado
                                </span>
                            )}
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-2">
                            Estado de Servicios
                        </h2>
                        <p className="text-slate-500 font-medium max-w-lg">
                            Gestiona las llaves de acceso a la Nube (Firebase) y a la Inteligencia Artificial (Gemini).
                            <br />
                            <span className="text-xs opacity-75">
                                Si las actualizaciones borran tu conexión, reingresa los datos aquí y se guardarán para siempre.
                            </span>
                        </p>
                    </div>
                    {isMissingKeys && <ShieldAlert size={64} className="text-red-300 dark:text-red-900/50" />}
                </div>
            </div>

            {/* FORMULARIO */}
            <div className="grid grid-cols-1 gap-6">

                {/* FIREBASE */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 mb-4">
                        <Cloud size={20} className="text-orange-500" /> Nube y Sincronización (Firebase)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">API Key</label>
                            <div className="relative">
                                <Key size={16} className="absolute left-3 top-3 text-slate-400" />
                                <input
                                    type="text"
                                    name="VITE_FIREBASE_API_KEY"
                                    value={config.VITE_FIREBASE_API_KEY}
                                    onChange={handleChange}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-600 dark:text-slate-300 font-mono text-xs focus:ring-2 focus:ring-orange-500"
                                    placeholder="AIzaSy..."
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase">Project ID</label>
                            <input
                                type="text"
                                name="VITE_FIREBASE_PROJECT_ID"
                                value={config.VITE_FIREBASE_PROJECT_ID}
                                onChange={handleChange}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-600 dark:text-slate-300 font-mono text-xs focus:ring-2 focus:ring-orange-500"
                                placeholder="listo-pos-..."
                            />
                        </div>
                    </div>
                </div>

                {/* GEMINI */}
                <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 dark:text-slate-200 mb-4">
                        <Key size={20} className="text-purple-500" /> Inteligencia Artificial (Gemini AI)
                    </h3>
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-400 uppercase">Gemini API Key</label>
                        <input
                            type="password"
                            name="VITE_GEMINI_API_KEY"
                            value={config.VITE_GEMINI_API_KEY}
                            onChange={handleChange}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-slate-600 dark:text-slate-300 font-mono text-xs focus:ring-2 focus:ring-purple-500"
                            placeholder="AIzaSy..."
                        />
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="flex justify-end gap-4 pt-4">
                    {isCustom && (
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 text-slate-400 hover:text-red-500 text-sm font-bold transition-colors"
                        >
                            Restaurar Valores por Defecto
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-bold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-slate-900/20"
                    >
                        <Save size={18} /> Guardar Conexión
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ConfigConexiones;
