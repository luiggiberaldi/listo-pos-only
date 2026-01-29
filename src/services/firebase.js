// ✅ SYSTEM IMPLEMENTATION - V. 2.0 (DOUBLE ANTENNA)
// Archivo: src/services/firebase.js
// Autorizado por Auditor en Fase 4 (Double Antenna)
// Rastro: Multi-Tenancy Client vs Master [cite: 5581]

import { initializeApp } from 'firebase/app';
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';

// 📡 ANTENA A: CLIENT APP (Ventas y Datos del Usuario)
// Configuración dinámica desde .env
const clientConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// 📡 ANTENA B: MASTER APP (Telemetría de Listo POS)
// Configuración fija (Hardcoded Safety)
const masterConfig = {
    apiKey: "AIzaSyBuSsNqH9uWOYnROjvWFxTHvke3fXCGB6I",
    authDomain: "listo-pos-prod.firebaseapp.com",
    projectId: "listo-pos-prod",
    storageBucket: "listo-pos-prod.firebasestorage.app",
    messagingSenderId: "579228744504",
    appId: "1:579228744504:web:eba981935893b38f6e1fcd"
};

let dbClient = null;
let authClient = null;
let clientApp = null;

let dbMaster = null;
let authMaster = null;
let masterApp = null;

// Inicialización Defensiva
try {
    // --- 1. INICIALIZAR ANTENA CLIENTE (LISTO GO) ---
    if (clientConfig.apiKey) {
        clientApp = initializeApp(clientConfig, "CLIENT_APP"); // Nombre explícito para evitar colisión

        // Persistencia Offline solo para datos del cliente
        // dbClient = initializeFirestore(clientApp, {
        //    localCache: persistentLocalCache({
        //        tabManager: persistentMultipleTabManager()
        //    })
        // });
        dbClient = getFirestore(clientApp); // 🟢 CACHE DISABLED FOR DEBUG (Persistent Cache Disabled)

        authClient = getAuth(clientApp);
        // console.log("📡 [ANTENA A] Cliente conectado.");
    } else {
        console.warn("📡 [ANTENA A] Sin credenciales. Modo Offline Puro.");
    }

    // --- 2. INICIALIZAR ANTENA MASTER (LISTO MASTER) ---
    if (masterConfig.apiKey) {
        masterApp = initializeApp(masterConfig, "MASTER_APP");

        // Sin persistencia pesada, es solo para telemetría
        dbMaster = getFirestore(masterApp);
        authMaster = getAuth(masterApp);
        // console.log("📡 [ANTENA B] Enlace Master listo.");
    }

    // --- 3. PROTOCOLO IRON DOME (DOBLE AUTENTICACIÓN) ---
    const authenticateAntenna = (authInstance, label) => {
        if (!authInstance) return;

        onAuthStateChanged(authInstance, (user) => {
            if (!user) {
                // console.warn(`🛡️ [IRON DOME] ${label} desconectado. Re-autenticando...`);
                signInAnonymously(authInstance).catch(e => console.error(`❌ Error Auth ${label}:`, e.message));
            }
        });

        signInAnonymously(authInstance).catch(error => {
            console.error(`❌ [IRON DOME] Fallo inicial en ${label}:`, error.code);
        });
    };

    // Activar Escudos
    authenticateAntenna(authClient, "CLIENTE");
    authenticateAntenna(authMaster, "MASTER");

} catch (error) {
    console.error("🔥 [SYSTEM] Error crítico inicializando Antenas:", error);
}

// --- EXPORTACIONES ---
const db = dbClient; // Alias de compatibilidad (Legacy Support)

export {
    db,          // Default (Legacy)
    dbClient,    // Explicit Client
    authClient,  // Explicit Client Auth
    dbMaster,    // Explicit Master
    authMaster   // Explicit Master Auth
};