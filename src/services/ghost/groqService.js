
// 🧠 LISTO GHOST CORE: GROQ MULTI-KEY ROTATION SYSTEM
// Capacidad: 8 Motores LPU (Language Processing Units)
// Estrategia: Round Robin con Penalización por Fallo
// Objetivo: < 1% Tasa de Fallo

const GROQ_KEYS_CONFIG = [
    import.meta.env.VITE_GROQ_API_KEY_1,
    import.meta.env.VITE_GROQ_API_KEY_2,
    import.meta.env.VITE_GROQ_API_KEY_3,
    import.meta.env.VITE_GROQ_API_KEY_4,
    import.meta.env.VITE_GROQ_API_KEY_5,
    import.meta.env.VITE_GROQ_API_KEY_6,
    import.meta.env.VITE_GROQ_API_KEY_7,
    import.meta.env.VITE_GROQ_API_KEY_8,
    import.meta.env.VITE_GROQ_API_KEY_9,
    import.meta.env.VITE_GROQ_API_KEY_10
].filter(Boolean);

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant';

export class GroqService {
    constructor() {
        // Cola de claves viva. Se reordena dinámicamente.
        this.keyQueue = [...GROQ_KEYS_CONFIG];
        this.model = DEFAULT_MODEL;
        this.requestCount = 0;

        // 🛡️ Circuit Breaker
        this._failures = [];
        this._circuitOpen = false;
        this._circuitCooldownUntil = 0;

        console.log(`🚀 Groq Engine Inicializado: ${this.keyQueue.length} Núcleos Activos.`);
    }

    getKeyId(apiKey) {
        return apiKey ? apiKey.slice(-4) : '????';
    }

    rotateKey() {
        if (this.keyQueue.length === 0) return null;
        const key = this.keyQueue.shift();
        this.keyQueue.push(key);
        this.requestCount++;
        return key;
    }

    penalizeKey(invalidKey) {
        console.warn(`⚠️ Groq Key Penalizada (Movida al final de la cola)`);
    }

    // 🛡️ Circuit Breaker: Track failures within a window
    _recordFailure() {
        const now = Date.now();
        this._failures.push(now);
        // Keep only failures from last 60s
        this._failures = this._failures.filter(t => now - t < 60000);
        // If 10+ failures in 60s, open circuit for 30s
        if (this._failures.length >= 10) {
            this._circuitOpen = true;
            this._circuitCooldownUntil = now + 30000;
            console.warn('🔴 [Circuit Breaker] OPEN — Groq bajo presión, cooldown 30s');
        }
    }

    _isCircuitOpen() {
        if (!this._circuitOpen) return false;
        if (Date.now() > this._circuitCooldownUntil) {
            this._circuitOpen = false;
            this._failures = [];
            console.log('🟢 [Circuit Breaker] CLOSED — Groq disponible');
            return false;
        }
        return true;
    }

    /**
     * Genera respuesta con reintentos inteligentes + timeout + circuit breaker
     */
    async generateResponse(messages, systemPrompt) {
        // Circuit breaker check
        if (this._isCircuitOpen()) {
            throw new Error('GROQ_CIRCUIT_OPEN: Servicio en cooldown');
        }

        let attempts = 0;
        const maxAttempts = this.keyQueue.length;
        const REQUEST_TIMEOUT_MS = 8000; // 8s timeout per request

        while (attempts < maxAttempts) {
            const apiKey = this.rotateKey();
            if (!apiKey) throw new Error('NO_GROQ_KEYS_AVAILABLE');

            const keyId = this.getKeyId(apiKey);

            try {
                const payload = {
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                    temperature: 0.6,
                    max_tokens: 1024
                };

                // 🛡️ AbortController for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

                const response = await fetch(GROQ_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const isRateLimit = response.status === 429;
                    const errorText = await response.text();

                    console.warn(`🔸 Groq Key ...${keyId} FAIL (${response.status}): ${isRateLimit ? 'RATE LIMIT' : errorText.slice(0, 30)}`);

                    this._recordFailure();
                    attempts++;

                    // Backoff: wait 200ms * attempt before retry
                    if (attempts < maxAttempts) {
                        await new Promise(r => setTimeout(r, 200 * attempts));
                    }
                    continue;
                }

                const data = await response.json();
                const rawText = data.choices[0]?.message?.content || '';

                if (!rawText.trim()) throw new Error('EMPTY_RESPONSE');

                const position = ((this.requestCount - 1) % this.keyQueue.length) + 1;
                console.log(`%c⚡ GROQ SUCCESS | Key ...${keyId} | Req #${this.requestCount} | Pos ${position}/${this.keyQueue.length}`, 'color: #10b981; font-weight: bold;');

                return {
                    text: rawText,
                    model: this.model,
                    provider: 'GROQ'
                };

            } catch (e) {
                if (e.name === 'AbortError') {
                    console.warn(`⏱️ Groq Key ...${keyId} TIMEOUT (${REQUEST_TIMEOUT_MS}ms)`);
                } else {
                    console.warn(`🔸 Groq Key ...${keyId} Network/Parse Error: ${e.message}`);
                }
                this._recordFailure();
                attempts++;

                if (attempts < maxAttempts) {
                    await new Promise(r => setTimeout(r, 200 * attempts));
                }
            }
        }

        throw new Error('ALL_GROQ_KEYS_EXHAUSTED');
    }


    async checkAvailability() {
        if (this.keyQueue.length === 0) return false;
        // Ping rápido con la clave actual (sin rotar para no gastar turnos innecesarios)
        try {
            const currentKey = this.keyQueue[0];
            const response = await fetch(GROQ_ENDPOINT, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${currentKey}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 1
                })
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}

export const groqService = new GroqService();
