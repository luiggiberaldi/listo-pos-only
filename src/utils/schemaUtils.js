import { safeLoad } from './storageUtils';

/**
 * Loads data from secure storage and strictly validates it against a Zod schema.
 * @param {string} key - Storage key
 * @param {import('zod').ZodSchema} schema - Zod schema to validate against
 * @param {any} fallback - Default value if load or validation fails
 * @returns {any} Validated data or fallback
 */
export const loadWithSchema = (key, schema, fallback) => {
    // 1. Load raw data (Integrity Checked by Layer 1)
    const data = safeLoad(key, fallback);

    // If safeLoad returned fallback, we trust it matches expectation (or we can validate fallback too, but usually it's static)
    if (data === fallback) return fallback;

    // 2. Validate Structure (Anti-Crash Layer 2)
    const result = schema.safeParse(data);

    if (result.success) {
        return result.data;
    } else {
        console.warn(`⚠️ [DATA HEALTH] Schema Mismatch for '${key}'. Reverting to safe default.`, result.error.format());
        return fallback;
    }
};
