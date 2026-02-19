import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Terminal, ShieldCheck, Server, AlertCircle, ArrowRight, Key, WifiOff, Copy, Check, Wifi, Monitor, Loader2 } from 'lucide-react';
import { useLicenseGuard } from '../../hooks/security/useLicenseGuard';
import OwnerLockScreen from './OwnerLockScreen'; // 🟠 NEW TACTICAL LOCK
import { generateChallenge, validateSOS } from '../../utils/securityUtils';
import { useConfigStore } from '../../stores/useConfigStore';
import { dbMaster } from '../../services/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

// [FIX M1] Salt centralizado desde módulo compartido (eliminado el hardcode duplicado)
import { LICENSE_SALT_LEGACY } from '../../config/licenseLegacy';

// [FIX M4] Importar guard de maxCajas para aplicar en activación de Caja Secundaria
import { canAddCaja } from '../../config/planTiers';

const LAN_PORT = 3847;

export default function LicenseGate({ children }) {
    // Consumimos el estado consolidado del Guardián
    const { status: localStatus, machineId, isSuspended, plan } = useLicenseGuard();

    // Estados Locales (Activation UI)
    const [inputCode, setInputCode] = useState('');
    const [isUnlocking, setIsUnlocking] = useState(false);
    const [activationError, setActivationError] = useState(null);
    const [copied, setCopied] = useState(false);

    // SOS States
    const [sosMode, setSosMode] = useState(false);
    const [challenge, setChallenge] = useState('');
    const [sosPin, setSosPin] = useState('');
    const [sosError, setSosError] = useState(null);

    // 🔑 MULTI-CAJA STATES
    const [multiCajaMode, setMultiCajaMode] = useState(false);
    const [serverIP, setServerIP] = useState('');
    const [multiCajaStatus, setMultiCajaStatus] = useState(''); // '', 'connecting', 'success', 'error'
    const [multiCajaError, setMultiCajaError] = useState(null);

    // 🆕 HOISTED HOOKS (Fixing 'Rendered fewer hooks than expected')
    const { license, loadConfig, setPlan: setStorePlan } = useConfigStore();

    useEffect(() => {
        if (license.usageCount === 0) loadConfig();
    }, []);

    // 🏪 SYNC PLAN: Cuando el plan cambia en Firebase, actualizar el store
    useEffect(() => {
        if (plan && setStorePlan) setStorePlan(plan);
    }, [plan]);

    const handleSOSClick = () => {
        if (!sosMode) {
            setChallenge(generateChallenge());
            setSosMode(true);
            setMultiCajaMode(false); // Cerrar multi-caja si estaba abierto
        } else {
            setSosMode(false);
            setSosPin('');
            setSosError(null);
        }
    };

    // 🔑 MULTI-CAJA: Activar como Caja Secundaria
    const handleMultiCajaActivation = async () => {
        if (!serverIP.trim() || !machineId) return;

        // [FIX M4] Verificar si el plan activo permite más cajas antes de intentar conectar
        // El plan se resuelve desde el store o localStorage como segundo fallback
        const activePlan = license?.plan || localStorage.getItem('listo_plan') || 'bodega';
        // Nota: aquí la caja principal ya cuenta como 1, estamos añadiendo la #2 (o más)
        // canAddCaja(plan, 1) → ¿puede añadir a partir de 1 caja existente?
        if (!canAddCaja(activePlan, 1)) {
            setMultiCajaStatus('error');
            setMultiCajaError(`El plan ${activePlan} no permite más de 1 caja. Actualiza a Abasto o Minimarket.`);
            return;
        }

        setMultiCajaStatus('connecting');
        setMultiCajaError(null);

        try {
            // 1. Ping al servidor para verificar que existe
            const pingRes = await fetch(`http://${serverIP.trim()}:${LAN_PORT}/api/ping`, {
                signal: AbortSignal.timeout(5000),
            });
            if (!pingRes.ok) throw new Error('Servidor no responde');
            const pingData = await pingRes.json();

            // 2. Solicitar licencia al servidor
            const licRes = await fetch(`http://${serverIP.trim()}:${LAN_PORT}/api/license-grant`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    machineId: machineId,
                    cajaLabel: 'Caja Secundaria',
                }),
                signal: AbortSignal.timeout(10000),
            });

            if (!licRes.ok) {
                const errData = await licRes.json().catch(() => ({}));
                throw new Error(errData.error || `Error ${licRes.status}`);
            }

            const { licenseKey, negocio, serverMachineId, plan: grantedPlan } = await licRes.json();

            // 3. Guardar la licencia y plan localmente
            localStorage.setItem('listo_license_key', licenseKey);
            localStorage.setItem('listo_plan', grantedPlan || 'bodega');

            // 4. Registrar en Firebase como terminal vinculado
            if (dbMaster) {
                try {
                    await setDoc(doc(dbMaster, 'terminales', machineId), {
                        status: 'ACTIVE',
                        role: 'secundaria',
                        plan: grantedPlan || 'bodega',
                        parentId: serverMachineId || 'unknown',
                        negocio: negocio || '',
                        linkedAt: serverTimestamp(),
                        lastSeen: serverTimestamp(),
                        ip: serverIP.trim(),
                    }, { merge: true });
                } catch (fbErr) {
                    console.warn('⚠️ Firebase registro falló (no crítico):', fbErr.message);
                }
            }

            // 5. Guardar config LAN
            if (window.electronAPI?.lanSaveConfig) {
                await window.electronAPI.lanSaveConfig({
                    role: 'secundaria',
                    targetIP: serverIP.trim(),
                });
            }

            setMultiCajaStatus('success');

            // 6. Recargar después de un breve delay para que el usuario vea el éxito
            setTimeout(() => window.location.reload(), 1500);

        } catch (err) {
            console.error('❌ [MULTI-CAJA] Error:', err);
            setMultiCajaStatus('error');
            setMultiCajaError(
                err.name === 'TimeoutError' || err.name === 'AbortError'
                    ? 'No se pudo conectar. Verifica la IP y que PC1 esté encendida.'
                    : err.message || 'Error de conexión'
            );
        }
    };

    const handleSOSVerify = async () => {
        if (sosPin.length !== 6) return;
        setIsUnlocking(true);

        // 🛡️ POLICY: The Red Screen can ONLY be unlocked by MASTER key
        const result = await validateSOS(challenge, machineId, sosPin);

        if (result === 'MASTER') {
            // ✅ Desbloqueo Maestro Exitoso
            // [FIX C2] listo_lock_down ya no se usa como fuente de verdad.
            // El estado reactivo de isSuspended en useLicenseGuard lo gestiona Firestore.
            // Limpiamos por retrocompatibilidad con terminales que aún tengan el key viejo.
            localStorage.removeItem('listo_lock_down');
            localStorage.removeItem('listo_owner_lock');
            window.location.reload();
        } else {
            setSosError(result === 'OWNER' ? 'Nivel Insuficiente (Halcón)' : 'PIN Inválido');
            setIsUnlocking(false);
            setSosPin('');
        }
    };

    // --- UI STATES ---

    // 1. FÉNIX CLOUD LOCK (BLOQUEO REMOTO - PRIORIDAD MÁXIMA - NIVEL 1)
    // Pantalla Negra + Candado Rojo (EL PORTERO MALO 😡)
    if (isSuspended) {
        return (
            <div className="h-screen w-screen bg-black flex items-center justify-center p-8 z-50 fixed inset-0 font-sans">
                <div className="max-w-3xl w-full border border-red-900/50 bg-slate-900/90 backdrop-blur-xl rounded-3xl p-16 shadow-[0_0_120px_rgba(220,38,38,0.5)] relative overflow-hidden flex flex-col items-center animate-in fade-in zoom-in-95 duration-500">

                    {/* Background Noise/Grid */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#000000_100%)] z-0"></div>
                    <div className="absolute inset-0 opacity-20 bg-[linear-gradient(45deg,#ff000011_25%,transparent_25%,transparent_50%,#ff000011_50%,#ff000011_75%,transparent_75%,transparent)] bg-[length:30px_30px]"></div>

                    <div className="relative z-10 flex flex-col items-center text-center space-y-10 w-full">

                        <div className="p-8 bg-red-600/10 rounded-full border-4 border-red-600 shadow-[0_0_50px_rgba(220,38,38,0.8)] animate-pulse">
                            {sosMode ? <WifiOff className="w-24 h-24 text-red-500" /> : <Lock className="w-24 h-24 text-red-500" strokeWidth={1.5} />}
                        </div>

                        <div className="space-y-6">
                            <h1 className="text-5xl font-black text-white tracking-widest uppercase drop-shadow-[0_2px_10px_rgba(220,38,38,0.5)]">
                                {sosMode ? 'RESCATE OFFLINE' : 'ACCESO DENEGADO'}
                            </h1>

                            <p className="text-xl text-red-500 font-bold max-w-2xl leading-relaxed mx-auto">
                                {sosMode
                                    ? 'Contacte a Soporte Técnico y dicte el código de reto.'
                                    : 'Este terminal ha sido suspendido por la administración central.'}
                            </p>
                        </div>

                        {sosMode ? (
                            // 🆘 SOS MASTER INTERFACE
                            <div className="bg-red-950/30 p-8 rounded-2xl border border-red-800/50 w-full max-w-sm animate-in slide-in-from-bottom-4">
                                <div className="flex flex-col items-center gap-6">
                                    <div className="text-center w-full">
                                        <p className="text-xs font-bold text-red-500 uppercase tracking-widest mb-2">CÓDIGO DE RETO</p>
                                        <div className="bg-black/50 p-4 rounded-xl border border-red-900/50 text-4xl font-mono font-black text-white tracking-[0.5em] select-all">
                                            {challenge}
                                        </div>
                                    </div>

                                    <div className="w-full space-y-2">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest text-center">PIN MAESTRO</p>
                                        <input
                                            type="tel"
                                            maxLength={6}
                                            value={sosPin}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                setSosPin(val);
                                                setSosError(null);
                                            }}
                                            className="w-full bg-slate-950 border border-slate-700 text-center text-3xl text-white font-mono py-3 rounded-lg focus:outline-none focus:border-red-500 transition-colors"
                                            placeholder="000000"
                                        />
                                    </div>

                                    {sosError && (
                                        <div className="text-red-500 font-bold text-sm flex items-center gap-2 bg-red-950/50 px-3 py-1 rounded w-full justify-center">
                                            <AlertCircle size={14} /> {sosError}
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
                                            className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isUnlocking ? '...' : 'DESBLOQUEAR'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-red-950/30 p-8 rounded-2xl border border-red-900/60 w-full max-w-xl backdrop-blur-md">
                                <p className="text-lg text-slate-300 leading-relaxed font-medium">
                                    Para reactivar el servicio, contacte a soporte técnico proporcionando su ID:
                                </p>
                                <div className="mt-6 p-4 bg-black/80 rounded-xl border border-red-800/50 flex items-center justify-between gap-4 group/copy">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <Terminal size={24} className="text-red-500 shrink-0" />
                                        <span
                                            className="font-mono text-xl font-bold text-yellow-500 tracking-wider select-all break-all cursor-pointer hover:text-yellow-400 transition-colors"
                                            onClick={() => {
                                                navigator.clipboard.writeText(machineId);
                                                setCopied(true);
                                                setTimeout(() => setCopied(false), 2000);
                                            }}
                                        >
                                            {machineId || 'IDENTIFICANDO...'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(machineId);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="p-3 bg-red-900/30 hover:bg-red-500 text-red-400 hover:text-white rounded-xl transition-colors shrink-0 border border-red-900/50 hover:border-red-400"
                                        title="Copiar ID"
                                    >
                                        {copied ? <Check size={20} className="text-white" /> : <Copy size={20} />}
                                    </button>
                                </div>
                            </div>
                        )}

                        {!sosMode && (
                            <div className="flex flex-col items-center gap-2 mt-8">
                                <button
                                    onClick={handleSOSClick}
                                    className="text-[10px] font-bold text-red-900/50 hover:text-red-500 uppercase tracking-widest flex items-center gap-2 transition-colors py-2 cursor-pointer"
                                >
                                    <WifiOff size={10} /> Protocolo de Emergencia Offline
                                </button>
                                <div className="flex items-center gap-3 text-red-900/50 text-xs font-mono uppercase tracking-widest">
                                    <ShieldAlert size={14} />
                                    <span className="font-bold">Fénix Security Protocol • v4.2 • Status: LOCKED</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 2. OWNER LOCK (BLOQUEO TÁCTICO - NIVEL 2) 🟠
    // Si no está suspendido por Admin, revisamos si el dueño lo pausó.
    if (localStorage.getItem('listo_owner_lock') === 'true') {
        return <OwnerLockScreen />;
    }

    // 🆕 2.5 DEMO SHIELD LOCK (CUOTAS AGOTADAS) 🧪
    if (license.isDemo && license.isQuotaBlocked) {
        return (
            <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-8 z-[60] fixed inset-0 font-sans overflow-hidden">
                {/* Decoration */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[100px] -mr-64 -mt-64"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-slate-500/5 rounded-full blur-[100px] -ml-64 -mb-64"></div>

                <div className="max-w-2xl w-full bg-slate-900 border-2 border-amber-500/30 rounded-[2.5rem] p-16 shadow-[0_35px_100px_-15px_rgba(245,158,11,0.2)] relative z-10 flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-24 h-24 bg-amber-500/10 rounded-3xl flex items-center justify-center mb-8 border-2 border-amber-500/40 shadow-lg shadow-amber-900/20">
                        <ShieldAlert className="w-12 h-12 text-amber-500" strokeWidth={1.5} />
                    </div>

                    <h2 className="text-4xl font-black text-white mb-6 uppercase tracking-tight">
                        Periodo de Prueba <span className="text-amber-500">Finalizado</span>
                    </h2>

                    <div className="space-y-6 max-w-md">
                        <p className="text-slate-400 text-lg leading-relaxed">
                            Has completado tus <span className="text-white font-bold">{license.quotaLimit} ventas</span> de demostración satisfactoriamente.
                        </p>

                        <div className="bg-slate-950/50 p-6 rounded-2xl border border-slate-800">
                            <p className="text-sm text-slate-500 mb-2 uppercase font-bold tracking-widest">Estado del Terminal</p>
                            <p className="text-amber-500/80 font-mono text-sm">LICENSE_QUOTA_EXHAUSTED</p>
                        </div>

                        <p className="text-slate-500 text-sm italic">
                            Contacte a soporte técnico para adquirir la licencia full y conservar su base de datos.
                        </p>
                    </div>

                    <div className="mt-12 flex flex-col items-center gap-4 w-full">
                        <button
                            onClick={() => window.open('https://listopos.com', '_blank')}
                            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-4 px-12 rounded-2xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-3 uppercase tracking-wider text-sm active:scale-95"
                        >
                            Contactar a Soporte <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. LOADING (Local Check)
    if (localStatus === 'checking') {
        return (
            <div className="h-screen w-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
                <div className="relative">
                    <div className="absolute inset-0 bg-emerald-500 blur-xl opacity-20 animate-pulse"></div>
                    <ShieldCheck className="w-20 h-20 text-emerald-500 relative z-10" />
                </div>
                <p className="font-mono text-sm tracking-widest uppercase text-emerald-500/80 animate-pulse">Verificando Credenciales...</p>
            </div>
        );
    }

    // 3. UNAUTHORIZED (LOCAL CHECKS - Hardware Mismatch)
    // Pantalla Azul/Profesional (EL PORTERO BUENO 👮‍♂️)
    // 3. UNAUTHORIZED (LOCAL CHECKS - Hardware Mismatch)
    // Pantalla Azul/Profesional (EL PORTERO BUENO 👮‍♂️)
    const handleUnlock = async () => {
        if (!inputCode.trim()) return;
        setIsUnlocking(true);
        setActivationError(null);

        try {
            const currentId = machineId;
            if (!currentId) throw new Error("No Hardware ID found");

            // Normalizar entrada (JWT debe ser exacto, sin espacios)
            const userKey = inputCode.trim();

            // 🛡️ FÉNIX V2: Verificar Firma (Pre-Validación UI)
            // Importamos dinámicamente para no cargar librerías si no se usan
            const { FENIX_PUBLIC_KEY } = await import('../../config/fenix_public_key');
            const { KJUR } = await import('jsrsasign');

            try {
                // Intento 1: Es un JWT (V2)
                if (userKey.includes('.')) {
                    const isValid = KJUR.jws.JWS.verify(userKey, FENIX_PUBLIC_KEY, ['RS256']);
                    if (isValid) {
                        const payload = KJUR.jws.JWS.readSafeJSONString(userKey.split('.')[1]);
                        if (payload.id === currentId) {
                            // ✅ ÉXITO V2
                            localStorage.setItem('listo_license_key', userKey);
                            window.location.reload();
                            return;
                        } else {
                            throw new Error("Esta licencia pertenece a OTRO equipo (ID Mismatch).");
                        }
                    } else {
                        throw new Error("Firma digital corrupta o inválida.");
                    }
                } else {
                    // Intento 2: Legacy (V1 - Hash)
                    // TODO: Eliminar en Q4-2026
                    // [FIX M1] Salt desde módulo compartido
                    const msgBuffer = new TextEncoder().encode(currentId + LICENSE_SALT_LEGACY);
                    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
                    const hashArray = Array.from(new Uint8Array(hashBuffer));
                    const expectedLicense = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

                    if (userKey.toUpperCase() === expectedLicense) {
                        localStorage.setItem('listo_license_key', userKey.toUpperCase());
                        window.location.reload();
                        return;
                    } else {
                        throw new Error("Código de activación incorrecto.");
                    }
                }

            } catch (validationError) {
                console.error("Validation failed:", validationError);
                setActivationError(validationError.message || "Licencia inválida.");
                setIsUnlocking(false);
            }

        } catch (error) {
            console.error("Lock system error", error);
            setActivationError("Error del sistema de seguridad.");
            setIsUnlocking(false);
        }
    };

    if (localStatus === 'unauthorized') {
        return (
            <div className="h-screen w-screen bg-[#0f172a] flex items-center justify-center p-6 z-50 fixed inset-0 font-sans">
                {/* Decoration Background */}
                <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900/20 to-transparent pointer-events-none"></div>

                <div className="max-w-5xl w-full bg-slate-900 border border-slate-700/50 rounded-3xl shadow-2xl flex overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">

                    {/* LEFT PANEL: INFO */}
                    <div className="w-2/5 bg-slate-950 p-12 flex flex-col justify-between relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-32 -mt-32"></div>

                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-900/50">
                                <Server className="text-white w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black text-white mb-4 tracking-tight leading-tight">
                                Activación de<br />Nuevo Terminal
                            </h2>
                            <p className="text-slate-400 text-sm leading-relaxed mb-4">
                                El sistema ha detectado un cambio de hardware o una nueva instalación. Por seguridad, se requiere una reactivación manual.
                            </p>
                            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between gap-3 group/copy">
                                <div className="min-w-0 flex-1">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mb-1 tracking-wider">HARDWARE ID DETECTADO</p>
                                    <p
                                        className="font-mono text-xs text-blue-400 break-all select-all hover:text-white transition-colors cursor-pointer"
                                        onClick={() => {
                                            navigator.clipboard.writeText(machineId);
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                    >
                                        {machineId || 'Generando ID...'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(machineId);
                                        setCopied(true);
                                        setTimeout(() => setCopied(false), 2000);
                                    }}
                                    className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors shrink-0"
                                    title="Copiar ID"
                                >
                                    {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                        <div className="relative z-10 pt-12">
                            <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold flex items-center gap-2">
                                <ShieldCheck size={12} className="text-emerald-500" />
                                Sistema Protegido por Fénix
                            </p>
                        </div>
                    </div>

                    {/* RIGHT PANEL: FORM */}
                    <div className="w-3/5 bg-slate-900 p-12 flex flex-col justify-center relative">
                        <div className="max-w-md mx-auto w-full space-y-8">

                            <div className="text-center">
                                <h3 className="text-2xl font-bold text-white mb-2">Ingresa tu Llave</h3>
                                <p className="text-slate-400 text-sm">
                                    Introduce la licencia generada desde el panel Master.
                                </p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                        Llave de Activación (JWT)
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <Key className="h-5 w-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
                                        </div>
                                        <input
                                            type="text"
                                            value={inputCode}
                                            onChange={(e) => {
                                                setInputCode(e.target.value);
                                                setActivationError(null); // Limpiar error al escribir
                                            }}
                                            onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                                            disabled={isUnlocking}
                                            className={`block w-full pl-11 bg-slate-950 border ${activationError ? 'border-red-500' : 'border-slate-800 group-focus-within:border-blue-500'} rounded-xl py-4 text-white placeholder-slate-600 focus:ring-1 focus:ring-blue-500/20 focus:outline-none transition-all font-mono text-sm`}
                                            placeholder="Pegue su licencia aquí..."
                                        />
                                    </div>
                                    {activationError && (
                                        <div className="flex items-center gap-2 text-red-500 text-xs font-bold animate-in slide-in-from-left-2 mt-2 ml-1">
                                            <AlertCircle size={14} />
                                            {activationError}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleUnlock}
                                    disabled={isUnlocking || !inputCode}
                                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isUnlocking ? (
                                        <span className="animate-pulse">Validando Criptografía...</span>
                                    ) : (
                                        <>
                                            ACTIVAR TERMINAL <ArrowRight size={18} />
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* ═══ SEPARADOR + MULTI-CAJA ═══ */}
                            <div className="pt-6 border-t border-slate-800 space-y-4">
                                {!multiCajaMode ? (
                                    <div className="flex flex-col items-center gap-3">
                                        <p className="text-xs text-slate-500">
                                            ¿No tienes una licencia? Contacta a tu proveedor.
                                        </p>
                                        <button
                                            onClick={() => { setMultiCajaMode(true); setSosMode(false); }}
                                            className="flex items-center gap-2 text-xs font-bold text-emerald-500/70 hover:text-emerald-400 uppercase tracking-widest transition-colors py-2 cursor-pointer"
                                        >
                                            <Wifi size={14} /> Activar como Caja Secundaria (Multi-Caja)
                                        </button>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-950/30 p-6 rounded-2xl border border-emerald-800/50 animate-in slide-in-from-bottom-4 space-y-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 bg-emerald-600/20 rounded-lg">
                                                <Monitor size={18} className="text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">Caja Secundaria</p>
                                                <p className="text-xs text-slate-400">Ingresa la IP del servidor principal</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                                IP de la Caja Principal
                                            </label>
                                            <input
                                                type="text"
                                                value={serverIP}
                                                onChange={(e) => { setServerIP(e.target.value); setMultiCajaError(null); }}
                                                onKeyDown={(e) => e.key === 'Enter' && handleMultiCajaActivation()}
                                                disabled={multiCajaStatus === 'connecting' || multiCajaStatus === 'success'}
                                                className="w-full bg-slate-950 border border-slate-700 text-white font-mono text-sm py-3 px-4 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-600"
                                                placeholder="Ej: 192.168.1.100"
                                            />
                                        </div>

                                        {multiCajaError && (
                                            <div className="flex items-center gap-2 text-red-400 text-xs font-bold bg-red-950/40 px-3 py-2 rounded-lg">
                                                <AlertCircle size={14} /> {multiCajaError}
                                            </div>
                                        )}

                                        {multiCajaStatus === 'success' && (
                                            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold bg-emerald-950/40 px-3 py-2 rounded-lg">
                                                <Check size={14} /> ¡Licencia recibida! Reiniciando...
                                            </div>
                                        )}

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setMultiCajaMode(false); setMultiCajaError(null); setMultiCajaStatus(''); }}
                                                disabled={multiCajaStatus === 'connecting' || multiCajaStatus === 'success'}
                                                className="flex-1 py-3 rounded-lg border border-slate-700 text-slate-400 hover:bg-slate-800 font-bold text-sm transition-colors disabled:opacity-50"
                                            >
                                                CANCELAR
                                            </button>
                                            <button
                                                onClick={handleMultiCajaActivation}
                                                disabled={!serverIP.trim() || multiCajaStatus === 'connecting' || multiCajaStatus === 'success'}
                                                className="flex-1 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                            >
                                                {multiCajaStatus === 'connecting' ? (
                                                    <><Loader2 size={16} className="animate-spin" /> CONECTANDO...</>
                                                ) : multiCajaStatus === 'success' ? (
                                                    <><Check size={16} /> ACTIVADO</>
                                                ) : (
                                                    <><Wifi size={16} /> VINCULAR</>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 4. AUTHORIZED & SAFE
    return <>{children}</>;
}
