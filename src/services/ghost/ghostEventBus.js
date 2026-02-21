// 👻 GHOST AUDIT EVENT BUS — V.1.0
// Central event emitter for ALL POS operational events.
// Events are persisted to Dexie (ghost_audit_log) for offline resilience.
// At 10 PM, the scheduler reads today's events, digests, and syncs to Firebase.

import { db } from '../../db';

// ─── CATEGORIES ───
export const GHOST_CATEGORIES = {
    SALE: 'SALE',
    INVENTORY: 'INVENTORY',
    FINANCE: 'FINANCE',
    CONFIG: 'CONFIG',
    SESSION: 'SESSION',
    ERROR: 'ERROR',
    STATE: 'STATE'
};

// ─── SEVERITY LEVELS ───
export const GHOST_SEVERITY = {
    INFO: 'INFO',       // Normal operations
    WARN: 'WARN',       // Unusual but not broken
    CRITICAL: 'CRITICAL' // Requires attention
};

// ─── IN-MEMORY BUFFER (fast access, flushed to Dexie periodically) ───
const _buffer = [];
const MAX_BUFFER = 500;
let _flushTimer = null;
const FLUSH_INTERVAL_MS = 30_000; // Flush to Dexie every 30s

// ─── DEDUP (prevent rapid-fire identical events) ───
let _lastEventHash = '';
let _lastEventTime = 0;
const DEDUP_WINDOW_MS = 2_000; // 2 second dedup window

// ─── DATE HELPER ───
const getDateKey = () => new Date().toISOString().slice(0, 10); // "2026-02-21"

// ─── CORE API ───
const ghostEventBus = {
    /**
     * Emit an operational event.
     * @param {string} category - GHOST_CATEGORIES value
     * @param {string} event - Event name (e.g. 'sale_completed')
     * @param {object} data - Event-specific payload (auto-sanitized)
     * @param {string} severity - GHOST_SEVERITY value (default: INFO)
     * @param {number} customTimestamp - Optional custom timestamp (for simulation)
     */
    emit(category, event, data = {}, severity = GHOST_SEVERITY.INFO, customTimestamp = null) {
        // Dedup: skip identical events within 2s window
        const now = Date.now();
        const hash = `${category}.${event}.${JSON.stringify(data)}`;
        if (hash === _lastEventHash && (now - _lastEventTime) < DEDUP_WINDOW_MS) return;
        _lastEventHash = hash;
        _lastEventTime = now;

        const ts = customTimestamp || now;
        const entry = {
            category,
            event,
            severity,
            data: _sanitize(data),
            timestamp: ts,
            date: customTimestamp ? new Date(ts).toISOString().slice(0, 10) : getDateKey()
        };

        // Push to in-memory buffer
        _buffer.push(entry);
        if (_buffer.length > MAX_BUFFER) _buffer.shift();

        // Schedule Dexie flush if not already scheduled
        if (!_flushTimer) {
            _flushTimer = setTimeout(() => _flushToDexie(), FLUSH_INTERVAL_MS);
        }
    },

    /**
     * Get all events for a specific date from Dexie.
     * @param {string} date - Date key like "2026-02-21" (defaults to today)
     * @returns {Promise<Array>} Array of event objects
     */
    async getEventsForDate(date = getDateKey()) {
        // Flush pending buffer first
        await _flushToDexie();
        try {
            return await db.ghost_audit_log.where('date').equals(date).toArray();
        } catch (e) {
            console.warn('👻 [EventBus] Failed to read Dexie:', e.message);
            return [..._buffer.filter(e => e.date === date)];
        }
    },

    /**
     * Get today's event count (fast, from Dexie index).
     */
    async getTodayCount() {
        try {
            return await db.ghost_audit_log.where('date').equals(getDateKey()).count();
        } catch {
            return _buffer.length;
        }
    },

    /**
     * Clear events older than N days (housekeeping).
     * @param {number} daysToKeep - Keep events from last N days (default: 30)
     */
    async purgeOld(daysToKeep = 30) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysToKeep);
        const cutoffKey = cutoff.toISOString().slice(0, 10);

        try {
            const count = await db.ghost_audit_log.where('date').below(cutoffKey).delete();
            if (count > 0) console.log(`👻 [EventBus] Purged ${count} old audit events`);
        } catch (e) {
            console.warn('👻 [EventBus] Purge failed:', e.message);
        }
    },

    /**
     * Force flush buffer to Dexie immediately.
     */
    flush: () => _flushToDexie()
};

// ─── INTERNAL: Flush buffer to Dexie ───
async function _flushToDexie() {
    clearTimeout(_flushTimer);
    _flushTimer = null;

    if (_buffer.length === 0) return;

    const batch = _buffer.splice(0, _buffer.length);

    try {
        await db.ghost_audit_log.bulkAdd(batch);
    } catch (e) {
        // If Dexie write fails, push back to buffer
        console.warn('👻 [EventBus] Dexie flush failed, retaining in buffer:', e.message);
        _buffer.unshift(...batch);
    }
}

// ─── INTERNAL: Sanitize data ───
const REDACT_KEYS = ['pin', 'password', 'token', 'secret', 'cvv', 'apiKey'];

function _sanitize(obj) {
    if (!obj || typeof obj !== 'object') return obj;

    const clean = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

        // Redact sensitive keys
        if (REDACT_KEYS.some(k => key.toLowerCase().includes(k))) {
            clean[key] = '***';
            continue;
        }

        const val = obj[key];

        // Skip DOM nodes, functions, circular refs
        if (typeof val === 'function') continue;
        if (val instanceof Element || val instanceof Node) continue;

        // Truncate large arrays (e.g. full product list)
        if (Array.isArray(val) && val.length > 20) {
            clean[key] = `[Array(${val.length})]`;
            continue;
        }

        // Recurse for nested objects (max 2 levels deep)
        if (typeof val === 'object' && val !== null) {
            clean[key] = _sanitizeShallow(val);
        } else {
            clean[key] = val;
        }
    }
    return clean;
}

function _sanitizeShallow(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(v => typeof v === 'object' ? '[Object]' : v).slice(0, 10);

    const clean = {};
    for (const key in obj) {
        if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
        const val = obj[key];
        if (typeof val === 'function' || val instanceof Element) continue;
        clean[key] = typeof val === 'object' && val !== null ? '[Object]' : val;
    }
    return clean;
}

// ─── AUTO-FLUSH on page unload ───
if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
        if (_buffer.length > 0) {
            // Synchronous fallback: try navigator.sendBeacon with Dexie
            // But Dexie is async, so we do a best-effort sync write
            try {
                const tx = db.ghost_audit_log.bulkAdd(_buffer);
                // Fire and forget — page is closing
            } catch { /* best effort */ }
        }
    });
}

export default ghostEventBus;
