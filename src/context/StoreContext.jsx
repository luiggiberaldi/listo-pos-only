// ✅ SYSTEM IMPLEMENTATION - V. 5.3 (SAFE MODE - SYNC PAUSED)
// Archivo: src/context/StoreContext.jsx

import React, { useEffect } from 'react';
import { desglosarStock } from '../utils/mathUtils';
import { migrarDatosLocales } from '../db';

// Providers
import { ConfigProvider, useConfigContext } from './ConfigContext';
import { AuthProvider, useAuthContext } from './AuthContext';
import { InventoryProvider, useInventoryContext } from './InventoryContext';
import { POSProvider, usePOSContext } from './POSContext';
import { AuditProvider, useAuditContext } from './AuditContext';
import { CajaEstadoProvider } from '../hooks/caja/CajaEstadoProvider';

// ☁️ Motor de Sincronización (PAUSADO POR CUOTA)
import { useSyncEngine } from '../hooks/sync/useSyncEngine';
import { useAutoBackup } from '../hooks/safety/useAutoBackup';

export const useStore = () => {
  const config = useConfigContext();
  const auth = useAuthContext();
  const inventory = useInventoryContext();
  const pos = usePOSContext();
  const audit = useAuditContext();

  return {
    TOLERANCIA_AUDITORIA: 0.05,
    desglosarStock,
    ...config,
    ...auth,
    ...inventory,
    ...pos,
    ...audit
  };
};

export const StoreProvider = ({ children }) => {

  const { encolarOperacion } = useSyncEngine();

  useEffect(() => {
    // ⚠️ MODO SEGURO: Desactivamos la sincronización para evitar errores de cuota
    // window.encolarSincronizacion = encolarOperacion; 
    window.encolarSincronizacion = () => { console.log("☁️ [SYNC] Pausado por límite de cuota."); };
  }, [encolarOperacion]);

  useEffect(() => {
    const arrancarBaseDeDatos = async () => {
      try {
        console.log("🚀 [SYSTEM] Iniciando protocolos de persistencia...");
        await migrarDatosLocales();
      } catch (e) {
        console.error("🔥 [CRITICAL] Fallo al inicializar DB:", e);
      }
    };
    arrancarBaseDeDatos();
  }, []);

  return (
    <ConfigProvider>
      <AuthProvider>
        <CajaEstadoProvider>
          <InventoryProvider>
            <POSProvider>
              <AuditProvider>
                {children}
              </AuditProvider>
            </POSProvider>
          </InventoryProvider>
        </CajaEstadoProvider>
      </AuthProvider>
    </ConfigProvider>
  );
};