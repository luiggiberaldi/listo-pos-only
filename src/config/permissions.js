/**
 * 🔐 SISTEMA DE PERMISOS (RBAC) - V.2.1 (UNIFIED)
 * Fuente de verdad ÚNICA para roles, capacidades y metadatos del sistema.
 * Consolida src/security/permissions.js y src/config/permissions.js
 */

// --- 1. ROLES DEL SISTEMA ---
export const ROLES = {
    OWNER: 'ROL_DUENO',      // Dios del sistema
    MANAGER: 'ROL_ENCARGADO', // Supervisor (Inventario, Cajeros, Anulaciones)
    CASHIER: 'ROL_EMPLEADO',   // Operativo (Ventas básicas)
    CUSTOM: 'ROL_CUSTOM'     // 🆕 Personalizado (Empieza vacío)
};

// --- 2. DICCIONARIO DE PERMISOS (GRANULAR) ---
export const PERMISSIONS = {
    // 🛒 VENTAS Y CAJA
    POS_ACCESS: 'POS_ACCESS',
    POS_ACCESO: 'POS_ACCESO', // Legacy Alias

    POS_VOID_ITEM: 'POS_VOID_ITEM',
    POS_VOID_TICKET: 'POS_VOID_TICKET',

    CASH_OPEN: 'CASH_OPEN',
    CASH_CLOSE: 'CASH_CLOSE',
    CAJA_CERRAR: 'CAJA_CERRAR', // Legacy Alias

    CASH_MANAGE: 'CASH_MANAGE',
    CAJA_MOVIMIENTOS: 'CAJA_MOVIMIENTOS', // Alias for CASH_MANAGE logic if needed, or distinct

    // 📦 INVENTARIO
    INVENTORY_VIEW: 'INVENTORY_VIEW',
    INV_VER: 'INV_VER', // Legacy Alias

    INVENTORY_MANAGE: 'INVENTORY_MANAGE',
    INV_EDITAR: 'INV_EDITAR', // Alias preferido en UI

    INVENTORY_ADJUST: 'INVENTORY_ADJUST',
    INV_AJUSTE: 'INV_AJUSTE', // Alias

    INVENTORY_COSTS: 'INVENTORY_COSTS',
    INV_VER_COSTOS: 'INV_VER_COSTOS', // Alias

    // 👥 CLIENTES
    CLIENTS_VIEW: 'CLIENTS_VIEW',
    CLI_VER: 'CLI_VER', // Legacy Alias

    CLIENTS_MANAGE: 'CLIENTS_MANAGE',
    CLI_EDITAR: 'CLI_EDITAR', // Alias

    CLIENTS_CREDIT: 'CLIENTS_CREDIT',
    CLI_CREDITO: 'CLI_CREDITO', // Alias

    // 📊 REPORTES Y ANALÍTICA
    REPORTS_VIEW: 'REPORTS_VIEW',

    REPORTS_DASHBOARD: 'REPORTS_DASHBOARD',
    REP_VER_DASHBOARD: 'REP_VER_DASHBOARD', // Legacy Alias

    REPORTS_SALES: 'REP_VER_VENTAS', // Unified
    REP_VER_VENTAS: 'REP_VER_VENTAS', // Legacy Alias

    REPORTS_AUDIT: 'REPORTS_AUDIT',
    REP_VER_AUDITORIA: 'REP_VER_AUDITORIA', // Alias

    REPORTS_FINANCIAL: 'REPORTS_FINANCIAL',
    REP_VER_TOTAL_DIARIO: 'REP_VER_TOTAL_DIARIO', // Alias

    // ⚙️ CONFIGURACIÓN SENSIBLE
    SETTINGS_VIEW: 'SETTINGS_VIEW',
    CONF_ACCESO: 'CONF_ACCESO', // Legacy Alias

    SETTINGS_MANAGE_USERS: 'SETTINGS_MANAGE_USERS',
    CONF_USUARIOS_VER: 'CONF_USUARIOS_VER',
    CONF_USUARIOS_EDITAR: 'CONF_USUARIOS_EDITAR',

    SETTINGS_GLOBAL: 'SETTINGS_GLOBAL',

    CONF_NEGOCIO_VER: 'CONF_NEGOCIO_VER',
    CONF_NEGOCIO_EDITAR: 'CONF_NEGOCIO_EDITAR',

    CONF_FINANZAS_VER: 'CONF_FINANZAS_VER',
    CONF_FINANZAS_EDITAR: 'CONF_FINANZAS_EDITAR',

    CONF_SISTEMA_VER: 'CONF_SISTEMA_VER',
    CONF_SISTEMA_EDITAR: 'CONF_SISTEMA_EDITAR',

    SETTINGS_DB_RESET: 'SETTINGS_DB_RESET'
};

// ✅ ALIAS DE COMPATIBILIDAD
export const PERMISOS = PERMISSIONS;

// --- 3. MATRIZ DE CAPACIDADES (ROLE -> PERMISSIONS) ---
export const ROLE_PERMISSIONS = {
    [ROLES.OWNER]: Object.values(PERMISSIONS), // ✅ TIENE TODO

    [ROLES.MANAGER]: [
        // Ventas
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.POS_ACCESO,
        PERMISSIONS.POS_VOID_ITEM,
        PERMISSIONS.POS_VOID_TICKET,
        PERMISSIONS.CASH_OPEN,
        PERMISSIONS.CASH_CLOSE,
        PERMISSIONS.CAJA_CERRAR,
        PERMISSIONS.CASH_MANAGE,
        PERMISSIONS.CAJA_MOVIMIENTOS,

        // Gestión Operativa
        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INV_VER,
        PERMISSIONS.INVENTORY_MANAGE,
        PERMISSIONS.INV_EDITAR,
        PERMISSIONS.INVENTORY_ADJUST,
        PERMISSIONS.INV_AJUSTE,

        PERMISSIONS.CLIENTS_VIEW,
        PERMISSIONS.CLI_VER,
        PERMISSIONS.CLIENTS_MANAGE,
        PERMISSIONS.CLI_EDITAR,
        PERMISSIONS.CLIENTS_CREDIT,
        PERMISSIONS.CLI_CREDITO,

        // Reportes
        PERMISSIONS.REPORTS_VIEW,
        PERMISSIONS.REPORTS_DASHBOARD,
        PERMISSIONS.REP_VER_DASHBOARD,
        PERMISSIONS.REP_VER_VENTAS,
        PERMISSIONS.REP_VER_TOTAL_DIARIO,

        // Configuración
        PERMISSIONS.SETTINGS_VIEW,
        PERMISSIONS.CONF_ACCESO,
        PERMISSIONS.CONF_NEGOCIO_VER,
        PERMISSIONS.CONF_USUARIOS_VER
    ],

    [ROLES.CASHIER]: [
        PERMISSIONS.POS_ACCESS,
        PERMISSIONS.POS_ACCESO,
        PERMISSIONS.CASH_OPEN,
        PERMISSIONS.CASH_MANAGE,
        PERMISSIONS.CAJA_MOVIMIENTOS,

        PERMISSIONS.INVENTORY_VIEW,
        PERMISSIONS.INV_VER,

        PERMISSIONS.CLIENTS_VIEW,
        PERMISSIONS.CLI_VER,

        // 🔒 CAJERO BLINDADO: 
        // Eliminado acceso a Configuración y Negocio.
        PERMISSIONS.REP_VER_VENTAS
    ],

    [ROLES.CUSTOM]: [] // ⚠️ Inicia SIN permisos por defecto (Lienzo en blanco)
};

// Aliases for useAuth or legacy systems
export const ROLE_PRESETS = {
    admin: ROLE_PERMISSIONS[ROLES.OWNER],
    encargado: ROLE_PERMISSIONS[ROLES.MANAGER],
    empleado: ROLE_PERMISSIONS[ROLES.CASHIER],
    custom: ROLE_PERMISSIONS[ROLES.CUSTOM]
};

// --- 4. METADATA DE UI (Nombres bonitos para Roles) ---
export const ROLE_META = {
    [ROLES.OWNER]: { label: 'Dueño', color: 'amber' },
    [ROLES.MANAGER]: { label: 'Encargado', color: 'violet' },
    [ROLES.CASHIER]: { label: 'Cajero', color: 'blue' },
    [ROLES.CUSTOM]: { label: 'Personalizado', color: 'slate' }
};

// --- 5. GRUPOS DE PERMISOS (PARA UI DE GESTIÓN) ---
export const PERMISSION_GROUPS = {
    SALES: { id: 'SALES', label: 'Ventas y Caja', order: 1 },
    INVENTORY: { id: 'INVENTORY', label: 'Inventario y Stock', order: 2 },
    CLIENTS: { id: 'CLIENTS', label: 'Clientes y Créditos', order: 3 },
    REPORTS: { id: 'REPORTS', label: 'Reportes y Tesorería', order: 4 },
    CONFIG: { id: 'CONFIG', label: 'Configuración Global', order: 5 }
};

// --- 6. METADATA DE PERMISOS (PARA UI DE GESTIÓN) ---
export const PERMISSION_META = {
    // POS
    [PERMISSIONS.POS_ACCESO]: { label: 'Acceso al POS', description: 'Permite entrar a la pantalla de ventas.', group: PERMISSION_GROUPS.SALES.id },
    [PERMISSIONS.POS_VOID_ITEM]: { label: 'Anular Ítems', description: 'Quitar productos del carrito actual.', group: PERMISSION_GROUPS.SALES.id, critical: true },
    [PERMISSIONS.POS_VOID_TICKET]: { label: 'Anular Venta Completa', description: 'Cancelar la compra completa y vaciar cesta.', group: PERMISSION_GROUPS.SALES.id, critical: true },
    [PERMISSIONS.CAJA_ABRIR]: { label: 'Apertura de Caja', description: 'Registrar base inicial de efectivo.', group: PERMISSION_GROUPS.SALES.id },
    [PERMISSIONS.CAJA_CERRAR]: { label: 'Cierre de Caja (Z)', description: 'Finalizar jornada y ver totales.', group: PERMISSION_GROUPS.SALES.id, critical: true },
    [PERMISSIONS.CAJA_MOVIMIENTOS]: { label: 'Entradas/Salidas', description: 'Registrar gastos menores o ingresos.', group: PERMISSION_GROUPS.SALES.id },

    // INVENTARIO
    [PERMISSIONS.INV_VER]: { label: 'Ver Catálogo', description: 'Consultar lista de productos y stock.', group: PERMISSION_GROUPS.INVENTORY.id },
    [PERMISSIONS.INV_VER_COSTOS]: { label: 'Ver Costos de Compra', description: 'Visualizar márgenes y precios de costo.', group: PERMISSION_GROUPS.INVENTORY.id },
    [PERMISSIONS.INV_EDITAR]: { label: 'Gestión de Productos', description: 'Crear o modificar datos de productos.', group: PERMISSION_GROUPS.INVENTORY.id, critical: true },
    [PERMISSIONS.INV_AJUSTE]: { label: 'Ajustes de Inventario', description: 'Corregir stock manualmente.', group: PERMISSION_GROUPS.INVENTORY.id, critical: true },

    // CLIENTES
    [PERMISSIONS.CLI_VER]: { label: 'Ver Clientes', description: 'Consultar directorio de clientes.', group: PERMISSION_GROUPS.CLIENTS.id },
    [PERMISSIONS.CLI_EDITAR]: { label: 'Editar Clientes', description: 'Crear o modificar datos de clientes.', group: PERMISSION_GROUPS.CLIENTS.id },
    [PERMISSIONS.CLI_CREDITO]: { label: 'Gestionar Créditos', description: 'Realizar abonos y ver deudas.', group: PERMISSION_GROUPS.CLIENTS.id, critical: true },

    // REPORTES
    [PERMISSIONS.REP_VER_DASHBOARD]: { label: 'Panel de Métricas', description: 'Ver gráficas y resumen del día.', group: PERMISSION_GROUPS.REPORTS.id },
    [PERMISSIONS.REP_VER_VENTAS]: { label: 'Historial de Ventas', description: 'Consultar facturas emitidas.', group: PERMISSION_GROUPS.REPORTS.id },
    [PERMISSIONS.REP_VER_AUDITORIA]: { label: 'Registros de Auditoría', description: 'Ver logs de eventos sensibles.', group: PERMISSION_GROUPS.REPORTS.id, critical: true },
    [PERMISSIONS.REP_VER_TOTAL_DIARIO]: { label: 'Ver Bóveda Total', description: 'Acceso al balance global.', group: PERMISSION_GROUPS.REPORTS.id, critical: true },

    // CONFIG
    [PERMISSIONS.CONF_ACCESO]: { label: 'Entrar a Configuración', description: 'Permiso base para ver el menú.', group: PERMISSION_GROUPS.CONFIG.id },
    [PERMISSIONS.CONF_NEGOCIO_VER]: { label: 'Ver Identidad', description: 'Ver datos del comercio.', group: PERMISSION_GROUPS.CONFIG.id },
    [PERMISSIONS.CONF_NEGOCIO_EDITAR]: { label: 'Editar Identidad', description: 'Modificar RIF y Nombre.', group: PERMISSION_GROUPS.CONFIG.id, critical: true },
    [PERMISSIONS.CONF_FINANZAS_VER]: { label: 'Ver Finanzas', description: 'Consultar Tasa y Métodos.', group: PERMISSION_GROUPS.CONFIG.id },
    [PERMISSIONS.CONF_FINANZAS_EDITAR]: { label: 'Editar Finanzas', description: 'Cambiar Tasa y Métodos.', group: PERMISSION_GROUPS.CONFIG.id, critical: true },
    [PERMISSIONS.CONF_USUARIOS_VER]: { label: 'Ver Equipo', description: 'Ver lista de personal.', group: PERMISSION_GROUPS.CONFIG.id },
    [PERMISSIONS.CONF_USUARIOS_EDITAR]: { label: 'Gestionar Equipo', description: 'Crear/Borrar usuarios.', group: PERMISSION_GROUPS.CONFIG.id, critical: true },
    [PERMISSIONS.CONF_SISTEMA_VER]: { label: 'Ver Salud Datos', description: 'Consultar estado BD.', group: PERMISSION_GROUPS.CONFIG.id },
    [PERMISSIONS.CONF_SISTEMA_EDITAR]: { label: 'Admin Sistema', description: 'Backups y Reset.', group: PERMISSION_GROUPS.CONFIG.id, critical: true },
};

export const getGroupedPermissions = () => {
    const groups = Object.values(PERMISSION_GROUPS).sort((a, b) => a.order - b.order);
    return groups.map(group => {
        const items = Object.entries(PERMISSION_META)
            .filter(([key, meta]) => meta.group === group.id)
            .map(([key, meta]) => ({ key, ...meta }));
        return { ...group, items };
    });
};
