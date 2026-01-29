// ✅ SYSTEM IMPLEMENTATION - V. 2.6 (UX REFACTOR + TOKENS)
// Archivo: src/pages/config/ConfigSalud.jsx
// Autorizado por Auditor en Fase 3 (Data Integrity)
// Rastro: Sistema de Respaldo Unificado (Snapshot V2) con corrección de llaves críticas.

import React, { useState, useEffect, useRef } from 'react';
import {
  HardDrive, Trash2, Activity, Zap, ShieldCheck, Database,
  Download, Upload, AlertTriangle, CheckCircle2, FileJson,
  Cloud, CloudDownload, CloudUpload
} from 'lucide-react';
import Swal from 'sweetalert2';
import { useDataArchiving } from '../../hooks/management/useDataArchiving';
import { useSecureAction } from '../../hooks/security/useSecureAction';
import { PERMISOS } from '../../hooks/store/useRBAC';
import { useStore } from '../../context/StoreContext';
import { db } from '../../db';
import { useCloudBackup } from '../../hooks/safety/useCloudBackup'; // 🛡️ FIRESTORE BACKUP
import { useDataPersistence } from '../../hooks/store/useDataPersistence'; // ✅ UNIFIED BACKUP HOOK

/**
 * ConfigSalud.jsx - V. 2.6
 * Monitor de Signos Vitales + CAJA NEGRA (Centro de Respaldo).
 * Refactorizado con Tokens de Diseño Semánticos.
 * [SYSTEM REFRESH: Visual Update Enforced]
 */
const ConfigSalud = ({ readOnly }) => {
  const { ventas, configuracion, guardarConfiguracion, getSystemID } = useStore();
  const { ejecutarAccionSegura } = useSecureAction();
  const { subirRespaldo, restaurarRespaldo } = useCloudBackup();
  const { exportarDatos, importarDatos } = useDataPersistence(); // ✅ Hook integration

  const {
    verificarSaludAlmacenamiento,
    archivarVentasViejas,
    ejecutarLimpiezaSilenciosa,
    autoArchivado,
    setAutoArchivado
  } = useDataArchiving();

  const [stats, setStats] = useState(null);
  const [loadingArchive, setLoadingArchive] = useState(false);
  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState(null);
  const fileInputRef = useRef(null);

  const hasRunAutoCheck = useRef(false);

  // 0. FETCH LAST BACKUP HEARTBEAT
  useEffect(() => {
    const checkBackup = async () => {
      try {
        const snap = await db.config.get('backup_snapshot_v1');
        // Si no hay snapshot local, podríamos chequear la nube, 
        // pero por ahora mantenemos el heartbeat local para estabilidad
        if (snap?.timestamp) setLastBackupTime(snap.timestamp);
      } catch (e) { console.error("Error checking backup heartbeat", e); }
    };
    checkBackup();
    const interval = setInterval(checkBackup, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // 1. MONITOR DE SIGNOS VITALES
  useEffect(() => {
    const currentStats = verificarSaludAlmacenamiento();
    setStats(currentStats);

    const umbralAuto = currentStats.limiteMaximoMB === 50 ? 5000 : 1500;
    if (autoArchivado && currentStats.totalVentas > umbralAuto && !hasRunAutoCheck.current) {
      console.log("⚡ [SISTEMA] Ejecutando limpieza silenciosa programada...");
      ejecutarLimpiezaSilenciosa(30);
      hasRunAutoCheck.current = true;
    }
  }, [ventas, autoArchivado, verificarSaludAlmacenamiento, ejecutarLimpiezaSilenciosa]);

  // 2. PURGA MANUAL
  const handleArchivar = () => {
    if (readOnly) return;
    ejecutarAccionSegura({
      permiso: PERMISOS.ADMIN_CONFIG,
      nombreAccion: 'Purga de Base de Datos',
      accion: async () => {
        const { value: dias } = await Swal.fire({
          title: 'Mantenimiento Profundo',
          html: `
            <div class="text-left text-sm text-slate-600 dark:text-slate-300">
              <p class="mb-2">Esta acción moverá las ventas antiguas a un archivo histórico.</p>
              <ul class="list-disc pl-4 space-y-1 mb-4">
                <li>Las ventas a <strong>Crédito (Deuda)</strong> NO se tocarán.</li>
                <li>Se generará un respaldo JSON automático antes de borrar.</li>
              </ul>
              <label class="block font-bold text-xs uppercase text-slate-400 mb-1">Días a conservar</label>
            </div>
          `,
          input: 'number',
          inputValue: 30,
          showCancelButton: true,
          confirmButtonText: 'INICIAR LIMPIEZA',
          confirmButtonColor: '#ef4444'
        });

        if (dias) {
          setLoadingArchive(true);
          try {
            const res = await archivarVentasViejas(parseInt(dias));
            Swal.fire({ icon: 'success', title: 'Optimización Completada', text: `Registros archivados: ${res.procesados}` });
            hasRunAutoCheck.current = false;
            setStats(verificarSaludAlmacenamiento());
          } catch (e) { Swal.fire('Error', e.message, 'error'); }
          finally { setLoadingArchive(false); }
        }
      }
    });
  };

  // ===========================================================================
  // ⏳ 3. MOTOR DE CÁPSULA DEL TIEMPO (TIME CAPSULE)
  // ===========================================================================

  const handleCloudBackup = async () => {
    const machineId = getSystemID();
    ejecutarAccionSegura({
      permiso: PERMISOS.ADMIN_CONFIG,
      nombreAccion: 'Respaldo Maestro en Firestore',
      accion: async () => {
        setIsCloudLoading(true);
        try {
          const res = await subirRespaldo(machineId);
          if (res.success) {
            const now = new Date().toISOString();
            await db.config.put({ key: 'backup_snapshot_v1', timestamp: now });
            setLastBackupTime(now);

            Swal.fire({
              icon: 'success',
              title: 'Nube Sincronizada',
              text: `Respaldo exitoso (${res.size}). Datos blindados en Firestore.`,
              timer: 3000
            });
          }
        } catch (error) {
          Swal.fire('Error de Nube', error.message, 'error');
        } finally {
          setIsCloudLoading(false);
        }
      }
    });
  };

  const handleCloudRestore = async () => {
    const machineId = getSystemID();
    ejecutarAccionSegura({
      permiso: PERMISOS.CONF_SISTEMA_EDITAR,
      nombreAccion: 'Restauración desde Firestore',
      accion: async () => {
        const { isConfirmed } = await Swal.fire({
          title: '¿Restaurar desde la Nube?',
          html: `
            <div class="text-left bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-indigo-900 text-sm">
              <p class="font-bold mb-2">⚠ DESCARGA DE DATOS</p>
              <p>Se descargarán las ventas, inventario y usuarios desde Firestore.</p>
              <p class="mt-2 font-bold">El sistema se reiniciará al finalizar.</p>
            </div>
          `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'INICIAR DESCARGA',
          confirmButtonColor: '#4f46e5'
        });

        if (isConfirmed) {
          setIsCloudLoading(true);
          try {
            await restaurarRespaldo(machineId);
            Swal.fire({
              title: 'Restaurando...',
              timer: 2000,
              didOpen: () => Swal.showLoading()
            }).then(() => {
              window.location.reload();
            });
          } catch (error) {
            Swal.fire('Error', error.message, 'error');
          } finally {
            setIsCloudLoading(false);
          }
        }
      }
    });
  };

  // ✅ UNIFIED EXPORT
  const handleExportarLocal = () => {
    exportarDatos();
  };

  // ✅ UNIFIED IMPORT
  const handleImportarClick = () => {
    if (readOnly) return;
    fileInputRef.current.click();
  };

  const procesarImportacionLocal = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      await importarDatos(e.target.result);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // --- UI COMPONENTS (TOKENIZED) ---
  const StorageDNA = ({ percent }) => {
    const segments = Array.from({ length: 20 });
    const filledSegments = Math.round((percent / 100) * 20);
    return (
      <div className="flex gap-1 h-3 w-full">
        {segments.map((_, i) => (
          <div key={i} className={`flex-1 rounded-sm transition-all duration-500 ${i < filledSegments ? (percent > 80 ? 'bg-status-danger' : percent > 50 ? 'bg-status-warning' : 'bg-primary') : 'bg-app-light dark:bg-slate-700'}`} />
        ))}
      </div>
    );
  };

  const CircularMetric = ({ icon: Icon, label, value, colorClass, subText }) => (
    <div className="bg-surface-light dark:bg-surface-dark p-4 rounded-2xl border border-border-subtle dark:border-slate-700/50 shadow-sm flex items-center gap-4 relative overflow-hidden group">
      <div className={`p-3 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
        <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
      </div>
      <div>
        <p className="text-[10px] font-black text-content-secondary uppercase tracking-widest">{label}</p>
        <p className="text-lg font-bold text-content-main dark:text-content-inverse">{value}</p>
        {subText && <p className="text-[10px] text-content-secondary font-medium">{subText}</p>}
      </div>
    </div>
  );

  if (!stats) return <div className="p-10 text-center text-content-secondary animate-pulse font-mono text-xs">INITIALIZING SYSTEM DIAGNOSTICS...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto animate-fade-in pb-10">

      {/* 🛑 HIDDEN INPUT FOR IMPORTS - RESTORED */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={procesarImportacionLocal}
        style={{ display: 'none' }}
        accept=".json"
      />

      {/* HEADER: ENGINE HUD (TOKENIZED) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CircularMetric icon={Activity} label="Integridad" value={stats.status === 'HEALTHY' ? 'ÓPTIMO' : 'REVISAR'} colorClass={stats.status === 'HEALTHY' ? 'bg-status-success' : 'bg-status-danger'} subText="Sistema de archivos estable" />
        <CircularMetric icon={Zap} label="Rendimiento" value={stats.saturacion < 50 ? 'ALTO' : 'MEDIO'} colorClass="bg-primary" subText="Latencia de escritura baja" />
        <CircularMetric icon={ShieldCheck} label="Seguridad" value="ACTIVA" colorClass="bg-primary" subText="Protocolo Fénix v4" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* PANEL IZQUIERDO: VISUALIZACIÓN (TOKENIZED) */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-[1.5rem] border border-border-subtle dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-bold flex items-center gap-2 text-content-main dark:text-content-inverse uppercase tracking-wide">
              <Database size={18} className="text-primary" /> Almacenamiento Local
            </h2>
            <span className="px-2 py-1 bg-primary-light/20 text-primary text-xs font-bold rounded-md">
              {stats.pesoEstimadoMB} MB / {stats.limiteMaximoMB} MB
            </span>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[10px] font-bold text-content-secondary mb-2 uppercase"><span>Espacio Usado</span><span>{Math.round(stats.saturacion)}% Saturación</span></div>
              <StorageDNA percent={stats.saturacion} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
              <div className="p-4 bg-app-light dark:bg-app-dark rounded-xl border border-border-subtle dark:border-slate-700/50">
                <p className="text-[10px] font-bold text-content-secondary uppercase mb-1">Registros Totales</p>
                <p className="text-2xl font-black text-content-main dark:text-content-inverse">{stats.totalVentas}</p>
              </div>
              <div className="p-4 bg-status-successBg/30 dark:bg-emerald-900/10 rounded-xl border border-status-successBg dark:border-emerald-800/30 flex flex-col justify-between">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-bold text-status-success dark:text-emerald-400 uppercase whitespace-nowrap">Piloto Automático</span>
                  <button role="switch" aria-checked={autoArchivado} onClick={() => !readOnly && setAutoArchivado(!autoArchivado)} className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${autoArchivado ? 'bg-status-success' : 'bg-slate-300 dark:bg-slate-600'}`}>
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${autoArchivado ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-500 mt-2 leading-tight">Purga automática activa.</p>
              </div>

              {/* --- NUEVO: PAUSA DE SINCRONIZACIÓN (TOKENIZED) --- */}
              <div className="md:col-span-2 p-4 bg-primary-light/20 dark:bg-indigo-900/10 rounded-xl border border-primary-light/30 dark:border-indigo-800/30 flex flex-wrap items-center justify-between gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 mb-1">
                    <Upload size={14} className="text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase">Sincronización Nube</span>
                  </div>
                  <p className="text-[10px] text-content-secondary">
                    Envío de datos en tiempo real al Companion App.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-primary uppercase whitespace-nowrap">
                    {configuracion?.pausarSync ? '⏸️ PAUSADO' : '⚡ ACTIVO'}
                  </span>
                  <button
                    role="switch"
                    aria-checked={configuracion?.pausarSync}
                    onClick={() => {
                      if (!readOnly) guardarConfiguracion({ ...configuracion, pausarSync: !configuracion?.pausarSync });
                    }}
                    className={`w-10 h-5 rounded-full transition-colors relative shrink-0 ${!configuracion?.pausarSync ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform shadow-sm ${!configuracion?.pausarSync ? 'left-6' : 'left-1'}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: MANTENIMIENTO (TOKENIZED) */}
        <div className="bg-surface-light dark:bg-surface-dark p-6 rounded-[1.5rem] border border-border-subtle dark:border-slate-700/50 shadow-sm flex flex-col">
          <h2 className="text-sm font-bold flex items-center gap-2 mb-4 text-content-main dark:text-content-inverse uppercase tracking-wide">
            <Trash2 size={18} className="text-primary" /> Mantenimiento Profundo
          </h2>
          <div className="bg-app-light dark:bg-slate-900/50 p-4 rounded-xl mb-auto space-y-3">
            <div className="flex items-start gap-3"><CheckCircle2 size={16} className="text-status-success mt-0.5" /><p className="text-xs text-content-secondary">Snapshot automático antes de borrar.</p></div>
            <div className="flex items-start gap-3"><CheckCircle2 size={16} className="text-status-success mt-0.5" /><p className="text-xs text-content-secondary">Protección de Deudas activa.</p></div>
          </div>
          <div className="mt-6">
            <button onClick={handleArchivar} disabled={loadingArchive || stats.totalVentas === 0 || readOnly} className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 border ${loadingArchive ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-surface-light border-border-subtle text-content-main hover:bg-status-dangerBg hover:border-status-danger hover:text-status-danger dark:bg-slate-800 dark:border-slate-700 dark:text-content-inverse dark:hover:bg-red-900/20 dark:hover:text-red-400'} disabled:opacity-50 disabled:cursor-not-allowed`}>
              {loadingArchive ? 'OPTIMIZANDO...' : 'OPTIMIZAR BASE DE DATOS'}
            </button>
          </div>
        </div>
      </div>

      {/* FOOTER: CENTRO DE BLINDAJE MAESTRO (PREMIUM UI) */}
      <div className="bg-[#0f172a] dark:bg-black p-6 md:p-10 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.07] transition-all duration-700 scale-150 rotate-12">
          <ShieldCheck size={180} />
        </div>

        <div className="flex flex-col xl:flex-row items-center justify-between gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-3xl border border-primary/20 shadow-inner">
              <Cloud size={32} className="text-primary-light animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight">Blindaje Maestro (Nube)</h3>
              <p className="text-slate-400 text-sm mt-1 max-w-md leading-relaxed">
                Módulo de preservación digital. Tus ventas, inventarios y clientes protegidos por siempre en la nube.
              </p>
              {lastBackupTime && (
                <div className="flex items-center gap-2 mt-4 py-1.5 px-3 bg-status-success/10 border border-status-success/20 rounded-full w-fit">
                  <div className="w-1.5 h-1.5 bg-status-success rounded-full animate-pulse"></div>
                  <span className="text-status-success text-[10px] uppercase font-black tracking-[0.1em]">
                    Sincronizado: {new Date(lastBackupTime).toLocaleDateString()} {new Date(lastBackupTime).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center bg-white/5 p-2 rounded-[1.5rem] border border-white/5 backdrop-blur-sm">
            {/* MÓDULO LOCAL */}
            <div className="flex items-center bg-black/40 p-1 rounded-xl border border-white/10 h-11">
              <button
                onClick={handleImportarClick}
                className="px-5 py-2 hover:bg-white/5 text-slate-300 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Download size={14} className="rotate-180 opacity-60" /> Importar
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
              <button
                onClick={handleExportarLocal}
                className="px-5 py-2 hover:bg-white/5 text-slate-300 hover:text-white rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2"
              >
                <Download size={14} className="opacity-60" /> Exportar
              </button>
            </div>

            {/* ACCIONES NUBE */}
            <button
              onClick={handleCloudRestore}
              disabled={readOnly || isCloudLoading}
              className="px-6 py-2.5 bg-white/5 hover:bg-indigo-500/20 border border-white/10 hover:border-indigo-500/30 rounded-xl font-black text-[10px] uppercase tracking-[0.15em] transition-all flex items-center gap-3 active:scale-95 h-11"
            >
              <CloudDownload size={16} className="text-indigo-400" /> RESTAURAR
            </button>

            <button
              onClick={handleCloudBackup}
              disabled={isCloudLoading}
              className="px-8 py-2.5 bg-primary hover:bg-primary-hover rounded-xl font-black text-[11px] uppercase tracking-[0.15em] transition-all shadow-xl shadow-primary/20 flex items-center gap-3 active:scale-95 disabled:opacity-50 h-11 group/btn"
            >
              {isCloudLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CloudUpload size={18} className="group-hover/btn:-translate-y-0.5 transition-transform" />
              )}
              {isCloudLoading ? 'GUARDANDO...' : 'GUARDAR AHORA'}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ConfigSalud;