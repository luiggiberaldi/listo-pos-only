import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, RefreshCw, Lock, Radio, WifiOff, KeyRound, AlertTriangle } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { generateChallenge, validateSOS } from '../../utils/securityUtils';

export default function OwnerLockScreen() {
    const { getSystemID } = useAuthContext();
    const [isUnlocking, setIsUnlocking] = useState(false);
    const machineId = getSystemID();

    // SOS States
    const [sosMode, setSosMode] = useState(false);
    const [challenge, setChallenge] = useState('');
    const [sosPin, setSosPin] = useState('');
    const [sosError, setSosError] = useState(null);

    // Efecto visual de radar
    const [pulse, setPulse] = useState(false);
    useEffect(() => {
        const interval = setInterval(() => setPulse(p => !p), 2000);
        return () => clearInterval(interval);
    }, []);

    const handleCheckUnlock = () => {
        setIsUnlocking(true);
        window.location.reload();
    };

    const handleSOSClick = () => {
        if (!sosMode) {
            setChallenge(generateChallenge());
            setSosMode(true);
        } else {
            setSosMode(false);
            setSosPin('');
            setSosError(null);
        }
    };

    const handleSOSVerify = async () => {
        if (sosPin.length !== 6) return;
        setIsUnlocking(true);

        const result = await validateSOS(challenge, machineId, sosPin);

        if (result === 'OWNER' || result === 'MASTER') {
            // ✅ Desbloqueo Exitoso
            localStorage.removeItem('listo_owner_lock');
            if (result === 'MASTER') localStorage.removeItem('listo_lock_down'); // Master also kills Red Lock
            window.location.reload();
        } else {
            setSosError("PIN Incorrecto");
            setIsUnlocking(false);
            setSosPin('');
        }
    };

    return (
        <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-8 z-50 fixed inset-0 font-sans">
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/30 via-slate-900 to-amber-900/10 pointer-events-none"></div>

            <div className="max-w-2xl w-full bg-slate-900/90 backdrop-blur-xl border border-blue-500/30 rounded-3xl p-12 shadow-[0_0_60px_rgba(59,130,246,0.3)] relative overflow-hidden flex flex-col items-center animate-in zoom-in-95 duration-500">

                {/* Radar waves (Only in normal mode) */}
                {!sosMode && (
                    <>
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border border-blue-500/20 rounded-full transition-all duration-1000 ${pulse ? 'scale-110 opacity-0' : 'scale-75 opacity-20'}`}></div>
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] border border-blue-500/40 rounded-full transition-all duration-1000 delay-100 ${pulse ? 'scale-110 opacity-0' : 'scale-90 opacity-40'}`}></div>
                    </>
                )}

                <div className="relative z-10 flex flex-col items-center text-center space-y-8 w-full">

                    <div className="p-6 bg-blue-500/10 rounded-full border-2 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)]">
                        {sosMode ? <WifiOff className="w-16 h-16 text-amber-500" /> : <Lock className="w-16 h-16 text-blue-400" />}
                    </div>

                    <div className="space-y-4">
                        <h1 className="text-4xl font-black text-white tracking-widest uppercase">
                            {sosMode ? 'RESCATE OFFLINE' : 'Terminal en Pausa'}
                        </h1>
                        <p className="text-lg text-blue-200 font-medium max-w-md mx-auto leading-relaxed">
                            {sosMode
                                ? 'Use la herramienta de rescate en su App Listo GO para generar el PIN.'
                                : 'El propietario ha restringido el acceso temporalmente por motivos de seguridad operativa.'}
                        </p>
                    </div>

                    {sosMode ? (
                        // 🆘 SOS INTERFACE
                        <div className="bg-amber-950/30 p-8 rounded-2xl border border-amber-600/50 w-full max-w-sm animate-in slide-in-from-bottom-4">
                            <div className="flex flex-col items-center gap-6">
                                <div className="text-center w-full">
                                    <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-2">CÓDIGO DE RETO</p>
                                    <div className="bg-black/50 p-4 rounded-xl border border-amber-900/50 text-4xl font-mono font-black text-white tracking-[0.5em] select-all">
                                        {challenge}
                                    </div>
                                </div>

                                <div className="w-full space-y-2">
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">PIN DE RESPUESTA</p>
                                    <input
                                        type="tel"
                                        maxLength={6}
                                        value={sosPin}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                            setSosPin(val);
                                            setSosError(null);
                                        }}
                                        className="w-full bg-slate-950 border border-slate-700 text-center text-3xl text-white font-mono py-3 rounded-lg focus:outline-none focus:border-amber-500 transition-colors"
                                        placeholder="000000"
                                    />
                                </div>

                                {sosError && (
                                    <div className="text-red-500 font-bold text-sm flex items-center gap-2 bg-red-950/50 px-3 py-1 rounded">
                                        <AlertTriangle size={14} /> {sosError}
                                    </div>
                                )}

                                <div className="flex gap-2 w-full">
                                    <button
                                        onClick={handleSOSClick}
                                        className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 font-bold transition-colors"
                                    >
                                        CANCELAR
                                    </button>
                                    <button
                                        onClick={handleSOSVerify}
                                        disabled={sosPin.length !== 6 || isUnlocking}
                                        className="flex-1 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUnlocking ? '...' : 'DESBLOQUEAR'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        // 🔵 NORMAL INTERFACE
                        <>
                            <div className="bg-slate-950/50 p-6 rounded-2xl border border-dashed border-slate-700 w-full max-w-md">
                                <div className="flex items-center gap-4 justify-center text-slate-400 mb-4">
                                    <Radio className={`text-emerald-500 ${pulse ? 'animate-pulse' : ''}`} size={20} />
                                    <span className="text-sm font-mono tracking-wider">ESPERANDO ORDEN DESDE APP</span>
                                </div>

                                <div className="flex justify-center gap-8 text-center">
                                    <div>
                                        <Smartphone size={32} className="mx-auto text-blue-400 mb-2" />
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Listo GO</p>
                                    </div>
                                    <div className="h-full w-px bg-slate-800"></div>
                                    <div>
                                        <Shield size={32} className="mx-auto text-amber-500 mb-2" />
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Seguridad</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 w-full max-w-xs">
                                <button
                                    onClick={handleCheckUnlock}
                                    disabled={isUnlocking}
                                    className="w-full flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                                >
                                    {isUnlocking ? (
                                        <><RefreshCw className="animate-spin" /> Verificando...</>
                                    ) : (
                                        "Forzar Verificación Online"
                                    )}
                                </button>

                                <button
                                    onClick={handleSOSClick}
                                    className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider flex items-center justify-center gap-2 transition-colors py-2"
                                >
                                    <WifiOff size={14} /> ¿Sin Internet? (Modo Rescate)
                                </button>
                            </div>
                        </>
                    )}

                    <p className="text-[10px] text-slate-600 font-mono pt-4">
                        ID: {machineId || 'UNKNOWN'}
                    </p>
                </div>
            </div>
        </div>
    );
}
