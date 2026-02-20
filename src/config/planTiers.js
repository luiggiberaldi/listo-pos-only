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
    // ═══ CORE (Siempre incluidos) ═══
    POS: 'pos',
    INVENTARIO: 'inventario',
    CORTE_Z: 'cierre',
    CONFIG_BASICA: 'config',
    HISTORIAL_BASICO: 'historialBasico',

    // ═══ ESSENTIALS (Operación diaria — Bodega+) ═══
    PESAJE: 'pesaje',
    FIADO: 'fiado',
    CATEGORIAS: 'categorias',
    GASTOS: 'gastos',
    CLIENTES: 'clientes',

    // ═══ BUSINESS (Gestión — Abasto+) ═══
    KARDEX: 'kardex',
    TOTAL_DIARIO: 'totalDiario',
    MULTI_CAJA: 'multiCaja',
    VENCIMIENTOS: 'vencimientos',
    METODOS_PAGO: 'metodosPago',

    // ═══ BUSINESS (Gestión de personal — Abasto+) ═══
    EMPLEADOS_BASICO: 'empleadosBasico', // Adelantos y consumos, máx 3 empleados

    // ═══ ENTERPRISE (Escala — Minimarket) ═══
    DASHBOARD: 'dashboard',
    REPORTES_AVANZADOS: 'reportes',
    AUDITORIA: 'auditoria',
    GHOST_AI: 'ghostAI',
    GHOST_ANALYTICS: 'ghostAnalytics',
    KNOWLEDGE_BASE: 'knowledgeBase',
    SIMULADOR: 'simulador',
    ROLES: 'roles',               // Permisos granulares + empleados ilimitados
    CONFIG_AVANZADA: 'configAvanzada',
    ETIQUETAS: 'etiquetas',
};

// ═══════════════════════════════════════════
// FEATURES POR TIER (acumulativas)
// Basado en research de bodegas, abastos y
// minimarkets venezolanos (2024-2025)
// ═══════════════════════════════════════════
const BODEGA_FEATURES = new Set([
    // CORE
    FEATURES.POS,
    FEATURES.INVENTARIO,
    FEATURES.CORTE_Z,
    FEATURES.CONFIG_BASICA,
    FEATURES.HISTORIAL_BASICO,
    // ESSENTIALS — Operación diaria de toda bodega venezolana
    FEATURES.PESAJE,        // ⚖️ Queso, granos, charcutería por kg
    FEATURES.FIADO,         // 📒 "Apúntame ahí" — tradición venezolana
    FEATURES.CATEGORIAS,    // 🏷️ Organizar: Bebidas, Granos, Limpieza
    FEATURES.GASTOS,        // 💰 ¿Gané o perdí hoy?
    FEATURES.CLIENTES,      // 👥 Directorio básico (necesario para fiado)
]);

const ABASTO_FEATURES = new Set([
    ...BODEGA_FEATURES,
    // BUSINESS — Gestión de negocio mediano
    FEATURES.KARDEX,            // 📊 Auditoría de movimientos de inventario
    FEATURES.TOTAL_DIARIO,      // 📋 Reporte financiero detallado
    FEATURES.MULTI_CAJA,        // 📦 2+ cajas simultáneas
    FEATURES.VENCIMIENTOS,      // 📅 Control de caducidad (perecederos)
    FEATURES.METODOS_PAGO,      // 💵 Desglose: efectivo/$, PagoMóvil, Punto
    FEATURES.EMPLEADOS_BASICO,  // 👷 Adelantos + consumos de empleados (máx 3)
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
        maxEmpleados: 0,           // Sin módulo de empleados
        features: BODEGA_FEATURES,
        color: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: '🏪',
    },
    abasto: {
        id: 'abasto',
        label: 'Abasto',
        maxCajas: 2,
        maxEmpleados: 3,           // Adelantos/consumos, máx 3 trabajadores
        features: ABASTO_FEATURES,
        color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        icon: '🛒',
    },
    minimarket: {
        id: 'minimarket',
        label: 'Minimarket',
        maxCajas: 99,
        maxEmpleados: Infinity,    // Sin límite, con permisos granulares
        features: MINIMARKET_FEATURES,
        color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        icon: '🏬',
    },
};

// ═══════════════════════════════════════════════════════════════
// [FIX M5] MAPEO: PERMISO (RBAC) → REQUISITO DE PLAN
// Ahora CONECTADO: usado por PlanGate via getRequiredFeature()
// ═══════════════════════════════════════════════════════════════
export const PLAN_REQUIREMENTS = {
    // Ventas
    [PERMISOS.POS_ACCESO]: FEATURES.POS,
    [PERMISOS.CAJA_CERRAR]: FEATURES.CORTE_Z,
    [PERMISOS.CAJA_MOVIMIENTOS]: FEATURES.GASTOS,

    // Inventario
    [PERMISOS.INV_VER]: FEATURES.INVENTARIO,
    [PERMISOS.INV_VER_COSTOS]: FEATURES.CONFIG_AVANZADA,

    // Clientes
    [PERMISOS.CLI_VER]: FEATURES.CLIENTES,
    [PERMISOS.CLI_CREDITO]: FEATURES.FIADO,

    // Reportes
    [PERMISOS.REP_VER_DASHBOARD]: FEATURES.DASHBOARD,
    [PERMISOS.REP_VER_VENTAS]: FEATURES.HISTORIAL_BASICO,
    [PERMISOS.REP_VER_TOTAL_DIARIO]: FEATURES.TOTAL_DIARIO,
    [PERMISOS.REP_VER_AUDITORIA]: FEATURES.AUDITORIA,

    // Config
    [PERMISOS.CONF_USUARIOS_VER]: FEATURES.EMPLEADOS_BASICO, // Abasto+ puede ver empleados (gating fino en ConfigSeguridad)
    [PERMISOS.CONF_NEGOCIO_EDITAR]: FEATURES.CONFIG_BASICA,
    [PERMISOS.CONF_FINANZAS_VER]: FEATURES.CONFIG_BASICA,
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

/**
 * [FIX M5] Obtener la feature requerida para un permiso RBAC dado.
 * Permite usar PlanGate con permisos directamente, sin conocer la feature subyacente.
 * @param {string} permissionKey - Clave del permiso (PERMISOS.XXX)
 * @returns {string|null} Feature key o null si no está mapeado
 */
export const getRequiredFeature = (permissionKey) => {
    return PLAN_REQUIREMENTS[permissionKey] || null;
};

/**
 * [FIX M4] Verificar si el plan permite añadir una caja más.
 * Usar en el servidor LAN (license-grant) y en la UI antes de crear Caja Secundaria.
 * @param {string} planId - ID del plan activo
 * @param {number} currentCajaCount - Número de cajas ya activas (incluyendo la principal)
 * @returns {boolean} true si se puede añadir otra caja
 */
export const canAddCaja = (planId, currentCajaCount = 1) => {
    const plan = PLANES[planId] || PLANES.bodega;
    return currentCajaCount < plan.maxCajas;
};

/** Plan default */
export const DEFAULT_PLAN = 'bodega';
