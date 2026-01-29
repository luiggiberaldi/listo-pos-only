
// 🔑 LISTO MASTER KEY GENERATOR
// Uso: node master_unlock.js <CHALLENGE_CODE> <SYSTEM_ID>

const crypto = require('crypto');

// ⚠️ DEBE COINCIDIR CON src/utils/securityUtils.js
const SALT_MASTER = "LISTO_MASTER_SUPER_ADMIN_KEY_X99";

async function calculateMasterPin(challenge, systemId) {
    if (!challenge || !systemId) {
        console.error("❌ Error: Faltan argumentos.");
        console.log("Uso: node master_unlock.js <CHALLENGE> <SYSTEM_ID>");
        return;
    }

    const data = challenge.toUpperCase() + systemId + SALT_MASTER;

    // Node.js Crypto Implementation (Matches Browser WebCrypto)
    const hashBuffer = crypto.createHash('sha256').update(data).digest();

    // Read last 4 bytes as UInt32
    const offset = hashBuffer.length - 4;
    const numericValue = hashBuffer.readUInt32BE(offset);

    const pin = (numericValue % 1000000).toString().padStart(6, '0');

    console.log("\n🔐 GENERADOR DE LLAVE MAESTRA");
    console.log("=============================");
    console.log(`📡 Sistema ID: ${systemId}`);
    console.log(`🧩 Reto:       ${challenge.toUpperCase()}`);
    console.log("=============================");
    console.log(`🔑 PIN MAESTRO: \x1b[32m${pin}\x1b[0m`);
    console.log("=============================\n");
}

// Get args from command line
const args = process.argv.slice(2);
calculateMasterPin(args[0], args[1]);
