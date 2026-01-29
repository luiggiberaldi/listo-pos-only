import { useState, useRef, useEffect } from 'react';

export const usePaymentState = (initialClient, metodosActivos, isTouch) => {
    const [modo, setModo] = useState('contado');
    const [clienteSeleccionado, setClienteSeleccionado] = useState(initialClient?.id || '');
    const [pagos, setPagos] = useState({});
    const [referencias, setReferencias] = useState({});

    // 🆕 Centralized Wallet State (This was missing!)
    const [pagoSaldoFavor, setPagoSaldoFavor] = useState('');

    // UI State for Touch/Inputs
    const [activeInputId, setActiveInputId] = useState(null);
    const [activeInputType, setActiveInputType] = useState('amount'); // 'amount' | 'ref'
    const inputRefs = useRef([]);

    // Auto-focus first input on mount
    useEffect(() => {
        if (inputRefs.current[0]) setTimeout(() => inputRefs.current[0].focus(), 100);
    }, []);

    // 🆕 RESET SALDO INPUT WHEN CLIENT CHANGES
    useEffect(() => {
        setPagoSaldoFavor('');
    }, [clienteSeleccionado]);

    // 📱 AUTO-SCROLL PARA MODO TOUCH
    useEffect(() => {
        if (isTouch && activeInputId) {
            const index = metodosActivos.findIndex(m => m.id === activeInputId);
            if (index !== -1 && inputRefs.current[index]) {
                inputRefs.current[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [activeInputId, isTouch, metodosActivos]);

    const val = (id) => (pagos[id] === '' || !pagos[id] ? 0 : Math.round((parseFloat(pagos[id]) + Number.EPSILON) * 100) / 100);

    return {
        modo, setModo,
        clienteSeleccionado, setClienteSeleccionado,
        pagos, setPagos,
        referencias, setReferencias,
        pagoSaldoFavor, setPagoSaldoFavor, // Exporting the missing state setter
        activeInputId, setActiveInputId,
        activeInputType, setActiveInputType,
        inputRefs,
        val
    };
};
