// 📄 PDF TEXT SANITIZER
// jsPDF default fonts (Helvetica/Courier/Times) only support Latin-1 (ISO 8859-1).
// This utility strips or replaces unsupported Unicode characters to prevent garbled output.

/**
 * Sanitizes text for jsPDF rendering.
 * Replaces common Unicode symbols with ASCII equivalents and strips unsupported characters.
 * @param {string} text - Input text
 * @returns {string} - Sanitized text safe for jsPDF
 */
export const sanitizeForPDF = (text) => {
    if (!text || typeof text !== 'string') return text || '';

    return text
        // Common Unicode replacements
        .replace(/[\u2714\u2705\u2611]/g, '[OK]')       // ✔ ✅ ☑
        .replace(/[\u274C\u274E\u2716\u2718]/g, '[X]')   // ❌ ❎ ✖ ✘
        .replace(/[\u25B2\u25B3\u2B06]/g, '+')            // ▲ △ ⬆
        .replace(/[\u25BC\u25BD\u2B07]/g, '-')            // ▼ ▽ ⬇
        .replace(/[\u2022\u2023\u25CF]/g, '-')            // • ‣ ●
        .replace(/[\u2013\u2014]/g, '-')                  // – —
        .replace(/[\u2018\u2019]/g, "'")                  // ' '
        .replace(/[\u201C\u201D]/g, '"')                  // " "
        .replace(/\u2026/g, '...')                        // …
        .replace(/\u00A0/g, ' ')                          // non-breaking space
        // Strip remaining characters outside Latin-1 range (keep 0x20-0xFF)
        .replace(/[^\x20-\xFF]/g, '');
};

/**
 * Sanitizes a value, handling numbers and nulls gracefully.
 * @param {*} val
 * @returns {string}
 */
export const s = (val) => sanitizeForPDF(String(val ?? ''));
