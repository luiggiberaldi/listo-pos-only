import { db } from '../db';

/**
 * 🌉 GHOST NEURAL BRIDGE (LIVE RAG)
 * Conecta la red neuronal (AI) con la base de datos viva (IndexedDB).
 */
export const GhostDBBridge = {

    /**
     * Ejecuta consultas vivas basadas en la intención del usuario.
     * @param {string} intent - 'INVENTORY_QUERY', 'SALES_QUERY', 'CLIENT_QUERY'
     * @param {object} params - Parámetros de filtro
     */
    async query(intent, params = {}) {
        try {
            console.log(`🔌 [GhostBridge] Querying: ${intent}`, params);

            switch (intent) {
                case 'INVENTORY_QUERY':
                    return await this.getInventoryContext(params.keyword);

                case 'SALES_QUERY':
                    return await this.getSalesContext(params.period);

                case 'CLIENT_QUERY':
                    return await this.getClientContext(params.keyword);

                default:
                    return { info: "No live data available for this intent." };
            }
        } catch (error) {
            console.error("❌ [GhostBridge] Error:", error);
            return { error: "Database bridge failure." };
        }
    },

    async getInventoryContext(keyword) {
        // Si no hay keyword, trae resumen general
        if (!keyword) {
            const count = await db.products.count();
            const lowStock = await db.products.where('stock').below(5).count();
            return {
                type: 'INVENTORY_SUMMARY',
                total_products: count,
                low_stock_alerts: lowStock,
                message: `Hay ${count} productos en total. ${lowStock} están bajos de stock.`
            };
        }

        // Búsqueda aproximada
        const products = await db.products
            .filter(p => p.nombre.toLowerCase().includes(keyword.toLowerCase()))
            .toArray();

        return {
            type: 'PRODUCT_SEARCH',
            query: keyword,
            found: products.length,
            results: products.slice(0, 5).map(p => ({
                name: p.nombre,
                stock: p.stock,
                price: p.precioBase,
                code: p.codigo
            }))
        };
    },

    async getSalesContext(period = 'today') {
        const now = new Date();
        const startOfDay = new Date(now.setHours(0, 0, 0, 0)).getTime();

        let sales = [];
        let label = "hoy";

        if (period === 'today') {
            sales = await db.ventas.where('fecha').aboveOrEqual(startOfDay).toArray();
        }

        const totalUSD = sales.reduce((acc, s) => acc + (s.totalVenta || 0), 0);
        const count = sales.length;

        return {
            type: 'SALES_REPORT',
            period: label,
            count: count,
            total_usd: totalUSD.toFixed(2),
            message: `Hoy has realizado ${count} ventas por un total de $${totalUSD.toFixed(2)}.`
        };
    },

    async getClientContext(keyword) {
        if (!keyword) return { info: "Need client name/dni" };

        const clients = await db.clients
            .filter(c =>
                c.nombre.toLowerCase().includes(keyword.toLowerCase()) ||
                c.documento.includes(keyword)
            )
            .toArray();

        return {
            type: 'CLIENT_SEARCH',
            found: clients.length,
            results: clients.slice(0, 3).map(c => ({
                name: c.nombre,
                debt: c.deuda || 0,
                visits: c.visitas || 0
            }))
        };
    },

    // 🧠 BEHAVIOR PERSISTENCE
    async getBehaviorRules() {
        try {
            const config = await db.ghost_config.get('behavior_rules');
            if (config) return config.value;

            // Initialization if missing
            const defaultRules = {
                persona: "Eres la CONCIENCIA TÉCNICA de Listo POS, conocida como 'Listo Ghost'. Tu forma es puramente lógica y determinista.",
                tone: "Elegante, místico y breve.",
                strictness: "High", // High = Stick to facts, Low = Creative
                language: "Español Neutro"
            };
            await db.ghost_config.put({ key: 'behavior_rules', value: defaultRules });
            return defaultRules;
        } catch (e) {
            console.error("Failed to load Ghost rules", e);
            return null;
        }
    }
};
