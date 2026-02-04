import { useEffect, useState } from 'react';
import { useConfigStore } from '../../stores/useConfigStore';

export const useAppConfig = () => {
    // ⚡ ZUSTAND BINDING
    const configuracion = useConfigStore(state => state.configuracion);
    const setConfiguracion = useConfigStore(state => state.setConfiguracion);
    const obtenerTasaBCV = useConfigStore(state => state.obtenerTasaBCV);

    // UI Local State (DevMode is purely local/session)
    const [devMode, setDevMode] = useState(false);

    // 🎨 UI SIDE EFFECTS (DOM Manipulation)
    useEffect(() => {
        // Dark Mode
        // document.documentElement.classList.toggle('dark', configuracion.modoOscuro); 
        document.documentElement.classList.remove('dark'); // Force Light for now as per previous logic

        // Touch Mode
        if (configuracion.modoTouch) {
            document.documentElement.classList.add('touch-mode');
        } else {
            document.documentElement.classList.remove('touch-mode');
        }

    }, [configuracion.modoOscuro, configuracion.modoTouch]);

    // 🔄 AUTO-UPDATE TASA INTERVAL
    useEffect(() => {
        let intervalId = null;
        const frecuencia = parseInt(configuracion.autoUpdateFrecuencia) || 0;

        if (configuracion.autoUpdateTasa && frecuencia > 0) {
            const runUpdate = () => obtenerTasaBCV(false);
            intervalId = setInterval(runUpdate, frecuencia);

            // Initial run check handled by store or manual trigger usually, but let's leave interval
        }
        return () => { if (intervalId) clearInterval(intervalId); };
    }, [configuracion.autoUpdateTasa, configuracion.autoUpdateFrecuencia, obtenerTasaBCV]);


    return {
        configuracion,
        guardarConfiguracion: setConfiguracion,
        devMode,
        setDevMode,
        obtenerTasaBCV
    };
};