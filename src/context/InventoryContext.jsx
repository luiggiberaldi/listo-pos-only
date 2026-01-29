// ✅ SYSTEM IMPLEMENTATION - V. 5.2
// Archivo: src/context/InventoryContext.jsx

import React, { createContext, useContext, useMemo } from 'react';
import { useInventory } from '../hooks/store/useInventory';
import { useCustomers } from '../hooks/store/useCustomers';
import { useFinance } from '../hooks/store/useFinance';
import { useAuthContext } from './AuthContext';
import { useConfigContext } from './ConfigContext';

const InventoryContext = createContext(null);

export const useInventoryContext = () => {
  const context = useContext(InventoryContext);
  if (!context) throw new Error('useInventoryContext debe usarse dentro de InventoryProvider');
  return context;
};

export const InventoryProvider = ({ children }) => {
  const { usuario, registrarEventoSeguridad } = useAuthContext();
  const { configuracion } = useConfigContext();

  // ✅ CONEXIÓN DE SEGURIDAD: Inyectamos configuracion y logger
  const inventoryLogic = useInventory(usuario, configuracion, registrarEventoSeguridad);

  const customersLogic = useCustomers();
  const financeLogic = useFinance(configuracion, inventoryLogic.productos);

  const value = useMemo(() => ({
    ...inventoryLogic,
    ...customersLogic,
    ...financeLogic,
  }), [inventoryLogic, customersLogic, financeLogic]);

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
};