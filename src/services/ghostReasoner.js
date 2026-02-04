import { KnowledgeMiner } from './KnowledgeMiner';

/**
 * 🧠 GHOST REASONER (RAG COORDINATOR)
 * Intermediario que obtiene el contexto necesario para la IA.
 * (Antes usaba atomic_logic.json, ahora usa RAG dinámico).
 */
class GhostReasoner {

    /**
     * Recupera el contexto lógico para una consulta.
     * @param {string} query 
     */
    getReasoningContext(query) {
        const matches = KnowledgeMiner.search(query, 3); // Top 3 chunks

        if (matches.length > 0) {
            const topMatch = matches[0];

            // Construir bloque de contexto para el prompt
            const contextBlock = matches.map(m =>
                `[DOC: ${m.title} (${(m.confidence * 100).toFixed(0)}%)]\n${m.content}`
            ).join('\n\n');

            return {
                found: true,
                context: contextBlock,
                bestConfidence: topMatch.confidence
            };
        }

        return { found: false, context: null, bestConfidence: 0 };
    }
}

export const ghostReasoner = new GhostReasoner();
