
export class GhostMotor {
    constructor(page, vision, healer) {
        this.page = page;
        this.vision = vision;
        this.healer = healer;
        this._isRecovering = false;
    }

    async smartClick(selector, options = {}) {
        const timeout = options.timeout || 10000;
        const locator = this.page.locator(selector).first();

        try {
            await locator.click({ timeout, force: false });
        } catch (e) {
            console.log(`❌ Click failed at ${selector}.`);

            // Si el error es de interceptación de puntero, es un bloqueador visual
            const isObstructed = e.message.includes('intercepts pointer events') || e.message.includes('Timeout');

            if (this._isRecovering) {
                console.log('⚠️ Already in recovery, forcing click...');
                if (this.healer) {
                    await this.healer.captureFailure('stuck_click', { selector, error: e.message });
                }
                await locator.click({ force: true, timeout: 5000 });
                return;
            }

            this._isRecovering = true;
            try {
                if (this.vision && this.healer) {
                    const signature = await this.vision.getScreenSignature();
                    console.log(`🛡️ Self-Healing Triggered. Sign: ${signature} | Obstructed: ${isObstructed}`);

                    if (isObstructed) {
                        await this.healer.captureFailure('click_obstructed', { selector, signature, error: e.message });
                        await this.healer.recover('OBSTRUCTION', selector);
                    } else {
                        await this.healer.recover('CLICK', selector);
                    }
                }

                // Segundo intento con un poco de espera y fuerza si es necesario
                await this.page.waitForTimeout(500);
                await locator.click({ timeout: 5000, force: isObstructed });
            } catch (retryErr) {
                if (this.healer) {
                    await this.healer.captureFailure('critical_click_failure', { selector, error: retryErr.message });
                }
                throw retryErr;
            } finally {
                this._isRecovering = false;
            }
        }
    }

    async typeHighFidelity(locator, value) {
        await locator.waitFor({ state: 'visible', timeout: 5000 });
        await locator.click();
        await this.page.keyboard.press('Control+A');
        await this.page.keyboard.press('Backspace');
        await this.page.keyboard.type(value, { delay: 100 });
        console.log(`✍️ HighFidelity: Typed "${value}"`);
    }
}
