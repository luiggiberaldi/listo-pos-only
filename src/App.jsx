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

  return (
    <LicenseGate>
      <ContractGuard>
        <HashRouter>
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

                {/* 🔄 REDIRECCIÓN */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            )}
          </Routes>
        </HashRouter>
      </ContractGuard>
    </LicenseGate>
  );
}

export default App;