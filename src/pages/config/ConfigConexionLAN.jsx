// ✅ SYSTEM IMPLEMENTATION - V. 1.0
// Archivo: src/pages/config/ConfigConexionLAN.jsx
// UI para configurar Multi-Caja (LAN Sync)

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Monitor, MonitorSmartphone, CheckCircle, XCircle, Loader2, Cable, RefreshCw } from 'lucide-react';
import { pingServer } from '../../services/lanSyncService';

export default function ConfigConexionLAN({ onConfigChange }) {
    const [role, setRole] = useState('principal'); // principal | secundaria
    const [targetIP, setTargetIP] = useState('');
    const [localIP, setLocalIP] = useState('...');
    const [testStatus, setTestStatus] = useState(null); // null | testing | success | error
    const [serverInfo, setServerInfo] = useState(null);
    const [saving, setSaving] = useState(false);

    // Detectar IP local via WebRTC (fallback cuando Electron no está disponible)
    const detectLocalIP = () => {
        return new Promise((resolve) => {
            try {
                const pc = new RTCPeerConnection({ iceServers: [] });
                pc.createDataChannel('');
                pc.createOffer().then(offer => pc.setLocalDescription(offer));
                pc.onicecandidate = (e) => {
                    if (!e || !e.candidate) return;
                    const match = e.candidate.candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                    if (match && match[1] !== '0.0.0.0') {
                        pc.close();
                        resolve(match[1]);
                    }
                };
                // Timeout fallback
                setTimeout(() => { pc.close(); resolve(null); }, 3000);
            } catch { resolve(null); }
        });
    };

    // Cargar configuración persistente
    useEffect(() => {
        (async () => {
            // Cargar config guardada
            if (window.electronAPI?.lanGetConfig) {
                try {
                    const config = await window.electronAPI.lanGetConfig();
                    if (config) {
                        setRole(config.role || 'principal');
                        setTargetIP(config.targetIP || '');
                    }
                } catch (e) {
                    console.warn('⚠️ No se pudo cargar config LAN:', e.message);
                }
            }

            // Obtener IP — intentar Electron primero, luego WebRTC
            let ip = null;
            if (window.electronAPI?.lanGetIP) {
                try {
                    ip = await window.electronAPI.lanGetIP();
                } catch (e) {
                    console.warn('⚠️ lanGetIP falló:', e.message);
                }
            }
            if (!ip || ip === '127.0.0.1') {
                ip = await detectLocalIP();
            }
            setLocalIP(ip || 'No detectada — conecta un cable de red');
        })();
    }, []);

    // Probar conexión
    const handleTestConnection = async () => {
        if (!targetIP) return;
        setTestStatus('testing');
        setServerInfo(null);

        const result = await pingServer(targetIP);
        if (result) {
            setTestStatus('success');
            setServerInfo(result);
        } else {
            setTestStatus('error');
        }
    };

    // Guardar configuración
    const handleSave = async () => {
        setSaving(true);
        const config = { role, targetIP: role === 'secundaria' ? targetIP : '' };

        if (window.electronAPI?.lanSaveConfig) {
            await window.electronAPI.lanSaveConfig(config);
        }

        // Guardar también en localStorage para que App.jsx lo lea
        localStorage.setItem('listo-lan-config', JSON.stringify(config));

        if (onConfigChange) onConfigChange(config);
        setSaving(false);

        // Notificar
        const Swal = (await import('sweetalert2')).default;
        await Swal.fire({
            icon: 'success',
            title: 'Configuración guardada',
            html: role === 'principal'
                ? `<p>Esta PC es la <b>Caja Principal</b>.</p><p>Las otras cajas deben conectarse a: <code>${localIP}</code></p>`
                : `<p>Esta PC es <b>Caja Secundaria</b>.</p><p>Se conectará a: <code>${targetIP}</code></p><p style="color:#f59e0b;">⚠️ Reinicia la app para aplicar los cambios.</p>`,
            timer: 4000,
            showConfirmButton: false,
        });
    };

    return (
        <div className="space-y-6">
            {/* TÍTULO */}
            <div className="flex items-center gap-3">
                <Cable className="text-primary" size={24} />
                <div>
                    <h3 className="text-lg font-bold text-content-main dark:text-content-inverse">Conexión Multi-Caja</h3>
                    <p className="text-sm text-content-secondary">Sincroniza inventario entre PCs por cable de red (100% offline)</p>
                </div>
            </div>

            {/* SELECTOR DE ROL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Caja Principal */}
                <button
                    onClick={() => setRole('principal')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${role === 'principal'
                        ? 'border-primary bg-primary-light dark:bg-primary/20 ring-2 ring-primary/30'
                        : 'border-border-subtle dark:border-slate-700 hover:border-primary/30'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <Monitor size={28} className={role === 'principal' ? 'text-primary' : 'text-content-secondary'} />
                        <span className="font-bold text-lg text-content-main dark:text-content-inverse">Caja Principal</span>
                        {role === 'principal' && <CheckCircle size={20} className="text-primary ml-auto" />}
                    </div>
                    <p className="text-sm text-content-secondary">
                        Esta PC es el <strong>servidor</strong>. Los productos se gestionan aquí y se envían a las demás cajas.
                    </p>
                </button>

                {/* Caja Secundaria */}
                <button
                    onClick={() => setRole('secundaria')}
                    className={`p-6 rounded-2xl border-2 text-left transition-all ${role === 'secundaria'
                        ? 'border-status-warning bg-status-warningBg dark:bg-yellow-900/20 ring-2 ring-status-warning/30'
                        : 'border-border-subtle dark:border-slate-700 hover:border-status-warning/30'
                        }`}
                >
                    <div className="flex items-center gap-3 mb-3">
                        <MonitorSmartphone size={28} className={role === 'secundaria' ? 'text-status-warning' : 'text-content-secondary'} />
                        <span className="font-bold text-lg text-content-main dark:text-content-inverse">Caja Secundaria</span>
                        {role === 'secundaria' && <CheckCircle size={20} className="text-status-warning ml-auto" />}
                    </div>
                    <p className="text-sm text-content-secondary">
                        Esta PC <strong>recibe</strong> el inventario de la Caja Principal. Puede vender pero no editar productos.
                    </p>
                </button>
            </div>

            {/* INFO PARA PRINCIPAL */}
            {role === 'principal' && (
                <div className="bg-primary-light dark:bg-primary/15 border border-primary/30 dark:border-primary/40 rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-3">
                        <Wifi className="text-primary" size={22} />
                        <span className="font-bold text-primary">Servidor activo</span>
                    </div>
                    <p className="text-sm text-content-secondary mb-3">
                        Las otras cajas deben conectarse a esta dirección:
                    </p>
                    <div className="bg-surface-light dark:bg-surface-dark rounded-xl px-4 py-3 font-mono text-lg font-bold text-center text-primary border border-border-subtle dark:border-slate-700">
                        {localIP}
                    </div>
                    <p className="text-xs text-content-secondary mt-3 text-center">
                        Puerto: 3847 • Conecta ambas PCs con un cable Ethernet al mismo router
                    </p>
                </div>
            )}

            {/* CONFIG PARA SECUNDARIA */}
            {role === 'secundaria' && (
                <div className="bg-status-warningBg dark:bg-yellow-900/20 border border-status-warning/30 dark:border-yellow-800 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-3 mb-1">
                        <WifiOff className="text-status-warning" size={22} />
                        <span className="font-bold text-status-warning">Conectar a Caja Principal</span>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-content-secondary block mb-2">
                            IP de la Caja Principal:
                        </label>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={targetIP}
                                onChange={(e) => setTargetIP(e.target.value)}
                                placeholder="Ej: 192.168.1.100"
                                className="flex-1 px-4 py-3 bg-surface-light dark:bg-surface-dark border border-border-subtle dark:border-slate-700 rounded-xl font-mono text-center text-lg focus:ring-2 focus:ring-status-warning/40 outline-none text-content-main dark:text-content-inverse"
                            />

                            {/* BOTON PROBAR */}
                            <button
                                onClick={handleTestConnection}
                                disabled={!targetIP || testStatus === 'testing'}
                                className="px-5 py-3 bg-status-warning hover:brightness-110 disabled:bg-slate-300 text-content-inverse font-bold rounded-xl transition-all flex items-center gap-2"
                            >
                                {testStatus === 'testing' ? <Loader2 size={18} className="animate-spin" /> : <Wifi size={18} />}
                                Probar
                            </button>
                        </div>

                        {/* 🔍 AUTO ESCANEO */}
                        <div className="mt-2 flex justify-end">
                            <button
                                onClick={async () => {
                                    setTestStatus('testing');
                                    const baseIP = localIP.split('.').slice(0, 3).join('.');
                                    let found = null;

                                    const scan = async (ip) => {
                                        try {
                                            const c = new AbortController();
                                            setTimeout(() => c.abort(), 500);
                                            const r = await fetch(`http://${ip}:3847/api/ping`, { signal: c.signal });
                                            if (r.ok) return ip;
                                        } catch { }
                                        return null;
                                    };

                                    for (let i = 1; i < 255 && !found; i += 20) {
                                        const batch = [];
                                        for (let j = 0; j < 20 && (i + j) < 255; j++) {
                                            batch.push(scan(`${baseIP}.${i + j}`));
                                        }
                                        const results = await Promise.all(batch);
                                        found = results.find(ip => ip) || null;
                                    }

                                    if (found) {
                                        setTargetIP(found);
                                        setTestStatus('success');
                                        const r = await fetch(`http://${found}:3847/api/ping`);
                                        const info = await r.json();
                                        setServerInfo(info);
                                        if (info.lanToken) {
                                            try { localStorage.setItem('listo-lan-auth-token', info.lanToken); } catch { /**/ }
                                        }
                                    } else {
                                        setTestStatus('error');
                                        console.warn("No se encontró ninguna Caja Principal en la red.");
                                    }
                                }}
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                            >
                                <RefreshCw size={14} /> Auto-detectar servidor
                            </button>
                        </div>
                    </div>

                    {/* Resultado del test */}
                    {testStatus === 'success' && serverInfo && (
                        <div className="flex items-center gap-3 p-4 bg-status-successBg dark:bg-status-success/10 border border-status-success/30 rounded-xl">
                            <CheckCircle className="text-status-success" size={20} />
                            <div>
                                <p className="font-bold text-status-success">¡Conexión exitosa!</p>
                                <p className="text-sm text-content-secondary">
                                    {serverInfo.negocio} • {serverInfo.productos} productos
                                </p>
                            </div>
                        </div>
                    )}

                    {testStatus === 'error' && (
                        <div className="flex items-center gap-3 p-4 bg-status-dangerBg dark:bg-status-danger/10 border border-status-danger/30 rounded-xl">
                            <XCircle className="text-status-danger" size={20} />
                            <div>
                                <p className="font-bold text-status-danger">No se pudo conectar</p>
                                <p className="text-sm text-content-secondary">
                                    Verifica estar en la misma red WiFi/Cable.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* BOTÓN GUARDAR */}
            <button
                onClick={handleSave}
                disabled={saving || (role === 'secundaria' && !targetIP)}
                className="w-full py-4 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-content-inverse font-bold rounded-2xl transition-all text-lg flex items-center justify-center gap-3"
            >
                {saving ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle size={20} />}
                Guardar Configuración
            </button>

            {/* INSTRUCTIVO */}
            <div className="bg-app-light dark:bg-app-dark rounded-2xl p-5 border border-border-subtle dark:border-slate-700">
                <p className="font-bold text-sm text-content-main dark:text-content-inverse mb-3">📋 Cómo configurar Multi-Caja:</p>
                <ol className="list-decimal list-inside space-y-2 text-sm text-content-secondary">
                    <li>Conecta ambas PCs al mismo router con cables Ethernet</li>
                    <li>En la <strong>PC principal</strong>, selecciona "Caja Principal" y anota la IP</li>
                    <li>En la <strong>PC secundaria</strong>, selecciona "Caja Secundaria" e ingresa la IP</li>
                    <li>Presiona "Probar" para verificar la conexión</li>
                    <li>Guarda y reinicia la app — los productos se sincronizarán automáticamente</li>
                </ol>
            </div>
        </div>
    );
}
