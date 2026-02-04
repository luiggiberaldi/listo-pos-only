/**
 * 📝 MARKDOWN PROCESSOR
 * Convierte documentación técnica (.md) en átomos de conocimiento.
 */

import fs from 'fs';
import path from 'path';

export class MarkdownProcessor {
    constructor(docsDir) {
        this.docsDir = docsDir;
    }

    /**
     * Escanea carpeta de documentación y genera átomos.
     */
    scanDocs() {
        if (!fs.existsSync(this.docsDir)) {
            console.warn(`⚠️ Docs directory not found: ${this.docsDir}`);
            return [];
        }

        const docFiles = fs.readdirSync(this.docsDir).filter(f => f.endsWith('.md'));
        if (docFiles.length === 0) {
            console.log('📭 No markdown files found.');
            return [];
        }

        const atoms = [];

        docFiles.forEach(file => {
            const filePath = path.join(this.docsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Extract title from first H1
            const titleMatch = content.match(/^#\s+(.+)$/m);
            const title = titleMatch ? titleMatch[1] : file.replace('.md', '');

            // Generate UID from filename
            const uid = `doc_${file.replace('.md', '').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;

            // Extract sections for keywords
            const headers = content.match(/^#{1,3}\s+(.+)$/gm) || [];
            const keywords = this.extractKeywords(title + ' ' + headers.join(' '));

            atoms.push({
                uid,
                keywords,
                technical_steps: [
                    `Fuente: ${file}`,
                    "Auto-extracted from documentation"
                ],
                logic_chain: "Documentation -> KnowledgeBase",
                local_response: this.summarizeContent(content),
                source: `docs/${file}`
            });
        });

        console.log(`✅ Extracted ${atoms.length} atoms from documentation.`);
        return atoms;
    }

    /**
     * Extrae keywords eliminando stop words.
     */
    extractKeywords(text) {
        const stopWords = new Set([
            'el', 'la', 'los', 'las', 'de', 'del', 'para', 'en', 'con', 'por', 'que',
            'un', 'una', 'como', 'esta', 'este', 'al', 'y', 'o', 'es', 'son'
        ]);

        return text.toLowerCase()
            .replace(/[^\w\sáéíóúñ]/g, ' ')
            .split(/\s+/)
            .filter(k => k.length > 3 && !stopWords.has(k))
            .slice(0, 15); // Limit keywords
    }

    /**
     * Resume el contenido del markdown.
     */
    summarizeContent(content) {
        // Remove code blocks
        const cleaned = content.replace(/```[\s\S]*?```/g, '');

        // Get first 2 paragraphs
        const paragraphs = cleaned.split('\n\n').filter(p => p.trim().length > 20);
        const summary = paragraphs.slice(0, 2).join('\n\n');

        return summary.length > 500 ? summary.substring(0, 500) + '...' : summary;
    }
}
