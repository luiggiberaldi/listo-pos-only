// ✅ SYSTEM IMPLEMENTATION - V. 1.2
// Archivo: src/hooks/sync/useSync.js
// Autorizado por Auditor en Fase 2 (Nexus Cloud)
// Rastro: Patrón Outbox y Worker de Sincronización

import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { safeLoad } from '../../utils/storageUtils';

export const useSync = (configuracion) => {
    // Outbox persistente en localStorage
    const [outbox, setOutbox] = useState(() => safeLoad('listo-outbox', []));
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState('idle'); // idle | syncing | error | success

    // Referencia para evitar closures obsoletos en el intervalo
    const outboxRef = useRef(outbox);
    useEffect(() => { outboxRef.current = outbox; }, [outbox]);

    // Guardar outbox en disco cada vez que cambie
    useEffect(() => {
        localStorage.setItem('listo-outbox', JSON.stringify(outbox));
    }, [outbox]);

    // ✅ MÉTODO PÚBLICO: Encolar datos para envío
    const encolar = (coleccion, datos) => {
        const item = {
            id: crypto.randomUUID(),
            collection: coleccion,
            data: datos,
            timestamp: Date.now(),
            attempts: 0
        };
        
        setOutbox(prev => [...prev, item]);
        console.log(`☁️ [OUTBOX] Ítem encolado para '${coleccion}'. Pendientes: ${outbox.length + 1}`);
        
        // Intentar sincronizar inmediatamente si hay red
        if (navigator.onLine) procesarCola();
    };

    // 🔄 WORKER: Procesador de la cola
    const procesarCola = async () => {
        if (!db || isSyncing || outboxRef.current.length === 0 || !navigator.onLine) return;

        setIsSyncing(true);
        setSyncStatus('syncing');
        
        const pendingItems = [...outboxRef.current];
        const failedItems = [];
        let successCount = 0;

        console.log(`☁️ [SYNC] Iniciando sincronización de ${pendingItems.length} elementos...`);

        for (const item of pendingItems) {
            try {
                // Inyectamos metadatos de servidor
                const payload = {
                    ...item.data,
                    _sync_source: 'PC_LOCAL',
                    _sync_createdAt: serverTimestamp(),
                    _local_timestamp: item.timestamp
                };

                await addDoc(collection(db, item.collection), payload);
                successCount++;
            } catch (error) {
                console.error("☁️ [SYNC] Fallo al enviar item:", error);
                // Si falla, aumentamos contador de intentos y lo devolvemos a la cola
                // (Opcional: Si attempts > 5, mover a 'Dead Letter Queue')
                failedItems.push({ ...item, attempts: item.attempts + 1 });
            }
        }

        // Actualizamos la cola: eliminamos los exitosos, mantenemos los fallidos
        if (successCount > 0) {
            setOutbox(failedItems); // Aquí realmente borramos los que se enviaron bien
            setSyncStatus('success');
            console.log(`☁️ [SYNC] Sincronización finalizada. Éxitos: ${successCount}, Fallos: ${failedItems.length}`);
        } else if (failedItems.length > 0) {
            setSyncStatus('error');
        } else {
            setSyncStatus('idle');
        }

        setIsSyncing(false);
    };

    // ⏰ CRON: Intentar sincronizar cada 30 segundos si hay algo pendiente
    useEffect(() => {
        const interval = setInterval(() => {
            if (navigator.onLine && outboxRef.current.length > 0) {
                procesarCola();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    // Escuchar eventos de reconexión
    useEffect(() => {
        const handleOnline = () => {
            console.log("☁️ [NETWORK] Conexión detectada. Intentando sincronizar...");
            procesarCola();
        };
        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, []);

    return {
        encolar,
        outboxCount: outbox.length,
        isSyncing,
        syncStatus,
        procesarCola // Exponemos para forzar sync manual si se desea
    };
};