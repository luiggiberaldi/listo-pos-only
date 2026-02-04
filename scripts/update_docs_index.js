
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(__dirname, '../src/simulation/memory/docs_index.json');

console.log(`Loading: ${targetFile}`);

try {
    const rawData = fs.readFileSync(targetFile, 'utf8');
    const docs = JSON.parse(rawData);

    console.log(`Current items: ${docs.length}`);

    const newEntries = [
        {
            "title": "Listo GO - Companion App",
            "text": "# Listo GO - Companion App\n\n## Propósito\nEs la aplicación móvil complementaria de Listo POS que permite monitorear tu negocio en tiempo real desde cualquier lugar. Funciona como un espejo de tus operaciones.\n\n## Funciones Principales\n- 📊 Ver ventas en tiempo real\n- 📦 Consultar inventario actualizado\n- 👥 Monitorear actividad de cajeros\n- 🔔 Recibir alertas de stock bajo\n\n## Requisitos\n- Smartphone Android o iOS\n- Conexión a internet en ambos dispositivos (PC y Celular)\n- Licencia activa de Listo POS",
            "source": "00-quick-reference.md"
        },
        {
            "title": "Vinculación Listo GO",
            "text": "# Vinculación Listo GO\n\n## Pasos para Conectar\n1. En Listo POS: Ve a **Configuración > Comercio > Mi Negocio**.\n2. Busca la sección \"Vinculación con Listo GO App\" (abajo a la derecha).\n3. En tu Celular: Abre Listo GO y selecciona \"Escanear Código\".\n4. Escanea el QR que aparece en la pantalla del POS.\n\n## Alternativa Manual\nSi la cámara falla, toca el ID de Vinculación (texto verde) para copiarlo e ingrésalo manualmente en la App.",
            "source": "09-configuracion-comercio.md"
        },
        {
            "title": "Estados de Sincronización (Listo GO)",
            "text": "# Estados de Sincronización\n\nEl sistema muestra el estado de conexión con Listo GO en la configuración:\n\n- 🟢 **En Línea**: Todo funcionando perfecto. Las ventas se reflejan en segundos.\n- 🟡 **Sincronizando**: Enviando datos pendientes (común al reconectar internet).\n- 🔴 **Error/Offline**: Sin conexión o internet caído. Los datos se guardarán localmente y se enviarán al recuperar conexión.",
            "source": "09-configuracion-comercio.md"
        },
        {
            "title": "Solución de Problemas Listo GO",
            "text": "# Solución de Problemas Listo GO\n\n## No se actualizan los datos\n1. Verifica que \"Sincronización Nube\" esté **ACTIVO** en **Configuración > Sistema > Salud de Datos**.\n2. Revisa tu conexión a internet.\n\n## Pausar Sincronización\nSi tienes internet muy lento y el sistema se siente pesado, puedes pausar el envío de datos:\n1. Ve a **Configuración > Salud de Datos**.\n2. Apaga el switch \"Sincronización Nube\".\n3. Recuerda activarlo luego para actualizar tu App.",
            "source": "11-configuracion-sistema-seguridad.md"
        }
    ];

    // Check if already exists to avoid dupes
    const existingTitles = new Set(docs.map(d => d.title));
    let addedCount = 0;

    newEntries.forEach(entry => {
        if (!existingTitles.has(entry.title)) {
            docs.push(entry);
            addedCount++;
        } else {
            console.log(`Skipping duplicate: ${entry.title}`);
        }
    });

    if (addedCount > 0) {
        fs.writeFileSync(targetFile, JSON.stringify(docs, null, 2), 'utf8');
        console.log(`✅ Successfully added ${addedCount} new entries.`);
    } else {
        console.log("ℹ️ No new entries added (all existed).");
    }

} catch (error) {
    console.error("❌ Error updating docs_index.json:", error);
    process.exit(1);
}
