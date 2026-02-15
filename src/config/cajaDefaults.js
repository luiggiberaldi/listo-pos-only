// ✅ MULTI-CAJA: Configuración central de cajas
// Archivo: src/config/cajaDefaults.js

export const CAJA_IDS = {
    CAJA_1: 'caja-1',
    CAJA_2: 'caja-2',
    CAJA_3: 'caja-3',
};

export const CAJA_NOMBRES = {
    'caja-1': 'Caja Principal',
    'caja-2': 'Caja 2',
    'caja-3': 'Caja 3',
};

export const DEFAULT_CAJA = CAJA_IDS.CAJA_1;

/**
 * Helper: obtiene el key de caja, con fallback al default
 * @param {string} cajaId 
 * @returns {string}
 */
export const getCajaKey = (cajaId) => cajaId || DEFAULT_CAJA;

/**
 * Helper: obtiene el nombre legible de una caja
 * @param {string} cajaId 
 * @returns {string}
 */
export const getCajaNombre = (cajaId) => CAJA_NOMBRES[cajaId] || `Caja ${cajaId}`;
