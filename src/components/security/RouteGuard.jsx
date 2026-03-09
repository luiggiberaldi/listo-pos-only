// ✅ SYSTEM IMPLEMENTATION - V. 1.7 (DYNAMIC FEEDBACK)
// Archivo: src/components/security/RouteGuard.jsx

import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { ShieldAlert, Lock, Home } from 'lucide-react';
import { useMasterTelemetry } from '../../hooks/sync/useMasterTelemetry';

const RouteGuard = ({ children, requiredPermiso }) => {
  const { usuario, tienePermiso } = useStore();
  const location = useLocation();
  const navigate = useNavigate();

  // 🚨 TELEMETRIA DE INTRUSIÓN (EL CHISMOSO)
  // MOVED UP: Hooks must be called before any early return!
  const { reportarIncidente } = useMasterTelemetry();
  const hasReportedRef = React.useRef(false);

  // Efecto lateral para reportar (evita render loops)
  React.useEffect(() => {
    // Only report specific permission failures for LOGGED IN users.
    // Unauthenticated users are handled by the redirect below.
    if (usuario && requiredPermiso && !tienePermiso(requiredPermiso) && !hasReportedRef.current) {
      reportarIncidente('ACCESO_NO_AUTORIZADO', `Intento de acceso a ruta: ${location.pathname} (Rol: ${usuario.role || 'Desconocido'})`, 'ALERTA');
      hasReportedRef.current = true;
    }
  }, [requiredPermiso, tienePermiso, location.pathname, usuario, reportarIncidente]);

  if (!usuario) return <Navigate to="/login" state={{ from: location }} replace />;

  if (requiredPermiso && !tienePermiso(requiredPermiso)) {
    // Obtenemos el nombre real del rol para el mensaje
    const nombreRol = usuario.role || usuario.rol || 'Usuario';

    return (
      <div className="min-h-screen bg-app-light dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-surface-light dark:bg-surface-dark p-10 rounded-[2.5rem] shadow-2xl border border-border-subtle dark:border-slate-800 max-w-md w-full">
          <div className="w-20 h-20 bg-status-dangerBg dark:bg-red-900/20 text-status-danger rounded-3xl flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={44} />
          </div>
          <h2 className="text-2xl font-black text-content-main dark:text-white uppercase tracking-tighter mb-2">Acceso Denegado</h2>

          {/* MENSAJE DINÁMICO CORREGIDO */}
          <p className="text-content-secondary dark:text-slate-400 text-sm mb-8 leading-relaxed">
            Tu perfil actual (<strong>{nombreRol}</strong>) no tiene los permisos necesarios para acceder a esta ruta.
            <br /><span className="text-[10px] text-status-danger/80 mt-2 block font-mono">INCIDENTE REPORTADO AL ADMINISTRADOR</span>
          </p>

          <button
            onClick={() => navigate('/')} // Volver al Dashboard es más seguro
            className="w-full py-4 bg-content-main dark:bg-[#10B981] text-white rounded-2xl font-black text-xs tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <Home size={18} /> Volver al Inicio
          </button>

          <div className="mt-8 pt-4 border-t border-border-subtle/50 dark:border-slate-800 flex items-center justify-center gap-2 text-[10px] text-content-secondary font-bold tracking-widest">
            <Lock size={12} /> SISTEMA FÉNIX V4.3 ACTIVE
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default RouteGuard;