import { db } from '../db';

/**
 * ⏳ GENERAR CÁPSULA DE TIEMPO (SHARED LOGIC)
 * Genera un objeto masivo con toda la data crítica del sistema.
 */
export const generarCapsulaDeTiempo = async () => {
    // 1. DEXIE DUMPS (Dynamic)
    const tables = db.tables.map(t => t.name);
    const dexieDump = {};

    for (const tableName of tables) {
        dexieDump[tableName] = await db.table(tableName).toArray();
    }

    // 2. LOCALSTORAGE KEYS CRÍTICAS
    const keysToBackup = [
        'listo-config',
        'listo_license_key',
        'sys_installation_id',
        'listo_users_v1' // Usuarios (LocalStorage based)
    ];

    const localStorageDump = {};
    keysToBackup.forEach(key => {
        const val = localStorage.getItem(key);
        if (val) localStorageDump[key] = val;
    });

    // 3. METADATA
    return {
        dexie: dexieDump,
        localStorage: localStorageDump,
        _meta: {
            version_software: '1.4.0', // Obtener de package.json idealmente, o constante global
            fecha: new Date().toISOString(),
            origen: 'LISTO_POS',
            schema_version: 'v2-unified'
        }
    };
};

/**
 * 🛠️ RESTAURAR CÁPSULA (SHARED LOGIC)
 * Borra todo e inyecta la data.
 * @param {Object} data - Objeto JSON de la cápsula
 */
export const restaurarCapsulaDeTiempo = async (data) => {
    if (!data.dexie || !data.localStorage) {
        throw new Error("Formato de respaldo inválido (Falta Dexie/LS).");
    }

    console.log("🧹 [RESTORE] Limpiando Base de Datos...");

    // 1. LIMPIEZA DE TABLAS
    const tables = db.tables.map(t => t.name);
    await db.transaction('rw', db.tables, async () => {
        for (const tableName of tables) {
            await db.table(tableName).clear();
        }
    });

    // 2. INYECCIÓN MASIVA
    console.log("💉 [RESTORE] Inyectando Datos...");
    await db.transaction('rw', db.tables, async () => {
        for (const tableName of Object.keys(data.dexie)) {
            const rows = data.dexie[tableName];
            if (rows && rows.length > 0 && db[tableName]) {
                await db.table(tableName).bulkAdd(rows);
            }
        }
    });

    // 3. RESTAURACIÓN LOCALSTORAGE
    console.log("💾 [RESTORE] Restaurando LocalStorage...");
    Object.entries(data.localStorage).forEach(([key, val]) => {
        if (val) localStorage.setItem(key, val);
    });

    return true;
};
