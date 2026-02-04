/**
 * 🌐 OPENROUTER SERVICE
 * Cloud AI provider con modelos Llama-3 y Gemma-2 gratuitos.
 * Documentación: https://openrouter.ai/docs
 */

const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Modelos disponibles (free tier verified 2026/02 by Audit Script)
// Prioridad: Llama-3.3 70B (Best) -> Trinity (Large) -> Gemma 3 -> ...
const FREE_MODELS_QUEUE = [
    'arcee-ai/trinity-large-preview:free',   // 🥇 User Priority (Trinity)
    'meta-llama/llama-3.3-70b-instruct:free', // 🥈 Backup (Llama 3.3)
    'google/gemma-3-12b-it:free',            // 🧠 Google Gemma 3 (Balanced)
    'qwen/qwen3-next-80b-a3b-instruct:free', // 💪 Qwen 3 (Powerful)
    'liquid/lfm-2.5-1.2b-instruct:free',     // ⚡ Speed Demon (Fallthrough)
    'tngtech/deepseek-r1t2-chimera:free'     // 🧙‍♂️ DeepSeek R1 (Reasoning)
];

export class OpenRouterService {
    constructor() {
        this.apiKey = OPENROUTER_API_KEY;
        this.currentModelIndex = 0;
    }

    get currentModel() {
        return FREE_MODELS_QUEUE[this.currentModelIndex];
    }

    /**
     * Genera una respuesta intentando varios modelos si hay error 429/503
     */
    async generateResponse(messages, systemPrompt, retryCount = 0) {
        if (!this.apiKey) {
            throw new Error('OpenRouter API key not configured');
        }

        // Avoid infinite loops
        if (retryCount >= FREE_MODELS_QUEUE.length) {
            this.currentModelIndex = 0; // Reset for next time
            throw new Error('All OpenRouter free models are busy/failed.');
        }

        const targetModel = FREE_MODELS_QUEUE[this.currentModelIndex];

        const payload = {
            model: targetModel,
            messages: [
                { role: 'system', content: systemPrompt },
                ...messages
            ],
            temperature: 0.7,
            max_tokens: 512
        };

        try {
            const response = await fetch(OPENROUTER_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'http://localhost:5173',
                    'X-Title': 'Listo POS'
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                // If 429 (Rate Limit), 503 (Overload) or 404 (Not Found), try next model
                if (response.status === 429 || response.status === 503 || response.status === 404) {
                    console.warn(`⚠️ Model ${targetModel} issue (${response.status}). Waiting 1s then trying next...`);
                    await new Promise(r => setTimeout(r, 1000)); // Cool-down
                    this.currentModelIndex = (this.currentModelIndex + 1) % FREE_MODELS_QUEUE.length;
                    return this.generateResponse(messages, systemPrompt, retryCount + 1);
                }
                throw new Error(`OpenRouter HTTP ${response.status}`);
            }

            const data = await response.json();
            const rawText = data.choices[0]?.message?.content || '';

            // DEBUG: OpenRouter Raw
            console.log(`%c🌐 OPENROUTER RAW:`, 'background: #8e44ad; color: #fff; padding: 2px;', rawText);

            return {
                text: rawText.trim(),
                model: targetModel,
                provider: 'OPENROUTER'
            };

        } catch (error) {
            // If it's a fetch network error, also try next model
            if (retryCount < FREE_MODELS_QUEUE.length - 1) {
                console.warn(`❌ Net Error on ${targetModel}: ${error.message}. Switching...`);
                this.currentModelIndex = (this.currentModelIndex + 1) % FREE_MODELS_QUEUE.length;
                return this.generateResponse(messages, systemPrompt, retryCount + 1);
            }
            console.error('❌ OpenRouter Exhausted:', error.message);
            throw error;
        }
    }

    /**
     * Verifica si OpenRouter está disponible (prueba la cola de modelos)
     */
    async checkAvailability() {
        if (!this.apiKey) return false;

        const checkModel = async (model) => {
            try {
                const response = await fetch(OPENROUTER_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'http://localhost:5173',
                        'X-Title': 'Listo POS'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: 'ping' }],
                        max_tokens: 5
                    })
                });
                return response.status === 200; // Only strict success counting
            } catch {
                return false;
            }
        };

        // Try models in order until one works
        for (let i = 0; i < FREE_MODELS_QUEUE.length; i++) {
            const model = FREE_MODELS_QUEUE[i];
            if (await checkModel(model)) {
                this.currentModelIndex = i;
                console.log(`✅ OpenRouter Available via: ${model}`);
                return true;
            }
            console.warn(`🔸 Model check failed for: ${model}`);
        }

        console.error(`❌ OpenRouter Unavailable (All free models query failed)`);
        return false;
    }
}

export const openRouterService = new OpenRouterService();
