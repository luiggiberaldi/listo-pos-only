// src/hooks/usePowerStatus.js
// Detecta si el equipo está funcionando con batería (sin corriente/UPS).
// Usa la Battery Status API del navegador.

import { useState, useEffect } from 'react';

export function usePowerStatus() {
    const [onBattery, setOnBattery] = useState(false);

    useEffect(() => {
        if (!navigator.getBattery) return;
        let battery = null;

        const handleChargingChange = () => {
            setOnBattery(!battery.charging);
        };

        navigator.getBattery().then(bat => {
            battery = bat;
            setOnBattery(!battery.charging);
            battery.addEventListener('chargingchange', handleChargingChange);
        });

        return () => {
            if (battery) {
                battery.removeEventListener('chargingchange', handleChargingChange);
            }
        };
    }, []);

    return onBattery;
}
