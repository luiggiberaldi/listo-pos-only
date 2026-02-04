import { supabase } from './supabaseClient';

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
            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .insert({
                    title,
                    content,
                    category,
                    keywords,
                    system_id: systemId,
                    created_by: createdBy
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
            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .update(updates)
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
            // Extract keywords from query (simple tokenization)
            const keywords = query
                .toLowerCase()
                .split(/\s+/)
                .filter(word => word.length > 3); // Only words longer than 3 chars

            // Search using text search and keyword matching
            const { data, error } = await supabase
                .from('ghost_knowledge_base')
                .select('*')
                .eq('system_id', systemId)
                .eq('is_active', true)
                .or(`title.ilike.%${query}%,content.ilike.%${query}%`)
                .order('usage_count', { ascending: false })
                .limit(5);

            return { data: data || [], error };
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
                return await this.updateArticle(id, { usage_count: article.usage_count + 1 });
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
}

export const ghostKnowledge = new GhostKnowledgeService();
