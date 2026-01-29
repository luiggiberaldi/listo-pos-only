import { useState, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import { fixFloat } from '../../utils/mathUtils';

// Utils de Performance
const delay = (ms) => new Promise(res => setTimeout(res, ms));
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Monitor de Almacenamiento (Estimación UTF-16)
const getStorageUsage = () => {
    let total = 0;
    for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            total += ((localStorage[key].length + key.length) * 2);
        }
    }
    const kb = total / 1024;
    const mb = kb / 1024;
    const percent = (total / (5 * 1024 * 1024)) * 100; 
    return { 
        bytes: total, 
        formated: mb > 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`,
        percent: percent.toFixed(2)
    };
};

export const useAdvancedSimulation = () => {
  const { 
    registrarVenta, abrirCajaPOS, cerrarCaja, 
    productos, clientes, configuracion 
  } = useStore();

  const [logs, setLogs] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  
  const shouldStop = useRef(false);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => {
        const newLogs = [...prev, { time: new Date().toLocaleTimeString(), msg, type }];
        if (newLogs.length > 30) return newLogs.slice(newLogs.length - 30);
        return newLogs;
    });
  };

  const detenerSimulacion = () => {
      if (isRunning) {
          shouldStop.current = true;
          addLog(`🛑 DETENIENDO MOTOR...`, 'warning');
      }
  };

  const ejecutarSimulacionEscalada = async (diasConfig = 90) => {
    if (isRunning) return;
    
    setIsRunning(true);
    shouldStop.current = false;
    setLogs([]); 
    
    addLog(`🚀 INICIANDO SIMULACIÓN 4.1 (${diasConfig} Días)...`, 'header');
    await delay(100); 

    // CONFIGURACIÓN DEL MOTOR
    let tasaActual = 45.00; 
    let fechaVirtual = new Date();
    fechaVirtual.setDate(fechaVirtual.getDate() - diasConfig);

    let totalVentasGeneradas = 0;
    let erroresAcumulados = 0;

    try {
      for (let dia = 1; dia <= diasConfig; dia++) {
        if (shouldStop.current) {
            addLog(`⛔ ABORTADO EN DÍA ${dia}.`, 'error-bold');
            break;
        }

        // 1. AVANZAR TIEMPO Y TASA
        fechaVirtual.setDate(fechaVirtual.getDate() + 1);
        const fechaISO = fechaVirtual.toISOString();
        const fluctuacion = (Math.random() * 0.02) - 0.005; 
        tasaActual = fixFloat(tasaActual * (1 + fluctuacion));

        setProgress((dia / diasConfig) * 100);

        // 2. APERTURA
        try { abrirCajaPOS(randomInt(50, 200)); } catch (e) { }

        // 3. VENTAS
        const ventasHoy = randomInt(10, 20);
        
        for (let v = 0; v < ventasHoy; v++) {
            if (shouldStop.current) break;

            const prod = productos[randomInt(0, productos.length - 1)];
            if (!prod) continue; 
            
            const cantidad = randomInt(1, 5);
            const totalUSD = fixFloat(prod.precio * cantidad);
            const totalBS = fixFloat(totalUSD * tasaActual);

            const esCredito = Math.random() < 0.3;
            const cliente = clientes.length > 0 ? clientes[randomInt(0, clientes.length - 1)] : null;
            const ventaTipoCredito = esCredito && cliente;

            const payloadVenta = {
                items: [{ ...prod, cantidad, precio: prod.precio, unidadVenta: 'unidad' }],
                total: totalUSD,
                subtotal: totalUSD,
                totalBS: totalBS,
                tasa: tasaActual,
                fecha: fechaISO, 
                metodos: ventaTipoCredito ? [] : [{ metodo: 'Efectivo USD', monto: totalUSD, montoBS: 0, tipo: 'DIVISA' }],
                distribucionVuelto: { usd: 0, bs: 0 },
                esCredito: ventaTipoCredito,
                clienteId: ventaTipoCredito ? cliente.id : null,
                deudaPendiente: ventaTipoCredito ? totalUSD : 0
            };

            try {
                registrarVenta(payloadVenta);
                totalVentasGeneradas++;
            } catch (err) {
                // Ignorar errores de caja cerrada por desfase
            }
        }

        // 4. CIERRE
        try { cerrarCaja(); } catch (e) { }

        // 5. LOG DIARIO (Cada 5 días)
        if (dia % 5 === 0) {
            const usoDisco = getStorageUsage();
            addLog(`📅 Día ${dia} | Tasa: ${tasaActual} | Disco: ${usoDisco.percent}%`, 'info');
        }

        await delay(20); // Pequeño respiro al CPU
      }

      if (!shouldStop.current) {
          addLog(`🏁 FINALIZADO. Ventas: ${totalVentasGeneradas}`, 'success');
      }

    } catch (error) {
      addLog(`💥 ERROR: ${error.message}`, 'error-bold');
    } finally {
      setIsRunning(false);
      shouldStop.current = false;
    }
  };

  return { ejecutarSimulacionEscalada, detenerSimulacion, logs, isRunning, progress };
};