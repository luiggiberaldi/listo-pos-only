// ✅ SYSTEM IMPLEMENTATION - V. 3.2 (CREDIT WIRING)
// Archivo: src/context/POSContext.jsx
// Autorizado por Auditor en Fase 3 (Credit Expansion)

import React, { createContext, useContext, useMemo } from 'react';
import { usePOS } from '../hooks/store/usePOS';
import { useSoundSystem } from '../hooks/ui/useSoundSystem';
import { useSync } from '../hooks/sync/useSync';

// Importamos los contextos de nivel inferior
import { useConfigContext } from './ConfigContext';
import { useAuthContext } from './AuthContext';
import { useInventoryContext } from './InventoryContext';
import { useCajaEstado } from '../hooks/caja/useCajaEstado';

const POSContext = createContext(null);

export const usePOSContext = () => {
  const context = useContext(POSContext);
  if (!context) throw new Error('usePOSContext debe usarse dentro de POSProvider');
  return context;
};

export const POSProvider = ({ children }) => {
  // 1. Consumir dependencias de capas inferiores
  const { configuracion, generarCorrelativo } = useConfigContext();
  const { usuario, registrarEventoSeguridad } = useAuthContext();
  const inventory = useInventoryContext();

  // 2. Consumir estado de Caja
  const caja = useCajaEstado();

  // 3. Inicializar sistemas satélite
  const { play: playSound } = useSoundSystem(configuracion);
  const sync = useSync(configuracion);

  // 4. Inicializar el POS con Inyección de Dependencias
  const posLogic = usePOS(
    usuario,
    configuracion,
    {
      transaccionVenta: inventory.transaccionVenta,
      transaccionAnulacion: inventory.transaccionAnulacion,
      productos: inventory.productos,
      playSound,
      sincronizarVenta: () => { },
      registrarEventoSeguridad,
      generarCorrelativo
    },
    {
      clientes: inventory.clientes,
      setClientes: inventory.setClientes,
      // 🟢 CABLEADO CRÍTICO: Conectamos el POS con la BD de Clientes
      actualizarSaldoCliente: inventory.actualizarSaldoCliente
    }
  );

  const value = useMemo(() => ({
    ...caja,      // 1. Base (Estado crudo)
    ...posLogic,  // 2. Override (Lógica de negocio rica, ej: cerrarCaja con reporte)
    playSound,
  }), [posLogic, playSound, caja]);

  return (
    <POSContext.Provider value={value}>
      {children}
    </POSContext.Provider>
  );
};