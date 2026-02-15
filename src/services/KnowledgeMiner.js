import Fuse from 'fuse.js';

/**
 * ⛏️ KNOWLEDGE MINER (RAG ENGINE)
 * Busca fragmentos de conocimiento en la documentación indexada.
 * LAZY INIT: No carga los 699+ chunks hasta que se necesitan.
 */
class KnowledgeMinerService {
    constructor() {
        this.index = null;
        this.fuse = null;
        this._initialized = false;
        this._initPromise = null;
    }

    /**
     * Lazy initialization — loads the JSON index only on first search.
     */
    async _init() {
        if (this._initialized) return;
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            const { default: docsIndex } = await import('../simulation/memory/docs_index.json');
            this.index = docsIndex;
            this.fuse = new Fuse(this.index, {
                keys: [
                    { name: 'title', weight: 0.7 },
                    { name: 'text', weight: 0.5 },
                    { name: 'source', weight: 0.3 }
                ],
                threshold: 0.5,
                includeScore: true,
                minMatchCharLength: 4
            });
            this._initialized = true;
            console.log(`⛏️ [KnowledgeMiner] Lazy-loaded ${this.index.length} fragmentos de conocimiento.`);
        })();

        return this._initPromise;
    }

    /**
     * Busca los chunks más relevantes para una query.
     * @param {string} query - Pregunta del usuario
     * @param {number} limit - Máximo de resultados
     * @returns {Promise<Array>} - Array de chunks con score
     */
    async search(query, limit = 3) {
        if (!query) return [];

        await this._init();

        const results = this.fuse.search(query);

        return results
            .slice(0, limit)
            .map(result => ({
                title: result.item.title,
                content: result.item.text,
                source: result.item.source,
                confidence: 1 - result.score
            }));
    }
}

export const KnowledgeMiner = new KnowledgeMinerService();
