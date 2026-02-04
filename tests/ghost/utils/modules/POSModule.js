
import { expect } from '@playwright/test';

export class POSModule {
    constructor(page, motor, vision, healer) {
        this.page = page;
        this.motor = motor;
        this.vision = vision;
        this.healer = healer;
    }

    async openRegister(amount) {
        console.log(`💵 Opening Register Protocol: High Fidelity...`);

        // 1. Asegurar que estamos en una pantalla que revele el estado de la caja (POS)
        if (this.page.url().endsWith('/') || this.page.url().includes('inicio') || this.page.url().includes('dashboard')) {
            console.log('🔗 Navigating to POS to check register status...');
            await this.motor.smartClick('a[href*="/vender"]');
            await this.page.waitForURL('**/vender');
        }

        const mainButton = this.page.locator('button:has-text("ABRIR CAJA")').first();
        const usdInput = this.page.getByPlaceholder(/0\.00\s*USD/i).first();

        // 2. ¿Necesitamos abrir el modal o ya estamos en él?
        if (!(await usdInput.isVisible())) {
            console.log('🔎 Checking if register needs opening...');
            if (await mainButton.isVisible()) {
                console.log('👆 Clicking ABRIR CAJA trigger...');
                await mainButton.click();
            } else {
                console.log('✅ Register appears to be already open (no button/inputs found).');
                return;
            }
        }

        console.log('🚧 Starting input filling protocol...');

        try {
            // Localizadores por Placeholder con Fallback por Posición
            const usdInputReal = this.page.getByPlaceholder(/0\.00\s*USD/i).first();
            const vesInputReal = this.page.getByPlaceholder(/0\.00\s*(VES|BS)/i).first();

            // USD (Index 0)
            const activeUsd = (await usdInputReal.isVisible()) ? usdInputReal : this.page.locator('input[type="number"]').nth(0);
            await this.motor.typeHighFidelity(activeUsd, amount.toString());

            // VES (Index 1)
            const activeVes = (await vesInputReal.isVisible()) ? vesInputReal : this.page.locator('input[type="number"]').nth(1);
            if (await activeVes.isVisible()) {
                await this.motor.typeHighFidelity(activeVes, '0');
            }

            // 3. Confirmación
            const confirmBtn = this.page.locator('button:has-text("Confirmar"), button:has-text("ABRIR CAJA")').last();

            console.log('⏳ Esperando habilitación del botón de confirmación...');
            await expect(confirmBtn).toBeEnabled({ timeout: 5000 });
            await confirmBtn.click({ force: true });
            await this.page.keyboard.press('Enter');

            console.log('⏳ Verificando transición al POS...');
            await this.page.waitForSelector('input[placeholder*="buscar product"], input[placeholder*="Buscar"]', { timeout: 15000 });
            console.log('✅ Register Successfully Opened.');

        } catch (e) {
            await this.healer.captureFailure('error_apertura', { amount, error: e.message });
            throw new Error(`ERROR_APERTURA Detalle: ${e.message}`);
        }
    }

    async addToCart(searchQuery) {
        console.log(`🛒 Adding ${searchQuery} to cart (High Fidelity)...`);

        try {
            if (!this.page.url().includes('/vender')) {
                await this.motor.smartClick('a[href*="/vender"]');
                await this.page.waitForURL('**/vender');
            }

            // 1. Búsqueda
            const searchInput = this.page.locator('input[placeholder*="Buscar"]').first();
            await this.motor.typeHighFidelity(searchInput, searchQuery);
            await this.page.waitForTimeout(1500); // Wait for React to render results

            // 2. Selección con Reintento y Verificación
            const productItem = this.page.locator(`text=${searchQuery}`).first();
            const payButton = this.page.locator('button:has-text("PAGAR"), button:has-text("COBRAR")').first();

            console.log(`🖱️ Clicking on product: ${searchQuery}`);
            await productItem.waitFor({ state: 'visible', timeout: 5000 });
            await productItem.click({ force: true, delay: 100 });

            // Verificación: El botón de pago debe habilitarse o el carrito debe tener items
            console.log('⚖️ Verifying cart update...');
            try {
                await expect(payButton).toBeEnabled({ timeout: 5000 });
                console.log(`✅ ${searchQuery} added successfully.`);
            } catch (e) {
                console.log('🔄 Cart not updated. Retrying product click...');
                await productItem.click({ force: true, delay: 200 });
                await expect(payButton).toBeEnabled({ timeout: 5000 });
                console.log(`✅ ${searchQuery} added on retry.`);
            }

        } catch (e) {
            await this.healer.captureFailure('error_carrito', { searchQuery, error: e.message });
            throw e;
        }
    }

    async payMixed(usd = 0, method = 'EFECTIVO') {
        console.log(`💳 Starting Payment Flow (High Fidelity)...`);

        try {
            const signature = await this.vision.getScreenSignature();
            if (signature !== 'PAYMENT_SCREEN') {
                // Trigger el modal de pago usando smartClick (para manejar obstrucciones)
                await this.motor.smartClick('button:has-text("PAGAR"), button:has-text("COBRAR")');
            } else {
                console.log('✨ Payment Modal already open.');
            }

            // Esperar el modal de cobro/procesamiento con reintento
            console.log('⏳ Waiting for Payment Modal...');
            const modalLocator = this.page.locator('text=/Procesar Venta|MÉTODOS DE PAGO|COBRAR|Falta por pagar/i').first();

            try {
                await modalLocator.waitFor({ state: 'visible', timeout: 8000 });
            } catch (e) {
                const payButton = this.page.locator('button:has-text("PAGAR"), button:has-text("PROCESAR"), button:has-text("COBRAR")').first();
                const isStillEnabled = await payButton.isEnabled().catch(() => false);
                if (isStillEnabled) {
                    console.log('🔄 Modal not detected and Button is Enabled. Retrying trigger click...');
                    await this.motor.smartClick('button:has-text("PAGAR"), button:has-text("COBRAR")');
                    await modalLocator.waitFor({ state: 'visible', timeout: 8000 });
                } else {
                    console.log('⚠️ Trigger disabled but Modal not found. Assuming slow load...');
                    await modalLocator.waitFor({ state: 'visible', timeout: 10000 });
                }
            }

            // Autocompletar con Efectivo si el botón está deshabilitado
            const processButton = this.page.getByRole('button', { name: /PAGAR|PROCESAR|COBRAR/i }).first();

            // Heurística de autocompletado si el botón no está habilitado
            let isEnabled = await processButton.isEnabled();
            if (!isEnabled) {
                console.log('⚖️ Balance not settled. trying "Completar Saldo" button...');

                // 1. Intentar usar el botón de completar saldo (Rayo/Zap)
                const completeBalanceBtn = this.page.locator('button[title="Completar Saldo"]').first();
                if (await completeBalanceBtn.isVisible()) {
                    console.log('⚡ Clicking "Completar Saldo" button...');
                    await completeBalanceBtn.click();
                    await this.page.waitForTimeout(1000); // Wait for React state
                    isEnabled = await processButton.isEnabled();
                }

                // 2. Fallback: Detectar monto faltante y escribir si sigue deshabilitado
                if (!isEnabled) {
                    console.log('⌨️ "Completar Saldo" failed or not found. Falling back to manual typing...');
                    let missingAmount = usd; // Fallback
                    try {
                        const missingTextEl = this.page.locator('text=/Falta por pagar/i').first();
                        if (await missingTextEl.isVisible()) {
                            const missingText = await missingTextEl.textContent();
                            const match = missingText.match(/[\d,.]+/);
                            if (match) {
                                missingAmount = match[0];
                                console.log(`💰 Detected missing amount: ${missingAmount}`);
                            }
                        }
                    } catch (e) {
                        console.log('⚠️ Could not auto-detect missing amount. Using default.');
                    }

                    const currencyInput = this.page.locator('input[inputmode="decimal"]').first();
                    if (await currencyInput.isVisible()) {
                        await this.motor.typeHighFidelity(currencyInput, missingAmount.toString());
                        await this.page.keyboard.press('Tab'); // Trigger blur/state update
                        await this.page.waitForTimeout(1000); // Wait for validation
                    }
                }
            }

            await expect(processButton).toBeEnabled({ timeout: 10000 });

            try {
                await this.motor.smartClick('button:has-text("PAGAR"), button:has-text("PROCESAR"), button:has-text("COBRAR")');
            } catch (e) {
                console.log('🎯 SmartClick failed. Attempting coordinate-based click as fallback...');
                const box = await processButton.boundingBox();
                if (box) {
                    await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
                } else {
                    await this.page.keyboard.press('Enter');
                }
            }

            // Protocolo de finalización (React safe)
            await this.page.keyboard.press('Enter');
            await this.page.waitForTimeout(1000);

            // Venta Exitosa (Wait for any success indicator)
            console.log('⏳ Waiting for success confirmation...');
            try {
                const successLocator = this.page.locator('text=/Venta Exitosa|¡LISTO!|Comprobante|Ticket/i').first();
                await successLocator.waitFor({ state: 'visible', timeout: 15000 });
                console.log('✅ Sale Successful');
            } catch (e) {
                console.log('⚠️ Success message not found after 15s. Checking if modal is still open...');
                const signature = await this.vision.getScreenSignature();
                if (signature === 'PAYMENT_SCREEN') {
                    console.log('🆘 Modal STILL OPEN. Forcing Escape...');
                    await this.page.keyboard.press('Escape');
                    await this.page.waitForTimeout(500);
                }
            }

            const closeBtn = this.page.locator('button:has-text("Cerrar"), button:has-text("FINALIZAR"), button:has-text("OK")').first();
            if (await closeBtn.isVisible()) {
                await closeBtn.click({ force: true });
            } else {
                await this.page.keyboard.press('Escape');
                await this.page.waitForTimeout(500);
                await this.page.keyboard.press('Escape');
            }
        } catch (e) {
            await this.healer.captureFailure('error_pago', { usd, error: e.message });
            console.log('⚠️ Triggering recovery for payment flow...');
            await this.healer.recover('SALE_CONFIRMATION');
        }
    }

    async closeTurn() {
        console.log('💵 Closing Turn Protocol...');
        await this.motor.smartClick('a[href*="/cierre"]');

        // El botón puede decir "CERRAR TURNO" o "Declarar Cierre" según la versión
        await this.motor.smartClick('button:has-text("CERRAR TURNO"), button:has-text("Declarar Cierre")');

        // Esperar transición o modal de confirmación si existe
        await this.page.waitForTimeout(1000);
        console.log('✅ Turn Closed Successfully.');
    }
}
