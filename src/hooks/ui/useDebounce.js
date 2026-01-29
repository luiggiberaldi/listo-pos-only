import { useState, useEffect } from 'react';

/**
 * useDebounce Hook
 * Retrasa la actualización de un valor hasta que el usuario deja de escribir.
 * Ideal para búsquedas y filtrados pesados.
 * @param {any} value - El valor a observar
 * @param {number} delay - El retraso en ms (default 300)
 */
export function useDebounce(value, delay = 300) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Configurar el timer
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Limpiar el timer si el valor cambia antes del delay
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
