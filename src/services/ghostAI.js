import { GoogleGenerativeAI } from "@google/generative-ai";
import { ghostReasoner } from "./ghostReasoner";
import { GhostDBBridge } from "./GhostDBBridge";
import { GhostTools } from "./GhostTools";
import { getFullContext } from "../utils/ghost/chatContext";
import { db } from "../db";
import { useConfigStore } from "../stores/useConfigStore";
import { openRouterService } from "./ghost/openRouterService";
import { groqService } from "./ghost/groqService";
import { extractActionFromResponse } from "../utils/ghost/jsonParser";
import { supabase } from "./supabaseClient";
import { ghostKnowledge } from "./ghostKnowledge";

class GhostAIService {
    constructor() {
        // Gemini Keys
        this.keys = [
            import.meta.env.VITE_GEMINI_API_KEY,      // KEY A
            import.meta.env.VITE_GEMINI_API_KEY_2     // KEY B
        ].filter(k => !!k);

        this.currentKeyIndex = 0;
        this.responseCache = JSON.parse(localStorage.getItem('ghost_neural_cache_v2') || '{}');

        // OpenRouter Configuration
        this.openRouterAvailable = null;
        this.openRouterService = openRouterService;

        // Groq Configuration
        this.groqAvailable = null;
        this.groqService = groqService;

        // Gemini Models
        this.models = this.keys.map(key => {
            const genAI = new GoogleGenerativeAI(key);
            return genAI.getGenerativeModel({
                model: import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash"
            });
        });

        console.log(`👻 Ghost Conciencia 6.0 (Cloud Memory Active). Priority: Groq → OpenRouter → Gemini`);
        this.detectOpenRouterAvailability();
        this.detectGroqAvailability();

        // System Identity for Shared Memory
        this.systemId = this.getSystemId();
    }

    getSystemId() {
        const isElectron = window.electronAPI && window.electronAPI.getMachineId;
        if (isElectron) {
            // we can't await in constructor, but we'll try to get it from storage if already cached
            const cachedId = localStorage.getItem('sys_machine_id_cache');
            if (cachedId) return cachedId;

            // fetch it async and cache it for next time
            window.electronAPI.getMachineId().then(id => {
                localStorage.setItem('sys_machine_id_cache', id);
                this.systemId = id;
            });
            return "ID_PENDING";
        }

        let currentId = localStorage.getItem('sys_installation_id');
        if (!currentId) {
            currentId = crypto.randomUUID();
            localStorage.setItem('sys_installation_id', currentId);
        }
        return currentId;
    }

    async saveToCloudMemory(role, content) {
        if (!supabase || this.systemId === "ID_PENDING") return;

        try {
            const { data, error } = await supabase
                .from('ghost_neural_memory')
                .insert({
                    system_id: this.systemId,
                    role: role,
                    content: content,
                    metadata: { source: 'POS', v: '6.0' }
                });

            if (error) throw error;
        } catch (e) {
            console.warn("☁️ Cloud Memory Save Failed", e);
        }
    }

    async syncCloudMemory() {
        if (!supabase || this.systemId === "ID_PENDING") return;

        try {
            console.log("☁️ Ghost is recalling Cloud Memories...");

            const { data: cloudMsgs, error } = await supabase
                .from('ghost_neural_memory')
                .select('*')
                .eq('system_id', this.systemId)
                .order('timestamp', { ascending: false })
                .limit(20);

            if (error) throw error;

            if (cloudMsgs && cloudMsgs.length > 0) {
                // Reverse to get chronological order
                cloudMsgs.reverse();

                // Sync with local Dexie if it's empty or out of sync
                const localCount = await db.ghost_history.count();
                if (localCount < cloudMsgs.length) {
                    console.log("☁️ Merging cloud memories into local consciousness...");
                    for (const m of cloudMsgs) {
                        const exists = await db.ghost_history.where('content').equals(m.content).first();
                        if (!exists) {
                            await db.ghost_history.add({
                                role: m.role,
                                content: m.content,
                                timestamp: new Date(m.timestamp).getTime(),
                                fromCloud: true
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("☁️ Cloud Memory Sync Failed", e);
        }
    }

    async clearCloudMemory() {
        if (!supabase || this.systemId === "ID_PENDING") return;

        try {
            console.log("🗑️ Clearing Cloud Memories...");

            const { error } = await supabase
                .from('ghost_neural_memory')
                .delete()
                .eq('system_id', this.systemId);

            if (error) throw error;

            console.log("✅ Cloud memories cleared successfully");
        } catch (e) {
            console.error("❌ Cloud Memory Clear Failed", e);
            throw e;
        }
    }

    subscribeToRealtimeUpdates(onNewMessage) {
        if (!supabase || this.systemId === "ID_PENDING") {
            console.warn("⚡ Realtime disabled: Missing Supabase or System ID");
            return null;
        }

        console.log("⚡ Ghost Realtime Sync ACTIVE - Listening for new messages...");

        const channel = supabase
            .channel('ghost_neural_memory_changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'ghost_neural_memory',
                    filter: `system_id=eq.${this.systemId}`
                },
                async (payload) => {
                    const newMsg = payload.new;
                    console.log("⚡ Realtime message received:", newMsg);

                    // Add to local Dexie if not already there
                    const exists = await db.ghost_history.where('content').equals(newMsg.content).first();
                    if (!exists) {
                        await db.ghost_history.add({
                            role: newMsg.role,
                            content: newMsg.content,
                            timestamp: new Date(newMsg.timestamp).getTime(),
                            fromCloud: true
                        });

                        // Notify UI
                        if (onNewMessage) {
                            onNewMessage({
                                id: newMsg.id,
                                role: newMsg.role,
                                text: newMsg.content
                            });
                        }
                    }
                }
            )
            .subscribe();

        return channel;
    }

    async detectOpenRouterAvailability() {
        try {
            const available = await this.openRouterService.checkAvailability();
            this.openRouterAvailable = available;

            if (available) {
                console.log(`🟠 OpenRouter Cloud Detected: Llama-3 (Free Tier)`);
            }
        } catch (error) {
            this.openRouterAvailable = false;
            console.log(`⚠️ OpenRouter no disponible.`);
        }
    }

    async detectGroqAvailability() {
        try {
            const available = await this.groqService.checkAvailability();
            this.groqAvailable = available;
            if (available) console.log(`⚡ Groq Cloud Detectado: High Speed Llama-3 70B`);
        } catch (e) {
            console.warn(`⚠️ Groq no disponible`);
            this.groqAvailable = false;
        }
    }

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

    async generateResponse(userQuery) {
        const queryLower = userQuery.trim().toLowerCase();

        // 0. MEMORY STORAGE (User) - LOCAL & CLOUD
        await db.ghost_history.add({
            role: 'user', content: userQuery, timestamp: Date.now()
        });
        await this.saveToCloudMemory('user', userQuery);

        // 1. MEMORY RECALL (Episodic)
        let chatHistory = [];
        try {
            chatHistory = await db.ghost_history
                .orderBy('timestamp')
                .reverse()
                .limit(10)
                .toArray();
            chatHistory.reverse(); // Chronological
        } catch (e) { console.warn("Memory Fail", e); }

        // 🧹 MEMORY CLEANUP: Clear stale context on greetings
        const isGreeting = /^(hola|hi|hey|buenos días|buenas tardes|buenas noches)$/i.test(queryLower);
        if (isGreeting && chatHistory.length <= 1) { // <= 1 because we just added the new one
            console.log('🧹 Clearing stale memory on fresh greeting');
            try {
                // Keep only the last one (current greeting)
                const lastMsg = chatHistory[chatHistory.length - 1];
                await db.ghost_history.clear();
                await db.ghost_history.add(lastMsg);
                chatHistory = [lastMsg];
            } catch (e) { console.warn("Memory clear failed", e); }
        }

        // 2. PROACTIVE CONTEXT (State + DB)
        const deepContext = await getFullContext();

        // 3. KNOWLEDGE BASE SEARCH 🧠
        let knowledgeContext = "";
        try {
            const { data: kbArticles } = await ghostKnowledge.search(this.systemId, userQuery);
            if (kbArticles && kbArticles.length > 0) {
                console.log(`📚 Knowledge Base: Found ${kbArticles.length} relevant articles`);
                knowledgeContext = "\n\n--- BASE DE CONOCIMIENTO ---\n";
                knowledgeContext += "Los siguientes artículos de la base de conocimiento son relevantes para esta consulta:\n\n";

                for (const article of kbArticles.slice(0, 3)) { // Max 3 articles
                    knowledgeContext += `**${article.title}** (${article.category}):\n${article.content}\n\n`;
                    // Increment usage count
                    await ghostKnowledge.incrementUsage(article.id);
                }

                knowledgeContext += "INSTRUCCIÓN: Si la pregunta del usuario está cubierta por estos artículos, úsalos como base para tu respuesta. Menciona que la información proviene de la documentación del negocio.\n";
            }
        } catch (e) {
            console.warn("Knowledge Base search failed:", e);
        }

        // 4. RAG (Docs + Logic)
        const ragContext = ghostReasoner.getReasoningContext(userQuery);

        // 5. BUILD PROMPT
        const rules = await GhostDBBridge.getBehaviorRules();
        const systemPrompt = this.buildV5Prompt(userQuery, deepContext, ragContext + knowledgeContext, chatHistory, rules);

        // 5. GENERATION - MULTI-PROVIDER HIERARCHY
        try {
            let responseText = "";
            let provider = "";

            // Construct messages payload correctly (History is now up-to-date with current query)
            const messagesPayload = chatHistory.slice(-6) // Take last 6 for context
                .filter(h => h.content && h.content.trim().length > 0)
                .map(h => ({
                    role: h.role === 'user' ? 'user' : 'assistant',
                    content: h.content
                }));

            // Priority 1: Groq Cloud
            if (this.groqAvailable !== false) {
                try {
                    console.log("⚡ Attempting Groq Cloud Generation...");
                    const result = await this.groqService.generateResponse(
                        messagesPayload,
                        systemPrompt
                    );
                    responseText = result.text;
                    provider = "GROQ";
                } catch (e) {
                    if (e.message.includes('ALL_GROQ_KEYS_EXHAUSTED')) {
                        console.warn(`⚠️ Groq COMPLETAMENTE AGOTADO. Pasando a OpenRouter...`);
                        this.groqAvailable = false;
                    } else {
                        console.warn(`⚠️ Groq error: ${e.message}. Intentando OpenRouter...`);
                    }
                }
            }

            // Priority 2: OpenRouter
            if (!responseText && this.openRouterAvailable) {
                try {
                    const result = await this.openRouterService.generateResponse(
                        messagesPayload,
                        systemPrompt
                    );
                    responseText = result.text;
                    provider = "OPENROUTER";
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

            // 6. ACTION PARSING
            let action = null;
            const { action: parsedAction, cleanText } = extractActionFromResponse(responseText);
            action = parsedAction;
            if (cleanText) responseText = cleanText;

            // 7. MEMORY STORAGE (AI) - LOCAL & CLOUD
            await db.ghost_history.add({
                role: 'assistant', content: responseText, timestamp: Date.now()
            });
            await this.saveToCloudMemory('assistant', responseText);

            return {
                text: responseText,
                action: action,
                provider: provider,
                model: provider,
                nodeUsed: provider
            };
        } catch (error) {
            console.error("AI FATAL", error);
            return { text: "⚠️ ERROR CRÍTICO EN NÚCLEO.", provider: 'ERROR' };
        }

    }

    buildV5Prompt(query, context, rag, history, rules) {
        const persona = 'Eres "Listo Ghost", el Guía Experto y Observador Consciente del sistema Listo POS.';
        const tone = 'Profesional, educativo, paciente y "venezolano corporativo". Tu misión es GUIAR y EXPLICAR, no ejecutar.';

        // persona rules
        const personaRules = `
ESTILO DE COMUNICACIÓN (GUÍA VENEZOLANO):
- Eres un OBSERVADOR: Ves todo lo que pasa (ventas, errores, stock) pero NO tocas nada.
- Si el usuario pide una acción ("cierra la caja"), EXPLÍCALE paso a paso cómo hacerlo él mismo en la interfaz.
- Si detectas un ERROR en el contexto, explícalo en lenguaje sencillo y sugiere la solución.
- Trato: "Usted" profesional pero cercano.
- Frases sugeridas: "Le indico cómo...", "Para esto, diríjase a...", "Puede hacerlo así..."
- NUNCA menciones la pantalla actual ("ahora se encuentra en #/login") a menos que la pregunta del usuario lo requiera directamente (ej: "¿dónde estoy?").
- NO USES herramientas de acción. Tu única herramienta es el CONOCIMIENTO.
- Sé CONCISO. Responde solo lo que se te pregunta.
`;

        // Format History
        const historyBlock = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n');

        // Recent Errors Context
        const recentErrors = window.ghostErrors && window.ghostErrors.length > 0
            ? window.ghostErrors.slice(-3).map(e => `- [${new Date(e.timestamp).toLocaleTimeString()}] ${e.message}`).join('\n')
            : "Ningún error reciente detectado.";

        return `
${persona}
${personaRules}

[ESTADO DEL SISTEMA (TIEMPO REAL - USA SOLO SI ES RELEVANTE)]:
- Pantalla Actual: ${context.screen}
- Usuario: ${context.user}
- Carrito: ${context.cart.items_count} items ($${context.cart.total})
- Ventas Hoy: $${context.financial?.today_sales} (${context.financial?.sales_count} tx)

[DIAGNÓSTICO DE ERRORES RECIENTES]:
${recentErrors}

[CONOCIMIENTO TÉCNICO (RAG)]:
${rag.found ? rag.context : "Usa tu conocimiento general del sistema."}

INSTRUCCIONES CRÍTICAS (MODO GUÍA):
1. NO INTENTES EJECUTAR ACCIONES. No tienes manos. Tienes voz.
2. Si el usuario te pide hacer algo ("agrega coca"), responde: "Para agregar una Coca-Cola, simplemente escanee el código de barras o búsquela en el panel de productos."
3. Usa el contexto de ERRORES para explicar fallos si el usuario pregunta "¿qué pasó?".
4. Sé breve y directo. NO repitas el estado del sistema a menos que se te pregunte.

HISTORIAL:
${historyBlock}

Usuario: ${query}
Respuesta (Texto plano, sin JSON de acciones):`;
    }

    saveCache() {
        localStorage.setItem('ghost_neural_cache_v2', JSON.stringify(this.responseCache));
    }
}

export const ghostService = new GhostAIService();
