// 👻 GHOST AUDIT SCHEDULER — V.1.0
// Triggers daily report at 10 PM local time.
// Offline-resilient: queues reports in Dexie, syncs when online.

import { generateDailyReport } from './ghostDigestService';
import { initAllInterceptors } from './ghostAuditInterceptors';
import { db } from '../../db';

// ─── CONFIG ───
const REPORT_HOUR = 22; // 10 PM local time
const REPORT_MINUTE = 0;
const PENDING_REPORTS_KEY = 'ghost_pending_reports';

let _schedulerTimer = null;
let _initialized = false;

/**
 * Initialize the Ghost Auditor system.
 * Call this once from App.jsx after initial render.
 */
export function initGhostAuditor() {
    if (_initialized) return;
    _initialized = true;

    // 1. Start all event interceptors
    initAllInterceptors();

    // 2. Schedule the nightly report
    _scheduleNextReport();

    // 3. Try to sync any pending offline reports
    _syncPendingReports();

    // 4. Listen for connectivity changes to sync pending
    if (typeof window !== 'undefined') {
        window.addEventListener('online', () => {
            console.log('👻 [Scheduler] Back online — syncing pending reports...');
            _syncPendingReports();
        });
    }

    console.log('👻 [Ghost Auditor] System initialized. Next report at 10:00 PM.');
}

// ─── SCHEDULING ───
function _scheduleNextReport() {
    const now = new Date();
    const target = new Date(now);
    target.setHours(REPORT_HOUR, REPORT_MINUTE, 0, 0);

    // If 10 PM already passed today, schedule for tomorrow
    if (now >= target) {
        target.setDate(target.getDate() + 1);
    }

    const msUntilReport = target.getTime() - now.getTime();

    console.log(`👻 [Scheduler] Next report in ${Math.round(msUntilReport / 60000)} minutes (${target.toLocaleString()})`);

    clearTimeout(_schedulerTimer);
    _schedulerTimer = setTimeout(async () => {
        await _executeReport();
        // Re-schedule for next day
        _scheduleNextReport();
    }, msUntilReport);
}

// ─── REPORT EXECUTION ───
async function _executeReport() {
    console.log('👻 [Scheduler] ⏰ 10 PM — Generating daily report...');

    try {
        const report = await generateDailyReport();

        if (report.status === 'empty') {
            console.log('👻 [Scheduler] No events today, skipping report.');
            return;
        }

        // Get system identifier
        let systemId = 'unknown';
        try {
            const config = await db.config.get('general');
            systemId = config?.systemId || config?.nombreNegocio?.replace(/\s+/g, '_').toLowerCase() || 'unknown';
        } catch { /* use default */ }

        const reportDoc = {
            ...report,
            systemId,
            type: 'daily_report'
        };

        // Try to sync to Firebase
        if (navigator.onLine) {
            await _pushToFirebase(reportDoc);
            console.log('👻 [Scheduler] ✅ Report synced to Firebase');
        } else {
            // Save locally for later sync
            await _savePending(reportDoc);
            console.log('👻 [Scheduler] 📴 Offline — Report queued for later sync');
        }

    } catch (e) {
        console.error('👻 [Scheduler] ❌ Report generation failed:', e.message);
    }
}

// ─── FIREBASE SYNC ───
async function _pushToFirebase(reportDoc) {
    // Lazy-load Firebase to avoid import issues
    const { dbMaster, initFirebase, isFirebaseReady } = await import('../../services/firebase');

    if (!isFirebaseReady()) {
        await initFirebase();
    }

    const { dbMaster: masterDb } = await import('../../services/firebase');
    if (!masterDb) {
        throw new Error('Firebase Master not available');
    }

    const { doc, setDoc } = await import('firebase/firestore');

    const docId = `${reportDoc.systemId}_${reportDoc.date}`;
    const docRef = doc(masterDb, 'ghost_daily_reports', docId);

    await setDoc(docRef, {
        ...reportDoc,
        syncedAt: Date.now(),
        // Truncate rawEvents if too large for Firestore (1MB limit)
        rawEvents: reportDoc.rawEvents?.length > 1000
            ? reportDoc.rawEvents.slice(0, 1000)
            : reportDoc.rawEvents
    });
}

// ─── OFFLINE QUEUE ───
async function _savePending(reportDoc) {
    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_REPORTS_KEY) || '[]');
        pending.push(reportDoc);
        // Keep max 7 pending reports (1 week)
        while (pending.length > 7) pending.shift();
        localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(pending));
    } catch (e) {
        console.warn('👻 [Scheduler] Failed to save pending report:', e.message);
    }
}

async function _syncPendingReports() {
    if (!navigator.onLine) return;

    try {
        const pending = JSON.parse(localStorage.getItem(PENDING_REPORTS_KEY) || '[]');
        if (pending.length === 0) return;

        console.log(`👻 [Scheduler] Syncing ${pending.length} pending report(s)...`);

        const synced = [];
        for (const report of pending) {
            try {
                await _pushToFirebase(report);
                synced.push(report);
                console.log(`👻 [Scheduler] ✅ Synced pending report for ${report.date}`);
            } catch (e) {
                console.warn(`👻 [Scheduler] Failed to sync report for ${report.date}:`, e.message);
                break; // Stop on first failure (probably still offline or auth issue)
            }
        }

        // Remove synced reports from pending
        if (synced.length > 0) {
            const remaining = pending.filter(p => !synced.includes(p));
            localStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(remaining));
        }
    } catch (e) {
        console.warn('👻 [Scheduler] Pending sync error:', e.message);
    }
}

/**
 * Manually trigger a report (for testing or on-demand).
 * @param {string} date - Optional date key
 */
export async function triggerManualReport(date) {
    console.log('👻 [Scheduler] Manual report triggered...');
    await _executeReport();
}

// Expose to window for debugging
if (typeof window !== 'undefined') {
    window.ghostAudit = {
        triggerReport: triggerManualReport,
        getScheduleInfo: () => {
            const now = new Date();
            const target = new Date(now);
            target.setHours(REPORT_HOUR, REPORT_MINUTE, 0, 0);
            if (now >= target) target.setDate(target.getDate() + 1);
            return {
                nextReport: target.toLocaleString(),
                minutesUntil: Math.round((target - now) / 60000),
                pendingReports: JSON.parse(localStorage.getItem(PENDING_REPORTS_KEY) || '[]').length
            };
        }
    };
}
