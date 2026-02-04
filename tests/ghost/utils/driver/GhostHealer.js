
import fs from 'fs';
import path from 'path';

export class GhostHealer {
    constructor(page, vision, driver) {
        this.page = page;
        this.vision = vision;
        this.driver = driver; // Reference to main driver to call high-level actions (openRegister, etc.)
    }

    async captureFailure(name, details = {}) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `failure_${name}_${timestamp}`;
        const failureDir = './tests/ghost/failures';

        if (!fs.existsSync(failureDir)) fs.mkdirSync(failureDir, { recursive: true });

        const signature = await this.vision.getScreenSignature();
        const url = this.page.url();

        const logContent = `
=== 📂 FORENSIC LOG: ${name} ===
Timestamp: ${new Date().toISOString()}
URL: ${url}
Signature: ${signature}
Details: ${JSON.stringify(details, null, 2)}
==============================
`;
        console.error(logContent);
        fs.appendFileSync(`${failureDir}/ghost_forensics.log`, logContent);

        const screenshotPath = `${failureDir}/${fileName}.png`;
        await this.page.screenshot({ path: screenshotPath, fullPage: true });
        console.error(`📸 Screenshot captured: ${screenshotPath}`);

        return { screenshotPath, logContent };
    }

    async recover(failType, target = null) {
        const signature = await this.vision.getScreenSignature();
        console.log(`🛠️ Recovery Action for [Type: ${failType}, Sign: ${signature}]`);

        // Prioridad: Limpiar bloqueadores globales (Backdrops)
        // EXCEPCIÓN: Si estamos en el PAYMENT_SCREEN, no queremos limpiar nada (queremos pagar)
        if ((failType === 'OBSTRUCTION' || signature === 'MODAL_INTERCEPTOR' || failType === 'SALE_CONFIRMATION') && signature !== 'PAYMENT_SCREEN') {
            console.log('🧹 Clearing Blockers (Backdrops/Modals)...');

            // 1. Intentar clic en botones de cierre comunes
            const selectors = [
                '.swal2-confirm', 'text=OK', 'text=Aceptar', 'text=Cerrar', 'text=Cancelar',
                'button:has-text("Entendido")', 'button:has-text("FINALIZAR")', 'button:has-text("Cancelar")',
                '.modal-close', '[aria-label="Close"]', 'button:has-text("Cerrar")'
            ];

            for (const sel of selectors) {
                const btn = this.page.locator(sel).first();
                if (await btn.isVisible()) {
                    console.log(`👆 Clicking close button: ${sel}`);
                    await btn.click({ force: true });
                    await this.page.waitForTimeout(1000);
                    if (await this.vision.getScreenSignature() !== 'MODAL_INTERCEPTOR') return;
                }
            }

            // 2. Si sigue bloqueado, intentar clic en el backdrop para cerrarlo (común en modals)
            const backdrop = this.page.locator('.fixed.inset-0, .v-overlay__scrim, .bg-slate-900\\/60').first();
            if (await backdrop.isVisible()) {
                console.log('🖱️ Clicking backdrop center to dismiss...');
                // Clic en el centro con fuerza
                await backdrop.click({ force: true, position: { x: 50, y: 50 } });
                await this.page.waitForTimeout(1000);
            }

            // 3. Último recurso: Escape repetido
            console.log('⌨️ Sending multiple Escape keys...');
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
            await this.page.keyboard.press('Escape');

            // 4. Verificar limpieza
            try {
                const backdropSel = '.fixed.inset-0, .v-overlay__scrim, .bg-slate-900\\/60';
                await this.page.waitForSelector(backdropSel, { state: 'hidden', timeout: 3000 });
                console.log('✅ Blockers cleared successfully.');
            } catch (e) {
                console.log('⚠️ Some blockers might still be present.');
            }
        }

        // Break recursion: Call driver methods only if needed and safe
        if (signature === 'REGISTER_CLOSED' && (!target || !target.includes('ABRIR'))) {
            console.log('💰 Resolving Register dependency...');
            if (this.driver && this.driver.pos) {
                await this.driver.pos.openRegister(100);
            }
        }

        if (signature === 'AUTH_FLOW' && (!target || !target.includes('¿Quién'))) {
            console.log('🔐 Session restoration required.');
            if (this.driver) {
                await this.driver.login('123456');
            }
        }

        if (signature === 'PRODUCT_MODAL' && target && target.toLowerCase().includes('vender')) {
            console.log('🚪 Closing Product Modal to return to POS...');
            await this.page.keyboard.press('Escape');
        }

        if (signature === 'PAYMENT_SCREEN') {
            console.log('💳 Payment Screen detected during recovery. Retrying payment fill...');
            // No escapar, intentar rellenar saldo
            return;
        }
    }
}
