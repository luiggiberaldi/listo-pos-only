// ✅ SYSTEM IMPLEMENTATION - V. 3.4 (PERFORMANCE: LAZY LOADING + PLAN GATING)
// Archivo: src/App.jsx

import React, { Suspense, lazy } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSecurity } from './hooks/security/useSecurity';
import { useMasterTelemetry } from './hooks/sync/useMasterTelemetry'; // 🔌 GLOBAL SECURITY LISTENER
import { useListoGoSync } from './hooks/sync/useListoGoSync'; // 🔄 MOBILE APP SYNC ENGINE
import { useRemoteLockListener } from './hooks/security/useRemoteLockListener'; // 🛡️ REMOTE LOCK (DEADLOCK PROOF)
import { PERMISSIONS } from './config/permissions';
import RouteGuard from './components/security/RouteGuard';
import { GhostEye } from './components/ghost/GhostEye';
import { Assistant } from './components/ghost/Assistant';
import UpdateNotification from './components/common/UpdateNotification';
import ErrorBoundary from './components/common/ErrorBoundary';
import { initFirebase } from './services/firebase'; // 🚀 LAZY INIT
import { useLanSync } from './hooks/sync/useLanSync'; // 📡 LAN MULTI-CAJA
import { secretsService } from './services/config/SecretsService';
import { initSupabase } from './services/supabaseClient';
import { ghostService } from './services/ghostAI';

// Layouts (eager - needed immediately)
import MainLayout from './layout/MainLayout';
import LoginScreen from './pages/LoginScreen';

// 🚀 LAZY LOADED PAGES (Route-based code splitting)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const PosPage = lazy(() => import('./pages/PosPage'));
const InventarioPage = lazy(() => import('./pages/InventarioPage'));
const ConfigPage = lazy(() => import('./pages/ConfigPage'));
const CierrePage = lazy(() => import('./pages/CierrePage'));
const ClientesPage = lazy(() => import('./pages/ClientesPage'));
const TotalDiarioPage = lazy(() => import('./pages/TotalDiarioPage'));
const ReportesPage = lazy(() => import('./pages/ReportesPage'));
const SimulationPage = lazy(() => import('./pages/SimulationPage'));
const SalesHistoryPage = lazy(() => import('./pages/SalesHistoryPage'));
const NotFound = lazy(() => import('./pages/NotFound'));


// Security Gate
import LicenseGate from './components/security/LicenseGate';
import ContractGuard from './components/security/ContractGuard'; // 🟢 CONTRACT GUARD
import PlanGate from './components/security/PlanGate'; // 🏪 PLAN TIER GATE
import { FEATURES, hasFeature } from './config/planTiers';
import { useConfigStore } from './stores/useConfigStore';
import { auditFiscalLogic } from './utils/fiscal_lock';

// 🏪 PLAN-GATED HOME: Redirige a POS si no tiene Dashboard
function PlanGatedHome() {
  const { license } = useConfigStore();
  const plan = license?.plan || 'bodega';
  // 🏪 DASHBOARD LITE FOR ALL PLANS
  // El Dashboard ahora es "Smart" y oculta widgets según el Plan.
  return <Dashboard />;
}

function App() {
  const { isAuthenticated } = useSecurity();
  useMasterTelemetry(); // 📡 ALWAYS ON: Monitoring for Remote PIN Resets & Telemetry
  useListoGoSync();     // 🔄 ALWAYS ON: Syncing Sales/Inventory to Mobile App
  useRemoteLockListener(); // 🔓 ALWAYS ON: Monitoring for Remote Unlock (Panic Release)

  // 📡 LAN MULTI-CAJA: Sync inventario entre PCs offline
  const lanConfig = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('listo-lan-config') || '{}');
    } catch { return {}; }
  }, []);
  useLanSync(lanConfig.role || 'principal', lanConfig.targetIP || '');

  // 🔒 RUNTIME INTEGRITY CHECK (Fiscal Lock)
  React.useEffect(() => {
    auditFiscalLogic();
  }, []);

  // 🚀 LAZY: Inicializar Firebase después del render inicial (2s delay)
  React.useEffect(() => {
    const timer = setTimeout(() => {
      initFirebase().then(ok => {
        if (ok) console.log('🔥 Firebase listo (carga diferida)');
      });
    }, 2000);

    // 👻 GHOST AUDITOR: Initialize after Firebase (5s total delay)
    const ghostTimer = setTimeout(() => {
      import('./services/ghost/ghostAuditScheduler').then(({ initGhostAuditor }) => {
        initGhostAuditor();
      }).catch(e => console.warn('👻 Ghost Auditor init skipped:', e.message));
    }, 5000);

    return () => { clearTimeout(timer); clearTimeout(ghostTimer); };
  }, []);

  // 🔐 SECRETS BOOTSTRAP (Persist API Keys)
  React.useEffect(() => {
    const loadSecrets = async () => {
      await secretsService.load();
      // Init Supabase
      initSupabase(
        secretsService.get('VITE_SUPABASE_URL'),
        secretsService.get('VITE_SUPABASE_ANON_KEY')
      );
      // Init Ghost
      ghostService.reloadKeys();
    };
    loadSecrets();
  }, []);

  // 👻 GHOST MODE TOOLS (Development Only)
  React.useEffect(() => {
    if (!import.meta.env.DEV) return; // 🛡️ Block in production

    import('./db').then(({ toggleGhostMode, isGhostMode }) => {
      import('./utils/TimeProvider').then(({ timeProvider }) => {
        window.GhostTools = {
          timeProvider,
          toggleMode: toggleGhostMode,
          isGhost: isGhostMode
        };

        if (isGhostMode) {
          console.log("👻 GHOST MODE ACTIVE");
          document.body.style.border = '5px solid red';
          document.body.style.boxSizing = 'border-box';
          document.body.setAttribute('data-ghost-mode', 'true');

          const div = document.createElement('div');
          div.style.position = 'fixed';
          div.style.bottom = '10px';
          div.style.right = '10px';
          div.style.zIndex = '99999';
          div.style.background = 'red';
          div.style.color = 'white';
          div.style.padding = '5px 10px';
          div.style.fontWeight = 'bold';
          div.style.pointerEvents = 'none';
          div.innerText = '👻 GHOST MODE';
          document.body.appendChild(div);
        }
      });
    });
  }, []);

  // 🚨 GLOBAL ERROR TRAP FOR GHOST
  React.useEffect(() => {
    window.ghostErrors = [];
    const handleError = (event) => {
      const errorMsg = event.reason ? `Promise Rejection: ${event.reason}` : event.message;
      console.log('🚨 [GHOST EYE] Error Captured:', errorMsg);
      window.ghostErrors.push({ message: errorMsg, timestamp: Date.now() });
      if (window.ghostErrors.length > 10) window.ghostErrors.shift(); // Keep last 10
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleError);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleError);
    };
  }, []);

  return (
    <LicenseGate>
      <ContractGuard>
        <HashRouter>
          <UpdateNotification />
          <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-app-light dark:bg-app-dark">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-content-secondary font-medium">Cargando...</p>
              </div>
            </div>
          }>
            <Routes>
              {!isAuthenticated ? (
                <>
                  <Route path="/login" element={<LoginScreen />} />
                  <Route path="*" element={<Navigate to="/login" replace />} />
                </>
              ) : (
                <Route path="/" element={<MainLayout />}>

                  {/* 🏠 INICIO — Dashboard si Minimarket, POS si no */}
                  <Route index element={<PlanGatedHome />} />

                  {/* 🛒 PUNTO DE VENTA */}
                  <Route
                    path="vender"
                    element={
                      <RouteGuard requiredPermiso={PERMISSIONS.POS_ACCESO}>
                        <ErrorBoundary section="pos" title="Error en el Punto de Venta">
                          <PosPage />
                        </ErrorBoundary>
                      </RouteGuard>
                    }
                  />

                  {/* 📦 INVENTARIO */}
                  <Route
                    path="inventario"
                    element={
                      <RouteGuard requiredPermiso={PERMISSIONS.INV_VER}>
                        <ErrorBoundary section="inventario" title="Error en Inventario">
                          <InventarioPage />
                        </ErrorBoundary>
                      </RouteGuard>
                    }
                  />

                  {/* 👥 CLIENTES (Bodega+) */}
                  <Route
                    path="clientes"
                    element={
                      <PlanGate requiredFeature={FEATURES.CLIENTES}>
                        <RouteGuard requiredPermiso={PERMISSIONS.POS_ACCESO}>
                          <ClientesPage />
                        </RouteGuard>
                      </PlanGate>
                    }
                  />

                  {/* 📈 ESTADÍSTICAS (Minimarket) */}
                  <Route
                    path="reportes"
                    element={
                      <PlanGate requiredFeature={FEATURES.REPORTES_AVANZADOS}>
                        <RouteGuard requiredPermiso={PERMISSIONS.REP_VER_DASHBOARD}>
                          <ReportesPage />
                        </RouteGuard>
                      </PlanGate>
                    }
                  />

                  {/* 💰 TESORERÍA (Abasto+) */}
                  <Route
                    path="total-diario"
                    element={
                      <PlanGate requiredFeature={FEATURES.TOTAL_DIARIO}>
                        <RouteGuard requiredPermiso={PERMISSIONS.REP_VER_TOTAL_DIARIO}>
                          <TotalDiarioPage />
                        </RouteGuard>
                      </PlanGate>
                    }
                  />

                  {/* 📜 HISTORIAL DE VENTAS (Bodega+) */}
                  <Route
                    path="historial-ventas"
                    element={
                      <PlanGate requiredFeature={FEATURES.HISTORIAL_BASICO}>
                        <RouteGuard requiredPermiso={PERMISSIONS.REP_VER_VENTAS}>
                          <SalesHistoryPage />
                        </RouteGuard>
                      </PlanGate>
                    }
                  />

                  {/* 🔒 CIERRE DE CAJA */}
                  <Route
                    path="cierre"
                    element={
                      <RouteGuard requiredPermiso={PERMISSIONS.CAJA_CERRAR}>
                        <ErrorBoundary section="cierre" title="Error en Cierre de Caja">
                          <CierrePage />
                        </ErrorBoundary>
                      </RouteGuard>
                    }
                  />

                  {/* ⚙️ CONFIGURACIÓN */}
                  <Route
                    path="configuracion"
                    element={
                      <RouteGuard requiredPermiso={PERMISSIONS.CONF_ACCESO}>
                        <ConfigPage />
                      </RouteGuard>
                    }
                  />


                  {/* 🧪 LABORATORIO (Minimarket) */}
                  <Route path="simulation" element={
                    <PlanGate requiredFeature={FEATURES.SIMULADOR}>
                      <SimulationPage />
                    </PlanGate>
                  } />

                  {/* 🔄 Catch-all: Silent redirect to home */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              )}
            </Routes>
          </Suspense>
          <Assistant variant="floating" />
        </HashRouter>
      </ContractGuard>
      <GhostEye />
    </LicenseGate>
  );
}

export default App;