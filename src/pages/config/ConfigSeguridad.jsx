// ✅ SYSTEM IMPLEMENTATION - V. 5.0 (MODULAR REFACTOR)
// Archivo: src/pages/config/ConfigSeguridad.jsx
// Descripción: Orquestador limpio que conecta el Hook de Lógica con los Componentes UI.

import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { PERMISOS, useRBAC } from '../../hooks/store/useRBAC';
import { useSecurityManager } from './security/hooks/useSecurityManager';

// Componentes Modulares
import SecurityHeroProfile from './security/components/SecurityHeroProfile';
import EmployeeRegistrationForm from './security/components/EmployeeRegistrationForm';
import EmployeeList from './security/components/EmployeeList';
import AccessDeniedBanner from './security/components/AccessDeniedBanner';

const ConfigSeguridad = ({ readOnly }) => {
  const { usuario } = useStore();
  const { tienePermiso } = useRBAC(usuario);

  // Hook que contiene toda la lógica "sucia" (Alertas, Validaciones, Estado)
  const manager = useSecurityManager(readOnly);
  const location = useLocation();

  // 🚀 AUTO-OPEN PIN CHANGE (Coming from Safety Banner)
  useEffect(() => {
    if (location.state?.autoOpenPin && !readOnly) {
      // Pequeño delay para que el render sea fluido
      const timer = setTimeout(() => {
        manager.changeMyPin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [location.state, readOnly]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative max-w-full mx-auto px-6 lg:px-12">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 opacity-40 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-light/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {/* 1. PERFIL DEL USUARIO ACTUAL */}
      <SecurityHeroProfile
        currentUser={manager.currentUser}
        onManageAccess={manager.changeMyPin}
        onUpdateName={() => manager.updateUserName(manager.currentUser)}
        readOnly={readOnly}
      />

      {/* 2. ZONA DE GESTIÓN (CONDICIONAL) */}
      {tienePermiso(PERMISOS.CONF_USUARIOS_EDITAR) ? (
        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

          {/* Formulario de Alta */}
          <EmployeeRegistrationForm
            formState={manager.nuevoEmpleado}
            setFormState={manager.setNuevoEmpleado}
            onSubmit={manager.createEmployee}
            readOnly={readOnly}
          />

          {/* Lista de Personal */}
          <EmployeeList
            users={manager.usuarios}
            onReset={manager.resetEmployeePin}
            onDelete={manager.fireEmployee}
            onEditName={manager.updateUserName}
            onUpdatePermissions={manager.openPermissionsMatrix} // ✅ Granular RBAC
            readOnly={readOnly}
          />
        </div>
      ) : (
        /* Mensaje para Empleados sin permisos */
        <AccessDeniedBanner />
      )}
    </div>
  );
};

export default ConfigSeguridad;