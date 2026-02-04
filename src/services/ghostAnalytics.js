import { supabase } from './supabaseClient';

/**
 * Ghost Analytics Service
 * Functions to query Ghost usage statistics from Supabase
 */

class GhostAnalyticsService {
    /**
     * Get top N most frequent questions
     */
    async getTopQuestions(systemId, limit = 10) {
        if (!supabase) return { data: [], error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase
                .from('ghost_frequent_questions')
                .select('*')
                .eq('system_id', systemId)
                .order('question_count', { ascending: false })
                .limit(limit);

            return { data: data || [], error };
        } catch (e) {
            console.error('Error fetching top questions:', e);
            return { data: [], error: e.message };
        }
    }

    /**
     * Get usage statistics by hour of day
     */
    async getUsageByHour(systemId) {
        if (!supabase) return { data: [], error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase
                .from('ghost_usage_by_hour')
                .select('*')
                .eq('system_id', systemId)
                .order('hour_of_day', { ascending: true });

            return { data: data || [], error };
        } catch (e) {
            console.error('Error fetching usage by hour:', e);
            return { data: [], error: e.message };
        }
    }

    /**
     * Get topic distribution
     */
    async getTopicDistribution(systemId, days = 30) {
        if (!supabase) return { data: [], error: 'Supabase not configured' };

        try {
            const sinceDate = new Date();
            sinceDate.setDate(sinceDate.getDate() - days);

            const { data, error } = await supabase
                .from('ghost_topic_classification')
                .select('topic')
                .eq('system_id', systemId)
                .gte('timestamp', sinceDate.toISOString());

            if (error) return { data: [], error };

            // Aggregate by topic
            const distribution = {};
            data.forEach(item => {
                distribution[item.topic] = (distribution[item.topic] || 0) + 1;
            });

            const result = Object.entries(distribution).map(([topic, count]) => ({
                topic,
                count
            })).sort((a, b) => b.count - a.count);

            return { data: result, error: null };
        } catch (e) {
            console.error('Error fetching topic distribution:', e);
            return { data: [], error: e.message };
        }
    }

    /**
     * Get daily statistics for a date range
     */
    async getDailyStats(systemId, days = 7) {
        if (!supabase) return { data: [], error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase
                .from('ghost_daily_stats')
                .select('*')
                .eq('system_id', systemId)
                .order('date', { ascending: false })
                .limit(days);

            return { data: data || [], error };
        } catch (e) {
            console.error('Error fetching daily stats:', e);
            return { data: [], error: e.message };
        }
    }

    /**
     * Get overall summary statistics
     */
    async getSummaryStats(systemId) {
        if (!supabase) return { data: null, error: 'Supabase not configured' };

        try {
            const { data, error } = await supabase
                .from('ghost_neural_memory')
                .select('id, role, timestamp')
                .eq('system_id', systemId);

            if (error) return { data: null, error };

            const totalMessages = data.length;
            const userMessages = data.filter(m => m.role === 'user').length;
            const assistantMessages = data.filter(m => m.role === 'assistant').length;

            // Calculate date range
            const timestamps = data.map(m => new Date(m.timestamp).getTime());
            const firstMessage = timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null;
            const lastMessage = timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;

            return {
                data: {
                    totalMessages,
                    userMessages,
                    assistantMessages,
                    firstMessage,
                    lastMessage
                },
                error: null
            };
        } catch (e) {
            console.error('Error fetching summary stats:', e);
            return { data: null, error: e.message };
        }
    }
}

export const ghostAnalytics = new GhostAnalyticsService();
