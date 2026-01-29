import React, { createContext, useContext, useMemo } from 'react';
import { useAudits } from '../hooks/store/useAudits';
import { useDataPersistence } from '../hooks/store/useDataPersistence';
import { useInventoryContext } from './InventoryContext';

const AuditContext = createContext(null);

export const useAuditContext = () => {
  const context = useContext(AuditContext);
  if (!context) throw new Error('useAuditContext debe usarse dentro de AuditProvider');
  return context;
};

export const AuditProvider = ({ children }) => {
  // Necesita productos para generar reportes de auditoría
  const { productos, actualizarProducto } = useInventoryContext();

  const auditsLogic = useAudits(productos, actualizarProducto);
  const persistenceLogic = useDataPersistence();

  const value = useMemo(() => ({
    ...auditsLogic,
    ...persistenceLogic
  }), [auditsLogic, persistenceLogic]);

  return (
    <AuditContext.Provider value={value}>
      {children}
    </AuditContext.Provider>
  );
};