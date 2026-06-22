import { useState, useEffect } from 'react';
import { safeLoad } from '../../utils/storageUtils';
import { FinanceService } from '../../services/pos/FinanceService';

export const useFinance = () => {
    const metodosDefault = [
        { id: 'pago_movil', nombre: 'Pago Móvil', tipo: 'BS', icono: 'Smartphone', activo: true, requiereRef: true, aplicaIGTF: false },
        { id: 'punto_venta', nombre: 'Punto de Venta', tipo: 'BS', icono: 'CreditCard', activo: true, requiereRef: false, aplicaIGTF: false },
        { id: 'efectivo_bs', nombre: 'Efectivo (Bs)', tipo: 'BS', icono: 'Banknote', activo: true, requiereRef: false, aplicaIGTF: false },
        { id: 'efectivo_divisa', nombre: 'Efectivo Divisa', tipo: 'DIVISA', icono: 'Wallet', activo: true, requiereRef: false, aplicaIGTF: true },
        { id: 'zelle', nombre: 'Zelle', tipo: 'DIVISA', icono: 'Send', activo: true, requiereRef: true, aplicaIGTF: true },
        { id: 'binance', nombre: 'Binance', tipo: 'DIVISA', icono: 'Bitcoin', activo: true, requiereRef: true, aplicaIGTF: true }
    ];

    const [metodosPago, setMetodosPago] = useState(() => {
        let cargados = safeLoad('listo-metodos', metodosDefault);
        if (Array.isArray(cargados)) {
            const tieneCashea = cargados.some(m => m.id === 'cashea');
            if (!tieneCashea) {
                cargados = [...cargados, { id: 'cashea', nombre: 'Cashea', tipo: 'DIVISA', icono: 'Smartphone', activo: true, requiereRef: true, aplicaIGTF: false }];
            }
            return cargados;
        }
        return metodosDefault;
    });

    useEffect(() => { localStorage.setItem('listo-metodos', JSON.stringify(metodosPago)); }, [metodosPago]);

    // --- MÉTODOS DE CONFIGURACIÓN DE PAGOS ---

    const agregarMetodoPago = (nuevo) => {
        setMetodosPago(prev => [...prev, { ...nuevo, id: Date.now().toString(), activo: true }]);
        return { success: true, message: 'Método agregado correctamente' };
    };

    const editarMetodoPago = (id, datos) => {
        setMetodosPago(prev => prev.map(m => m.id === id ? { ...m, ...datos } : m));
        return { success: true, message: 'Método actualizado correctamente' };
    };

    const toggleMetodoPago = (id) => {
        setMetodosPago(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m));
        return { success: true };
    };

    const eliminarMetodoPago = (id) => {
        setMetodosPago(prev => prev.filter(m => m.id !== id));
        return { success: true };
    };

    // --- 💸 MÓDULO DE GASTOS (THIN CONTROLLER) ---
    const registrarGasto = async (datos) => {
        // datos: { monto, moneda, medio, motivo, usuario }
        try {
            // Delegamos toda la lógica transaccional al Servicio Puro
            const result = await FinanceService.registrarGasto(datos);
            return { success: true, message: 'Gasto registrado correctamente', logId: result.logId };
        } catch (error) {
            console.error("Error en registrarGasto (Controller):", error);
            // Mensaje amigable para UI
            return { success: false, message: error.message };
        }
    };

    return {
        metodosPago,
        agregarMetodoPago,
        editarMetodoPago,
        toggleMetodoPago,
        eliminarMetodoPago,
        registrarGasto,
        revertirGasto: FinanceService.revertirGasto,
        getReporteGastos: FinanceService.getReporteGastos
    };
};
