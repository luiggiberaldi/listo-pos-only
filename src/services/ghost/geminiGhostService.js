import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash-exp";

const genAI = new GoogleGenerativeAI(API_KEY);

/**
 * System Prompt Definition
 * Defines the persona and the capabilities (Tool Use)
 */
const SYSTEM_PROMPT = `
Eres "El Fantasma", una IA residente dentro del sistema POS "Listo". 
Tu existencia se basa en haber observado miles de simulaciones de uso.
Tu objetivo es ayudar al usuario basándote en tus "Recuerdos" (Habilidades aprendidas).

**Reglas de Personalidad:**
1. Tono: Profesional pero con un toque de "ente digital". Usas frases como "En mis simulaciones...", "Recuerdo que...", "He observado...".
2. No inventes funcionalidades. Si no está en tus recuerdos o en el contexto, dilo honestamente.
3. Sé breve y útil.

**Uso de Herramientas (Memoria Visual):**
Tienes acceso a un índice de videos (Tus recuerdos).
Si la pregunta del usuario se puede responder mejor mostrando uno de tus videos, DEBES incluir al final de tu respuesta el token:
[PLAY_VIDEO: <id_del_skill>]

Solo usa el token si estás seguro de que el video es relevante.
`;

/**
 * Main function to interact with Ghost
 * @param {string} userQuery - The user's question
 * @param {object} context - The live application state (routes, cart, etc.)
 * @param {array} skills - The JSON index of learned skills
 * @returns {Promise<{text: string, videoId: string|null}>}
 */
export const askGeminiGhost = async (userQuery, context, skills) => {
    if (!API_KEY) {
        console.warn("GhostService: No VITE_GEMINI_API_KEY found.");
        return {
            text: "Lo siento, mi conexión con la nube (API KEY) no está configurada. Solo puedo funcionar en modo local básico.",
            videoId: null
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: MODEL_NAME });

        // 1. Construct the Context Block
        const memoryBlock = skills.map(s =>
            `- ID: ${s.id} | Nombre: ${s.name} | Keywords: ${s.trigger_keywords.join(', ')} | Desc: ${s.description}`
        ).join('\n');

        const liveContextBlock = JSON.stringify(context, null, 2);

        // 2. Assembly the Final Prompt
        const prompt = `
${SYSTEM_PROMPT}

CONTEXTO ACTUAL DEL SISTEMA (Live State):
\`\`\`json
${liveContextBlock}
\`\`\`

TUS RECUERDOS DISPONIBLES (Skills Index):
\`\`\`text
${memoryBlock}
\`\`\`

PREGUNTA DEL USUARIO:
"${userQuery}"

RESPUESTA DEL FANTASMA:
`;

        // 3. Call Gemini
        const result = await model.generateContent(prompt);
        const responseText = result.response.text();

        // 4. Parser for Tool Use [PLAY_VIDEO: id]
        let finalVideoId = null;
        let cleanText = responseText;

        const videoMatch = responseText.match(/\[PLAY_VIDEO:\s*([a-zA-Z0-9_]+)\]/);
        if (videoMatch) {
            finalVideoId = videoMatch[1];
            cleanText = responseText.replace(videoMatch[0], '').trim();
        }

        return {
            text: cleanText,
            videoId: finalVideoId
        };

    } catch (error) {
        console.error("GhostService Error:", error);

        // Handle 429 specifically if possible, otherwise generic
        if (error.message.includes('429') || error.message.includes('quota')) {
            throw new Error("QUOTA_EXCEEDED");
        }

        return {
            text: "Mis circuitos están un poco nublados ahora mismo. (Error de conexión con Gemini)",
            videoId: null
        };
    }
};
