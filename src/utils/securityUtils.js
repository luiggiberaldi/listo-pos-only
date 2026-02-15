
// 🛡️ LISTO SECURITY CORE - OFF-GRID PROTOCOLS
// Archivo: src/utils/securityUtils.js

// SALTS (SECRETS)
// En producción, estas llaves vienen de .env. Si no existen, usamos fallbacks (Dev Mode).
export const SALT_OWNER = import.meta.env.VITE_SALT_OWNER || "LISTO_GO_TACTICAL_KEY_2026";
export const SALT_MASTER = import.meta.env.VITE_SALT_MASTER || "LISTO_MASTER_SUPER_ADMIN_KEY_X99";
const PIN_SALT = "LISTO_POS_V1_SECURE_SALT_998877"; // 🛡️ Legacy Salt for PINs

// 0. PBKDF2 PIN HASHER (Required by useAuth)
export const hashPin = async (pin) => {
  if (!pin) return null;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(PIN_SALT),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const exported = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(exported)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// 0.1 Legacy/GodMode Verifier
export const verifySecurityCode = async (input, hashKeyOrValue) => {
  // If it's a known env var key, look it up, otherwise treat as direct hash
  let targetHash = import.meta.env[hashKeyOrValue] || hashKeyOrValue;

  // Fallback: deny access if env hash is not configured
  if (hashKeyOrValue === 'VITE_GOD_MODE_HASH' && !targetHash) {
    console.warn('⚠️ SECURITY: VITE_GOD_MODE_HASH not configured. God Mode disabled.');
    return false;
  }

  const inputHash = await hashPin(input);
  return inputHash === targetHash;
};

// 1. Generar Reto (4 Caracteres Alfanuméricos - Easy to read)
// Evitamos O, 0, I, 1 para no confundir
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateChallenge = () => {
  let result = '';
  const randomBuffer = new Uint8Array(4);
  crypto.getRandomValues(randomBuffer);

  for (let i = 0; i < 4; i++) {
    result += CHARS[randomBuffer[i] % CHARS.length];
  }
  return result;
};

// 2. Calcular Respuesta (SHA-256 Truncado a 6 dígitos numéricos)
// Input: Challenge (4 chars) + SystemID (UUID) + Salt (String)
export const calculateResponse = async (challenge, systemId, salt) => {
  if (!challenge || !systemId || !salt) return null;

  const data = challenge.toUpperCase() + systemId + salt;
  const msgBuffer = new TextEncoder().encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  // Convertimos el hash a un número grande y tomamos los últimos 6 dígitos
  // Estrategia simple: Sumar los bytes y hacer módulo 1000000? 
  // Mejor: Tomar los últimos 4 bytes como entero.

  // Usamos DataView para leer un entero de 32 bits del hash
  const view = new DataView(hashBuffer);
  const numericValue = view.getUint32(hashBuffer.byteLength - 4); // Últimos 4 bytes

  const pin = (numericValue % 1000000).toString().padStart(6, '0');
  return pin;
};

// 3. Validador Unificado
// Retorna: 'MASTER' | 'OWNER' | null
export const validateSOS = async (challenge, systemId, inputPin) => {
  const cleanInput = inputPin.replace(/\D/g, ''); // Solo números

  // Check Master First
  const masterPin = await calculateResponse(challenge, systemId, SALT_MASTER);
  if (cleanInput === masterPin) return 'MASTER';

  // Check Owner Second
  const ownerPin = await calculateResponse(challenge, systemId, SALT_OWNER);
  if (cleanInput === ownerPin) return 'OWNER';

  return null;
};