// 🏪 PLAN TIERS — Definición central de planes Listo POS
// Archivo: src/config/planTiers.js

import { PERMISOS } from './permissions';

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
    HISTORIAL_BASICO: 'historialBasico', // 🆕 Movido a Bodega

    // ABASTO (Intermedias)
    CLIENTES: 'clientes',
    FIADO: 'fiado',
    GASTOS: 'gastos',
    TOTAL_DIARIO: 'totalDiario', // Finanzas simples
    CATEGORIAS: 'categorias',
    KARDEX: 'kardex',
    PESAJE: 'pesaje', // Balanza
    MULTI_CAJA: 'multiCaja', // 2 Cajas

    // MINIMARKET (Avanzadas)
    DASHBOARD: 'dashboard',   // Analytics Real
    REPORTES_AVANZADOS: 'reportes',
    AUDITORIA: 'auditoria',   // 🆕 Logs de seguridad
    GHOST_AI: 'ghostAI',
    GHOST_ANALYTICS: 'ghostAnalytics',
    KNOWLEDGE_BASE: 'knowledgeBase',
    SIMULADOR: 'simulador',
    ROLES: 'roles',
    CONFIG_AVANZADA: 'configAvanzada',
    ETIQUETAS: 'etiquetas',   // 🆕 Label Designer
};

// ═══════════════════════════════════════════
// FEATURES POR TIER (acumulativas)
// ═══════════════════════════════════════════
const BODEGA_FEATURES = new Set([
    FEATURES.POS,
    FEATURES.INVENTARIO,
    FEATURES.CORTE_Z,
    FEATURES.CONFIG_BASICA,
    FEATURES.HISTORIAL_BASICO,
]);

const ABASTO_FEATURES = new Set([
    ...BODEGA_FEATURES,
    FEATURES.CLIENTES,
    FEATURES.FIADO,
    FEATURES.GASTOS,
    FEATURES.TOTAL_DIARIO,
    FEATURES.CATEGORIAS,
    FEATURES.KARDEX,
    FEATURES.PESAJE,
    FEATURES.MULTI_CAJA,
]);

const MINIMARKET_FEATURES = new Set([
    ...ABASTO_FEATURES,
    FEATURES.DASHBOARD,
    FEATURES.REPORTES_AVANZADOS,
    FEATURES.AUDITORIA,
    FEATURES.GHOST_AI,
    FEATURES.GHOST_ANALYTICS,
    FEATURES.KNOWLEDGE_BASE,
    FEATURES.SIMULADOR,
    FEATURES.ROLES,
    FEATURES.CONFIG_AVANZADA,
    FEATURES.ETIQUETAS,
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
// MAPEO: PERMISO (RBAC) -> REQUISITO DE PLAN
// ═══════════════════════════════════════════
export const PLAN_REQUIREMENTS = {
    // Ventas
    [PERMISOS.POS_ACCESO]: FEATURES.POS,
    [PERMISOS.CAJA_CERRAR]: FEATURES.CORTE_Z,
    [PERMISOS.CAJA_MOVIMIENTOS]: FEATURES.GASTOS, // Gastos requiere Abasto

    // Inventario
    [PERMISOS.INV_VER]: FEATURES.INVENTARIO,
    [PERMISOS.INV_VER_COSTOS]: FEATURES.CONFIG_AVANZADA, // Costos sensibles solo Minimarket? O Abasto? Dejemos Config Avanzada para costos.

    // Clientes
    [PERMISOS.CLI_VER]: FEATURES.CLIENTES,
    [PERMISOS.CLI_CREDITO]: FEATURES.FIADO,

    // Reportes
    [PERMISOS.REP_VER_DASHBOARD]: FEATURES.DASHBOARD, // Solo Minimarket
    [PERMISOS.REP_VER_VENTAS]: FEATURES.HISTORIAL_BASICO, // Bodega puede ver historial simple
    [PERMISOS.REP_VER_TOTAL_DIARIO]: FEATURES.TOTAL_DIARIO, // Abasto+
    [PERMISOS.REP_VER_AUDITORIA]: FEATURES.AUDITORIA, // Minimarket

    // Config
    [PERMISOS.CONF_USUARIOS_VER]: FEATURES.ROLES, // Minimarket
    [PERMISOS.CONF_NEGOCIO_EDITAR]: FEATURES.CONFIG_BASICA,
    [PERMISOS.CONF_FINANZAS_VER]: FEATURES.CONFIG_BASICA, // 🟢 Bovina (Bodega) necesita cambiar tasa
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════

/** Verificar si un plan tiene acceso a una feature */
export const hasFeature = (planId, featureKey) => {
    const plan = PLANES[planId] || PLANES.bodega;
    return plan.features.has(featureKey);
};

/** Obtener el plan completo (con fallback a bodega) */
export const getPlan = (planId) => {
    return PLANES[planId] || PLANES.bodega;
};

/** Plan default */
export const DEFAULT_PLAN = 'bodega';

