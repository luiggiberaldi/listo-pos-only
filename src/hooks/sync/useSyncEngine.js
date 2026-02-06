// ✅ SYSTEM IMPLEMENTATION - V. 1.0 (SYNC ENGINE)
// Archivo: src/hooks/sync/useSyncEngine.js
// Responsabilidad: Orquestar la subida de datos offline-first.

import { useEffect, useState } from 'react';
import { db as localDb } from '../../db'; // Dexie
import { db as cloudDb } from '../../services/firebase'; // Firebase
import { collection, addDoc, setDoc, doc } from 'firebase/firestore';

export const useSyncEngine = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // 1. FUNCIÓN PARA ENCOLAR (Pública)
  const encolarOperacion = async (coleccion, datos) => {
    try {
      await localDb.outbox.add({
        collection: coleccion,
        data: datos,
        status: 'pending',
        timestamp: Date.now()
      });
      console.log(`☁️ [SYNC] Operación encolada para: ${coleccion}`);
    } catch (error) {
      console.error("Error encolando:", error);
    }
  };

  // 1.5. SYNC SNAPSHOT (Overwrite Pattern)
  // Ahora soporta targetDb para Doble Antena (Client vs Master)
  const syncSnapshot = async (coleccion, docId, datos, targetDb = cloudDb) => {
    if (!navigator.onLine) {
      console.warn("⚠️ [SYNC-GO] Offline. Snapshot omitido.");
      return false;
    }

    if (!targetDb) {
      console.warn("⚠️ [SYNC-GO] No Database Connection. Snapshot omitido.");
      return false;
    }

    try {
      await setDoc(doc(targetDb, coleccion, docId), {
        ...datos,
        _syncedAt: new Date().toISOString(),
        _origin: 'POS_LOCAL_SNAPSHOT'
      }, { merge: true }); // 🛡️ Evita borrar campos de la App (COMO VERIFICACIONES)
      console.log(`🚀 [SYNC-GO] Snapshot enviado a ${targetDb === cloudDb ? 'CLIENTE' : 'MASTER'}: ${docId}`);
      return true;
    } catch (error) {
      console.error(`❌ [SYNC-GO] Error subiendo snapshot:`, error);
      return false;
    }
  };

  // 2. WORKER DE SINCRONIZACIÓN (Privado)
  const procesarCola = async () => {
    if (isSyncing || !navigator.onLine) return;

    try {
      // Buscar pendientes
      const pendientes = await localDb.outbox
        .where('status').equals('pending')
        .limit(5) // Procesar en lotes pequeños
        .toArray();

      if (pendientes.length === 0) {
        setPendingCount(0);
        return;
      }

      setIsSyncing(true);
      setPendingCount(pendientes.length);

      for (const item of pendientes) {
        // Intentar subir a Firebase
        try {
          if (!cloudDb) throw new Error("Firebase no configurado");
          await addDoc(collection(cloudDb, item.collection), {
            ...item.data,
            _syncedAt: new Date().toISOString(),
            _origin: 'POS_LOCAL'
          });

          // Si éxito, borrar de la cola local
          await localDb.outbox.delete(item.id);
          console.log(`✅ [SYNC] Item ${item.id} sincronizado.`);
        } catch (err) {
          console.error(`❌ [SYNC] Fallo en item ${item.id}:`, err);
          // Opcional: Marcar como 'error' para no reintentar infinitamente
        }
      }

    } catch (error) {
      console.error("Error en ciclo de sync:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // 3. CICLO DE VIDA (Heartbeat)
  useEffect(() => {
    const intervalo = setInterval(procesarCola, 10000); // Cada 10 segundos

    // Listeners de red para reactivar inmediato
    const handleOnline = () => procesarCola();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(intervalo);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  return { encolarOperacion, syncSnapshot, isSyncing, pendingCount };
};