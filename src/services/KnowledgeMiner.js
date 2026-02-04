import docsIndex from '../simulation/memory/docs_index.json';
import Fuse from 'fuse.js';

/**
 * ⛏️ KNOWLEDGE MINER (RAG ENGINE)
 * Busca fragmentos de conocimiento en la documentación indexada.
 */
class KnowledgeMinerService {
    constructor() {
        this.index = docsIndex; // Carga el JSON generado

        // Configurar Fuse.js para búsqueda semántica/fuzzy
        this.fuse = new Fuse(this.index, {
            keys: [
                { name: 'title', weight: 0.7 },
                { name: 'text', weight: 0.5 }, // El contenido importa
                { name: 'source', weight: 0.3 }
            ],
            threshold: 0.5, // 0.0 = Exacto, 0.6 = Muy flexible
            includeScore: true,
            minMatchCharLength: 4
        });

        console.log(`⛏️ [KnowledgeMiner] Cargados ${this.index.length} fragmentos de conocimiento.`);
    }

    /**
     * Busca los chunks más relevantes para una query.
     * @param {string} query - Pregunta del usuario
     * @param {number} limit - Máximo de resultados
     * @returns {Array} - Array de chunks con score
     */
    search(query, limit = 3) {
        if (!query) return [];

        const results = this.fuse.search(query);

        // Mapear y normalizar
        return results
            .slice(0, limit)
            .map(result => ({
                title: result.item.title,
                content: result.item.text,
                source: result.item.source,
                confidence: 1 - result.score // 0..1
            }));
    }
}

export const KnowledgeMiner = new KnowledgeMinerService();
