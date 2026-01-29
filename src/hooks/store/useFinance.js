import { useState, useEffect } from 'react';
import { safeLoad } from '../../utils/storageUtils';

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
        const cargados = safeLoad('listo-metodos', metodosDefault);
        return Array.isArray(cargados) ? cargados : metodosDefault;
    });

    useEffect(() => { localStorage.setItem('listo-metodos', JSON.stringify(metodosPago)); }, [metodosPago]);

    // ✅ CORRECCIÓN: Ahora todas las funciones retornan un objeto { success: true }
    // Esto permite que la interfaz sepa que la operación fue exitosa y cierre el modal.

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

    return { metodosPago, agregarMetodoPago, editarMetodoPago, toggleMetodoPago, eliminarMetodoPago };
};