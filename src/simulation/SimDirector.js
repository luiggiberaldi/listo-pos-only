// ============================================================
// 🎬 SIM DIRECTOR — Cerebro AI (Groq) de la Simulación
// ============================================================
// 1 call Groq por día simulado → genera perfil JSON del día.
// 1 call cada 7 días → aprendizaje con resumen semanal.
// Fallback 100% local si Groq falla.

import { groqService } from '../services/ghost/groqService';
import { PERFILES_DIA, randomInt, randomFloat, pickRandom, MOTIVOS_GASTO } from './SimCatalog';

// Rate limiter: mínimo 3 segundos entre calls
let _lastCallTime = 0;
const MIN_CALL_INTERVAL = 3000;

const MAX_RETRIES = 1; // Solo 1 retry, luego fallback local

/**
 * Genera el perfil de un día simulado usando Groq.
 * Si falla, retorna perfil por defecto basado en tipo de día.
 *
 * @param {Object} params
 * @param {string} params.fecha - ISO date string
 * @param {string} params.diaSemana - lunes, martes...
 * @param {string} params.tipoDia - NORMAL, LENTO, PICO, etc.
 * @param {number} params.ventasSemana - Total ventas $ de la semana anterior
 * @param {number} params.tasaActual - Tasa USD/Bs actual
 * @returns {Object} Perfil del día
 */
export async function generarPerfilDia({ fecha, diaSemana, tipoDia, ventasSemana = 0, tasaActual = 90 }) {
    // Rate limiting
    const now = Date.now();
    if (now - _lastCallTime < MIN_CALL_INTERVAL) {
        const wait = MIN_CALL_INTERVAL - (now - _lastCallTime);
        await new Promise(r => setTimeout(r, wait));
    }

    const systemPrompt = [
        'Eres director de simulación de minimarket en Venezuela.',
        'Responde SOLO un JSON válido, sin texto extra ni markdown.',
        'El JSON debe tener esta estructura exacta:',
        '{"tipo":"NORMAL","totalVentas":80,"ticketPromedio":5.5,',
        '"eventos":["frase corta del evento"],"tasaCambio":92.5,',
        '"gastos":[{"motivo":"texto","monto":15}],',
        '"consumos":[{"producto":"nombre","qty":1,"motivo":"uso"}],',
        '"humor":"frase de 1 línea describiendo el ambiente del día"}'
    ].join(' ');

    const userMsg = [
        `Día: ${diaSemana} ${fecha}. Tipo: ${tipoDia}.`,
        ventasSemana > 0 ? `Ventas semana anterior: $${ventasSemana}.` : '',
        `Tasa actual: ${tasaActual} Bs/$.`,
        'Genera perfil realista para este día de minimarket venezolano.',
        `Ventas entre ${tipoDia === 'LENTO' ? '25-50' : tipoDia === 'PICO' || tipoDia === 'QUINCENA' ? '90-140' : '55-90'}.`,
        'Incluye 1-3 gastos y 0-2 consumos internos. Eventos max 2.'
    ].filter(Boolean).join(' ');

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            _lastCallTime = Date.now();

            const response = await groqService.generateResponse(
                [{ role: 'user', content: userMsg }],
                systemPrompt
            );

            const parsed = parseGroqResponse(response.text);
            if (parsed) {
                return { ...parsed, source: 'GROQ', model: response.model };
            }
        } catch (err) {
            console.warn(`⚠️ SimDirector: Groq attempt ${attempt + 1} failed:`, err.message);
        }
    }

    // Fallback local
    return generarPerfilLocal(tipoDia, tasaActual);
}

/**
 * Genera resumen semanal y pide ajustes a Groq (call de aprendizaje).
 * Se ejecuta cada 7 días simulados.
 */
export async function generarAprendizajeSemanal(metricas) {
    const now = Date.now();
    if (now - _lastCallTime < 5000) { // 5s cooldown para calls de aprendizaje
        await new Promise(r => setTimeout(r, 5000));
    }

    const systemPrompt = [
        'Eres analista de datos de un minimarket venezolano.',
        'Analiza las métricas semanales y sugiere ajustes.',
        'Responde SOLO JSON:',
        '{"analisis":"1 párrafo","ajustes":{"factorVentas":1.0,',
        '"ticketSugerido":5.0,"categoriasTop":["Bebidas","Abarrotes"],',
        '"riesgo":"bajo|medio|alto"},"recomendacion":"1 frase"}'
    ].join(' ');

    const userMsg = [
        `Semana del ${metricas.fechaInicio} al ${metricas.fechaFin}.`,
        `Ventas totales: $${metricas.ventasTotales.toFixed(2)}.`,
        `Transacciones: ${metricas.totalTransacciones}.`,
        `Ticket promedio: $${metricas.ticketPromedio.toFixed(2)}.`,
        `Gastos totales: $${metricas.gastosTotales.toFixed(2)}.`,
        `Utilidad bruta: $${metricas.utilidadBruta.toFixed(2)}.`,
        `Categorías más vendidas: ${metricas.categoriasTop.join(', ')}.`,
        `Productos agotados: ${metricas.productosAgotados}.`,
        'Sugiere ajustes para la próxima semana.'
    ].join(' ');

    try {
        _lastCallTime = Date.now();
        const response = await groqService.generateResponse(
            [{ role: 'user', content: userMsg }],
            systemPrompt
        );

        const parsed = parseGroqResponse(response.text);
        if (parsed) {
            return { ...parsed, source: 'GROQ' };
        }
    } catch (err) {
        console.warn('⚠️ SimDirector: Weekly learning failed:', err.message);
    }

    // Fallback
    return {
        analisis: 'Semana con rendimiento estándar para minimarket urbano.',
        ajustes: {
            factorVentas: 1.0,
            ticketSugerido: 5.0,
            categoriasTop: ['Bebidas', 'Abarrotes'],
            riesgo: 'bajo'
        },
        recomendacion: 'Mantener inventario de productos estrella.',
        source: 'LOCAL'
    };
}

// ── Internals ──────────────────────────────────────

/**
 * Auditoría AI al final de cada día simulado.
 * Analiza métricas del día y detecta anomalías, errores o patrones preocupantes.
 * 1 call Groq por día. Fallback local si falla.
 *
 * @param {Object} resumenDia - Métricas del día completado
 * @returns {Object} Auditoría con veredicto, alertas y sugerencias
 */
export async function generarAuditoriaDiaria(resumenDia) {
    const now = Date.now();
    if (now - _lastCallTime < MIN_CALL_INTERVAL) {
        await new Promise(r => setTimeout(r, MIN_CALL_INTERVAL - (now - _lastCallTime)));
    }

    const systemPrompt = [
        'Eres auditor financiero de un minimarket venezolano.',
        'Analiza el resumen del día y detecta anomalías, errores o riesgos.',
        'REGLAS CRÍTICAS:',
        '1. El MARGEN REAL ya viene calculado. Cópialo tal cual en margenReal.',
        '2. Si margenReal < 40%, NO digas que está "por encima de 40%".',
        '3. Arrays alertas/anomalias deben tener frases REALES o estar vacíos []. NO copies placeholders.',
        '4. Si no hay anomalías, pon anomalias:[].',
        '',
        'Formato JSON (sin markdown):',
        '{"veredicto":"OK|ALERTA|CRITICO",',
        '"alertas":["alerta real detectada"],',
        '"anomalias":[],',
        '"margenReal":<copia el MARGEN REAL del input>,',
        '"riesgoOperativo":"bajo|medio|alto",',
        '"sugerencia":"1 frase de acción"}',
        '',
        'EJEMPLO con margen 32%:',
        '{"veredicto":"OK","alertas":[],"anomalias":[],',
        '"margenReal":32.0,"riesgoOperativo":"bajo",',
        '"sugerencia":"Día operativo normal, mantener inventario."}'
    ].join(' ');

    const userMsg = [
        `Día: ${resumenDia.fecha} (${resumenDia.tipoDia}).`,
        `Ventas brutas: $${resumenDia.ventasBrutas}. Ventas netas: $${resumenDia.ventasNetas}.`,
        `Costo mercancía vendida: $${resumenDia.totalCosto || 0}. MARGEN REAL: ${resumenDia.margenReal || 0}%.`,
        `Gastos operativos: $${resumenDia.gastos}. Utilidad: $${resumenDia.utilidad}.`,
        `Transacciones: ${resumenDia.transacciones}. Anulaciones: ${resumenDia.anulaciones}.`,
        `Créditos fiados: $${resumenDia.creditos}. Abonos cobrados: $${resumenDia.abonos}.`,
        `Errores del día: ${resumenDia.errores}.`,
        `Tasa: ${resumenDia.tasaCambio} Bs/$.`,
        resumenDia.nominaPagada > 0 ? `Nómina pagada: $${resumenDia.nominaPagada}.` : '',
        `Fondo caja inicial: $${resumenDia.fondoCaja || 100}.`,
        'Detecta: márgenes anormales (<5% o >40%), ratio anulaciones >5%, errores >2,',
        'créditos excesivos (>20% ventas), descuadre caja, gastos desproporcionados.',
        `Recuerda: MARGEN REAL = ${resumenDia.margenReal || 0}%. Cópialo exacto en margenReal.`
    ].filter(Boolean).join(' ');

    try {
        _lastCallTime = Date.now();
        const response = await groqService.generateResponse(
            [{ role: 'user', content: userMsg }],
            systemPrompt
        );
        const parsed = parseGroqResponse(response.text);
        if (parsed) {
            // Post-filtro: limpiar placeholders y valores basura de Groq
            if (Array.isArray(parsed.anomalias)) {
                parsed.anomalias = parsed.anomalias.filter(a =>
                    a && typeof a === 'string' &&
                    !a.toLowerCase().includes('descripción de anomalía') &&
                    !a.toLowerCase().includes('si existe') &&
                    a.toLowerCase() !== 'none' &&
                    a.trim().length > 3
                );
            } else {
                parsed.anomalias = [];
            }
            if (Array.isArray(parsed.alertas)) {
                parsed.alertas = parsed.alertas.filter(a =>
                    a && typeof a === 'string' &&
                    !a.toLowerCase().includes('frase corta') &&
                    a.trim().length > 3
                );
            }
            // Forzar margenReal del input si Groq lo inventó
            if (resumenDia.margenReal != null) {
                parsed.margenReal = resumenDia.margenReal;
            }
            return { ...parsed, source: 'GROQ' };
        }
    } catch (err) {
        console.warn('⚠️ SimDirector: Daily audit failed:', err.message);
    }

    // ── Fallback local: auditoría heurística ──
    return generarAuditoriaLocal(resumenDia);
}

function generarAuditoriaLocal(r) {
    const alertas = [];
    const anomalias = [];
    let riesgo = 'bajo';

    // Margen
    const margen = r.ventasNetas > 0 ? ((r.utilidad / r.ventasNetas) * 100) : 0;
    if (margen < 5) {
        alertas.push(`Margen peligrosamente bajo: ${margen.toFixed(1)}%`);
        riesgo = 'alto';
    } else if (margen > 40) {
        anomalias.push(`Margen inusualmente alto: ${margen.toFixed(1)}% — verificar precios`);
    }

    // Anulaciones
    const ratioAnulacion = r.transacciones > 0 ? (r.anulaciones / r.transacciones) * 100 : 0;
    if (ratioAnulacion > 5) {
        alertas.push(`Tasa de anulación alta: ${ratioAnulacion.toFixed(1)}% (${r.anulaciones} de ${r.transacciones})`);
        riesgo = riesgo === 'alto' ? 'alto' : 'medio';
    }

    // Errores
    if (r.errores > 2) {
        alertas.push(`${r.errores} errores operativos detectados — revisar procesos`);
        riesgo = 'medio';
    }

    // Créditos excesivos
    if (r.ventasBrutas > 0 && r.creditos > 0) {
        const creditoRatio = (r.creditos / r.transacciones) * 100;
        if (creditoRatio > 20) {
            alertas.push(`${creditoRatio.toFixed(0)}% de ventas a crédito — riesgo de liquidez`);
        }
    }

    // Gastos desproporcionados
    if (r.ventasNetas > 0 && r.gastos > r.ventasNetas * 0.5) {
        alertas.push(`Gastos representan ${((r.gastos / r.ventasNetas) * 100).toFixed(0)}% de ventas — revisar`);
        riesgo = 'alto';
    }

    // Utilidad negativa
    if (r.utilidad < 0) {
        anomalias.push(`Día con pérdida neta: -$${Math.abs(r.utilidad).toFixed(2)}`);
        riesgo = 'alto';
    }

    const veredicto = alertas.length === 0 && anomalias.length === 0 ? 'OK'
        : riesgo === 'alto' ? 'CRITICO' : 'ALERTA';

    const sugerencia = veredicto === 'OK'
        ? 'Día operativo normal, sin acciones requeridas.'
        : veredicto === 'CRITICO'
            ? 'Revisar urgente: márgenes, gastos y flujo de caja.'
            : 'Monitorear métricas señaladas antes del cierre semanal.';

    return {
        veredicto,
        alertas,
        anomalias,
        margenReal: +margen.toFixed(1),
        riesgoOperativo: riesgo,
        sugerencia,
        source: 'LOCAL'
    };
}

function parseGroqResponse(text) {
    try {
        // Limpiar posible markdown
        let clean = text.trim();
        if (clean.startsWith('```')) {
            clean = clean.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '');
        }
        // Buscar primer { y último }
        const start = clean.indexOf('{');
        const end = clean.lastIndexOf('}');
        if (start === -1 || end === -1) return null;
        clean = clean.substring(start, end + 1);
        return JSON.parse(clean);
    } catch {
        return null;
    }
}

function generarPerfilLocal(tipoDia, tasaActual) {
    const base = PERFILES_DIA[tipoDia] || PERFILES_DIA.NORMAL;
    const totalVentas = Math.round(70 * base.factorVentas + randomInt(-10, 10));

    const gastos = [];
    const numGastos = base.gastosBase + randomInt(0, 1);
    for (let i = 0; i < numGastos; i++) {
        const g = pickRandom(MOTIVOS_GASTO);
        gastos.push({ motivo: g.motivo, monto: randomFloat(g.rango[0], g.rango[1]) });
    }

    const consumos = [];
    if (Math.random() < 0.5) {
        consumos.push({
            producto: pickRandom(['Café Molido 250g', 'Agua 500ml', 'Galletas María']),
            qty: 1,
            motivo: 'Consumo empleados'
        });
    }

    return {
        tipo: tipoDia,
        totalVentas,
        ticketPromedio: base.ticketBase + randomFloat(-0.5, 0.5),
        eventos: [],
        tasaCambio: tasaActual + randomFloat(-1.5, 1.5),
        gastos,
        consumos,
        humor: `Día ${tipoDia.toLowerCase()} en el minimarket.`,
        source: 'LOCAL'
    };
}
