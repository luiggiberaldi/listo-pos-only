import { supabase } from './supabaseClient';
import { generateEmbedding } from './ghost/geminiGhostService'; // 🟢 Semantic Core

/**
 * Ghost Knowledge Base Service
 * CRUD operations for managing business knowledge articles
 */

class GhostKnowledgeService {
    /**
     * Create a new knowledge article
     */
    async createArticle({ title, content, category, keywords = [], systemId, createdBy }) {
        if (!supabase) return { data: null, error: 'Supabase not configured' };

        try {
            // 🧠 Generate Embedding
            const textToEmbed = `${title} ${content} ${keywords.join(' ')}`;
            const embedding = await generateEmbedding(textToEmbed);

            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .insert({
                    title,
                    content,
                    category,
                    keywords,
                    system_id: systemId,
                    created_by: createdBy,
                    embedding // 🟢 Vector
                })
                .select()
                .single();

            return { data, error };
        } catch (e) {
            console.error('Error creating article:', e);
            return { data: null, error: e.message };
        }
    }

    /**
     * Get all articles for a system
     */
    async getArticles(systemId, { category = null, activeOnly = true } = {}) {
        if (!supabase) return { data: [], error: 'Supabase not configured' };

        try {
            let query = supabase
                .from('ghost_knowledge_base')
                .select('*')
                .eq('system_id', systemId);

            if (category) {
                query = query.eq('category', category);
            }

            if (activeOnly) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query.order('created_at', { ascending: false });

            return { data: data || [], error };
        } catch (e) {
            console.error('Error fetching articles:', e);
            return { data: [], error: e.message };
        }
    }

    /**
     * Get article by ID
     */
    async getArticleById(id) {
        if (!supabase) return { data: null, error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .select('*')
                .eq('id', id)
                .single();

            return { data, error };
        } catch (e) {
            console.error('Error fetching article:', e);
            return { data: null, error: e.message };
        }
    }

    /**
     * Update an article
     */
    async updateArticle(id, updates) {
        if (!supabase) return { data: null, error: 'Supabase not configured' };

        try {
            // 🧠 Update Embedding if content changed
            let updatesWithEmbedding = { ...updates };
            if (updates.title || updates.content || updates.keywords) {
                const current = await this.getArticleById(id);
                // Ensure we handle potential null data if article not found, though unlikely if id exists
                if (!current.data) throw new Error("Article not found");

                const merged = { ...current.data, ...updates };
                const textToEmbed = `${merged.title} ${merged.content} ${merged.keywords?.join(' ') || ''}`;

                const embedding = await generateEmbedding(textToEmbed);
                if (embedding) {
                    updatesWithEmbedding.embedding = embedding;
                }
            }

            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .update(updatesWithEmbedding)
                .eq('id', id)
                .select()
                .single();

            return { data, error };
        } catch (e) {
            console.error('Error updating article:', e);
            return { data: null, error: e.message };
        }
    }

    /**
     * Delete (soft delete) an article
     */
    async deleteArticle(id) {
        if (!supabase) return { data: null, error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .update({ is_active: false })
                .eq('id', id)
                .select()
                .single();

            return { data, error };
        } catch (e) {
            console.error('Error deleting article:', e);
            return { data: null, error: e.message };
        }
    }

    /**
     * Search knowledge base by query
     */
    async search(systemId, query) {
        if (!supabase) return { data: [], error: 'Supabase not configured' };

        try {
            // 1. 🧠 Semantic Search (Deep Understanding)
            const embedding = await generateEmbedding(query);
            let semanticResults = [];

            if (embedding) {
                const { data: rpcData, error: rpcError } = await supabase.rpc('match_ghost_knowledge', {
                    query_embedding: embedding,
                    match_threshold: 0.5, // 50% simil
                    match_count: 5,
                    filter_system_id: systemId
                });
                if (!rpcError) semanticResults = rpcData || [];
            }

            // 2. 🔍 Keyword Search (Exact Match Fallback)
            const keywords = query
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3); // Only words longer than 3 chars

            // Search using text search and keyword matching
            const { data: keywordResults, error } = await supabase
                .from('ghost_knowledge_base')
                .select('*')
                .eq('system_id', systemId)
                .eq('is_active', true)
                .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
                .order('usage_count', { ascending: false })
                .limit(5);

            // 3. 🤝 Hybrid Merge (Deduplicate)
            const allResults = [...semanticResults, ...(keywordResults || [])];

            // Deduplicate by ID
            const uniqueResultsMap = new Map();
            allResults.forEach(item => {
                if (!uniqueResultsMap.has(item.id)) {
                    uniqueResultsMap.set(item.id, item);
                }
            });

            const uniqueResults = Array.from(uniqueResultsMap.values());

            // Prioritize Semantic score if available, else usage count
            return { data: uniqueResults.slice(0, 5), error: error };
        } catch (e) {
            console.error('Error searching knowledge base:', e);
            return { data: [], error: e.message };
        }
    }

    /**
     * Increment usage count when an article is used
     */
    async incrementUsage(id) {
        if (!supabase) return { data: null, error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase.rpc('increment_kb_usage', { article_id: id });
            return { data, error };
        } catch (e) {
            // Fallback to manual increment
            const { data: article } = await this.getArticleById(id);
            if (article) {
                return await this.updateArticle(id, { usage_count: (article.usage_count || 0) + 1 });
            }
            return { data: null, error: e.message };
        }
    }

    /**
     * Get articles by category
     */
    async getByCategory(systemId) {
        if (!supabase) return { data: {}, error: 'Supabase not configured' };

        try {
            const { data, error } = await this.getArticles(systemId);

            if (error) return { data: {}, error };

            // Group by category
            const grouped = data.reduce((acc, article) => {
                if (!acc[article.category]) {
                    acc[article.category] = [];
                }
                acc[article.category].push(article);
                return acc;
            }, {});

            return { data: grouped, error: null };
        } catch (e) {
            console.error('Error grouping by category:', e);
            return { data: {}, error: e.message };
        }
    }

    /**
     * Regenerate Embeddings for ALL articles of a system
     * Useful for backfilling or updating model
     */
    async regenerateAllEmbeddings(systemId) {
        console.log("🔄 Starting Embedding Backfill for System:", systemId);
        if (!supabase) return { success: false, error: 'Supabase not configured' };

        try {
            const { data: articles, error } = await this.getArticles(systemId, { activeOnly: false });
            if (error) throw error;
            console.log(`Found ${articles.length} articles to process.`);

            let count = 0;
            for (const article of articles) {
                const textToEmbed = `${article.title} ${article.content} ${article.keywords?.join(' ') || ''}`;
                console.log(`Processing ${count + 1}/${articles.length}: ${article.title}`);

                const embedding = await generateEmbedding(textToEmbed);

                if (embedding) {
                    const { error: updateError } = await supabase
                        .from('ghost_knowledge_base')
                        .update({ embedding })
                        .eq('id', article.id);

                    if (updateError) console.error("Update failed", updateError);
                    else count++;
                } else {
                    console.warn(`Failed to generate vector for: ${article.title}`);
                }
            }
            console.log(`✅ Backfill complete. Updated ${count} articles.`);
            return { success: true, count };
        } catch (e) {
            console.error('Error regenerating embeddings:', e);
            return { success: false, error: e.message };
        }
    }
}

export const ghostKnowledge = new GhostKnowledgeService();
