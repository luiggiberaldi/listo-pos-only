import React, { useState, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { useSecurityInsights } from '../../hooks/security/useSecurityInsights';
import { ShieldAlert, X, Info } from 'lucide-react';

const SESSION_KEY = 'listo_security_advisory_seen';

/**
 * SecurityAdvisory: Componente informativo para Administradores.
 * Muestra métricas de riesgo acumulado sin bloquear la operación.
 */
const SecurityAdvisory = () => {
  const { usuario } = useStore();
  const { legacyPinUsage, riskLevel } = useSecurityInsights();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Filtro de Rol: SOLO ADMINS (Soporte Legacy 'role' y Moderno 'tipo')
    const esAdmin = usuario?.role === 'admin' || usuario?.tipo === 'ADMIN';
    if (!esAdmin) return;

    // 2. Filtro de Sesión: Una vez por sesión de navegador
    const yaVisto = sessionStorage.getItem(SESSION_KEY);
    if (yaVisto) return;

    // 3. Filtro de Riesgo: Solo si hay algo que reportar
    if (riskLevel !== 'NONE') {
      // Pequeño delay para no competir con animaciones de entrada del dashboard
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [usuario, riskLevel]);

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem(SESSION_KEY, 'true'); // Marcar como visto
  };

  if (!isVisible) return null;

  // Configuración visual según nivel de riesgo
  const config = {
    LOW: { color: 'border-blue-500', bg: 'bg-blue-50', iconColor: 'text-blue-600', title: 'Aviso de Seguridad' },
    MEDIUM: { color: 'border-orange-500', bg: 'bg-orange-50', iconColor: 'text-orange-600', title: 'Riesgo Moderado' },
    HIGH: { color: 'border-red-500', bg: 'bg-red-50', iconColor: 'text-red-600', title: 'Atención Requerida' }
  };

  const style = config[riskLevel] || config.LOW;

  return (
    <div className="absolute top-4 right-4 z-[60] w-full max-w-sm animate-in slide-in-from-right fade-in duration-700">
      <div className={`bg-white border-l-4 ${style.color} shadow-2xl rounded-r-xl p-4 flex items-start gap-3 ring-1 ring-black/5`}>

        <div className={`p-2 rounded-full ${style.bg} ${style.iconColor} shrink-0 mt-3`}>
          {riskLevel === 'HIGH' ? <ShieldAlert size={20} /> : <Info size={20} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              {style.title}
            </h4>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            Se han detectado <strong>{legacyPinUsage}</strong> operaciones realizadas con credenciales heredadas (4 dígitos).
          </p>

          <p className="text-[10px] text-slate-400 mt-2 font-medium">
            Recomendación: Actualice a PINs de 6 dígitos.
          </p>
        </div>

        <button
          onClick={handleDismiss}
          className="text-slate-300 hover:text-slate-500 transition-colors p-1"
          aria-label="Cerrar aviso"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default SecurityAdvisory;