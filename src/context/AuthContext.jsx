import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from '../hooks/store/useAuth';
import { useRBAC } from '../hooks/store/useRBAC';
import { useConfigContext } from './ConfigContext';

const MODULE_ID = Math.random().toString(36).substring(7);
// 🛡️ PATRÓN SINGLETON ROBUSTO (Resistente a Split-Brain)
// Si ya existe un Contexto Global definido por una carga previa, LO USAMOS.
// Esto evita que 'useAuthContext' falle si este archivo se carga dos veces.
let AuthContext;

if (window.__GLOBAL_AUTH_CONTEXT__) {
  // Silenciosa reutilización para no molestar al usuario, pero mantenemos la seguridad.
  AuthContext = window.__GLOBAL_AUTH_CONTEXT__;
} else {
  AuthContext = createContext(null);
  window.__GLOBAL_AUTH_CONTEXT__ = AuthContext;
  window.__GLOBAL_AUTH_CONTEXT_ID = MODULE_ID;
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Intento de recuperación desesperada (si el provider está en otro context instance)
    // Pero si usamos el Singleton arriba, esto no debería pasar.
    const msg = `🚨 [AUTH-CRITICAL] useAuthContext fuera de Provider (Module: ${MODULE_ID})`;
    console.error(msg);
    throw new Error('useAuthContext debe usarse dentro de AuthProvider');
  }
  return context;
};

import { useSecurityLogs } from '../hooks/security/useSecurityLogs';

export const AuthProvider = ({ children }) => {
  const { configuracion } = useConfigContext();
  const { logs, registrarEvento } = useSecurityLogs();

  // 1. Inicializamos useAuth INYECTANDO el logger real
  const authLogic = useAuth(configuracion, registrarEvento);

  // 2. Sistema de Roles
  const rbacLogic = useRBAC(authLogic.usuario);

  const isFactoryAuth = authLogic.usuario?.isFactoryAuth === true;

  const value = useMemo(() => {
    const usuarioSanitizado = authLogic.usuario ? { ...authLogic.usuario } : null;

    return {
      ...authLogic,
      ...rbacLogic,
      usuario: usuarioSanitizado,
      isFactoryAuth,
      securityLogs: logs, // Exponemos los logs por si se necesitan en UI
      registrarEventoSeguridad: registrarEvento, // Exponemos el logger para uso externo (SweetAlerts, etc)

      agregarUsuario: authLogic.agregarUsuario,
      actualizarUsuario: authLogic.actualizarUsuario,
      eliminarUsuario: authLogic.eliminarUsuario,
      resetearSeguridad: authLogic.adminResetUserPin || authLogic.restaurarFabricaAdmin,
    };
  }, [authLogic, rbacLogic, isFactoryAuth, logs, registrarEvento]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};