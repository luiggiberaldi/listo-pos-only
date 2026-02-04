
export class InventoryModule {
    constructor(page, motor, vision, healer) {
        this.page = page;
        this.motor = motor;
        this.vision = vision;
        this.healer = healer;
    }

    async seedProduct(name, cost, price, stock) {
        console.log(`📦 Seeding Product: ${name} (High Fidelity)...`);

        try {
            // Navigate to Inventory if not there
            if (!this.page.url().includes('/inventario')) {
                await this.motor.smartClick('a[href="#/inventario"]');
                await this.page.waitForURL('**/inventario');
            }

            // Create Product
            await this.motor.smartClick('button:has-text("Nuevo Producto")');

            // Wait for visibility
            await this.page.waitForSelector('text=Información Básica', { state: 'visible' });

            // Fill by Placeholder
            await this.page.getByPlaceholder('Ej: Harina Pan 1kg').fill(name);

            // 🏷️ COSTO DE COMPRA & PRECIO VENTA
            await this.page.locator('section:has-text("Precios y Costos")').locator('input[placeholder="0.00"]').first().fill(cost.toString());
            await this.page.locator('section:has-text("Presentaciones")').locator('input[placeholder="0.00"]').first().fill(price.toString());

            // 📦 STOCK (Targeting the Unit input)
            await this.page.getByPlaceholder('0').last().fill(stock.toString());

            // Real Confirmation Button
            await this.motor.smartClick('button:has-text("Crear Producto")');

            // Wait for modal to close (Success)
            await this.page.waitForSelector('text=Información Básica', { state: 'hidden' });
            console.log(`✅ Product ${name} Seeded.`);
        } catch (e) {
            await this.healer.captureFailure('seed_product', { name, error: e.message });
            throw e;
        }
    }
}
