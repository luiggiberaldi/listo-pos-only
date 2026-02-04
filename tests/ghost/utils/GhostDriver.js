
import { GhostVision } from './driver/GhostVision.js';
import { GhostMotor } from './driver/GhostMotor.js';
import { GhostHealer } from './driver/GhostHealer.js';
import { POSModule } from './modules/POSModule.js';
import { InventoryModule } from './modules/InventoryModule.js';
import path from 'path';
import fs from 'fs';

export class GhostDriver {
    constructor(page) {
        this.page = page;

        // 1. Initialize Core Drivers
        this.vision = new GhostVision(page);
        this.healer = new GhostHealer(page, this.vision, this);
        this.motor = new GhostMotor(page, this.vision, this.healer);

        // 2. Initialize Domain Modules
        this.pos = new POSModule(page, this.motor, this.vision, this.healer);
        this.inventory = new InventoryModule(page, this.motor, this.vision, this.healer);
    }

    // 🧠 Brain Interface
    async wakeUp() {
        console.log(' Preparing Ghost Nervous System...');

        // 🔬 Inyectar Bypass Criptográfico ANTES de cargar la página
        await this.page.context().addInitScript(() => {
            localStorage.setItem('ghost_bypass', 'true');
            localStorage.setItem('listo_contract_signed', 'true');
            localStorage.setItem('listo-config', JSON.stringify({
                state: {
                    configuracion: {
                        nombre: "SIMULACIÓN FANTASMA",
                        moneda: { principal: "USD", secundaria: "VES", tasa: 20 },
                        negocio: { nombre: "Ghost Store" },
                        tema: "dark",
                        pinAdmin: "123456"
                    },
                    license: { isDemo: false, usageCount: 0, isQuotaBlocked: false }
                },
                version: 0
            }));
            console.log('🔓 Ghost Bypasses Injected via InitScript');
        });

        console.log('🚀 Booting Application...');
        await this.page.goto('/');

        // Activate Ghost Mode Visuals
        await this.page.evaluate(() => {
            if (window.GhostTools) window.GhostTools.toggleMode(true);
        });

        try {
            await this.page.waitForSelector('body[data-ghost-mode="true"]', { timeout: 5000 }).catch(() => { });
            console.log('👻 Ghost Mode Activated.');
        } catch (e) { console.log('👻 Ghost Mode Status: Unknown'); }
    }

    async setTime(hour) {
        console.log(`⏱️ Sets time to ${hour}:00...`);
        await this.page.evaluate((h) => {
            if (window.GhostTools && window.GhostTools.timeProvider) {
                const now = window.GhostTools.timeProvider.now();
                const target = new Date(now);
                target.setHours(h, 0, 0, 0);
                window.GhostTools.timeProvider.jumpTime(target - now);
            }
        }, hour);
    }

    // ✋ Motor Actions (Delegates)
    async login(pin) {
        console.log(`🔐 Logging in as ${pin}...`);
        await this.page.waitForSelector('text=¿QUIÉN ESTÁ OPERANDO?', { timeout: 10000 });
        const profiles = this.page.locator('h3, .inter-var');
        if (await profiles.count() > 0) await profiles.first().click();
        await this.page.waitForSelector('input[type="password"]');
        await this.page.keyboard.type(pin);
        await this.page.keyboard.press('Enter');
        await this.page.waitForSelector('text=ACCEDIENDO...', { state: 'hidden' });
        await this.page.waitForURL('**/');
        await this.page.waitForTimeout(1000);
    }

    // 💾 Memory Extraction
    async extractMemories(sessionName) {
        console.log(`🧠 Extracting memories...`);
        const logs = await this.page.evaluate(() => window.GhostBuffer?.getLogs() || []);
        const absPath = path.resolve(`./tests/ghost/memories/${sessionName}_${Date.now()}.json`);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, JSON.stringify(logs, null, 2));
        console.log(`💾 MEMORIES SAVED AT: ${absPath}`);
        return absPath;
    }

    async verifyFinancialSanity(cost, price) {
        const c = parseFloat(cost);
        const p = parseFloat(price);
        if (c >= p) {
            console.log(`⚠️ GhostLearning: Absurd profit margin detected (Cost: ${c} >= Price: ${p}).`);
            if (this.page.evaluate(() => window.GhostBuffer)) {
                // ... logging logic
            }
            return false;
        }
        return true;
    }
}
