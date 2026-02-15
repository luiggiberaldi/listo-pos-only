// 🏪 PLAN TIERS — Definición central de planes Listo POS
// Archivo: src/config/planTiers.js

/**
 * Cada plan define:
 * - label:      Nombre visible para el usuario
 * - maxCajas:   Máximo de cajas permitidas (1, 2, 99)
 * - features:   Set de features habilitadas
 * - color:      Color del badge del plan (tailwind classes)
 */

// ═══════════════════════════════════════════
// FEATURE KEYS (constantes para evitar typos)
// ═══════════════════════════════════════════
export const FEATURES = {
    // BODEGA (Básicas - siempre incluidas)
    POS: 'pos',
    INVENTARIO: 'inventario',
    CORTE_Z: 'cierre',
    CONFIG_BASICA: 'config',

    // ABASTO (Intermedias)
    CLIENTES: 'clientes',
    FIADO: 'fiado',
    GASTOS: 'gastos',
    HISTORIAL: 'historial',
    TOTAL_DIARIO: 'totalDiario',
    CATEGORIAS: 'categorias',
    KARDEX: 'kardex',
    PESAJE: 'pesaje',
    MULTI_CAJA: 'multiCaja',

    // MINIMARKET (Avanzadas)
    DASHBOARD: 'dashboard',
    REPORTES: 'reportes',
    GHOST_AI: 'ghostAI',
    GHOST_ANALYTICS: 'ghostAnalytics',
    KNOWLEDGE_BASE: 'knowledgeBase',
    SIMULADOR: 'simulador',
    ROLES: 'roles',
    CONFIG_AVANZADA: 'configAvanzada',
};

// ═══════════════════════════════════════════
// FEATURES POR TIER (acumulativas)
// ═══════════════════════════════════════════
const BODEGA_FEATURES = new Set([
    FEATURES.POS,
    FEATURES.INVENTARIO,
    FEATURES.CORTE_Z,
    FEATURES.CONFIG_BASICA,
    FEATURES.TOTAL_DIARIO, // 🟢 UNLOCKED FOR ALL
    FEATURES.DASHBOARD,    // 🟢 UNLOCKED FOR ALL
]);

const ABASTO_FEATURES = new Set([
    ...BODEGA_FEATURES,
    FEATURES.CLIENTES,
    FEATURES.FIADO,
    FEATURES.GASTOS,
    FEATURES.HISTORIAL,
    FEATURES.TOTAL_DIARIO,
    FEATURES.CATEGORIAS,
    FEATURES.KARDEX,
    FEATURES.PESAJE,
    FEATURES.MULTI_CAJA,
]);

const MINIMARKET_FEATURES = new Set([
    ...ABASTO_FEATURES,
    FEATURES.DASHBOARD,
    FEATURES.REPORTES,
    FEATURES.GHOST_AI,
    FEATURES.GHOST_ANALYTICS,
    FEATURES.KNOWLEDGE_BASE,
    FEATURES.SIMULADOR,
    FEATURES.ROLES,
    FEATURES.CONFIG_AVANZADA,
]);

// ═══════════════════════════════════════════
// DEFINICIÓN DE PLANES
// ═══════════════════════════════════════════
export const PLANES = {
    bodega: {
        id: 'bodega',
        label: 'Bodega',
        maxCajas: 1,
        features: BODEGA_FEATURES,
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: '🏪',
    },
    abasto: {
        id: 'abasto',
        label: 'Abasto',
        maxCajas: 2,
        features: ABASTO_FEATURES,
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: '🛒',
    },
    minimarket: {
        id: 'minimarket',
        label: 'Minimarket',
        maxCajas: 99,
        features: MINIMARKET_FEATURES,
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: '🏬',
    },
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/** Verificar si un plan tiene acceso a una feature */
export const hasFeature = (planId, featureKey) => {
    const plan = PLANES[planId];
    if (!plan) return false;
    return plan.features.has(featureKey);
};

/** Obtener el máximo de cajas para un plan */
export const getMaxCajas = (planId) => {
    return PLANES[planId]?.maxCajas || 1;
};

/** Obtener el plan completo (con fallback a bodega) */
export const getPlan = (planId) => {
    return PLANES[planId] || PLANES.bodega;
};

/** Plan default para licencias nuevas */
export const DEFAULT_PLAN = 'bodega';

/** Mapeo de rutas a features requeridas */
export const ROUTE_FEATURES = {
    '/clientes': FEATURES.CLIENTES,
    '/total-diario': FEATURES.TOTAL_DIARIO,
    '/historial-ventas': FEATURES.HISTORIAL,
    '/dashboard': FEATURES.DASHBOARD,
    '/reportes': FEATURES.REPORTES,
    '/simulacion': FEATURES.SIMULADOR,
};
