import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useSecurityReport } from '../../hooks/security/useSecurityReport';
import { ShieldCheck, ShieldAlert, Activity, FileText, X, AlertTriangle, Info } from 'lucide-react';

const REPORT_SESSION_KEY = 'listo_security_report_seen_v1';

/**
 * SecurityReportPanel: Dashboard Ejecutivo Flotante.
 * Muestra un resumen de seguridad al inicio de la sesión del administrador.
 */
const SecurityReportPanel = () => {
  const { usuario } = useStore();
  const { riskLevel, weakPinCount, uniqueUsersAffected, recentEvents, loading } = useSecurityReport();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Solo para ADMINS (Soporte Legacy y Moderno)
    const esAdmin = usuario?.role === 'admin' || usuario?.tipo === 'ADMIN';
    if (!esAdmin) return;

    // 2. Solo si hay datos relevantes (Riesgo detectado)
    if (loading || riskLevel === 'NONE') return;

    // 3. Una vez por sesión
    const yaVisto = sessionStorage.getItem(REPORT_SESSION_KEY);
    if (!yaVisto) {
      // Delay para no saturar el inicio de sesión visualmente
      const timer = setTimeout(() => setIsVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [usuario, riskLevel, loading]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(REPORT_SESSION_KEY, 'true');
  };

  if (!isVisible) return null;

  // Configuración de Estilo según Riesgo
  const styles = {
    LOW: { border: 'border-blue-500', icon: Info, color: 'text-blue-600', bg: 'bg-blue-50' },
    MEDIUM: { border: 'border-orange-500', icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    HIGH: { border: 'border-red-600', icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' }
  };

  const style = styles[riskLevel] || styles.LOW;
  const Icon = style.icon;

  return (
    <div className="fixed bottom-4 right-4 z-[70] w-full max-w-md animate-in slide-in-from-bottom-10 duration-700">
      <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-2xl border-l-8 ${style.border} overflow-hidden ring-1 ring-black/5`}>
        
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${style.bg} ${style.color}`}>
              <Icon size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Informe de Seguridad
              </h3>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Resumen de Actividad Sospechosa
              </p>
            </div>
          </div>
          <button onClick={handleDismiss} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* BODY - METRICAS */}
        <div className="p-5 grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-2xl font-black text-slate-800 dark:text-white mb-1">{weakPinCount}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-center items-center gap-1">
              <Activity size={10} /> Accesos Débiles
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-center">
            <div className="text-2xl font-black text-slate-800 dark:text-white mb-1">{uniqueUsersAffected}</div>
            <div className="text-[10px] font-bold text-slate-500 uppercase flex justify-center items-center gap-1">
              <ShieldCheck size={10} /> Usuarios Afectados
            </div>
          </div>
        </div>

        {/* FOOTER - LISTA EVENTOS */}
        <div className="bg-slate-50 dark:bg-slate-900/30 px-5 py-3 border-t border-slate-100 dark:border-slate-700">
          <div className="text-[10px] font-bold text-slate-400 uppercase mb-2 flex items-center gap-2">
            <FileText size={12} /> Actividad Reciente
          </div>
          <div className="space-y-1.5">
            {recentEvents.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Sin actividad reciente.</p>
            ) : (
              recentEvents.map((evt) => (
                <div key={evt.id} className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-300">
                  <span className="font-mono bg-white dark:bg-slate-800 px-1.5 rounded border border-slate-200 dark:border-slate-700 text-[10px]">
                    {evt.contexto}
                  </span>
                  <span>{evt.fecha}</span>
                </div>
              ))
            )}
          </div>
          
          <div className={`mt-3 text-[10px] text-center font-bold py-1 px-2 rounded ${style.bg} ${style.color}`}>
            {riskLevel === 'HIGH' 
              ? "⚠️ ALTO RIESGO: Se recomienda rotación inmediata de PINs." 
              : "ℹ️ Mantenimiento preventivo sugerido."}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityReportPanel;