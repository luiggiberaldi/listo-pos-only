// Service for managing secrets and API keys
// Priority: Custom Config (Electron/userData) > Build-time Env (import.meta.env)

// 🛡️ STATIC DEFAULTS (Vite Replacement Safe)
// Dynamic access like import.meta.env[key] FAILS in production builds.
// We must map them explicitly here to ensure they are baked into the bundle.
const DEFAULTS = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
    VITE_GEMINI_API_KEY_2: import.meta.env.VITE_GEMINI_API_KEY_2 || '',
    VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || '',
    VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
    // Groq Keys (Needs explicit mapping too if accessed dynamically)
    VITE_GROQ_API_KEY_1: import.meta.env.VITE_GROQ_API_KEY_1 || '',
    VITE_GROQ_API_KEY_2: import.meta.env.VITE_GROQ_API_KEY_2 || '',
    VITE_GROQ_API_KEY_3: import.meta.env.VITE_GROQ_API_KEY_3 || '',
    VITE_GROQ_API_KEY_4: import.meta.env.VITE_GROQ_API_KEY_4 || '',
    VITE_GROQ_API_KEY_5: import.meta.env.VITE_GROQ_API_KEY_5 || '',
    VITE_GROQ_API_KEY_6: import.meta.env.VITE_GROQ_API_KEY_6 || '',
    VITE_GROQ_API_KEY_7: import.meta.env.VITE_GROQ_API_KEY_7 || '',
    VITE_GROQ_API_KEY_8: import.meta.env.VITE_GROQ_API_KEY_8 || '',
    VITE_GROQ_API_KEY_9: import.meta.env.VITE_GROQ_API_KEY_9 || '',
    VITE_GROQ_API_KEY_10: import.meta.env.VITE_GROQ_API_KEY_10 || '',
    // OpenRouter
    VITE_OPENROUTER_API_KEY: import.meta.env.VITE_OPENROUTER_API_KEY || ''
};

class SecretsManager {
    constructor() {
        this.secrets = {};
        this.loaded = false;
    }

    async load() {
        this.secrets = {};

        // 1. Get Build-time defaults (From our Safe Static Map)
        const buildSecrets = { ...DEFAULTS };

        // 2. Get Persisted overrides
        let savedSecrets = {};
        let canPersist = false;

        if (window.electronAPI && window.electronAPI.getCustomEnv) {
            try {
                savedSecrets = await window.electronAPI.getCustomEnv() || {};
                canPersist = true;
            } catch (e) {
                console.warn('🔐 SecretsManager: Failed to load custom env.', e);
            }
        }

        // 3. AUTO-BACKUP LOGIC (The "Admin Seed" Strategy)
        let shouldSave = false;

        Object.keys(buildSecrets).forEach(key => {
            const buildVal = buildSecrets[key];
            const savedVal = savedSecrets[key];

            // If Build has a value, and it's different/new, we assume it's the master source.
            if (buildVal && buildVal.length > 5 && buildVal !== savedVal) {
                savedSecrets[key] = buildVal;
                shouldSave = true;
            }
        });

        // 4. Save if needed (Silent Admin Seed)
        if (canPersist && shouldSave) {
            console.log('🔐 SecretsManager: Auto-seeding keys from Build to Persistence...');
            window.electronAPI.saveCustomEnv(savedSecrets).catch(e => console.error(e));
        }

        // 5. Final Merge (SMART OVERRIDE)
        // If persisted key is empty/bad, but build key is good, ignore persisted.
        this.secrets = { ...buildSecrets };

        Object.keys(savedSecrets).forEach(key => {
            const savedVal = savedSecrets[key];
            const buildVal = buildSecrets[key];

            // Only use saved if it has content (length > 5 sanity check for API keys)
            if (savedVal && savedVal.length > 5) {
                this.secrets[key] = savedVal;
            } else if (buildVal && buildVal.length > 5) {
                // Keep build value (already set), ignore empty saved value
            } else {
                // Both weak/empty? Use saved (user might have cleared it intentionally)
                this.secrets[key] = savedVal || '';
            }
        });

        this.loaded = true;
        console.log(`🔐 SecretsManager: Ready. Loaded ${Object.keys(this.secrets).length} keys.`);
        return this.secrets;
    }

    get(key) {
        if (!this.loaded) {
            console.warn(`⚠️ SecretsManager: Accessing ${key} before load() completed. Using DEFAULTS.`);
            return DEFAULTS[key] || '';
        }
        return this.secrets[key] || DEFAULTS[key] || '';
    }
}

export const secretsService = new SecretsManager();
