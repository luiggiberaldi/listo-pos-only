import { useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { fixFloat } from '../../utils/mathUtils';

/**
 * useDataArchiving.js - Versión 2.2 Re-Optimized (Hybrid Limit Support + Memoization)
 * Hook encargado de la salud del almacenamiento local con detección de Electron.
 */
export const useDataArchiving = () => {
  const { ventas, setVentas, configuracion, guardarConfiguracion } = useStore();

  /**
   * 1. VERIFICAR SALUD DEL ALMACENAMIENTO
   * Detecta si es Electron para ajustar el límite de 5MB a 50MB.
   */
  const verificarSaludAlmacenamiento = useCallback(() => {
    // DETECCIÓN DE ENTORNO: Electron expone electronAPI en el objeto window
    const isElectron = !!window.electronAPI;
    const LIMITE_MB = isElectron ? 50 : 5;

    // Estimación UTF-16: 2 bytes por carácter
    const ventasRaw = localStorage.getItem('listo-ventas') || '[]';
    const bytesVentas = ventasRaw.length * 2;
    const mbVentas = (bytesVentas / (1024 * 1024)).toFixed(2);

    const totalVentas = ventas.length;
    // En Electron podemos permitir más registros antes de sugerir archivado
    const RECOMENDACION_LIMITE = isElectron ? 8000 : 2000;

    // Cálculo de porcentaje de saturación basado en el límite dinámico
    const saturacion = fixFloat((parseFloat(mbVentas) / LIMITE_MB) * 100);

    return {
      totalVentas,
      pesoEstimadoMB: parseFloat(mbVentas),
      limiteMaximoMB: LIMITE_MB, // Exportado para la UI
      saturacion,
      necesitaArchivado: totalVentas > RECOMENDACION_LIMITE,
      status: totalVentas > RECOMENDACION_LIMITE ? 'CRITICAL' : (totalVentas > 1000 ? 'WARNING' : 'HEALTHY')
    };
  }, [ventas]);

  const archivarVentasViejas = useCallback(async (diasCorte = 30) => {
    const ahora = new Date();
    const milisegundosCorte = diasCorte * 24 * 60 * 60 * 1000;
    const fechaLimite = new Date(ahora.getTime() - milisegundosCorte);
    const paraArchivar = [];
    const paraMantener = [];

    ventas.forEach(v => {
      const fechaVenta = new Date(v.fecha);
      const esVieja = fechaVenta < fechaLimite;
      const esVentaContado = !v.esCredito && v.status === 'COMPLETADA';
      if (esVieja && esVentaContado) { paraArchivar.push(v); } else { paraMantener.push(v); }
    });

    if (paraArchivar.length === 0) { throw new Error("No hay ventas de contado completadas para archivar."); }

    const dataBackup = { fechaExportacion: ahora.toISOString(), registros: paraArchivar };
    const blob = new Blob([JSON.stringify(dataBackup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `LISTO_BACKUP_${ahora.toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setVentas(paraMantener);
    return { procesados: paraArchivar.length, espacioLiberadoKB: (JSON.stringify(paraArchivar).length / 1024).toFixed(2) };
  }, [ventas, setVentas]);

  const ejecutarLimpiezaSilenciosa = useCallback((diasCorte = 30) => {
    const milisegundosCorte = diasCorte * 24 * 60 * 60 * 1000;
    const fechaLimite = new Date(Date.now() - milisegundosCorte);
    const nuevasVentas = ventas.filter(v => {
      const esVieja = new Date(v.fecha) < fechaLimite;
      const esVentaContado = !v.esCredito && v.status === 'COMPLETADA';
      return !(esVieja && esVentaContado);
    });
    if (nuevasVentas.length !== ventas.length) {
      setVentas(nuevasVentas);
      return true;
    }
    return false;
  }, [ventas, setVentas]);

  const setAutoArchivado = useCallback((valor) => {
    guardarConfiguracion({ ...configuracion, autoArchivado: valor });
  }, [configuracion, guardarConfiguracion]);

  return {
    verificarSaludAlmacenamiento,
    archivarVentasViejas,
    ejecutarLimpiezaSilenciosa,
    autoArchivado: configuracion?.autoArchivado || false,
    setAutoArchivado
  };
};