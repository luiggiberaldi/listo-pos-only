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

class GhostAIService {
    constructor() {
        // Gemini Keys
        this.keys = [
            import.meta.env.VITE_GEMINI_API_KEY,      // KEY A
            import.meta.env.VITE_GEMINI_API_KEY_2     // KEY B
        ].filter(k => !!k);

        this.currentKeyIndex = 0;

        // Providers
        this.openRouterAvailable = null;
        this.openRouterService = openRouterService;
        this.groqAvailable = null;
        this.groqService = groqService;

        // Gemini Models
        this.models = this.keys.map(key => {
            const genAI = new GoogleGenerativeAI(key);
            return genAI.getGenerativeModel({
                model: import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash"
            });
        });

        console.log(`👻 Ghost Conciencia 6.0 (Modular). Priority: Groq → OpenRouter → Gemini`);
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
    async syncCloudMemory() { return await ghostMemory.syncCloudMemory(); }
    async clearCloudMemory() { return await ghostMemory.clearMemory(); }
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

    // --- FAILOVER LOGIC ---
    async withFailover(operation) {
        let attempts = 0;
        while (attempts < this.keys.length) {
            try {
                return await operation(this.models[this.currentKeyIndex], this.currentKeyIndex);
            } catch (error) {
                const isThrottled = error.message.includes('429') || error.message.includes('quota');
                const isOverloaded = error.message.includes('503') || error.message.includes('overloaded');

                if (isThrottled || isOverloaded) {
                    console.warn(`🔥 Gemini Node ${this.currentKeyIndex} Busy. Switching...`);
                    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.keys.length;
                    attempts++;
                } else {
                    throw error;
                }
            }
        }
        throw new Error("ALL_NODES_EXHAUSTED_OR_ERROR");
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
        // If query is a greeting and history is just [user greeting], clear previous.
        // (Wait, getHistory returns chronological. If we just added 1, length is at least 1).
        // The idea is: if I say "Hola", I don't want context from 3 days ago.
        const isGreeting = /^(hola|hi|hey|buenos días|buenas tardes|buenas noches)$/i.test(queryLower);
        if (isGreeting && chatHistory.length > 2) {
            // Logic refinement: If greeting, usually reset. 
            // But let's rely on user explicit clear or just keep the simplified flow.
            // Simplification: We skip the auto-clear hack for now in favor of stability.
            // Or we can impl: await ghostMemory.clearMemory(); await ghostMemory.addMessage('user', userQuery);
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

            // Priority 3: Gemini Cloud
            if (!responseText) {
                try {
                    const response = await this.withFailover(async (model) => {
                        return await model.generateContent(systemPrompt);
                    });
                    responseText = response.response.text();
                    provider = "GEMINI";
                    modelName = "gemini-2.5-flash";
                } catch (e) {
                    console.warn(`⚠️ Gemini failed: ${e.message}`);
                }
            }

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
