
import { timeProvider } from '../TimeProvider';

// 🛡️ Data Sanitization
const SENSITIVE_KEYS = ['pin', 'password', 'token', 'cvv', 'secret'];

const sanitizeValue = (key, value) => {
    if (SENSITIVE_KEYS.some(k => key.toLowerCase().includes(k))) {
        return '***REDACTED***';
    }
    return value;
};

const sanitizeObject = (obj, seen = new WeakSet()) => {
    if (!obj || typeof obj !== 'object') return obj;
    if (seen.has(obj)) return '[Circular]';
    seen.add(obj);
    if (Array.isArray(obj)) return obj.map(item => sanitizeObject(item, seen));

    const newObj = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            // Skip internal/private keys (e.g. _refs with DOM elements)
            if (key.startsWith('_')) continue;
            const val = obj[key];
            // Skip DOM nodes and React refs
            if (val instanceof Element || val instanceof Node) continue;
            if (val && typeof val === 'object' && val.current !== undefined && Object.keys(val).length <= 1) continue;
            newObj[key] = sanitizeValue(key, sanitizeObject(val, seen));
        }
    }
    return newObj;
};

// 🧠 Global Memory (Buffer)
if (typeof window !== 'undefined') {
    window.GhostBuffer = window.GhostBuffer || {
        logs: [],
        maxSize: 5000,
        push(entry) {
            if (this.logs.length >= this.maxSize) this.logs.shift();
            this.logs.push(entry);
        },
        getLogs() { return this.logs; },
        clear() { this.logs = []; }
    };
}

/**
 * GhostObserver Middleware for Zustand
 * Intercepts state changes and logs them to window.GhostBuffer
 */
export const ghostMiddleware = (config, storeName) => (set, get, api) => {
    return config(
        (args) => {
            const oldState = get();

            // Apply state change
            set(args);

            const newState = get();

            // Perform Diff
            // Optimization: Shallow diff for top-level keys
            const diff = {};
            let hasChanges = false;

            for (const key in newState) {
                if (oldState[key] !== newState[key]) {
                    // Skip functions
                    if (typeof newState[key] === 'function') continue;

                    diff[key] = {
                        from: sanitizeValue(key, oldState[key]), // Shallow sanitize for speed, deep later?
                        to: sanitizeValue(key, newState[key])
                    };

                    // Deep sanitization if object
                    if (typeof diff[key].from === 'object') diff[key].from = sanitizeObject(diff[key].from);
                    if (typeof diff[key].to === 'object') diff[key].to = sanitizeObject(diff[key].to);

                    hasChanges = true;
                }
            }

            if (hasChanges && window.GhostBuffer) {
                window.GhostBuffer.push({
                    type: 'STATE_CHANGE',
                    timestamp: timeProvider.toISOString(), // Simulated Time
                    realTimestamp: Date.now(),     // Debug Time
                    store: storeName || 'AnonymousStore',
                    diff
                });
            }
        },
        get,
        api
    );
};
