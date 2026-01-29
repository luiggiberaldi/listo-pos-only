// 💰 FÉNIX FINANCIAL CORE - SYSTEM TYPES
// Definición del Modelo Bimodular (4 Cuadrantes)

export const CURRENCY = {
    USD: 'USD',
    VES: 'VES'
};

export const MEDIUM = {
    CASH: 'CASH',       // Efectivo Físico
    DIGITAL: 'DIGITAL'  // Electrónico / Banco
};

export const QUADRANT = {
    USD_CASH: 'USD_CASH',
    USD_DIGITAL: 'USD_DIGITAL',
    VES_CASH: 'VES_CASH',
    VES_DIGITAL: 'VES_DIGITAL'
};

// Mapa de Clasificación Automática
export const CLASSIFY_METHOD = (methodName = '') => {
    const m = methodName.toLowerCase();

    // 1. USD DIGITAL
    if (m.includes('zelle') || m.includes('panamá') || m.includes('binance') || m.includes('zinli') || m.includes('paypal')) {
        return { currency: CURRENCY.USD, medium: MEDIUM.DIGITAL };
    }

    // 2. VES DIGITAL
    if (m.includes('punto') || m.includes('biopago') || m.includes('pago móvil') || m.includes('transferencia')) {
        return { currency: CURRENCY.VES, medium: MEDIUM.DIGITAL };
    }

    // 3. VES CASH
    if (m.includes('bs') && m.includes('efectivo')) {
        return { currency: CURRENCY.VES, medium: MEDIUM.CASH };
    }

    // 4. USD CASH (Default fallback for "Efectivo")
    return { currency: CURRENCY.USD, medium: MEDIUM.CASH };
};
