import { useState, useEffect } from 'react';
import { safeLoad } from '../../utils/storageUtils';

const LOGS_KEY = 'listo_security_logs_v1';

/**
 * useSecurityInsights: Hook de Inteligencia de Seguridad (Solo Lectura).
 * Analiza pasivamente los logs para detectar patrones de riesgo acumulado.
 */
export const useSecurityInsights = () => {
  const [metrics, setMetrics] = useState({ 
    legacyPinUsage: 0, 
    riskLevel: 'NONE' // NONE | LOW | MEDIUM | HIGH
  });

  useEffect(() => {
    try {
      // 1. Lectura Pasiva (No-Blocking)
      const logs = safeLoad(LOGS_KEY, []);
      
      // 2. Análisis de Patrones (Detectar uso de PINs débiles)
      // Buscamos eventos específicos generados por la Fase 3.1
      const weakPinEvents = logs.filter(log => 
        log.tipo === 'SECURITY_NOTICE' && 
        log.subTipo === 'PIN_DEBIL_DETECTADO'
      );
      
      const count = weakPinEvents.length;

      // 3. Evaluación de Riesgo (Heurística simple)
      let level = 'NONE';
      if (count > 0) level = 'LOW';
      if (count > 10) level = 'MEDIUM';
      if (count > 50) level = 'HIGH';

      setMetrics({ 
        legacyPinUsage: count, 
        riskLevel: level 
      });

    } catch (error) {
      console.warn("Fallo silencioso en Security Insights:", error);
      // Fail-safe: Reportar riesgo cero si falla el análisis
      setMetrics({ legacyPinUsage: 0, riskLevel: 'NONE' });
    }
  }, []);

  return metrics;
};