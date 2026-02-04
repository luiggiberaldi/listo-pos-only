
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
    import.meta.env.VITE_GROQ_API_KEY_8
].filter(Boolean);

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.1-8b-instant';

export class GroqService {
    constructor() {
        // Cola de claves viva. Se reordena dinámicamente.
        this.keyQueue = [...GROQ_KEYS_CONFIG];
        this.model = DEFAULT_MODEL;
        this.requestCount = 0; // 🆕 Contador global de peticiones

        console.log(`🚀 Groq Engine Inicializado: ${this.keyQueue.length} Núcleos Activos.`);
    }

    /**
     * Obtiene ID de clave (últimos 4 caracteres para tracking)
     */
    getKeyId(apiKey) {
        return apiKey ? apiKey.slice(-4) : '????';
    }

    /**
     * Obtiene y rota la clave.
     * Estrategia "Perfect Rotation": Usa la primera, la mueve al final.
     * Esto distribuye la carga uniformemente (1 req cada 8 turnos por clave).
     */
    rotateKey() {
        if (this.keyQueue.length === 0) return null;

        const key = this.keyQueue.shift(); // Saca la primera
        this.keyQueue.push(key);           // La pone al final (Cola Circular)
        this.requestCount++; // Incrementar contador
        return key;
    }

    /**
     * Penaliza una clave que falló.
     * Ya fue movida al final por rotateKey(), pero aquí podríamos añadir lógica extra 
     * si quisiéramos "suspenderla" temporalmente. Por ahora, el push al final basta.
     */
    penalizeKey(invalidKey) {
        // En nuestra implementación de rotateKey, la clave YA se movió al final antes de usarse.
        // Si quisiéramos ser más agresivos, podríamos sacarla de la rotación X segundos.
        // Por simplicidad y robustez: La clave "mala" ya está al fondo de la fila.
        console.warn(`⚠️ Groq Key Penalizada (Movida al final de la cola)`);
    }

    /**
     * Genera respuesta con reintentos inteligentes
     */
    async generateResponse(messages, systemPrompt) {
        let attempts = 0;
        const maxAttempts = this.keyQueue.length; // Intentamos una vez por cada clave disponible

        while (attempts < maxAttempts) {
            // 1. Obtener Siguiente Clave (Rotación Automática)
            const apiKey = this.rotateKey();
            if (!apiKey) throw new Error('NO_GROQ_KEYS_AVAILABLE');

            const keyId = this.getKeyId(apiKey); // ID único de la clave

            try {
                // 2. Preparar Payload
                const payload = {
                    model: this.model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        ...messages
                    ],
                    temperature: 0.6,
                    max_tokens: 1024
                };

                // 3. Ejecutar Petición
                const response = await fetch(GROQ_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                // 4. Manejo de Errores HTTP
                if (!response.ok) {
                    const isRateLimit = response.status === 429;
                    const errorText = await response.text();

                    console.warn(`🔸 Groq Key ...${keyId} FAIL (${response.status}): ${isRateLimit ? 'RATE LIMIT' : errorText.slice(0, 30)}`);

                    // Si falla, la clave ya está al final de la cola (por rotateKey).
                    // Simplemente continuamos el loop para probar la siguiente clave (ahora primera).
                    attempts++;
                    continue;
                }

                // 5. Éxito
                const data = await response.json();
                const rawText = data.choices[0]?.message?.content || '';

                if (!rawText.trim()) throw new Error('EMPTY_RESPONSE');

                // Log Táctico con identificador de clave y posición en rotación
                const position = ((this.requestCount - 1) % this.keyQueue.length) + 1;
                console.log(`%c⚡ GROQ SUCCESS | Key ...${keyId} | Req #${this.requestCount} | Pos ${position}/${this.keyQueue.length}`, 'color: #10b981; font-weight: bold;');

                return {
                    text: rawText,
                    model: this.model,
                    provider: 'GROQ'
                };

            } catch (e) {
                console.warn(`🔸 Groq Key ...${keyId} Network/Parse Error: ${e.message}`);
                attempts++;
                // Reintentar con siguiente clave
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
