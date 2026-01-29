import { useEffect, useRef } from 'react';
import { db } from '../../db';

const BACKUP_INTERVAL_MS = 5 * 60 * 1000; // 5 Minutes
const BACKUP_KEYS = [
    'listo-config',
    'listo-plantillas-audit',
    'listo-sesiones-audit',
    'listo_security_logs_v1'
];

export const useAutoBackup = () => {
    const backupIntervalRef = useRef(null);

    useEffect(() => {
        const performBackup = async () => {
            try {
                // 1. Gather Data Snapshot
                const snapshot = {};
                let hasData = false;

                BACKUP_KEYS.forEach(key => {
                    const val = localStorage.getItem(key);
                    if (val) {
                        snapshot[key] = val; // Store raw string (already signed)
                        hasData = true;
                    }
                });

                if (!hasData) return;

                // 2. Save to Robust Storage (IndexedDB)
                await db.config.put({
                    key: 'backup_snapshot_v1',
                    data: snapshot,
                    timestamp: Date.now(),
                    device: navigator.userAgent
                });

                console.log("💾 [RESILIENCE] Auto-Backup saved to IndexedDB.");

            } catch (e) {
                console.error("❌ [RESILIENCE] Backup failed:", e);
            }
        };

        // Initial Backup on Load (delayed 10s to not slow down boot)
        const initialTimer = setTimeout(performBackup, 10000);

        // Periodic Backup
        backupIntervalRef.current = setInterval(performBackup, BACKUP_INTERVAL_MS);

        return () => {
            clearTimeout(initialTimer);
            if (backupIntervalRef.current) clearInterval(backupIntervalRef.current);
        };
    }, []);
};
