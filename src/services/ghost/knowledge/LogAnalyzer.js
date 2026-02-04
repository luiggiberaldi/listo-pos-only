/**
 * 📊 LOG ANALYZER
 * Extrae conocimiento de logs de interacción (simulaciones de Playwright).
 */

import fs from 'fs';
import path from 'path';

export class LogAnalyzer {
    constructor(memoriesDir) {
        this.memoriesDir = memoriesDir;
    }

    /**
     * Analiza archivos JSON de memoria y extrae átomos de conocimiento.
     */
    processLogs() {
        if (!fs.existsSync(this.memoriesDir)) {
            console.warn(`⚠️ Log directory not found: ${this.memoriesDir}`);
            return [];
        }

        const memoryFiles = fs.readdirSync(this.memoriesDir).filter(f => f.endsWith('.json'));
        if (memoryFiles.length === 0) {
            console.log('📭 No memory logs found.');
            return [];
        }

        const atoms = [];
        const usedUids = new Set();

        memoryFiles.forEach(file => {
            const filePath = path.join(this.memoriesDir, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

            const clicks = data.filter(e => e.type === 'USER_INTERACTION' && e.event === 'CLICK');
            const stateChanges = data.filter(e => e.type === 'STATE_CHANGE');

            clicks.forEach(click => {
                const relatedChanges = stateChanges.filter(sc => {
                    const clickTime = click.realTimestamp || new Date(click.timestamp).getTime();
                    const changeTime = sc.realTimestamp || new Date(sc.timestamp).getTime();
                    const diff = changeTime - clickTime;
                    return diff >= 0 && diff <= 2000;
                });

                if (relatedChanges.length > 0) {
                    let rawName = click.target.replace(/.*contains\("(.*)"\).*/, '$1').replace(/["']/g, "").trim();
                    const uid = rawName.toLowerCase().replace(/[^a-z0-9]/g, '_').substring(0, 30);

                    if (usedUids.has(uid)) return;
                    usedUids.add(uid);

                    const technicalSteps = [`Interact with ${rawName}`];
                    if (uid.includes('login')) technicalSteps.push('Type 6-digit PIN', 'Press Enter');

                    const affectedStores = [...new Set(relatedChanges.map(rc => rc.store))];
                    const logicChain = affectedStores.join(' -> ') + ' (mutated)';

                    atoms.push({
                        uid,
                        keywords: this.extractKeywords(rawName),
                        technical_steps: technicalSteps,
                        logic_chain: logicChain,
                        local_response: `Mecánica detectada para ${rawName}: Ejecuta cambios en ${affectedStores.join(', ')}.`,
                        source: 'simulation_log'
                    });
                }
            });
        });

        console.log(`✅ Extracted ${atoms.length} atoms from logs.`);
        return atoms;
    }

    /**
     * Extrae keywords filtrando stop words.
     */
    extractKeywords(text) {
        const stopWords = new Set(['el', 'la', 'de', 'para', 'en', 'con', 'por', 'que']);
        return text.toLowerCase()
            .split(' ')
            .filter(k => k.length > 3 && !stopWords.has(k));
    }
}
