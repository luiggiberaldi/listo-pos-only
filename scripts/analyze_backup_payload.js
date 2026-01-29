import fs from 'fs';
import path from 'path';

const filePath = process.argv[2];

if (!filePath) {
    console.error("Please provide a file path");
    process.exit(1);
}

try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    console.log("=== 🕵️ REPORTE DE INSPECCIÓN DE RESPALDO ===");
    console.log(`📂 Archivo: ${filePath.split(/[\\/]/).pop()}`);

    // Metadata Header
    if (data._meta) {
        console.log(`✅ Metadatos encontrados`);
        console.log(`   - Schema: ${data._meta.schema_version || 'N/A'}`);
        console.log(`   - Versión Software: ${data._meta.version_software || 'N/A'}`);
        console.log(`   - Fecha: ${data._meta.fecha}`);
        console.log(`   - Terminal/Origen: ${data._meta.terminal || data._meta.origen || 'N/A'}`);
    } else {
        console.log(`⚠️  ADVERTENCIA: Sin cabecera _meta (Posible formato Legacy V1)`);
    }

    // Dexie Data
    console.log("\n📊 BASE DE DATOS (DEXIE):");
    const dexieData = data.dexie || (data.productos ? data : null); // Fallback for V1 where tables were root

    if (dexieData) {
        let count = 0;
        const tables = ['productos', 'clientes', 'ventas', 'logs', 'config', 'caja_sesion'];

        // V2 Target
        const target = data.dexie ? data.dexie : data;
        const isV2 = !!data.dexie;

        tables.forEach(t => {
            if (target[t]) {
                const isString = typeof target[t] === 'string'; // Legacy used strings
                const realLen = isString ? JSON.parse(target[t] || '[]').length : target[t].length;

                console.log(`   - ${t}: ${realLen} registros ${isString ? '(Formato String Legacy)' : '(Formato Array Nativo)'}`);
                count++;
            }
        });

        // Summary
        console.log(`   (Tablas escaneadas: ${count})`);
    } else {
        console.log("❌ No se detectaron tablas de base de datos.");
    }

    // LocalStorage
    console.log("\n💾 CONFIGURACIÓN LOCAL (LocalStorage):");
    const lsData = data.localStorage;
    if (lsData) {
        Object.keys(lsData).forEach(k => {
            console.log(`   - ${k}: ${lsData[k] ? '✅ Presente' : '⚠️ Vacío'}`);
        });
    } else {
        if (data.config && typeof data.config === 'string') {
            console.log("   - Configuración encontrada en raíz (Legacy V1).");
        } else {
            console.log("❌ No se detectó bloque localStorage.");
        }
    }

    // Veredicto
    console.log("\n⚖️  VEREDICTO FINAL:");
    if (data._meta && data._meta.schema_version === 'v2-unified') {
        console.log("✨ EXCELENTE. Este respaldo cumple con el estándar 'Time Capsule V2'.");
        console.log("   Es seguro para Restauración Universal (Local y Nube).");
    } else {
        console.log("⚠️  OBSOLETO. Este respaldo tiene formato LEGACY (V1).");
        console.log("   No es compatible con la función 'Restaurar Cápsula'. Requiere migración manual (Importar como Legacy).");
    }

} catch (e) {
    console.error("🔥 Error crítico al leer el archivo:", e.message);
}
