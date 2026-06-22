// ✅ SYSTEM IMPLEMENTATION - V. 5.0 (MODULAR REFACTOR)
// Archivo: src/pages/config/ConfigSeguridad.jsx
// Descripción: Orquestador limpio que conecta el Hook de Lógica con los Componentes UI.

import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../context/StoreContext';
import { PERMISOS, useRBAC } from '../../hooks/store/useRBAC';
import { useConfigStore } from '../../stores/useConfigStore';
import { hasFeature, FEATURES, getPlan } from '../../config/planTiers';
import { useSecurityManager } from './security/hooks/useSecurityManager';
import { FileText, Users, X, FlaskConical, CalendarDays } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

// Componentes Modulares
import SecurityHeroProfile from './security/components/SecurityHeroProfile';
import EmployeeRegistrationForm from './security/components/EmployeeRegistrationForm';
import EmployeeList from './security/components/EmployeeList';
import AccessDeniedBanner from './security/components/AccessDeniedBanner';
import PayrollPage from './security/PayrollPage'; // 🆕
import EmployeeDetail from './security/components/EmployeeDetail'; // 🆕
const SystemTesterView = React.lazy(() => import('../../testing/SystemTesterView')); // 🧪
const DayTesterView = React.lazy(() => import('../../testing/DayTesterView')); // 📅

const ConfigSeguridad = ({ readOnly }) => {
  const { usuario } = useStore();
  const { tienePermiso } = useRBAC(usuario);

  // 🏪 PLAN GATING
  const { license } = useConfigStore();
  const planId = license?.plan || 'bodega';
  const hasEmployeeFeatures = hasFeature(planId, FEATURES.EMPLEADOS_BASICO) || hasFeature(planId, FEATURES.ROLES);
  const hasFullRoles = hasFeature(planId, FEATURES.ROLES);
  const planConfig = getPlan(planId);
  const maxEmpleados = planConfig.maxEmpleados ?? 0;

  // Hook que contiene toda la lógica "sucia" (Alertas, Validaciones, Estado)
  const manager = useSecurityManager(readOnly);
  const location = useLocation();

  // 🆕 Estados de Vista y Modal Financiero
  const [viewMode, setViewMode] = useState('SECURITY'); // 'SECURITY' | 'PAYROLL' | 'TESTER' | 'DAYTESTER'

  const [financeModalUser, setFinanceModalUser] = useState(null);

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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 relative max-w-full mx-auto px-6 lg:px-12 pt-6">
      {/* Background Pattern */}
      <div className="absolute inset-0 -z-10 opacity-40 pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-light/40 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px]" />
      </div>

      {hasEmployeeFeatures && tienePermiso(PERMISOS.CONF_USUARIOS_EDITAR) && (
        <div className="flex justify-between items-center bg-white/50 backdrop-blur-sm p-2 rounded-2xl border border-slate-200/50 shadow-sm mb-6">
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('SECURITY')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'SECURITY' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
            >
              <Users size={16} /> Personal
            </button>
            {hasFullRoles && (
              <button
                onClick={() => setViewMode('PAYROLL')}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'PAYROLL' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
              >
                <FileText size={16} /> Reporte Nómina
              </button>
            )}
            {import.meta.env.DEV && (
              <>
                <button
                  onClick={() => setViewMode('TESTER')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'TESTER' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                >
                  <FlaskConical size={16} /> System Tester
                </button>
                <button
                  onClick={() => setViewMode('DAYTESTER')}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${viewMode === 'DAYTESTER' ? 'bg-yellow-600 text-white shadow-lg shadow-yellow-500/30' : 'text-slate-400 hover:bg-white hover:text-slate-600'}`}
                >
                  <CalendarDays size={16} /> Day Tester
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {viewMode === 'TESTER' && import.meta.env.DEV ? (
        <React.Suspense fallback={<div className="text-center py-20 text-slate-400">Cargando System Tester...</div>}>
          <SystemTesterView />
        </React.Suspense>
      ) : viewMode === 'DAYTESTER' && import.meta.env.DEV ? (
        <React.Suspense fallback={<div className="text-center py-20 text-slate-400">Cargando Day Tester...</div>}>
          <DayTesterView />
        </React.Suspense>
      ) : viewMode === 'PAYROLL' ? (
        <PayrollPage />
      ) : (
        <>
          {/* 1. PERFIL DEL USUARIO ACTUAL */}
          <SecurityHeroProfile
            currentUser={manager.currentUser}
            onManageAccess={manager.changeMyPin}
            onUpdateName={() => manager.updateUserName(manager.currentUser)}
            readOnly={readOnly}
          />

          {/* 2. ZONA DE GESTIÓN (CONDICIONAL) */}
          {hasEmployeeFeatures && tienePermiso(PERMISOS.CONF_USUARIOS_EDITAR) ? (
            <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8 items-start">

              {/* Formulario de Alta */}
              <EmployeeRegistrationForm
                formState={manager.nuevoEmpleado}
                setFormState={manager.setNuevoEmpleado}
                onSubmit={manager.createEmployee}
                readOnly={readOnly}
                maxEmpleados={maxEmpleados}
                currentCount={manager.usuarios?.filter(u => u.rol !== 'admin').length || 0}
                isBasicPlan={!hasFullRoles}
              />

              {/* Lista de Personal */}
              <EmployeeList
                users={manager.usuarios}
                onReset={manager.resetEmployeePin}
                onDelete={manager.fireEmployee}
                onEditName={manager.updateUserName}
                onUpdatePermissions={hasFullRoles ? manager.openPermissionsMatrix : undefined}
                onViewFinance={hasFullRoles ? (u) => setFinanceModalUser(u) : undefined}
                readOnly={readOnly}
              />
            </div>
          ) : !hasEmployeeFeatures ? null : (
            /* Mensaje para Empleados sin permisos */
            <AccessDeniedBanner />
          )}
        </>
      )}

      {/* MODAL FICHA FINANCIERA */}
      <AnimatePresence>
        {financeModalUser && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <button
                onClick={() => setFinanceModalUser(null)}
                className="absolute -top-4 -right-4 bg-white text-slate-400 hover:text-rose-500 p-2 rounded-full shadow-lg z-10"
              >
                <X size={20} />
              </button>
              <EmployeeDetail
                usuario={financeModalUser}
                onClose={() => setFinanceModalUser(null)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default ConfigSeguridad;