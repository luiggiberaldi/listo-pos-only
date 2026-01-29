const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// ID único para los productos de Listo POS
const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

// Palabras clave de la Canasta Básica
const CANASTA_KEYWORDS = [
    'Arroz', 'Harina', 'Pasta', 'Aceite', 'Azúcar', 'Sal', 'Café', 'Leche',
    'Huevo', 'Lenteja', 'Caraota', 'Pollo', 'Carne', 'Atún', 'Sardina',
    'Margarina', 'Mayonesa', 'Salsa', 'Pan', 'Queso', 'Jamón', 'Jabón',
    'Papel', 'Crema', 'Mantequilla', 'Mortadela', 'Salchicha', 'Choro', 'Granos'
];

const urlToBase64 = (url) => {
    return new Promise((resolve) => {
        if (!url || !url.startsWith('http')) { resolve(null); return; }
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const type = res.headers['content-type'] || 'image/jpeg';
                resolve(`data:${type};base64,${buffer.toString('base64')}`);
            });
            res.on('error', () => resolve(null));
        }).on('error', () => resolve(null));
    });
};

(async () => {
    console.log('🧺 Iniciando Scraper de CANASTA BÁSICA (40 productos)...');

    const baseBackupPath = path.join(__dirname, 'RESPALDO_LISTO_2026-01-25.json');
    let backupBase = {
        dexie: { productos: [], ventas: [], clientes: [], config: [], logs: [], cortes: [], caja_sesion: [], tickets_espera: [], outbox: [] },
        localStorage: {},
        _meta: { version_software: "1.4.0", fecha: new Date().toISOString(), origen: "LISTO_POS", schema_version: "v2-unified" }
    };

    if (fs.existsSync(baseBackupPath)) {
        try {
            backupBase = JSON.parse(fs.readFileSync(baseBackupPath, 'utf8'));
            backupBase.dexie.productos = [];
        } catch (e) { }
    }

    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('🌐 Navegando a TuzonaMarket...');
        await page.goto('https://tuzonamarket.com/carabobo', { waitUntil: 'networkidle2', timeout: 90000 });

        console.log('📜 Buscando productos esenciales...');
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    // Aumentamos el scroll para encontrar más ítems
                    if (totalHeight >= 25000) { clearInterval(timer); resolve(); }
                }, 100);
            });
        });

        const extractedData = await page.evaluate((keywords) => {
            const products = [];
            const processedNames = new Set();
            const images = Array.from(document.querySelectorAll('img')).filter(img => img.width > 120);

            images.forEach(img => {
                let card = img.parentElement;
                let foundName = null;
                let foundPrice = null;

                for (let i = 0; i < 6; i++) {
                    if (!card) break;
                    const text = card.innerText || "";
                    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);

                    const priceLine = lines.find(l => l.includes('$') || l.includes('Bs'));
                    if (priceLine && !foundPrice) {
                        const m = priceLine.match(/[\d.,]+/);
                        if (m) foundPrice = parseFloat(m[0].replace(',', '.'));
                    }

                    const potentialNames = lines.filter(l =>
                        l.length > 5 && l.length < 80 &&
                        !l.includes('$') && !l.toLowerCase().includes('bs') &&
                        !l.toLowerCase().includes('disponible') &&
                        !l.toLowerCase().includes('ver más') &&
                        (l.split(',').length - 1) < 2 // Evitar líneas con muchas comas (categorías)
                    );

                    if (potentialNames.length > 0) foundName = potentialNames[0];
                    if (foundName && foundPrice) break;
                    card = card.parentElement;
                }

                if (foundName && foundPrice) {
                    const cleanName = foundName.trim();
                    const lowerName = cleanName.toLowerCase();
                    const isBasico = keywords.some(k => lowerName.includes(k.toLowerCase()));

                    // REGEX para detectar pesos o unidades (signo de que es un producto real)
                    const hasWeight = /[\d.,]+\s*(g|kg|und|unidad|l|ml|oz|lb|pza|gr|unid|cc)/i.test(cleanName);

                    // Exclusión de categorías genéricas y servicios
                    const isBasura = lowerName.includes('alimentos importados') ||
                        lowerName.includes('recarga') ||
                        lowerName.includes('repostería') ||
                        lowerName.includes('saludables') ||
                        lowerName.includes('tortas') ||
                        lowerName.includes('market') ||
                        (!hasWeight && cleanName.split(' ').length <= 3); // Si no tiene peso y es corto, suele ser categoría

                    if (isBasico && !isBasura && !processedNames.has(lowerName)) {
                        products.push({ name: cleanName, src: img.src, price: foundPrice });
                        processedNames.add(lowerName);
                    }
                }
            });
            return products;
        }, CANASTA_KEYWORDS);

        console.log(`✅ Encontrados ${extractedData.length} productos básicos potenciales.`);

        const finalProducts = [];
        const baseId = Date.now();
        let count = 0;

        for (const p of extractedData) {
            if (count >= 40) break;

            process.stdout.write(`\r📥 Procesando [${count + 1}/40]: ${p.name.substring(0, 30)}...`);

            const base64 = await urlToBase64(p.src);
            if (!base64) continue;

            const precio = parseFloat(p.price);
            const costo = parseFloat((precio * 0.7).toFixed(2));

            finalProducts.push({
                nombre: p.name,
                codigo: `CB-${baseId}-${count}`,
                categoria: "Canasta Básica",
                precio: precio,
                costo: costo,
                stock: 50,
                tipoUnidad: "unidad",
                favorito: true,
                fecha_registro: new Date().toISOString(),
                jerarquia: {
                    unidad: { activo: true, precio: precio, seVende: true, nombre: "Unidad" }
                },
                aplicaIva: false, // Usualmente exentos o tasa reducida, pero pondremos false por ser básica
                exento: true,
                id: baseId + count,
                imagen: base64
            });
            count++;
        }

        backupBase.dexie.productos = finalProducts;
        const outputPath = path.join(__dirname, 'RESPALDO_CANASTA_40.json');
        fs.writeFileSync(outputPath, JSON.stringify(backupBase, null, 2));

        console.log(`\n\n✨ ¡LISTO! Respaldo de Canasta Básica generado en: ${outputPath}`);

    } catch (e) {
        console.error('\n❌ Error:', e);
    } finally {
        await browser.close();
    }
})();
