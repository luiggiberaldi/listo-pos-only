// ✅ SYSTEM IMPLEMENTATION - V. 5.4 (ZUSTAND MIGRATION BRIDGE)
// Archivo: src/context/StoreContext.jsx
// ⚠️ DEPRECATED: This context aggregator is maintained for backward compatibility.
//    New code should import from Zustand stores directly (useConfigStore, useAuthStore, etc.)
//    See: src/stores/

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

// 🔄 ZUSTAND BRIDGE: Overlay critical config from stores
import { useConfigStore } from '../stores/useConfigStore';

/**
 * @deprecated Use Zustand stores directly (useConfigStore, useAuthStore, etc.)
 * This hook is maintained for backward compatibility with 50+ consumers.
 */
let _storeDeprecationWarned = false;
export const useStore = () => {
  if (import.meta.env.DEV && !_storeDeprecationWarned) {
    _storeDeprecationWarned = true;
    console.warn('⚠️ [DEPRECATED] useStore() merges 5 contexts per render. Prefer Zustand stores directly (useConfigStore, useAuthStore, etc.)');
  }
  const config = useConfigContext();
  const auth = useAuthContext();
  const inventory = useInventoryContext();
  const pos = usePOSContext();
  const audit = useAuditContext();

  // 🔄 ZUSTAND OVERLAY: License from store (source of truth)
  // NOTE: Do NOT merge zustandConfig into configuracion here — it creates
  // a new object ref every render, causing infinite loops in ConfigPage.
  const { license } = useConfigStore();

  return {
    TOLERANCIA_AUDITORIA: 0.05,
    desglosarStock,
    ...config,
    ...auth,
    ...inventory,
    ...pos,
    ...audit,
    // 🔄 Zustand override (only stable primitive/object refs)
    license
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