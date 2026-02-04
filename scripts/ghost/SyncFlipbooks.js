import fs from 'fs';
import path from 'path';

const SRC = path.resolve('tests/ghost/assets/scenes');
const DEST = path.resolve('public/ghost/clips');

if (!fs.existsSync(DEST)) {
    fs.mkdirSync(DEST, { recursive: true });
}

if (fs.existsSync(SRC)) {
    const files = fs.readdirSync(SRC);
    files.forEach(file => {
        if (file.endsWith('.png') || file.endsWith('.jpg')) {
            fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
        }
    });
    console.log(`✅ Flipbook Assets Synced to ${DEST}`);
} else {
    console.warn(`⚠️ Source directory not found: ${SRC}`);
}
