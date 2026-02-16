import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log("🛡️ [FÉNIX] Generando par de llaves RSA-2048...");

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
    },
    privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
    }
});

// Paths
const publicJsPath = path.join(__dirname, '../src/config/fenix_public_key.js');

// 1. Mostrar Private Key (Para el Admin / .env)
console.log("\n🔴 LLAVE PRIVADA (SECRET - MASTER ONLY):");
console.log("==========================================");
console.log(privateKey);
console.log("==========================================\n");

// 2. Guardar Public Key en Archivo JS
const jsContent = `// 🛡️ FÉNIX SHIELD - PUBLIC KEY
// Esta llave se distribuye con el POS para verificar licencias.
// NO contiene secretos. Es segura de exponer.

export const FENIX_PUBLIC_KEY = \`
${publicKey.trim()}
\`;
`;

// Asegurar directorio
const dir = path.dirname(publicJsPath);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(publicJsPath, jsContent);
console.log(`✅ Llave Pública guardada en: ${publicJsPath}`);

// 3. Append to .env (Optional - Manual is safer but we can try)
console.log("⚠️  Instrucción Manual: Copia la Llave Privada en tu archivo .env o Gestor de Secretos como 'VITE_FENIX_PRIVATE_KEY'.\n");
