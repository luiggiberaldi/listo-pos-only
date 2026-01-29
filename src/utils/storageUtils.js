// 🛡️ DATA HEALTH LAYER 1: INTEGRITY PROTECTION
// Utility to prevent manual tampering via DevTools

const SECRET_INV = "LISTO_POS_INTEGRITY_KEY_V1";

// Simple Synchronous Hash Function for Integrity
const generateHash = (str) => {
  let hash = 0;
  const combined = str + SECRET_INV;
  if (combined.length === 0) return hash.toString(16);
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
};

export const safeSave = (key, data) => {
  try {
    const jsonPayload = JSON.stringify(data);
    const signature = generateHash(jsonPayload);
    const packet = {
      d: data, // Payload
      s: signature, // Signature (Integrity Check)
      t: Date.now() // Timestamp
    };
    localStorage.setItem(key, JSON.stringify(packet));
    return true;
  } catch (e) {
    console.error("❌ [STORAGE] Save Failed:", e);
    return false;
  }
};

export const safeLoad = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;

    let packet;
    try {
      packet = JSON.parse(raw);
    } catch {
      // If it's not JSON, it's definitely corrupt or weird
      return fallback;
    }

    // 1. Check if it's our new Secure Packet format
    if (packet && typeof packet === 'object' && 's' in packet && 'd' in packet) {
      // Verify Integrity
      const currentHash = generateHash(JSON.stringify(packet.d));
      if (currentHash === packet.s) {
        return packet.d; // ✅ Verified & Clean
      } else {
        console.warn(`⚠️ [STORAGE] TAMPERING DETECTED for ${key}. Integrity check failed.`);
        // In a strict mode, we would return fallback. 
        // For now, we return fallback to "Punish" the cheater (Data is voided)
        return fallback;
      }
    }

    // 2. Legacy Fallback (Allows existing data to survive first migration)
    // Once saved again via safeSave, it will become signed.
    return packet;

  } catch (e) {
    console.warn("Error loading data:", e);
    return fallback;
  }
};