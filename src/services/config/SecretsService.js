// Service for managing secrets and API keys
// Priority: Custom Config (Electron/userData) > Build-time Env (import.meta.env)

class SecretsManager {
    constructor() {
        this.secrets = {};
        this.loaded = false;
    }

    async load() {
        this.secrets = {};

        // 1. Get Build-time defaults
        const buildSecrets = {
            VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL || '',
            VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY || '',
            VITE_GEMINI_API_KEY: import.meta.env.VITE_GEMINI_API_KEY || '',
            VITE_GEMINI_API_KEY_2: import.meta.env.VITE_GEMINI_API_KEY_2 || '',
            VITE_FIREBASE_API_KEY: import.meta.env.VITE_FIREBASE_API_KEY || '',
            VITE_FIREBASE_PROJECT_ID: import.meta.env.VITE_FIREBASE_PROJECT_ID || ''
        };

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
        // If the current Build has keys, they are the "Master Truth".
        // We save them to persistence so they survive future "empty" updates.
        let shouldSave = false;

        Object.keys(buildSecrets).forEach(key => {
            const buildVal = buildSecrets[key];
            const savedVal = savedSecrets[key];

            // If Build has a value, and it's different from what's saved (or saved is missing)
            // We authorize an update to the persistence layer.
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

        // 5. Final Merge: Use Saved Secrets (which now contain the freshest Build keys)
        this.secrets = { ...buildSecrets, ...savedSecrets };

        this.loaded = true;
        console.log(`🔐 SecretsManager: Ready. Loaded ${Object.keys(this.secrets).length} keys.`);
        return this.secrets;
    }

    get(key) {
        if (!this.loaded) console.warn(`⚠️ SecretsManager: Accessing ${key} before load() completed.`);
        return this.secrets[key] || import.meta.env[key] || '';
    }
}

export const secretsService = new SecretsManager();
