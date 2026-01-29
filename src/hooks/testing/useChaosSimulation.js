import { useState, useRef, useEffect } from 'react';
import { useStore } from '../../context/StoreContext';

const delay = (ms) => new Promise(res => setTimeout(res, ms));

export const useChaosSimulation = () => {
  const store = useStore();
  const storeRef = useRef(store); 
  
  useEffect(() => { storeRef.current = store; }, [store]);

  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const getMetodoValido = () => {
      const lista = storeRef.current.metodosPago || [];
      const m = lista.find(x => x.activo);
      return m ? m.nombre : "Efectivo";
  };

  /**
   * 🦍 EJECUTOR DE CAOS V3.1
   */
  const ejecutarCaos = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setProgress(0);
    
    addLog(`☢️ CHAOS MODE V3.1: RELOADED`, 'header');

    try {
      // ---------------------------------------------------------
      // FASE 0: PREPARACIÓN
      // ---------------------------------------------------------
      const productos = storeRef.current.productos;
      if (!productos.length) throw new Error("Se requiere inventario para el caos.");
      
      try {
        storeRef.current.abrirCajaPOS(100); 
        addLog(`🔓 Caja abierta para pruebas ($100)`, 'dim');
      } catch(e) { /* Ignorar */ }
      
      await delay(500);

      // ---------------------------------------------------------
      // FASE 1: THE HYDRA (Ataque de Concurrencia al Cierre)
      // ---------------------------------------------------------
      addLog(`🐙 FASE 1: PROTOCOLO HYDRA (10x Concurrent Close)`, 'header');
      
      const hydraHeads = Array(10).fill(null).map((_, i) => {
          return new Promise(resolve => {
              try {
                  const resultado = storeRef.current.cerrarCaja();
                  resolve({ status: 'fulfilled', id: resultado?.corteRef });
              } catch (e) {
                  resolve({ status: 'rejected', error: e.message });
              }
          });
      });

      const resultadosHydra = await Promise.all(hydraHeads);
      const exitos = resultadosHydra.filter(r => r.status === 'fulfilled');

      if (exitos.length === 1) {
          addLog(`🛡️ MUTEX BLINDADO: 1 Cierre Exitoso, 9 Bloqueados.`, 'success-bold');
      } else if (exitos.length > 1) {
          addLog(`💀 CRÍTICO: ${exitos.length} REPORTES Z SIMULTÁNEOS.`, 'error-bold');
      } else {
          addLog(`⚠️ RARO: Todos fallaron (¿Caja cerrada?).`, 'warning');
      }
      setProgress(30);

      // Reabrir para Fase 2
      if (exitos.length > 0) {
          await delay(500);
          try { storeRef.current.abrirCajaPOS(100); addLog(`🔓 Caja re-abierta.`, 'dim'); } catch(e){}
      }

      // ---------------------------------------------------------
      // FASE 2: PIRANHA POOL (Race Condition con Stock)
      // ---------------------------------------------------------
      addLog(`🐟 FASE 2: PIRANHA POOL (Inventory Race)`, 'header');
      
      // ESTRATEGIA DE SELECCIÓN MEJORADA: Buscar positivo, si no, el primero
      let victima = productos.find(p => parseFloat(p.stock) > 5) || productos[0];
      
      const stockReal = parseFloat(victima.stock);
      
      // 🛡️ FIX MATEMÁTICO: Asegurar siempre un array positivo
      // Si hay stock, lanzamos (stock + 5). Si es negativo o poco, lanzamos 20 fijos.
      const peticiones = stockReal > 0 ? Math.ceil(stockReal + 5) : 20;
      
      addLog(`   🎯 Objetivo: ${victima.nombre} (Stock: ${stockReal})`, 'info');
      addLog(`   🔥 Lanzando ${peticiones} compradores simultáneos...`, 'warning');

      const metodo = getMetodoValido();
      
      // Generamos el array de promesas de forma segura
      const piranhas = Array.from({ length: peticiones }).map((_, i) => {
          return new Promise(resolve => {
              setTimeout(() => {
                  try {
                      storeRef.current.registrarVenta({
                          items: [{ ...victima, cantidad: 1, precio: victima.precio }],
                          total: victima.precio, subtotal: victima.precio, totalBS: victima.precio, tasa: 1,
                          metodos: [{ metodo, monto: victima.precio, montoBS: 0 }],
                          distribucionVuelto: { usd: 0, bs: 0 },
                          id: `CHAOS-${Date.now()}-${i}`,
                          clienteId: null, esCredito: false
                      });
                      resolve({ status: 'sold' });
                  } catch (e) {
                      resolve({ status: 'rejected', msg: e.message });
                  }
              }, Math.random() * 50); 
          });
      });

      const resultadosPiranha = await Promise.all(piranhas);
      const ventasExitosas = resultadosPiranha.filter(r => r.status === 'sold').length;

      await delay(500);
      const stockFinal = parseFloat(storeRef.current.productos.find(p => p.id === victima.id).stock);
      
      // Validación flexible
      const stockInicialValido = stockReal > 0 ? stockReal : 0; // Si era negativo, lo tratamos como 0 para la lógica de "venta fantasma"
      
      if (stockFinal < 0 && !storeRef.current.configuracion?.permitirSinStock) {
          addLog(`💀 INTEGRIDAD ROTA: Stock negativo (${stockFinal}) no permitido.`, 'error-bold');
      } else if (ventasExitosas > stockInicialValido && !storeRef.current.configuracion?.permitirSinStock) {
          // Si partimos de stock negativo, cualquier venta exitosa es un error si 'permitirSinStock' es false
          addLog(`💀 VENTA FANTASMA: Se vendieron ${ventasExitosas} items sin stock suficiente.`, 'error-bold');
      } else {
          addLog(`🛡️ STOCK OK. Ventas: ${ventasExitosas}. Stock Final: ${stockFinal}`, 'success');
      }
      setProgress(70);

      // ---------------------------------------------------------
      // FASE 3: AMNESIA (Session Loss)
      // ---------------------------------------------------------
      addLog(`🧠 FASE 3: AMNESIA (Token Loss)`, 'header');
      
      const ventaSabotaje = {
          items: [{ ...victima, cantidad: 1, precio: 10 }],
          total: 10, metodos: [], distribucionVuelto: null
      };

      try {
          localStorage.removeItem('listo-caja-sesion');
          window.dispatchEvent(new Event("storage"));
          await delay(10);
          
          storeRef.current.registrarVenta(ventaSabotaje);
          addLog(`⚠️ ALERTA: Venta permitida sin sesión en disco.`, 'warning');
      } catch (e) {
          addLog(`🛡️ BLOQUEO DE SEGURIDAD: ${e.message}`, 'success');
      }
      
      // Restaurar para no dejar la app rota
      try { storeRef.current.abrirCajaPOS(100); } catch(e){}

      setProgress(100);
      addLog(`🏁 PRUEBA OMEGA FINALIZADA`, 'header');

    } catch (error) {
      addLog(`💥 ERROR: ${error.message}`, 'error-bold');
    } finally {
      setIsRunning(false);
    }
  };

  return { ejecutarCaos, logs, isRunning, progress };
};