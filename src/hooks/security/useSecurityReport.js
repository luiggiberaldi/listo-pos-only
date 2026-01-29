import { useState, useEffect } from 'react';
import { safeLoad } from '../../utils/storageUtils';

const LOGS_KEY = 'listo_security_logs_v1';

/**
 * useSecurityReport: Motor de Reportes de Seguridad (Read-Only).
 * Agrega y analiza los logs de seguridad para el panel ejecutivo.
 */
export const useSecurityReport = () => {
  const [report, setReport] = useState({
    totalEvents: 0,
    weakPinCount: 0,
    uniqueUsersAffected: 0,
    recentEvents: [],
    riskLevel: 'NONE',
    loading: true
  });

  useEffect(() => {
    try {
      // 1. Ingesta de Datos (Offline-First)
      const rawLogs = safeLoad(LOGS_KEY, []);

      // 2. Filtrado de Eventos de Interés (PIN Débil)
      const securityEvents = rawLogs.filter(log => 
        log.tipo === 'SECURITY_NOTICE' && 
        log.subTipo === 'PIN_DEBIL_DETECTADO'
      );

      // 3. Métricas Agregadas
      const uniqueUsers = new Set(securityEvents.map(e => e.usuarioId)).size;
      const totalWeak = securityEvents.length;

      // 4. Determinación de Nivel de Riesgo (Coherente con Fase 3.2)
      let level = 'NONE';
      if (totalWeak > 0) level = 'LOW';
      if (totalWeak > 10) level = 'MEDIUM';
      if (totalWeak > 50) level = 'HIGH';

      // 5. Últimos 5 Eventos (Más recientes primero)
      // Asumiendo que los logs se guardan cronológicamente (push), invertimos.
      const recent = [...securityEvents]
        .reverse()
        .slice(0, 5)
        .map(e => ({
          id: e.id,
          usuarioId: e.usuarioId,
          contexto: e.contexto, // LOGIN | JIT
          fecha: new Date(e.timestamp).toLocaleString('es-VE', {
            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
          })
        }));

      setReport({
        totalEvents: rawLogs.length,
        weakPinCount: totalWeak,
        uniqueUsersAffected: uniqueUsers,
        recentEvents: recent,
        riskLevel: level,
        loading: false
      });

    } catch (error) {
      console.warn("Error generando reporte de seguridad:", error);
      setReport(prev => ({ ...prev, loading: false }));
    }
  }, []);

  return report;
};