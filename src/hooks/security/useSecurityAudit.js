import { useCallback } from 'react';
import { safeSave } from '../../utils/storageUtils';
import { loadWithSchema } from '../../utils/schemaUtils';
import { securityLogSchema } from '../../schemas/dataSchemas';

const STORAGE_KEY = 'listo_security_logs_v1';

/**
 * useSecurityAudit: Sistema de Auditoría de Seguridad Pasiva.
 * Responsable de registrar eventos críticos sin afectar el flujo del usuario.
 */
export const useSecurityAudit = () => {

  /**
   * Registra un evento de seguridad de forma asíncrona y no bloqueante.
   * @param {Object} evento - Datos del evento.
   * @param {string} evento.tipo - Categoría principal (ej: SECURITY_NOTICE).
   * @param {string} evento.subTipo - Clasificación específica (ej: PIN_DEBIL_DETECTADO).
   * @param {string} evento.usuarioId - ID del actor.
   * @param {string} evento.contexto - Origen del evento (LOGIN | JIT).
   * @param {Object} [evento.metadata] - Datos adicionales opcionales.
   */
  const registrarEventoSeguridad = useCallback(({ tipo, subTipo, usuarioId, contexto, metadata = {} }) => {
    try {
      // 1. Construcción del payload inmutable
      const nuevoEvento = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        tipo,
        subTipo,
        usuarioId,
        contexto,
        metadata,
        // Firma de integridad simple (placeholder para Fase 3.2)
        integrity: 'SHA-256-PENDING'
      };

      // 2. Persistencia (LocalStorage)
      // Leemos directo del storage para evitar race conditions
      const logsPrevios = loadWithSchema(STORAGE_KEY, securityLogSchema, []);
      const logsActualizados = [...logsPrevios, nuevoEvento];

      // Límite de rotación: mantener últimos 1000 eventos para no saturar storage
      if (logsActualizados.length > 1000) {
        logsActualizados.shift();
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(logsActualizados));

      // Log consola dev-mode solo
      if (process.env.NODE_ENV === 'development') {
        console.groupCollapsed(`🛡️ [AUDIT] ${subTipo}`);
        console.log(nuevoEvento);
        console.groupEnd();
      }

    } catch (error) {
      console.error("Fallo crítico en sistema de auditoría:", error);
      // Fail-safe: No romper la app si falla el log
    }
  }, []);

  return {
    registrarEventoSeguridad
  };
};