// tests/ghost/scenarios/day01_awakening.spec.js
import { test, expect } from '@playwright/test';
import { GhostDriver } from '../utils/GhostDriver.js';

test('Day 01 - The Awakening', async ({ page }) => {
    const ghost = new GhostDriver(page);

    // 1 & 2. Boot Up & Ghost Injection
    console.log('--- STEP 1 & 2: BOOT UP & INJECTION ---');
    await ghost.wakeUp();

    // 3. Clock Sync (08:00 AM)
    console.log('--- STEP 3: CLOCK SYNC ---');
    await ghost.setTime(8);

    // 4. Login
    console.log('--- STEP 4: LOGIN ---');
    await ghost.login('123456');

    // 5. Opening Check
    console.log('--- STEP 5: OPENING REGISTER ---');
    await ghost.pos.openRegister(100);

    // 5.5 SEEDING INVENTORY
    console.log('--- STEP 5.5: SEEDING INVENTORY ---');
    await ghost.inventory.seedProduct('Ghost Soda', 1.5, 2.5, 100);
    await ghost.verifyFinancialSanity(1.5, 2.5);

    // 6. The Sale (Simulated)
    console.log('--- STEP 6: PERFORMING SALE ---');
    await ghost.pos.addToCart('Ghost Soda');
    await ghost.pos.payMixed(0);

    // 7. Time Jump (End of Shift)
    console.log('--- STEP 7: TIME JUMP ---');
    await ghost.setTime(16); // 4 PM

    // 8. Closing
    console.log('--- STEP 8: CLOSING ---');
    await ghost.pos.closeTurn();

    await expect(page).toHaveURL(/.*cierre/);

    // 9. Memory Dump
    console.log('--- STEP 9: MEMORY EXTRACTION ---');
    const memoryPath = await ghost.extractMemories('day01_awakening');

    console.log(`\n🎉 SIMULATION COMPLETE.`);
    console.log(`📂 MEMORIES: ${memoryPath}`);
});
