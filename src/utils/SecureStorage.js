/**
 * 🔒 SECURE STORAGE — Wrapper for sensitive localStorage values
 * Adds HMAC-like integrity verification to prevent DevTools tampering.
 * Drop-in replacement: SecureStorage.get('key') / SecureStorage.set('key', value)
 */

// Simple hash function (not cryptographic, but detects casual tampering)
function simpleHash(str) {
    let hash = 0;
    const salt = 'L1ST0-F3N1X-2025';
    const salted = salt + str + salt;
    for (let i = 0; i < salted.length; i++) {
        const char = salted.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}

const INTEGRITY_PREFIX = '_sig_';

export const SecureStorage = {
    /**
     * Set a value with integrity signature
     * @param {string} key - localStorage key
     * @param {string} value - Value to store
     */
    set(key, value) {
        if (value === null || value === undefined) {
            localStorage.removeItem(key);
            localStorage.removeItem(INTEGRITY_PREFIX + key);
            return;
        }
        const strValue = String(value);
        localStorage.setItem(key, strValue);
        localStorage.setItem(INTEGRITY_PREFIX + key, simpleHash(strValue));
    },

    /**
     * Get a value, verifying integrity
     * @param {string} key - localStorage key
     * @returns {string|null} Value if valid, null if tampered or missing
     */
    get(key) {
        const value = localStorage.getItem(key);
        if (value === null) return null;

        const storedHash = localStorage.getItem(INTEGRITY_PREFIX + key);

        // If no signature exists, value was set before SecureStorage migration
        // Accept it but sign it for future reads (graceful migration)
        if (!storedHash) {
            localStorage.setItem(INTEGRITY_PREFIX + key, simpleHash(value));
            return value;
        }

        // Verify integrity
        if (storedHash !== simpleHash(value)) {
            console.warn(`🔴 [SECURITY] Integrity check FAILED for key "${key}" — possible tampering`);

            // Log security event
            try {
                const events = JSON.parse(localStorage.getItem('listo_security_events') || '[]');
                events.push({
                    type: 'INTEGRITY_VIOLATION',
                    key,
                    timestamp: new Date().toISOString(),
                    detail: 'Value hash mismatch'
                });
                // Keep last 50 events
                if (events.length > 50) events.splice(0, events.length - 50);
                localStorage.setItem('listo_security_events', JSON.stringify(events));
            } catch { /* non-critical */ }

            return null; // Reject tampered value
        }

        return value;
    },

    /**
     * Remove a key and its signature
     */
    remove(key) {
        localStorage.removeItem(key);
        localStorage.removeItem(INTEGRITY_PREFIX + key);
    },

    /**
     * Check if a key has been tampered with
     */
    isValid(key) {
        const value = localStorage.getItem(key);
        if (value === null) return true; // Missing is not tampered
        const storedHash = localStorage.getItem(INTEGRITY_PREFIX + key);
        if (!storedHash) return true; // No signature yet (pre-migration)
        return storedHash === simpleHash(value);
    }
};
