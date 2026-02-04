import fs from 'fs';
import path from 'path';

const GHOST_FILES = [
    'src/services/ghostAI.js',
    'src/components/ghost/Assistant.jsx',
    'src/components/ghost/GhostFlipbook.jsx',
    'src/components/ghost/VideoBubble.jsx',
    'src/components/ghost/GhostEye.jsx',
    'scripts/ghost/KnowledgeMiner.js',
    'scripts/ghost/RenderSkillVideo.js',
    'scripts/ghost/SyncFlipbooks.js',
    'src/simulation/memory/ghost_brain.json',
    'src/simulation/memory/skills_index.json',
    'src/utils/ghost/chatContext.js',
    'src/utils/ghost/ghostMiddleware.js',
    'tests/ghost/utils/GhostDriver.js',
    'tests/ghost/utils/driver/GhostVision.js',
    'tests/ghost/utils/driver/GhostMotor.js',
    'tests/ghost/utils/driver/GhostHealer.js',
    'tests/ghost/scenarios/day01_awakening.spec.js'
];

let output = "# LISTO GHOST REPOMIX\n\n";
output += "This file contains the consolidated source code for the Listo Ghost Agent.\n\n";

GHOST_FILES.forEach(relPath => {
    const fullPath = path.resolve(relPath);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        output += `## FILE: ${relPath}\n`;
        output += "```" + (relPath.split('.').pop()) + "\n";
        output += content;
        output += "\n```\n\n---\n\n";
    } else {
        output += `## FILE: ${relPath} (NOT FOUND)\n\n---\n\n`;
    }
});

fs.writeFileSync('GHOST_REPOMIX.md', output);
console.log("✅ GHOST_REPOMIX.md generated successfully.");
