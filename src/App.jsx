// ✅ SYSTEM IMPLEMENTATION - V. 3.2 (SALES HISTORY ROUTE)
// Archivo: src/App.jsx

import React from 'react';
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

// Layouts & Pages
import MainLayout from './layout/MainLayout';
import Dashboard from './pages/Dashboard';
import PosPage from './pages/PosPage';
import InventarioPage from './pages/InventarioPage';
import ConfigPage from './pages/ConfigPage';
import CierrePage from './pages/CierrePage';
import ClientesPage from './pages/ClientesPage';
import LoginScreen from './pages/LoginScreen';
import TotalDiarioPage from './pages/TotalDiarioPage';
import ReportesPage from './pages/ReportesPage';
import SimulationPage from './pages/SimulationPage';
import SalesHistoryPage from './pages/SalesHistoryPage';
import NotFound from './pages/NotFound';


// Security Gate
import LicenseGate from './components/security/LicenseGate';
import ContractGuard from './components/security/ContractGuard'; // 🟢 CONTRACT GUARD
import { auditFiscalLogic } from './utils/fiscal_lock';

function App() {
  const { isAuthenticated } = useSecurity();
  useMasterTelemetry(); // 📡 ALWAYS ON: Monitoring for Remote PIN Resets & Telemetry
  useListoGoSync();     // 🔄 ALWAYS ON: Syncing Sales/Inventory to Mobile App
  useRemoteLockListener(); // 🔓 ALWAYS ON: Monitoring for Remote Unlock (Panic Release)

  // 🔒 RUNTIME INTEGRITY CHECK (Fiscal Lock)
  React.useEffect(() => {
    auditFiscalLogic();
  }, []);

  // 👻 GHOST MODE TOOLS
  // Expose tools for Playwright/Manual Testing
  React.useEffect(() => {
    // Dynamically import to ensure circular deps work if needed, or just use imports
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

          // Floating Indicator just in case
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
          <Routes>
            {!isAuthenticated ? (
              <>
                <Route path="/login" element={<LoginScreen />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <Route path="/" element={<MainLayout />}>

                {/* 🏠 INICIO (DASHBOARD) */}
                <Route index element={<Dashboard />} />

                {/* 🛒 PUNTO DE VENTA */}
                <Route
                  path="vender"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.POS_ACCESO}>
                      <PosPage />
                    </RouteGuard>
                  }
                />

                {/* 📦 INVENTARIO */}
                <Route
                  path="inventario"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.INV_VER}>
                      <InventarioPage />
                    </RouteGuard>
                  }
                />

                {/* 👥 CLIENTES */}
                <Route
                  path="clientes"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.POS_ACCESO}>
                      <ClientesPage />
                    </RouteGuard>
                  }
                />

                {/* 📈 ESTADÍSTICAS */}
                <Route
                  path="reportes"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.REP_VER_DASHBOARD}>
                      <ReportesPage />
                    </RouteGuard>
                  }
                />

                {/* 💰 TESORERÍA */}
                <Route
                  path="total-diario"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.REP_VER_TOTAL_DIARIO}>
                      <TotalDiarioPage />
                    </RouteGuard>
                  }
                />

                {/* 📜 HISTORIAL DE VENTAS (NUEVA RUTA) */}
                <Route
                  path="historial-ventas"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.REP_VER_VENTAS}>
                      <SalesHistoryPage />
                    </RouteGuard>
                  }
                />

                {/* 🔒 CIERRE DE CAJA */}
                <Route
                  path="cierre"
                  element={
                    <RouteGuard requiredPermiso={PERMISSIONS.CAJA_CERRAR}>
                      <CierrePage />
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


                {/* 🧪 LABORATORIO */}
                <Route path="simulation" element={<SimulationPage />} />

                {/* 🔄 Catch-all: Silent redirect to home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
          <Assistant variant="floating" />
        </HashRouter>
      </ContractGuard>
      <GhostEye />
    </LicenseGate>
  );
}

export default App;