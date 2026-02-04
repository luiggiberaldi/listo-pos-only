import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Parse Arguments
const args = process.argv.slice(2);
const memoryArg = args.find(a => a.startsWith('--memory='));

if (!memoryArg) {
    console.error('❌ Usage: node RenderSkillVideo.js --memory=<path_to_json>');
    process.exit(1);
}

const memoryPath = path.resolve(memoryArg.split('=')[1]);

if (!fs.existsSync(memoryPath)) {
    console.error(`❌ Memory file not found: ${memoryPath}`);
    process.exit(1);
}

// 2. Load Memory & Calculate Duration
console.log(`🧠 Loading Memory: ${memoryPath}`);
const memoryLog = JSON.parse(fs.readFileSync(memoryPath, 'utf-8'));

if (memoryLog.length === 0) {
    console.error('❌ Memory log is empty.');
    process.exit(1);
}

const getRealTime = (evt) => {
    // If realTimestamp exists (STATE_CHANGE, USER_INTERACTION), use it.
    if (evt.realTimestamp) return new Date(evt.realTimestamp).getTime();
    // Otherwise fallback to timestamp (SCENE_CHANGE use real time in timestamp)
    return new Date(evt.timestamp).getTime();
};

// Sort log by time to ensure monotonicity
const sortedLog = [...memoryLog].sort((a, b) => getRealTime(a) - getRealTime(b));

const firstTime = getRealTime(sortedLog[0]);
const lastTime = getRealTime(sortedLog[sortedLog.length - 1]);
const durationMs = lastTime - firstTime + 2000; // +2s buffer
const fps = 30;
const durationInFrames = Math.min(Math.ceil((durationMs / 1000) * fps), 90); // Cap at 3s (90 frames) for GIF-like speed

if (durationInFrames <= 0) {
    console.error(`❌ Calculated duration is invalid.`);
    process.exit(1);
}

console.log(`⏱️ Duration: ${durationMs}ms (Capped to ${durationInFrames} frames)`);

// 3. Prepare Assets (Base64 Embedding Strategy)
const assetsSourceDir = path.resolve('tests/ghost/assets/scenes');
const assetsMap = {};

if (fs.existsSync(assetsSourceDir)) {
    console.log(`📦 Embedding Assets from: ${assetsSourceDir}`);
    const files = fs.readdirSync(assetsSourceDir);
    files.forEach(f => {
        if (f.endsWith('.png') || f.endsWith('.jpg')) {
            const b64 = fs.readFileSync(path.join(assetsSourceDir, f), 'base64');
            assetsMap[f] = `data:image/png;base64,${b64}`;
        }
    });
    console.log(`📦 Embedded ${Object.keys(assetsMap).length} assets.`);
}

// 4. Create Props File
const props = {
    log: sortedLog,
    assetsMap: assetsMap, // Pass the map directly
    assetsBaseUrl: '' // Not used anymore
};

const propsPath = path.resolve('src/simulation/video/input-props.json');
fs.writeFileSync(propsPath, JSON.stringify(props));

// 5. Trigger Remotion Render
const outputName = `video_${path.basename(memoryPath, '.json')}.mp4`;
const outputPath = path.resolve(`tests/ghost/videos/${outputName}`);
// Create output dir if not exists
fs.mkdirSync(path.dirname(outputPath), { recursive: true });

console.log(`🎬 Starting Render: ${outputName}`);
const remotionDir = path.resolve('src/simulation/video');

try {
    // We execute npm run render but allow overriding args? 
    // Or direct npx remotion render
    // Use npx.cmd for Windows compatibility if npx fails
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const cmd = `${npxCmd} remotion render src/index.jsx GhostReplay "${outputPath}" --props="${propsPath}" --duration=${durationInFrames}`;

    console.log(`$ ${cmd}`);
    execSync(cmd, {
        cwd: remotionDir,
        stdio: 'inherit',
        env: { ...process.env, FORCE_COLOR: 'true' }
    });

    console.log(`✅ Video Rendered: ${outputPath}`);

    // --- PHASE 12: VISUAL CORTEX SYNC ---
    const publicDir = path.resolve('public/ghost/videos');
    if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
    }
    const publicPath = path.join(publicDir, outputName);
    fs.copyFileSync(outputPath, publicPath);
    console.log(`✅ Video Published to Web: ${publicPath}`);

    // Create Alias for Auth Login (Hardcoded for this phase)
    const aliasPath = path.join(publicDir, 'video_auth_login.mp4');
    fs.copyFileSync(outputPath, aliasPath);
    console.log(`🔗 Alias Created: ${aliasPath}`);

    // Cleanup
    // fs.unlinkSync(propsPath); // Keep for debugging if needed

} catch (e) {
    console.error('❌ Render Failed.');
    process.exit(1);
}
