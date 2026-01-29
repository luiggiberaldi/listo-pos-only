import React, { useState, useEffect } from 'react';
import { ShieldBan, ArrowUpCircle, LockKeyhole, AlertOctagon } from 'lucide-react';
import { usePinUpgrade } from '../../hooks/security/usePinUpgrade';
import { useSecurityAudit } from '../../hooks/security/useSecurityAudit';
import { useStore } from '../../context/StoreContext';

/**
 * SecurityCriticalGate: Modal de Migración Obligatoria Diferida (Fase 4.3).
 * Intercepta el flujo cuando la política es MIGRATION_REQUIRED.
 * NO ES DESCARTABLE (Non-Dismissable).
 */
const SecurityCriticalGate = () => {
  const { usuario } = useStore();
  const { iniciarMigracion, isUpgrading } = usePinUpgrade();
  const { registrarEventoSeguridad } = useSecurityAudit();
  
  const [isOpen, setIsOpen] = useState(false);
  const [blockedAction, setBlockedAction] = useState(null);

  useEffect(() => {
    // Escucha el evento disparado por useSecureAction
    const handleTrigger = (event) => {
      const actionName = event.detail?.actionName || 'Acción Crítica';
      setBlockedAction(actionName);
      setIsOpen(true);

      // Auditoría de Enforcement
      registrarEventoSeguridad({
        tipo: 'SECURITY_ENFORCEMENT',
        subTipo: 'MIGRATION_GATE_ACTIVATED',
        usuarioId: usuario?.id,
        contexto: 'CRITICAL_RISK_BLOCK',
        metadata: { 
          action: actionName,
          reason: 'MANDATORY_UPGRADE_PENDING'
        }
      });
    };

    window.addEventListener('SECURITY_MIGRATION_REQUIRED_TRIGGER', handleTrigger);
    return () => window.removeEventListener('SECURITY_MIGRATION_REQUIRED_TRIGGER', handleTrigger);
  }, [registrarEventoSeguridad, usuario]);

  const handleUpgrade = async () => {
    // Ocultamos temporalmente este modal para mostrar el SweetAlert de upgrade
    setIsOpen(false); 
    
    // Iniciamos flujo Fase 4.0
    await iniciarMigracion();
    
    // Nota: Si el upgrade es exitoso, el estado global cambia y este componente ya no se activa.
    // Si cancela el upgrade, la próxima acción crítica volverá a disparar este gate.
  };

  const handleCancel = () => {
    // Única salida: Cancelar la intención de la acción.
    setIsOpen(false);
    setBlockedAction(null);
  };

  if (!isOpen || isUpgrading) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border-2 border-red-600 ring-4 ring-red-500/20 transform scale-100 transition-all">
        
        {/* Header de Bloqueo */}
        <div className="bg-red-600 px-6 py-6 flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-full animate-pulse">
            <ShieldBan size={32} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-wider">
              Acción Detenida
            </h2>
            <p className="text-red-100 text-xs font-bold mt-1">
              POLÍTICA DE SEGURIDAD OBLIGATORIA
            </p>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="p-8">
          <div className="mb-6 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 p-4 rounded-xl flex items-start gap-3">
            <AlertOctagon size={20} className="text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm text-red-800 dark:text-red-200 font-bold">
                Bloqueo: "{blockedAction}"
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                Has pospuesto la actualización de seguridad demasiadas veces.
              </p>
            </div>
          </div>

          <div className="space-y-4 mb-8">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
              <LockKeyhole size={16} /> Requerimiento Inmediato
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed text-justify">
              Para proteger la integridad financiera del negocio, el sistema requiere que actualices tu credencial a un <strong>PIN de 6 dígitos</strong> ahora mismo. No podrás continuar con esta operación hasta hacerlo.
            </p>
          </div>

          {/* Botones de Acción - SIN "MÁS TARDE" */}
          <div className="flex flex-col gap-3">
            <button 
              onClick={handleUpgrade}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-base shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <ArrowUpCircle size={20} />
              ACTUALIZAR Y CONTINUAR
            </button>
            
            <button 
              onClick={handleCancel}
              className="w-full py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded-lg"
            >
              CANCELAR OPERACIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityCriticalGate;