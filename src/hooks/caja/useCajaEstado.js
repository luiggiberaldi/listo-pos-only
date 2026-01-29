import { useContext } from 'react';
import { CajaEstadoContext } from './CajaEstadoContext';

/**
 * useCajaEstado: Hook Consumidor (FÉNIX C.9.1).
 * Accede al estado compartido proporcionado por CajaEstadoProvider.
 */
export const useCajaEstado = () => {
  const context = useContext(CajaEstadoContext);

  if (!context) {
    throw new Error('useCajaEstado debe ser usado dentro de un CajaEstadoProvider');
  }

  return context;
};