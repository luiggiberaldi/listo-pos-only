import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';
import { fixFloat } from '../../utils/mathUtils';

export const useInventoryStressTest = () => {
  const store = useStore();
  const storeRef = useRef(store);
  
  useEffect(() => { storeRef.current = store; }, [store]);

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const abortRef = useRef(false);

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('es-VE', { hour12: false });
    setLogs(prev => [...prev, { time, msg, type }]);
  };

  const esperar = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // 🕵️ Auditoría: Busca por ID (para seguimiento)
  const auditarDiscoPorId = (id) => {
    const dbRaw = localStorage.getItem('listo-productos'); 
    if (!dbRaw) return null;
    const db = JSON.parse(dbRaw);
    return db.find(p => p.id === id);
  };

  // 🕵️ Auditoría: Busca por CÓDIGO (para captura inicial)
  const auditarDiscoPorCodigo = (codigo) => {
    const dbRaw = localStorage.getItem('listo-productos'); 
    if (!dbRaw) return null;
    const db = JSON.parse(dbRaw);
    return db.find(p => p.codigo === codigo);
  };

  const auditarKardex = (productoNombre, tipoMovimiento) => {
    const movs = storeRef.current.movimientos || [];
    return movs.find(m => m.producto === productoNombre && m.tipo === tipoMovimiento);
  };

  const ejecutarSimulacion = async (diasSimulacion = 7) => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    abortRef.current = false;

    addLog(`=== STRESS TEST V6 3.1 (OMNI-STRESS) ===`, 'header');
    addLog(`Objetivo: Simulación de ${diasSimulacion} días con captura dinámica de ID.`, 'info');

    let sujetoId = null;
    // Generamos un código único para rastrear al sujeto pase lo que pase con su ID
    const CODIGO_TEST = `V6-${Date.now()}-${Math.floor(Math.random()*1000)}`;

    try {
        // ==================================================================================
        // FASE 1: CLONACIÓN Y EVOLUCIÓN
        // ==================================================================================
        addLog("🧬 FASE 1: Selección y Evolución del Sujeto...", 'header');
        
        const inventarioReal = storeRef.current.productos || [];
        let productoBase = null;

        if (inventarioReal.length > 0) {
            const randomIdx = Math.floor(Math.random() * inventarioReal.length);
            productoBase = inventarioReal[randomIdx];
            addLog(`Sujeto Base: "${productoBase.nombre}"`, 'info');
        } else {
            productoBase = { nombre: 'GENERICO', stock: 0, precio: 1, costo: 0.5, tipoUnidad: 'unidad' };
            addLog("Inventario vacío. Usando sintético.", 'warning');
        }

        const PRODUCTO_TEST = {
            ...productoBase,
            id: `TEMP-${Date.now()}`, // Este ID será ignorado por useInventory
            nombre: `🧪 [TEST] ${productoBase.nombre} (V6)`,
            codigo: CODIGO_TEST,      // ✅ NUESTRO RASTREADOR
            stock: 1000,
            tipoUnidad: 'unidad',
            jerarquia: {
                bulto: { activo: true, contenido: 4, precio: 20 },
                paquete: { activo: true, contenido: 5, precio: 5 },
                unidad: { activo: true, precio: 1 }
            },
            _isTest: true
        };

        storeRef.current.agregarProducto(PRODUCTO_TEST);
        await esperar(1500); // Tiempo para escritura en disco

        // 🔍 BÚSQUEDA POR CÓDIGO (FIX CRÍTICO)
        let sujeto = auditarDiscoPorCodigo(CODIGO_TEST);
        
        if (!sujeto) throw new Error("Fallo Crítico: El clon no aparece en disco (búsqueda por código).");
        
        sujetoId = sujeto.id; // 🎣 CAPTURA DEL ID REAL ASIGNADO POR EL SISTEMA
        addLog(`✅ Clon Identificado. ID Real: ${sujetoId}. Stock: 1000.`, 'success');
        setProgress(10);

        // ==================================================================================
        // FASE 2: PRUEBA DE LIMITE NEGATIVO
        // ==================================================================================
        addLog("📉 FASE 2: Prueba de Límite Negativo...", 'header');
        
        const permitirNegativo = storeRef.current.configuracion?.permitirSinStock;
        const itemsMassive = [{ ...sujeto, cantidad: 5000, unidadVenta: 'unidad' }];
        const ventaNegId = `V-NEG-${Date.now()}`;
        
        const resultadoNeg = storeRef.current.transaccionVenta(itemsMassive, ventaNegId, storeRef.current.usuario);
        await esperar(800);
        sujeto = auditarDiscoPorId(sujetoId); // Ahora usamos el ID real

        if (permitirNegativo) {
            if (fixFloat(sujeto.stock) !== -4000) throw new Error(`Error Matemático Negativo. Real: ${sujeto.stock}`);
            addLog(`✅ Venta Sin Stock permitida (-4000). Correcto.`, 'success');
            storeRef.current.transaccionAnulacion(itemsMassive, ventaNegId, "Reset V6", storeRef.current.usuario);
            addLog(`🔄 Stock restaurado a 1000.`, 'info');
        } else {
            if (resultadoNeg) throw new Error("Fallo Seguridad: Se permitió venta masiva sin stock.");
            if (fixFloat(sujeto.stock) !== 1000) throw new Error(`Fuga de Stock. Cambió a ${sujeto.stock}.`);
            addLog(`🛡️ Bloqueo de Sin Stock activo. Correcto.`, 'success');
        }
        await esperar(1000);
        setProgress(20);

        // ==================================================================================
        // FASE 3: SIMULACIÓN DE DÍAS (Endurance Loop)
        // ==================================================================================
        addLog(`⏳ FASE 3: Ciclo de Trabajo (${diasSimulacion} Días)...`, 'header');
        
        for (let dia = 1; dia <= diasSimulacion; dia++) {
            if (abortRef.current) break;

            sujeto = auditarDiscoPorId(sujetoId);
            const stockInicio = sujeto.stock;

            // --- ESCENARIO DEL DÍA: VENTA MIXTA COMPLEJA ---
            // 2 Bultos (40) + 3 Paquetes (15) + 4 Unidades (4) = 59 Total
            const ventaDelDia = [
                { ...sujeto, cantidad: 2, unidadVenta: 'bulto' },
                { ...sujeto, cantidad: 3, unidadVenta: 'paquete' },
                { ...sujeto, cantidad: 4, unidadVenta: 'unidad' }
            ];
            
            storeRef.current.transaccionVenta(ventaDelDia, `V-DIA-${dia}`, storeRef.current.usuario);
            
            // --- REPOSICIÓN ---
            await esperar(150);
            sujeto = auditarDiscoPorId(sujetoId);
            storeRef.current.actualizarProducto(sujetoId, { ...sujeto, stock: sujeto.stock + 60, _motivo: `Compra Día ${dia}` });

            // --- BALANCE ---
            // Inicio - 59 + 60 = Inicio + 1
            await esperar(250);
            sujeto = auditarDiscoPorId(sujetoId);
            
            const balanceEsperado = fixFloat(stockInicio + 1);
            if (fixFloat(sujeto.stock) !== balanceEsperado) {
                throw new Error(`🚨 DESCUADRE DÍA ${dia}. Esperado: ${balanceEsperado}, Real: ${sujeto.stock}`);
            }

            if (dia === 1 || dia % 5 === 0 || dia === diasSimulacion) {
                addLog(`📅 Día ${dia}: Operaciones Mixtas OK. Stock: ${sujeto.stock}`, 'info');
            }
            
            const avance = 20 + ((dia / diasSimulacion) * 70);
            setProgress(Math.floor(avance));
        }

        // ==================================================================================
        // FASE 4: AUDITORÍA KARDEX
        // ==================================================================================
        addLog("🔎 FASE 4: Auditoría de Trazabilidad...", 'header');
        
        const logVenta = auditarKardex(sujeto.nombre, 'SALIDA_VENTA');
        const logEntrada = auditarKardex(sujeto.nombre, 'ENTRADA_EDICION');

        if (!logVenta) throw new Error("Fallo Kardex: Sin registro de Ventas.");
        if (!logEntrada) throw new Error("Fallo Kardex: Sin registro de Reposición.");
        
        addLog("✅ Kardex consistente.", 'success');
        setProgress(95);

        // ==================================================================================
        // FASE 5: LIMPIEZA
        // ==================================================================================
        addLog("🧹 FASE 5: Eliminando Clon...", 'header');
        storeRef.current.eliminarProducto(sujetoId);
        
        await esperar(800);
        if (auditarDiscoPorId(sujetoId)) addLog("⚠️ Advertencia: Residuo en disco.", 'warning');
        else addLog("✅ Clon eliminado. Sistema limpio.", 'success-bold');

        setProgress(100);
        addLog(`🏆 PRUEBA V6 3.1 COMPLETADA CON ÉXITO.`, 'success-bold');

    } catch (error) {
        addLog(`🔥 FALLO CRÍTICO: ${error.message}`, 'error-bold');
        try { if(sujetoId) storeRef.current.eliminarProducto(sujetoId); } catch(e){}
    } finally {
        setIsRunning(false);
    }
  };

  const detenerSimulacion = () => { abortRef.current = true; setIsRunning(false); };

  return { isRunning, progress, logs, ejecutarSimulacion, detenerSimulacion };
};