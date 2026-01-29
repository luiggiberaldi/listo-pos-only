import { useState, useEffect, useCallback } from 'react';
import { safeLoad } from '../../utils/storageUtils';

export const useSecurityLogs = () => {
    // Cargar logs existentes o iniciar array vacío
    const [logs, setLogs] = useState(() => safeLoad('listo_security_logs', []));

    // Persistencia automática
    useEffect(() => {
        localStorage.setItem('listo_security_logs', JSON.stringify(logs));
    }, [logs]);

    const registrarEvento = useCallback((accion, detalle, nivel = 'INFO', actor = 'SISTEMA') => {
        const nuevoLog = {
            id: crypto.randomUUID(), // Aseguramos ID único para el log
            timestamp: new Date().toISOString(),
            accion,
            detalle,
            nivel, // INFO, WARNING, ERROR, CRITICAL
            actor
        };

        setLogs(prev => [nuevoLog, ...prev]);
        console.log(`🛡️ [SEC-LOG] ${accion}: ${detalle}`);
    }, []);

    const limpiarLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return {
        logs,
        registrarEvento,
        limpiarLogs
    };
};
