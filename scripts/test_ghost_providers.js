
const fs = require('fs');
const path = require('path');

// 1. CARGAR ENV MANUALMENTE (Sin dependencias)
const envPath = path.resolve(__dirname, '../.env');
try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, val] = line.split('=');
        if (key && val) process.env[key.trim()] = val.trim().replace(/"/g, '');
    });
} catch (e) {
    console.error("⚠️ No se pudo leer .env", e.message);
}

const GROQ_KEY = process.env.VITE_GROQ_API_KEY_1;
const OPENROUTER_KEY = process.env.VITE_OPENROUTER_API_KEY;

// Modelos
const GROQ_MODEL = 'llama-3.3-70b-versatile';
const OPENROUTER_MODEL = 'arcee-ai/trinity-large-preview:free';

console.log(`\n🧪 PROBANDO PROVEEDORES IA (Node ${process.version})`);
console.log('=========================================');

async function testProvider(name, url, key, model) {
    if (!key) return console.log(`❌ ${name}: FALTA API KEY`);

    console.log(`\n⚡ PROBANDO: ${name} (${model})...`);
    const start = Date.now();

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:5173',
                'X-Title': 'Ghost Test Script'
            },
            body: JSON.stringify({
                model: model,
                messages: [{ role: 'user', content: 'Responde SOLO con este JSON exacto: {"status": "ok"}' }],
                max_tokens: 50
            })
        });

        const data = await res.json();
        const duration = ((Date.now() - start) / 1000).toFixed(2);

        if (res.ok) {
            console.log(`✅ ${name} OK en ${duration}s`);
            console.log(`📝 Respuesta: ${JSON.stringify(data.choices[0]?.message?.content)}`);
        } else {
            console.log(`❌ ${name} ERROR ${res.status}:`, data);
        }
    } catch (e) {
        console.log(`❌ ${name} EXCEPTION:`, e.message);
    }
}

// Ejecutar Tests
(async () => {
    // 1. GROQ
    await testProvider('GROQ', 'https://api.groq.com/openai/v1/chat/completions', GROQ_KEY, GROQ_MODEL);

    // 2. OPENROUTER
    await testProvider('OPENROUTER', 'https://openrouter.ai/api/v1/chat/completions', OPENROUTER_KEY, OPENROUTER_MODEL);

    console.log('\n✅ PRUEBA FINALIZADA');
})();
