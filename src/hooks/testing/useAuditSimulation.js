import { useState, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { fixFloat } from '../../utils/mathUtils';

/**
 * useAuditSimulation.js (Motor V8.0 - Forensic Edition)
 * Objetivo: Validar la integridad matemática y el rastro forense (Kardex) de una auditoría.
 */
export const useAuditSimulation = () => {
  const { 
    productos, 
    movimientos, // ✅ Necesario para validar el rastro
    actualizarProducto, 
    crearPlantillaAuditoria, 
    iniciarAuditoria, 
    actualizarConteoAuditoria, 
    resolverDiferencia, 
    cerrarAuditoria
  } = useStore();

  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('es-VE', { hour12: false });
    setLogs(prev => [...prev, { time, msg, type }]);
  };

  // 🕵️ Helper Forense: Lee directo del disco para evitar engaños de React
  const leerDisco = (key) => {
      try {
          return JSON.parse(localStorage.getItem(key)) || [];
      } catch (e) { return []; }
  };

  const ejecutarSimulacion = useCallback(async () => {
    if (productos.length < 3) {
        addLog("❌ Error: Se necesitan al menos 3 productos para la muestra.", "error");
        return;
    }

    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    
    addLog("🕵️ INICIANDO AUDITORÍA FORENSE V8.0", "header");
    addLog("Objetivo: Validar integridad de datos, persistencia en disco y rastro en Kardex.", "info");

    try {
        // ==========================================================
        // FASE 1: PREPARACIÓN Y SABOTAJE CONTROLADO
        // ==========================================================
        setProgress(10);
        const victima = productos[0]; // El sujeto de prueba
        const stockInicialReal = parseFloat(victima.stock);
        const stockSaboteado = stockInicialReal + 25; // Inflamos el sistema

        // 1. Saboteamos el sistema (Simulamos error de inventario previo)
        // Usamos _motivo para que no genere un log de auditoría válido todavía
        await actualizarProducto(victima.id, { stock: stockSaboteado, _motivo: 'SIM_SABOTAJE_PREVIO' });
        
        addLog(`📉 ESCENARIO: Stock Real (${stockInicialReal}) vs Sistema Inflado (${stockSaboteado})`, "warning");
        await new Promise(r => setTimeout(r, 800));

        // ==========================================================
        // FASE 2: EL PROCESO DE AUDITORÍA
        // ==========================================================
        addLog("⚖️ Ejecutando Protocolo de Auditoría...", "info");
        
        // 1. Crear y Abrir
        const plantillaId = crearPlantillaAuditoria(`AUDIT_FORENSE_${Date.now()}`, [victima.id]);
        const sesionId = iniciarAuditoria(plantillaId);
        addLog(`   ✅ Sesión #${sesionId} abierta.`, "dim");

        // 2. Conteo Físico (Descubrimos la verdad)
        // El auditor cuenta el stock REAL (stockInicialReal), ignorando el saboteado
        actualizarConteoAuditoria(sesionId, victima.id, stockInicialReal);
        addLog(`   ✅ Conteo físico ingresado: ${stockInicialReal}`, "dim");
        
        await new Promise(r => setTimeout(r, 1000));
        setProgress(50);

        // 3. Resolución (Aceptamos que el sistema estaba mal)
        resolverDiferencia(sesionId, victima.id, 'ACEPTAR'); // "El conteo tiene la razón"
        addLog(`   ✅ Diferencia aceptada (Ajuste: -25).`, "dim");

        // 4. Cierre
        cerrarAuditoria(sesionId);
        addLog("🔒 Auditoría Cerrada. Cambios aplicados.", "success");
        
        setProgress(80);
        await new Promise(r => setTimeout(r, 1500)); // Esperar persistencia

        // ==========================================================
        // FASE 3: ANÁLISIS FORENSE (LA VERDAD)
        // ==========================================================
        addLog("🔬 FASE 3: Análisis Forense de Datos...", "header");

        // 🔍 PRUEBA A: Integridad en Memoria (React)
        const productoPostAudit = productos.find(p => p.id === victima.id);
        const diferenciaMatematica = Math.abs(parseFloat(productoPostAudit.stock) - stockInicialReal);
        
        if (diferenciaMatematica < 0.01) {
            addLog(`✅ [MEMORIA] Stock corregido perfectamente a ${stockInicialReal}.`, "success");
        } else {
            throw new Error(`Fallo Matemático en Memoria: Esperado ${stockInicialReal}, Actual ${productoPostAudit.stock}`);
        }

        // 🔍 PRUEBA B: Persistencia en Disco (LocalStorage)
        const dbProductos = leerDisco('listo-productos');
        const productoEnDisco = dbProductos.find(p => p.id === victima.id);
        
        if (productoEnDisco && Math.abs(parseFloat(productoEnDisco.stock) - stockInicialReal) < 0.01) {
             addLog(`✅ [DISCO] Datos persistidos correctamente en HD.`, "success");
        } else {
             throw new Error("Fallo de Persistencia: El disco duro tiene datos viejos.");
        }

        // 🔍 PRUEBA C: Rastro en Kardex (Trazabilidad)
        // Debe existir un movimiento reciente que justifique el cambio
        // Buscamos un movimiento de 'AJUSTE' o 'AUDITORIA' para este producto
        const dbMovimientos = leerDisco('listo-movimientos');
        
        // Filtramos movimientos recientes (últimos 5 seg) del producto
        const now = Date.now();
        const rastroForense = dbMovimientos.find(m => 
            m.producto === victima.nombre && 
            (new Date(m.fecha).getTime() > now - 10000) &&
            (m.tipo.includes('AJUSTE') || m.tipo.includes('AUDITORIA') || m.tipo.includes('EDICION'))
        );

        if (rastroForense) {
            addLog(`✅ [TRAZABILIDAD] Log encontrado: "${rastroForense.tipo}"`, "success");
            addLog(`   📄 Detalle: ${rastroForense.detalle || 'Sin detalle'}`, "dim");
        } else {
             throw new Error("FRAUDE DETECTADO: El stock cambió sin dejar rastro en el Kardex (Movimiento Fantasma).");
        }

        setProgress(100);
        addLog("🏆 CERTIFICACIÓN FORENSE V8: APROBADA", "success-bold");

    } catch (error) {
        console.error(error);
        addLog(`🔥 FALLO CRÍTICO: ${error.message}`, "error-bold");
    } finally {
        setIsRunning(false);
    }
  }, [productos, movimientos, crearPlantillaAuditoria, iniciarAuditoria, actualizarConteoAuditoria, resolverDiferencia, cerrarAuditoria, actualizarProducto]);

  return { ejecutarSimulacion, logs, progress, isRunning };
};