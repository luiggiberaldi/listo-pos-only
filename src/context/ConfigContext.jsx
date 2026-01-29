// ✅ SYSTEM IMPLEMENTATION - V. 5.4 (DB KEY FIX)
// Archivo: src/context/ConfigContext.jsx
// Objetivo: Gestionar correlativos cumpliendo estrictamente con el esquema 'key' de Dexie.

import React, { createContext, useContext, useMemo } from 'react';
import { useAppConfig } from '../hooks/store/useAppConfig';
import { db } from '../db'; 

const ConfigContext = createContext(null);

export const useConfigContext = () => {
  const context = useContext(ConfigContext);
  if (!context) throw new Error('useConfigContext debe usarse dentro de ConfigProvider');
  return context;
};

export const ConfigProvider = ({ children }) => {
  const configLogic = useAppConfig();

  // 🧠 LÓGICA BLINDADA DE CORRELATIVOS
  const generarCorrelativo = async (tipo) => {
    return await db.transaction('rw', db.config, async () => {
      // 1. Buscamos el registro O creamos uno nuevo con la 'key' obligatoria
      const registro = await db.config.get('correlativos') || { key: 'correlativos', factura: 0, z: 0 };
      
      // 2. Incrementamos
      const nuevoValor = (registro[tipo] || 0) + 1;
      
      // 3. Guardamos asegurando que la propiedad 'key' exista
      // Al usar put con la key dentro del objeto, Dexie ya no se queja
      await db.config.put({ ...registro, [tipo]: nuevoValor });
      
      // 4. Formateamos (000001)
      return String(nuevoValor).padStart(6, '0');
    });
  };

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
  }, [configLogic]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};