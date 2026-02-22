// 👻 GHOST DIGEST SERVICE — V.1.0
// Compresses raw audit events into structured metrics,
// then feeds them to Groq for AI interpretation.

import ghostEventBus, { GHOST_CATEGORIES as C } from './ghostEventBus';
import { groqService } from './groqService';
import { db } from '../../db';

/**
 * Generate a full daily report for the given date.
 * @param {string} date - Date key like "2026-02-21" (defaults to today)
 * @returns {Promise<object>} Structured report with metrics + AI digest
 */
export async function generateDailyReport(date) {
    const dateKey = date || new Date().toISOString().slice(0, 10);

    // 0. Flush any pending bridge events before collecting
    try { (await import('./ghostAuditInterceptors')).bridgeGhostBuffer(); } catch { }

    // 1. Collect all events for the date
    const events = await ghostEventBus.getEventsForDate(dateKey);

    if (events.length === 0) {
        return {
            date: dateKey,
            status: 'empty',
            metrics: {},
            aiDigest: null,
            rawEventCount: 0,
            generatedAt: Date.now()
        };
    }

    // 2. Pre-compute quantitative metrics (no AI needed)
    const metrics = _computeMetrics(events);

    // 3. Generate AI digest via Groq
    let aiDigest = null;
    try {
        aiDigest = await _generateAIDigest(metrics, events, dateKey);
    } catch (e) {
        console.warn('👻 [Digest] Groq failed, report will be metrics-only:', e.message);
        aiDigest = {
            summary: 'Análisis IA no disponible (sin conexión o API saturada)',
            anomalies: [],
            recommendations: [],
            healthScore: null,
            error: e.message
        };
    }

    // 4. Get business name from config
    let businessName = 'POS Terminal';
    try {
        const config = await db.config.get('general');
        businessName = config?.nombreNegocio || config?.nombre || 'POS Terminal';
    } catch { /* use default */ }

    // 5. Compress events for storage — drop STATE noise, cap at 200
    const compressedEvents = events
        .filter(e => e.category !== 'STATE')
        .map(e => ({ t: e.timestamp, c: e.category, e: e.event, s: e.severity, d: e.data }))
        .slice(0, 200);

    return {
        date: dateKey,
        status: 'complete',
        businessName,
        metrics,
        aiDigest,
        rawEventCount: events.length,
        rawEvents: compressedEvents,
        generatedAt: Date.now()
    };
}

// ─── METRICS COMPUTATION (Pure JS, no AI) ───
function _computeMetrics(events) {
    const byCategory = {};
    const byEvent = {};
    const bySeverity = { INFO: 0, WARN: 0, CRITICAL: 0 };
    const hourDistribution = new Array(24).fill(0);

    events.forEach(e => {
        // Count by category
        byCategory[e.category] = (byCategory[e.category] || 0) + 1;
        // Count by event
        const key = `${e.category}.${e.event}`;
        byEvent[key] = (byEvent[key] || 0) + 1;
        // Count by severity
        bySeverity[e.severity] = (bySeverity[e.severity] || 0) + 1;
        // Hour distribution
        const hour = new Date(e.timestamp).getHours();
        hourDistribution[hour]++;
    });

    // Sale-specific metrics
    const saleEvents = events.filter(e => e.category === C.SALE && e.event === 'sale_completed');
    const salesMetrics = {
        totalSales: saleEvents.length,
        totalRevenue: saleEvents.reduce((sum, e) => sum + (e.data?.total || 0), 0),
        avgTicket: saleEvents.length > 0
            ? saleEvents.reduce((sum, e) => sum + (e.data?.total || 0), 0) / saleEvents.length
            : 0,
        totalItems: saleEvents.reduce((sum, e) => sum + (e.data?.items || 0), 0),
        paymentMethods: _countPaymentMethods(saleEvents),
        salesWithDebt: saleEvents.filter(e => e.data?.hasDebt).length
    };

    // Error metrics
    const errorEvents = events.filter(e => e.category === C.ERROR);
    const errorMetrics = {
        totalErrors: errorEvents.length,
        criticalErrors: errorEvents.filter(e => e.severity === 'CRITICAL').length,
        errorTypes: [...new Set(errorEvents.map(e => e.event))]
    };

    // Inventory metrics
    const invEvents = events.filter(e => e.category === C.INVENTORY);
    const inventoryMetrics = {
        adjustments: invEvents.filter(e => e.event === 'stock_adjusted').length,
        productsAdded: invEvents.filter(e => e.event === 'products_added')
            .reduce((sum, e) => sum + (e.data?.count || 0), 0),
        productsRemoved: invEvents.filter(e => e.event === 'products_removed')
            .reduce((sum, e) => sum + (e.data?.count || 0), 0),
        bulkImports: invEvents.filter(e => e.event === 'bulk_import').length
    };

    // Peak hour
    const peakHour = hourDistribution.indexOf(Math.max(...hourDistribution));

    return {
        totalEvents: events.length,
        byCategory,
        byEvent,
        bySeverity,
        peakHour,
        hourDistribution,
        sales: salesMetrics,
        errors: errorMetrics,
        inventory: inventoryMetrics
    };
}

function _countPaymentMethods(saleEvents) {
    const counts = {};
    saleEvents.forEach(e => {
        (e.data?.paymentMethods || []).forEach(method => {
            counts[method] = (counts[method] || 0) + 1;
        });
    });
    return counts;
}

// ─── SHIFT REPORT (Per Corte Z) ───
/**
 * Analyze a specific closed shift and return AI suggestions.
 * Called directly from CierrePage after cerrarCaja().
 * Non-blocking: returns null on failure instead of throwing.
 *
 * @param {object} corteData - Data from the closed shift
 * @returns {Promise<object|null>} Structured suggestions or null on failure
 */
export async function generateShiftReport(corteData) {
    const {
        cajaId = 'Z-??????',
        totalVentas = 0,
        totalIngresos = 0,
        ventasCount = 0,
        anulaciones = 0,
        metodosPago = {},
        ticketPromedio = 0,
        creditoCount = 0,
        duracionMinutos = 0,
    } = corteData || {};

    const metodosStr = Object.entries(metodosPago)
        .map(([m, c]) => `${m}: ${c}`)
        .join(', ') || 'No registrado';

    const dataSummary = `
TURNO: ${cajaId}
VENTAS: ${ventasCount} transacciones, $${totalVentas.toFixed(2)} fiscal, $${totalIngresos.toFixed(2)} en caja
TICKET PROMEDIO: $${ticketPromedio.toFixed(2)}
MÉTODOS DE PAGO: ${metodosStr}
CRÉDITOS: ${creditoCount} ventas a crédito
ANULACIONES: ${anulaciones}
DURACIÓN: ${duracionMinutos} minutos
`.trim();

    const systemPrompt = `Eres un asesor operativo experto para un pequeño negocio venezolano (bodega/tienda) con sistema POS llamado LISTO.
Acabas de recibir el resumen de un turno de trabajo (Cierre Z) que acaba de cerrarse.

INSTRUCCIONES:
1. Da máximo 3 sugerencias concretas y accionables para mejorar el negocio.
2. Detecta si hay anomalías (muchas anulaciones, bajo ticket, sin diversidad de pagos, etc.)
3. Asigna un score de salud del turno de 0 a 100.
4. Sé breve y directo, el cajero está cerrando su turno.

TIPOS VÁLIDOS para cada sugerencia: "inventario", "credito", "finanzas", "operacion"
PRIORIDADES: "alta", "media", "baja"
ACCIONES VÁLIDAS: "inventario", "cuentas", "finanzas", null

RESPONDE SOLO JSON puro (sin markdown, sin backticks):
{
  "resumen": "Resumen en 1 oración del turno.",
  "score": 82,
  "sugerencias": [
    {
      "prioridad": "alta",
      "tipo": "inventario",
      "emoji": "📦",
      "titulo": "Título corto (máx 6 palabras)",
      "detalle": "Explicación breve en 1 oración.",
      "accion": "inventario"
    }
  ],
  "alerta": null
}`;

    const userMessage = `Datos del turno cerrado:\n${dataSummary}`;

    try {
        const result = await groqService.generateResponse(
            [{ role: 'user', content: userMessage }],
            systemPrompt
        );

        const text = result.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return { ...parsed, cajaId, generatedAt: Date.now() };
        }
        return null;
    } catch (e) {
        console.warn('👻 [ShiftReport] Groq no disponible:', e.message);
        return null;
    }
}

// ─── AI DIGEST (Groq) ───
async function _generateAIDigest(metrics, events, dateKey) {
    // Build a concise data summary for the prompt (minimize tokens)
    // Enrich with financial context
    const tasaEvent = events.find(e => e.data?.tasa);
    const voidCount = events.filter(e => e.event === 'sale_voided').length;
    const corteCount = events.filter(e => e.event === 'corte_z').length;
    const creditPct = metrics.sales.totalSales > 0
        ? (metrics.sales.salesWithDebt / metrics.sales.totalSales * 100).toFixed(0)
        : 0;

    const dataSummary = `
FECHA: ${dateKey}
VENTAS: ${metrics.sales.totalSales} ventas, $${metrics.sales.totalRevenue.toFixed(2)} ingresos, ticket promedio $${metrics.sales.avgTicket.toFixed(2)}
ITEMS VENDIDOS: ${metrics.sales.totalItems}
MÉTODOS DE PAGO: ${JSON.stringify(metrics.sales.paymentMethods)}
VENTAS A CRÉDITO: ${metrics.sales.salesWithDebt} (${creditPct}% del total)
ANULACIONES: ${voidCount}
CORTES Z: ${corteCount}
TASA CAMBIO: Bs ${tasaEvent?.data?.tasa || 'N/A'}/$
ERRORES: ${metrics.errors.totalErrors} total, ${metrics.errors.criticalErrors} críticos. Tipos: ${metrics.errors.errorTypes.join(', ') || 'ninguno'}
INVENTARIO: ${metrics.inventory.adjustments} ajustes, +${metrics.inventory.productsAdded} productos, -${metrics.inventory.productsRemoved} eliminados
HORA PICO: ${metrics.peakHour}:00
ALERTAS: ${metrics.bySeverity.WARN} warnings, ${metrics.bySeverity.CRITICAL} critical
EVENTOS TOTALES: ${metrics.totalEvents}
`;

    // Get the most important events (warnings + criticals)
    const importantEvents = events
        .filter(e => e.severity !== 'INFO')
        .slice(0, 20)
        .map(e => `[${e.severity}] ${e.category}.${e.event}: ${JSON.stringify(e.data || {})}`);

    const systemPrompt = `Eres un auditor operativo experto de un negocio venezolano (bodega/tienda). Analizas datos de un sistema POS llamado LISTO.

INSTRUCCIONES:
1. Genera un análisis del día basado en los datos proporcionados.
2. Detecta anomalías y patrones sospechosos.
3. Da recomendaciones accionables para mejorar ventas e inventario.
4. Asigna un score de salud operativa de 0 a 100.

RESPONDE ESTRICTAMENTE EN ESTE FORMATO JSON (sin markdown, sin backticks, solo JSON puro):
{
  "resumen": "Resumen ejecutivo de 2-3 líneas máximo del día.",
  "anomalias": ["Anomalía 1 detectada", "Anomalía 2 si hay"],
  "recomendaciones": ["Recomendación 1", "Recomendación 2"],
  "healthScore": 85,
  "alertaMaxima": "Solo si hay algo urgente, null si todo bien"
}`;

    const userMessage = `Datos operativos del día:\n${dataSummary}\n\nEventos importantes:\n${importantEvents.join('\n') || 'Ningún evento destacable'}`;

    const result = await groqService.generateResponse(
        [{ role: 'user', content: userMessage }],
        systemPrompt
    );

    // Parse JSON response
    try {
        const text = result.text.trim();
        // Try to extract JSON from response (handle potential markdown wrapping)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { resumen: text, anomalias: [], recomendaciones: [], healthScore: null };
    } catch {
        return { resumen: result.text, anomalias: [], recomendaciones: [], healthScore: null };
    }
}
