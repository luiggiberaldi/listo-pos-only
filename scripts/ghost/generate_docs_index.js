import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CONFIG
const DOCS_DIR = path.join(__dirname, '../../docs/user-guide');
const OUTPUT_FILE = path.join(__dirname, '../../src/simulation/memory/docs_index.json');

console.log("📚 [DOCS MINER] Iniciando indexación de documentación...");

// Helper: Recursively get files
function getFiles(dir) {
    const dirents = fs.readdirSync(dir, { withFileTypes: true });
    const files = dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFiles(res) : res;
    });
    return Array.prototype.concat(...files);
}

// Helper: Extract Text Chunks
function extractChunks(content, filename) {
    const lines = content.split('\n');
    let chunks = [];
    let currentChunk = { title: filename, content: [] };

    lines.forEach(line => {
        if (line.startsWith('#')) {
            // Save prev chunk
            if (currentChunk.content.length > 0) {
                chunks.push({
                    title: currentChunk.title,
                    text: currentChunk.content.join('\n'),
                    source: filename
                });
            }
            // Start new chunk
            currentChunk = {
                title: line.replace(/^#+\s*/, '').trim(),
                content: [line]
            };
        } else {
            currentChunk.content.push(line);
        }
    });

    // Push last chunk
    if (currentChunk.content.length > 0) {
        chunks.push({
            title: currentChunk.title,
            text: currentChunk.content.join('\n'),
            source: filename
        });
    }

    return chunks;
}

// MAIN
try {
    if (!fs.existsSync(DOCS_DIR)) {
        throw new Error(`Directory not found: ${DOCS_DIR}`);
    }

    const files = getFiles(DOCS_DIR).filter(f => f.endsWith('.md'));
    let totalChunks = [];

    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const filename = path.basename(file);
        const chunks = extractChunks(content, filename);
        totalChunks = [...totalChunks, ...chunks];
    });

    // Write Index
    const payload = JSON.stringify(totalChunks, null, 2);
    fs.writeFileSync(OUTPUT_FILE, payload);

    console.log(`✅ [SUCCESS] Indexados ${files.length} archivos en ${totalChunks.length} chunks.`);
    console.log(`📂 Output: ${OUTPUT_FILE}`);

} catch (e) {
    console.error("❌ [ERROR]", e.message);
}
