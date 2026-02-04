/**
 * 🧠 GHOST KNOWLEDGE MINER V5.0 (MODULAR)
 * Orchestrator: Syncroniza Static + Logs + Docs -> atomic_logic.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GROUND_TRUTH } from '../../src/services/ghost/knowledge/StaticKnowledge.js';
import { LogAnalyzer } from '../../src/services/ghost/knowledge/LogAnalyzer.js';
import { MarkdownProcessor } from '../../src/services/ghost/knowledge/MarkdownProcessor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === CONFIGURATION ===
const MEMORIES_DIR = path.resolve(__dirname, '../../tests/ghost/memories');
const DOCS_DIR = path.resolve(__dirname, '../../docs/user-guide');
const OUTPUT_FILE = path.resolve(__dirname, '../../src/simulation/memory/atomic_logic.json');

/**
 * Main Orchestrator
 */
function syncAll() {
    console.log('🔍 Iniciando Knowledge Miner v5.0 (Modular)...\n');

    // 1. STATIC KNOWLEDGE (Ground Truth)
    console.log('📖 [1/3] Loading Static Knowledge...');
    const staticAtoms = GROUND_TRUTH;
    console.log(`   ✅ ${staticAtoms.length} static atoms loaded.\n`);

    // 2. LOG ANALYSIS (Simulación Playwright)
    console.log('📊 [2/3] Analyzing Simulation Logs...');
    const logAnalyzer = new LogAnalyzer(MEMORIES_DIR);
    const logAtoms = logAnalyzer.processLogs();
    console.log('');

    // 3. DOCUMENTATION PROCESSING (Markdown -> Atoms)
    console.log('📝 [3/3] Processing Documentation...');
    const mdProcessor = new MarkdownProcessor(DOCS_DIR);
    const docAtoms = mdProcessor.scanDocs();
    console.log('');

    // 4. MERGE & DEDUPLICATION
    console.log('🔀 Merging and deduplicating...');
    const combined = [...docAtoms, ...staticAtoms, ...logAtoms];
    const uniqueAtoms = deduplicateByUid(combined);
    console.log(`   📦 Total unique atoms: ${uniqueAtoms.length}\n`);

    // 5. SAVE TO JSON
    const outDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(uniqueAtoms, null, 2));
    console.log(`✅ Knowledge Base saved: ${OUTPUT_FILE}`);
    console.log(`\n📊 SUMMARY:`);
    console.log(`   - Static: ${staticAtoms.length}`);
    console.log(`   - Logs: ${logAtoms.length}`);
    console.log(`   - Docs: ${docAtoms.length}`);
    console.log(`   - TOTAL: ${uniqueAtoms.length} atoms`);
}

/**
 * Deduplication Logic
 * Priority: Docs > Static > Logs
 */
function deduplicateByUid(atoms) {
    const seen = new Map();

    atoms.forEach(atom => {
        if (!seen.has(atom.uid)) {
            seen.set(atom.uid, atom);
        } else {
            // Priority override
            const existing = seen.get(atom.uid);
            if (shouldReplace(existing, atom)) {
                seen.set(atom.uid, atom);
            }
        }
    });

    return Array.from(seen.values());
}

function shouldReplace(existing, incoming) {
    const priority = { 'docs': 3, 'static': 2, 'simulation_log': 1 };
    const existingSource = existing.source?.startsWith('docs') ? 'docs' :
        existing.source === 'simulation_log' ? 'simulation_log' : 'static';
    const incomingSource = incoming.source?.startsWith('docs') ? 'docs' :
        incoming.source === 'simulation_log' ? 'simulation_log' : 'static';

    return priority[incomingSource] > priority[existingSource];
}

// === EXECUTION ===
syncAll();
