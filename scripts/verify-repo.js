import { execSync } from 'child_process';
import process from 'process';

const TARGET_REPO_MATCH = 'listo-pos-only';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';

console.log(`${GREEN}🔒 Verificando repositorio destino...${RESET}`);

try {
    const remoteUrl = execSync('git remote get-url origin').toString().trim();
    console.log(`📡 Remote actual: ${remoteUrl}`);

    if (!remoteUrl.includes(TARGET_REPO_MATCH)) {
        console.error(`\n${RED}❌ ALERTA CRÍTICA: ESTÁS EN EL REPOSITORIO INCORRECTO${RESET}`);
        console.error(`${RED}   Esperaba: ...${TARGET_REPO_MATCH}...${RESET}`);
        console.error(`${RED}   Encontraste: ${remoteUrl}${RESET}`);
        console.error(`\n${RED}🛑 Operación CANCELADA para proteger el código.${RESET}`);
        process.exit(1);
    }

    console.log(`${GREEN}✅ Seguridad Aprobada: Estás en listo-pos-only.${RESET}\n`);
    process.exit(0);

} catch (error) {
    console.error(`${RED}❌ Error al verificar git remote: ${error.message}${RESET}`);
    process.exit(1);
}
