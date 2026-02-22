import { GoogleGenerativeAI } from "@google/generative-ai";
import { ghostReasoner } from "./ghostReasoner";
import { GhostDBBridge } from "./GhostDBBridge";
import { openRouterService } from "./ghost/openRouterService";
import { groqService } from "./ghost/groqService";
import { extractActionFromResponse } from "../utils/ghost/jsonParser";
import { ghostKnowledge } from "./ghostKnowledge";
import { generateEmbedding } from "./ghost/geminiGhostService";

// 🧩 MODULOS NUEVOS
import { ghostMemory } from "./ghost/GhostMemory";
import { ghostContext } from "./ghost/GhostContext";
import { ghostPrompt } from "./ghost/GhostPrompt";

import { secretsService } from "./config/SecretsService";
import { GhostTools } from "./GhostTools";

class GhostAIService {
    constructor() {
        this.currentKeyIndex = 0;

        // Providers
        this.openRouterAvailable = null;
        this.openRouterService = openRouterService;
        this.groqAvailable = null;
        this.groqService = groqService;

        console.log(`👻 Ghost Conciencia 6.0 (Modular). Priority: Groq → OpenRouter → Local RAG`);
        // 🚀 PERF: Provider checks deferred to first generateResponse() call
        this._providersChecked = false;
    }

    /**
     * Lazy-check provider availability on first use.
     */
    async _ensureProviders() {
        if (this._providersChecked) return;
        this._providersChecked = true;
        await Promise.allSettled([
            this.detectOpenRouterAvailability(),
            this.detectGroqAvailability()
        ]);
    }

    // --- PROXY METHODS (Memory) ---
    async getHistory(limit) { return await ghostMemory.getHistory(limit); }
    async syncCloudMemory() { return await ghostMemory.syncCloudMemory(); }
    async clearMemory() { return await ghostMemory.clearMemory(); }
    subscribeToRealtimeUpdates(cb) { return ghostMemory.subscribeToRealtimeUpdates(cb); }

    // --- AVAILABILITY CHECKS ---
    async detectOpenRouterAvailability() {
        try {
            this.openRouterAvailable = await this.openRouterService.checkAvailability();
            if (this.openRouterAvailable) console.log(`🟠 OpenRouter Cloud Detected`);
        } catch (error) {
            this.openRouterAvailable = false;
        }
    }

    async detectGroqAvailability() {
        try {
            this.groqAvailable = await this.groqService.checkAvailability();
            if (this.groqAvailable) console.log(`⚡ Groq Cloud Detectado`);
        } catch (e) {
            this.groqAvailable = false;
        }
    }

    // --- INTENT DETECTION ---
    /**
     * Detects exchange rate change commands from natural language.
     * Returns params object for GhostTools.set_exchange_rate, or null if no match.
     *
     * Supported patterns:
     *   "cambia la tasa a 450"         → { rate: 450, source: 'manual' }
     *   "pon la tasa en 38.50"         → { rate: 38.50, source: 'manual' }
     *   "tasa a bcv"                   → { source: 'bcv', currency: 'USD', rounding: 'exacto' }
     *   "tasa a dolar bcv"             → { source: 'bcv', currency: 'USD', rounding: 'exacto' }
     *   "tasa a euro bcv"              → { source: 'bcv', currency: 'EUR', rounding: 'exacto' }
     *   "tasa bcv multiplo de 10"      → { source: 'bcv', currency: 'USD', rounding: 'multiplo10' }
     *   "tasa bcv redondeo de 5"       → { source: 'bcv', currency: 'USD', rounding: 'multiplo5' }
     *   "tasa euro multiplo 10"        → { source: 'bcv', currency: 'EUR', rounding: 'multiplo10' }
     */
    _detectRateIntent(query) {
        // Normalize: remove accents, lowercase, trim
        const q = query.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

        // Must mention "tasa" somewhere
        if (!q.includes('tasa')) return null;

        // Must have an action verb (avoid matching informational queries like "cual es la tasa")
        const hasActionVerb = /cambia|pon|actualiza|coloca|mete|sincroniza|sube|baja|ajusta|mueve|ponme|cambiar|actualizar|sincronizar/.test(q);
        if (!hasActionVerb) return null;

        // Pattern 1: Manual rate → action verb + "tasa" + a number
        // Matches: "cambia la tasa a 450", "pon tasa en 38.50", "actualiza la tasa a 430"
        const manualMatch = q.match(/tasa.*?(?:a|en|de)?\s*(\d+(?:[.,]\d+)?)\s*$/i)
            || q.match(/(\d+(?:[.,]\d+)?)\s*(?:la\s+)?tasa/i);
        if (manualMatch) {
            const raw = manualMatch[1].replace(',', '.');
            const rate = parseFloat(raw);
            // Only treat as manual if > 20 (avoid confusing with rounding modes like 5/10)
            if (rate > 20) {
                console.log(`⚡ Ghost Intent: Manual rate → ${rate}`);
                return { rate, source: 'manual' };
            }
        }

        // Pattern 2: BCV rate (auto-fetch)
        // If user says action verb + "tasa" without a number → fetch from BCV
        // "bcv" keyword is optional — it's the only online source anyway

        // Detect currency
        const isEuro = /euro|eur(?!\w)/i.test(q);
        const currency = isEuro ? 'EUR' : 'USD';

        // Detect rounding
        let rounding = 'exacto';
        if (/multiplo.*10|redondeo.*10|redonde.*10/i.test(q)) {
            rounding = 'multiplo10';
        } else if (/multiplo.*5|redondeo.*5|redonde.*5/i.test(q)) {
            rounding = 'multiplo5';
        } else if (/entero|redondeado/i.test(q) && !/multiplo|de\s+\d/i.test(q)) {
            rounding = 'entero';
        }

        console.log(`⚡ Ghost Intent: BCV rate → ${currency}, rounding: ${rounding}`);
        return { source: 'bcv', currency, rounding };
    }

    // --- MAIN GENERATION FLOW ---
    async generateResponse(userQuery) {
        await this._ensureProviders(); // 🚀 Lazy provider init
        const queryLower = userQuery.trim().toLowerCase();

        // 0. MEMORY STORAGE (User)
        await ghostMemory.addMessage('user', userQuery);

        // 1. MEMORY RECALL
        let chatHistory = await ghostMemory.getHistory(10);

        // 🧹 MEMORY CLEANUP: Clear stale context on greetings
        const isGreeting = /^(hola|hi|hey|buenos días|buenas tardes|buenas noches)$/i.test(queryLower);
        if (isGreeting && chatHistory.length > 2) {
            // User is starting fresh — clear old context to avoid confusion
            await ghostMemory.clearMemory();
            await ghostMemory.addMessage('user', userQuery);
            chatHistory = [{ role: 'user', content: userQuery }];
        }

        // ⚡ INTENT DETECTION: Exchange rate commands (deterministic, skip LLM)
        const rateIntent = this._detectRateIntent(queryLower);
        if (rateIntent) {
            const result = await GhostTools.set_exchange_rate(rateIntent);
            const responseText = result.message;
            await ghostMemory.addMessage('assistant', responseText);
            return { text: responseText, action: null, provider: 'TOOL_DIRECT', model: 'intent' };
        }

        // 2. CONTEXT (Deep + Reactive)
        const deepContext = await ghostContext.getSystemContext();
        const reactiveContext = await ghostContext.getReactiveContext(userQuery);

        // 3. KNOWLEDGE BASE SEARCH 🧠
        let knowledgeContext = "";
        try {
            // Accessing systemId from memory service? No, ghostKnowledge needs it.
            // ghostFactoryKnowledge is initialized with systemId. 
            // ghostKnowledge.search needs systemId. 
            // ghostMemory has systemId.
            const sysId = ghostMemory.systemId;
            const { data: kbArticles } = await ghostKnowledge.search(sysId, userQuery);
            if (kbArticles && kbArticles.length > 0) {
                console.log(`📚 Knowledge Base: Found ${kbArticles.length} relevant articles`);
                knowledgeContext = "\n\n--- BASE DE CONOCIMIENTO ---\n";
                knowledgeContext += "Los siguientes artículos de la base de conocimiento son relevantes para esta consulta:\n\n";

                for (const article of kbArticles.slice(0, 3)) { // Max 3 articles
                    knowledgeContext += `**${article.title}** (${article.category}):\n${article.content}\n\n`;
                    await ghostKnowledge.incrementUsage(article.id);
                }
                knowledgeContext += "INSTRUCCIÓN: Si la pregunta del usuario está cubierta por estos artículos, úsalos como base para tu respuesta.\n";
            }
        } catch (e) {
            console.warn("Knowledge Base search failed:", e);
        }

        // 4. RAG (Docs + Logic)
        const ragContext = ghostReasoner.getReasoningContext(userQuery);

        // 5. BUILD PROMPT 
        const behaviorRules = await GhostDBBridge.getBehaviorRules();
        // Combined context for prompt: RAG + KB + Reactive
        const finalRagString = (ragContext.found ? ragContext.context : "Usa tu conocimiento general.") + knowledgeContext + reactiveContext;

        const systemPrompt = ghostPrompt.buildPrompt(userQuery, deepContext, finalRagString, chatHistory, behaviorRules);

        // 6. GENERATION - MULTI-PROVIDER HIERARCHY
        try {
            let responseText = "";
            let provider = "";
            let modelName = "";

            // Construct messages payload
            const messagesPayload = chatHistory.slice(-6).map(h => ({
                role: h.role === 'user' ? 'user' : 'assistant',
                content: h.content
            }));

            // Priority 1: Groq Cloud
            if (this.groqAvailable !== false) {
                try {
                    console.log("⚡ Attempting Groq Cloud Generation...");
                    const result = await this.groqService.generateResponse(messagesPayload, systemPrompt);
                    responseText = result.text;
                    provider = "GROQ";
                    modelName = result.model || "llama3-70b";
                } catch (e) {
                    if (e.message.includes('ALL_GROQ_KEYS_EXHAUSTED')) {
                        console.warn(`⚠️ Groq EXHAUSTED. Switching...`);
                        this.groqAvailable = false;
                    } else {
                        console.warn(`⚠️ Groq error: ${e.message}`);
                    }
                }
            }

            // Priority 2: OpenRouter
            if (!responseText && this.openRouterAvailable) {
                try {
                    const result = await this.openRouterService.generateResponse(messagesPayload, systemPrompt);
                    responseText = result.text;
                    provider = "OPENROUTER";
                    modelName = result.model || "openrouter-free";
                } catch (e) {
                    console.warn(`⚠️ OpenRouter failed: ${e.message}`);
                    this.openRouterAvailable = false;
                }
            }

            // Priority 3: Gemini Cloud (DISABLED)
            // if (!responseText) { ... }

            // Priority 4: Local RAG Fallback
            if (!responseText) {
                if (ragContext.found) {
                    responseText = `{"action": "none"} [TEXT] ${ragContext.context}`;
                    provider = "LOCAL_RAG";
                } else {
                    return { text: "⚠️ CEREBRO DESCONECTADO. Verifica tu internet.", provider: 'ERROR' };
                }
            }

            // 7. ACTION PARSING
            let action = null;
            const { action: parsedAction, cleanText } = extractActionFromResponse(responseText);
            action = parsedAction;
            if (cleanText) responseText = cleanText;

            // 7.5 ACTION DISPATCH — Execute tool if LLM emitted an action
            if (action && action.action && action.action !== 'none') {
                try {
                    console.log(`⚡ Ghost Tool Call: ${action.action}`, action);
                    const toolResult = await GhostTools.dispatch(action.action, action);
                    if (toolResult) {
                        // Append tool result to response if there's meaningful text
                        const toolMsg = toolResult.message || '';
                        if (toolMsg) {
                            responseText = responseText
                                ? `${responseText}\n\n${toolMsg}`
                                : toolMsg;
                        }
                    }
                } catch (e) {
                    console.warn('⚠️ Ghost Tool dispatch failed:', e);
                }
            }

            // 8. MEMORY STORAGE (AI)
            await ghostMemory.addMessage('assistant', responseText);

            return {
                text: responseText,
                action: action,
                provider: provider,
                model: modelName,
                nodeUsed: provider
            };
        } catch (error) {
            console.error("AI FATAL", error);
            return { text: "⚠️ ERROR CRÍTICO EN NÚCLEO.", provider: 'ERROR' };
        }
    }

    async generateEmbedding(text) {
        return await generateEmbedding(text);
    }
}

export const ghostService = new GhostAIService();
