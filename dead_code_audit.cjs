const fs = require('fs');
const path = require('path');

// Configuration
const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const ELECTRON_DIR = path.join(ROOT_DIR, 'electron');

// Entry points relative to ROOT_DIR
const ENTRIES = [
    'src/main.jsx',
    'electron/main.js',
    'index.html', // Vite entry
    'vite.config.js',
    'tailwind.config.js',
    'postcss.config.js',
    'eslint.config.js'
];

// Whitelisted files/folders (Ignored from being marked as dead or scanned into uselessly)
// We will filter these OUT from the "Dead" list at the end.
const IGNORE_PATTERNS = [
    /node_modules/,
    /\.git/,
    /dist/,
    /build/,
    /\.ds_store/i,
    /thumbs\.db/i,
    /\.env/,
    /\.json$/, // Ignore config JSONs as per user request
    /\.yml$/,
    /\.md$/,
    /LICENSE/,
    /Dockerfile/,
    /^public[\\\/]/, // Public assets often referenced dynamically or just served
    /^assets[\\\/]/,
    /\.rar$/
];

// Extensions to try when resolving imports
const EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.json', '.css', '.scss', '.svg', '.png', '.jpg', '.jpeg'];

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        const relativePath = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');

        // Early skip for heavy folders
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') return;

        if (stat.isDirectory()) {
            getAllFiles(filePath, fileList);
        } else {
            fileList.push(relativePath);
        }
    });
    return fileList;
}

function resolveImport(importPath, currentFileDir) {
    // 1. Handle absolute imports or aliases (Not present here, assume relative or node_modules)
    // If it starts with ., it's relative.
    // If it doesn't, it might be a node_module or an alias.
    // Since we didn't find aliases, we assume non-relative = node_module OR absolute path (unlikely in this setup).

    let targetPath = importPath;

    if (importPath.startsWith('.')) {
        targetPath = path.resolve(currentFileDir, importPath);
    } else if (importPath.startsWith('/')) {
        // Absolute path from root (usually src in some configs, or public)
        targetPath = path.join(ROOT_DIR, importPath);
    } else {
        // Likely a package import, ignore
        return null;
    }

    // Try finding the file
    // Check exact match
    if (fs.existsSync(targetPath)) {
        const stat = fs.statSync(targetPath);
        if (stat.isDirectory()) {
            // Try index files
            for (const ext of EXTENSIONS) {
                const indexFile = path.join(targetPath, `index${ext}`);
                if (fs.existsSync(indexFile)) return path.relative(ROOT_DIR, indexFile).replace(/\\/g, '/');
            }
        } else {
            return path.relative(ROOT_DIR, targetPath).replace(/\\/g, '/');
        }
    }

    // Try match with extensions
    for (const ext of EXTENSIONS) {
        const testPath = `${targetPath}${ext}`;
        if (fs.existsSync(testPath)) {
            return path.relative(ROOT_DIR, testPath).replace(/\\/g, '/');
        }
    }

    return null; // Could not resolve
}

function getImportsFromFile(filePath) {
    const absolutePath = path.join(ROOT_DIR, filePath);
    if (!fs.existsSync(absolutePath)) return [];

    const content = fs.readFileSync(absolutePath, 'utf-8');
    const imports = [];
    const dir = path.dirname(absolutePath);

    // Regex for imports
    // import ... from '...'
    const importRegex = /import\s+.*?from\s+['"](.*?)['"]/g;
    // import '...'
    const sideEffectImportRegex = /import\s+['"](.*?)['"]/g;
    // require('...')
    const requireRegex = /require\(['"](.*?)['"]\)/g;
    // Dynamic import('...')
    const dynamicImportRegex = /import\(['"](.*?)['"]\)/g;

    // For lazy searching in non-js files (like standard strings in case of dynamic loading?) - skipping for now to be precise.

    // Also handle HTML scripts
    if (filePath.endsWith('.html')) {
        const srcRegex = /src=['"](.*?)['"]/g;
        let match;
        while ((match = srcRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
        const hrefRegex = /href=['"](.*?)['"]/g; // content css
        while ((match = hrefRegex.exec(content)) !== null) {
            imports.push(match[1]);
        }
    } else {
        let match;
        while ((match = importRegex.exec(content)) !== null) imports.push(match[1]);
        while ((match = sideEffectImportRegex.exec(content)) !== null) imports.push(match[1]);
        while ((match = requireRegex.exec(content)) !== null) imports.push(match[1]);
        while ((match = dynamicImportRegex.exec(content)) !== null) imports.push(match[1]);
    }

    return imports.map(imp => {
        const resolved = resolveImport(imp, dir);
        return resolved;
    }).filter(items => items !== null);
}

function runAudit() {
    console.log('Starting Dead Code Audit...');

    // 1. Gather all files
    const allFiles = getAllFiles(ROOT_DIR);
    console.log(`Found ${allFiles.length} total files.`);

    // 2. BFS Traversal
    const visited = new Set();
    const queue = [...ENTRIES];

    // Mark entries as visited immediately if they exist
    ENTRIES.forEach(e => {
        if (allFiles.includes(e)) visited.add(e);
    });

    while (queue.length > 0) {
        const current = queue.shift();

        // Skip if not in our "allFiles" scope (e.g. outside root) or already processed fully
        // But we added to visited when pushing, so we might check here? 
        // We need to parse it.

        const imports = getImportsFromFile(current);

        imports.forEach(imp => {
            if (!visited.has(imp) && allFiles.includes(imp)) {
                visited.add(imp);
                queue.push(imp);

                // If regex missed extensions, resolveImport handles it and returns exact file path from allFiles
            }
        });
    }

    console.log(`Reachable files: ${visited.size}`);

    // 3. Find Dead Code
    const deadFiles = allFiles.filter(f => !visited.has(f));

    // 4. Filter Whitelist and Ignores
    const candidates = deadFiles.filter(f => {
        for (const pattern of IGNORE_PATTERNS) {
            if (pattern.test(f)) return false;
        }
        return true;
    });

    // 5. Output Grouped Report
    const grouped = {};
    let totalSaved = 0;

    candidates.forEach(f => {
        const dir = path.dirname(f);
        if (!grouped[dir]) grouped[dir] = [];
        const size = fs.statSync(path.join(ROOT_DIR, f)).size;
        grouped[dir].push({ file: path.basename(f), size });
        totalSaved += size;
    });

    const report = {
        scanDate: new Date().toISOString(),
        totalFiles: allFiles.length,
        reachableFiles: visited.size,
        deadFilesCount: candidates.length,
        totalSizeToFree: totalSaved,
        candidates: grouped
    };

    console.log('---------------------------------------------------');
    console.log(JSON.stringify(report, null, 2));
    console.log('---------------------------------------------------');

    // DELETION LOGIC ADDED
    console.log('\n[DELETION PHASE] Deleting candidates...');
    let deletedCount = 0;

    // Flatten candidates
    const filesToDelete = candidates;

    filesToDelete.forEach(file => {
        // Skip deleting this script itself until the very end (handled externally or safe to ignore for now)
        if (file.includes('dead_code_audit.cjs')) return;

        const fullPath = path.join(ROOT_DIR, file);
        try {
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
                console.log(`[DELETED] ${file}`);
                deletedCount++;
            } else {
                console.log(`[NOT FOUND] ${file}`);
            }
        } catch (err) {
            console.error(`[ERROR] Could not delete ${file}: ${err.message}`);
        }
    });

    console.log(`\nOperation Complete. Deleted ${deletedCount} files.`);
}

runAudit();
