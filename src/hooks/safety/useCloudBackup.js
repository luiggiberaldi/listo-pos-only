// ✅ SYSTEM IMPLEMENTATION - V. 1.0 (FIRESTORE MASTER BACKUP)
// Archivo: src/hooks/safety/useCloudBackup.js
// Propósito: Respaldo integral comprimido en Firestore.

import { useCallback } from 'react';
import { db } from '../../db';
import { dbClient } from '../../services/firebase';
import { doc, setDoc, getDoc, serverTimestamp, collection, getDocs, writeBatch } from 'firebase/firestore';
import LZString from 'lz-string';

const BACKUP_VERSION = 'v2-unified';
const CHUNK_SIZE_LIMIT = 800 * 1024; // 800KB Safe Limit (Firestore is 1MB - Overhead)

import { generarCapsulaDeTiempo, restaurarCapsulaDeTiempo } from '../../utils/backupUtils';

export const useCloudBackup = () => {

    /**
     * SUBIR RESPALDO (MASTER BACKUP)
     * Comprime y sube el estado total a Firestore (con Chunking).
     */
    const subirRespaldo = useCallback(async (machineId) => {
        if (!machineId) throw new Error("ID de terminal no identificado.");

        // 1. GENERACIÓN TWIN (Misma lógica que Local Export)
        const backupPayload = await generarCapsulaDeTiempo();
        backupPayload._meta.terminal = machineId; // Enriquecer con ID Terminal

        // 2. Compresión LZString
        const jsonStr = JSON.stringify(backupPayload);
        const compressed = LZString.compressToUTF16(jsonStr);

        // 3. Estrategia de Almacenamiento (Simple vs Chunked)
        // En UTF-16 cada carácter ocupa 2 bytes.
        const sizeBytes = compressed.length * 2;

        try {
            const docRef = doc(dbClient, 'backups', machineId);
            const chunksRef = collection(docRef, 'chunks');

            if (sizeBytes > CHUNK_SIZE_LIMIT) {
                // --- MODO CHUNKED ---
                console.log(`📦 [CLOUD] Backup Grande detectado (${(sizeBytes / 1024).toFixed(2)} KB). Iniciando fragmentación segura...`);

                // A. Limpiar chunks previos
                const oldChunks = await getDocs(chunksRef);
                const batch = writeBatch(dbClient);
                oldChunks.forEach(c => batch.delete(c.ref));
                await batch.commit();

                // B. Dividir y Subir
                // Reduced chunk size to 400,000 chars * 2 bytes = 800KB to be safe
                const CHUNK_CHAR_SIZE = 400000;
                const totalChunks = Math.ceil(compressed.length / CHUNK_CHAR_SIZE);

                for (let i = 0; i < totalChunks; i++) {
                    const start = i * CHUNK_CHAR_SIZE;
                    const end = start + CHUNK_CHAR_SIZE;
                    const chunkData = compressed.substring(start, end);

                    const chunkDoc = doc(chunksRef, i.toString()); // ID simple: "0", "1", "2"...
                    await setDoc(chunkDoc, { data: chunkData });
                }

                // C. Guardar Manifiesto (El documento principal es solo un índice)
                await setDoc(docRef, {
                    isChunked: true,
                    totalChunks: totalChunks,
                    fecha: serverTimestamp(),
                    version: BACKUP_VERSION,
                    terminal: machineId,
                    sizeBytes: sizeBytes,
                    nombre: 'backup_automatico_fragmentado'
                }, { merge: true });

            } else {
                // --- MODO SIMPLE (Legacy Compatible) ---
                console.log(`📦 [CLOUD] Backup Ligero (${(sizeBytes / 1024).toFixed(2)} KB). Subida directa.`);

                // Limpiar chunks si existían (para no dejar basura)
                const oldChunks = await getDocs(chunksRef);
                if (!oldChunks.empty) {
                    const batch = writeBatch(dbClient);
                    oldChunks.forEach(c => batch.delete(c.ref));
                    await batch.commit();
                }

                await setDoc(docRef, {
                    payload: compressed, // Payload completo
                    isChunked: false,
                    fecha: serverTimestamp(),
                    version: BACKUP_VERSION,
                    terminal: machineId,
                    sizeBytes: sizeBytes,
                    nombre: 'backup_automatico'
                }, { merge: true });
            }

            return { success: true, size: (sizeBytes / 1024).toFixed(2) + " KB" };
        } catch (error) {
            console.error("🔥 [CLOUD-BACKUP] Error:", error);
            throw new Error("Fallo en la comunicación con la nube: " + error.message);
        }
    }, []);

    /**
     * RESTAURAR RESPALDO
     * Descarga, recompone (si es chunked), descomprime y restaura la integridad local.
     */
    const restaurarRespaldo = useCallback(async (machineId) => {
        if (!machineId) throw new Error("ID de terminal no identificado.");

        // 1. Obtener Manifiesto
        const docRef = doc(dbClient, 'backups', machineId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
            throw new Error("No existe un respaldo guardado para esta terminal.");
        }

        const meta = snap.data();
        let payloadCompressed = '';

        // 2. Reconstrucción (Chunked vs Simple)
        if (meta.isChunked) {
            console.log(`🧩 [CLOUD] Reconstruyendo backup fragmentado (${meta.totalChunks} partes)...`);
            const chunksRef = collection(docRef, 'chunks');

            // Descargar en paralelo
            const promises = [];
            for (let i = 0; i < meta.totalChunks; i++) {
                promises.push(getDoc(doc(chunksRef, i.toString())));
            }

            const chunkSnaps = await Promise.all(promises);

            // Validar integridad
            if (chunkSnaps.some(s => !s.exists())) throw new Error("Corrupción en la nube: Faltan fragmentos del respaldo.");

            // Unir en orden
            payloadCompressed = chunkSnaps.map(s => s.data().data).join('');

        } else {
            console.log("📦 [CLOUD] Descargando backup simple...");
            payloadCompressed = meta.payload;
        }

        if (!payloadCompressed) throw new Error("El respaldo está vacío o corrupto.");

        // 3. Descompresión
        const jsonStr = LZString.decompressFromUTF16(payloadCompressed);
        if (!jsonStr) throw new Error("Fallo de descompresión LZString (Data corrupta).");

        const restoredData = JSON.parse(jsonStr);

        // 4. Restauración Unificada (Twin Logic)
        await restaurarCapsulaDeTiempo(restoredData);

        return { success: true };
    }, []);

    return { subirRespaldo, restaurarRespaldo };
};
