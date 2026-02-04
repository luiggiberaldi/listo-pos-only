import { ghostKnowledge } from './ghostKnowledge';
import factoryKnowledgeData from '../data/ghost/factory_knowledge.json';

/**
 * Factory Knowledge Base Articles for Listo POS
 * Pre-configured articles with essential information about the system
 * Data is now loaded from src/data/ghost/factory_knowledge.json
 */

export const FACTORY_KNOWLEDGE = factoryKnowledgeData;

/**
 * Initialize factory knowledge base
 * Checks if KB is empty and populates it with default articles
 */
export async function initializeFactoryKnowledge(systemId) {
    try {
        // Check if there are already articles
        const { data: existingArticles } = await ghostKnowledge.getArticles(systemId);

        if (existingArticles && existingArticles.length > 0) {
            console.log('📚 Knowledge Base already initialized');
            return { success: true, articlesCreated: 0 };
        }

        console.log('📚 Initializing Factory Knowledge Base...');
        let successCount = 0;

        for (const article of FACTORY_KNOWLEDGE) {
            const { error } = await ghostKnowledge.createArticle({
                ...article,
                systemId,
                createdBy: 'System'
            });

            if (!error) {
                successCount++;
            } else {
                console.warn(`Failed to create article: ${article.title}`, error);
            }
        }

        console.log(`✅ Created ${successCount}/${FACTORY_KNOWLEDGE.length} factory knowledge articles`);
        return { success: true, articlesCreated: successCount };

    } catch (e) {
        console.error('Error initializing factory knowledge:', e);
        return { success: false, error: e.message };
    }
}
