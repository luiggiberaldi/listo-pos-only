// ✅ SYSTEM IMPLEMENTATION - V. 3.0 (LAZY LOADING)
// Archivo: src/services/firebase.js
// Cambio: Firebase SDK se carga dinámicamente DESPUÉS del render inicial.
// Esto difiere ~458KB del bundle y los WebSockets hasta que realmente se necesiten.
// Todos los consumers existentes usan guards defensivos (if (!db) return).

// --- EXPORTS (inicialmente null, se llenan con lazy init) ---
// ES Module named exports son "live bindings" — consumers que importen
// estas variables verán el valor actualizado después del init.
export let db = null;
export let dbClient = null;
export let authClient = null;
export let dbMaster = null;
export let authMaster = null;
export let storageMaster = null;

let _initialized = false;
let _initializing = false;
let _initPromise = null;

/**
 * Inicializa Firebase de forma lazy. Se puede llamar múltiples veces sin efecto.
 * @returns {Promise<boolean>} true si se inicializó correctamente
 */
export async function initFirebase() {
    if (_initialized) return true;
    if (_initializing) return _initPromise;

    _initializing = true;
    _initPromise = _doInit();
    return _initPromise;
}

async function _doInit() {
    try {
        // 🚀 Dynamic imports — solo carga el SDK cuando se llama esta función
        const [appModule, firestoreModule, authModule, storageModule] = await Promise.all([
            import('firebase/app'),
            import('firebase/firestore'),
            import('firebase/auth'),
            import('firebase/storage'),
        ]);

        const { initializeApp } = appModule;
        const { getFirestore } = firestoreModule;
        const { getAuth, signInAnonymously, onAuthStateChanged } = authModule;
        const { getStorage } = storageModule;

        // 📡 ANTENA A: CLIENT APP
        const clientConfig = {
            apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_FIREBASE_APP_ID
        };

        // 📡 ANTENA B: MASTER APP
        const masterConfig = {
            apiKey: import.meta.env.VITE_MASTER_FIREBASE_API_KEY,
            authDomain: import.meta.env.VITE_MASTER_FIREBASE_AUTH_DOMAIN,
            projectId: import.meta.env.VITE_MASTER_FIREBASE_PROJECT_ID,
            storageBucket: import.meta.env.VITE_MASTER_FIREBASE_STORAGE_BUCKET,
            messagingSenderId: import.meta.env.VITE_MASTER_FIREBASE_MESSAGING_SENDER_ID,
            appId: import.meta.env.VITE_MASTER_FIREBASE_APP_ID
        };

        // --- 1. INICIALIZAR ANTENA CLIENTE ---
        if (clientConfig.apiKey) {
            const clientApp = initializeApp(clientConfig, "CLIENT_APP");
            dbClient = getFirestore(clientApp);
            authClient = getAuth(clientApp);
            db = dbClient; // Alias legacy
            console.log("📡 [LAZY] Antena Cliente inicializada.");
        } else {
            console.warn("📡 [ANTENA A] Sin credenciales. Modo Offline Puro.");
        }

        // --- 2. INICIALIZAR ANTENA MASTER ---
        if (masterConfig.apiKey) {
            const masterApp = initializeApp(masterConfig, "MASTER_APP");
            dbMaster = getFirestore(masterApp);
            authMaster = getAuth(masterApp);
            storageMaster = getStorage(masterApp);
            console.log("📡 [LAZY] Antena Master inicializada.");
        }

        // --- 3. DOBLE AUTENTICACIÓN (una sola vez) ---
        const authenticateAntenna = (authInstance, label) => {
            if (!authInstance) return;
            onAuthStateChanged(authInstance, (user) => {
                if (!user) {
                    signInAnonymously(authInstance).catch(e =>
                        console.error(`❌ Error Auth ${label}:`, e.message)
                    );
                }
            });
            signInAnonymously(authInstance).catch(error => {
                console.error(`❌ [IRON DOME] Fallo inicial en ${label}:`, error.code);
            });
        };

        authenticateAntenna(authClient, "CLIENTE");
        authenticateAntenna(authMaster, "MASTER");

        _initialized = true;
        console.log("🔥 [LAZY] Firebase completamente inicializado.");
        return true;

    } catch (error) {
        console.error("🔥 [SYSTEM] Error crítico inicializando Firebase:", error);
        _initializing = false;
        _initPromise = null;
        return false;
    }
}

/**
 * Helper: Verifica si Firebase ya fue inicializado
 */
export function isFirebaseReady() {
    return _initialized;
}