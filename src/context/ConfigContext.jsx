import React, { createContext, useContext, useMemo } from 'react';
import { useAppConfig } from '../hooks/store/useAppConfig';
import { useConfigStore } from '../stores/useConfigStore';

const ConfigContext = createContext(null);

export const useConfigContext = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfigContext debe usarse dentro de ConfigProvider');
  return context;
};

export const ConfigProvider = ({ children }) => {
  const configLogic = useAppConfig();
  const generarCorrelativo = useConfigStore(state => state.generarCorrelativo);

  const value = useMemo(() => {
    const safeConfig = {
      ...configLogic.configuracion,
      tasa: parseFloat(configLogic.configuracion?.tasa) || 0
    };

    return {
      ...configLogic,
      configuracion: safeConfig,
      monedaSimbolo: safeConfig.monedaBase === 'EUR' ? '€' : '$',
      generarCorrelativo,
    };
  }, [configLogic, generarCorrelativo]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};