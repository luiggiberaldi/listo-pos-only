const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');

// ID único para los productos de Listo POS (basado en timestamp)
const generateId = () => Date.now() + Math.floor(Math.random() * 1000);

// Función auxiliar para descargar imagen URL -> Base64
const urlToBase64 = (url) => {
    return new Promise((resolve, reject) => {
        if (!url || !url.startsWith('http')) { resolve(null); return; }

        https.get(url, (res) => {
            const chunks = [];
            res.on('data', d => chunks.push(d));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                const type = res.headers['content-type'] || 'image/jpeg';
                resolve(`data:${type};base64,${buffer.toString('base64')}`);
            });
            res.on('error', (e) => resolve(null));
        }).on('error', (e) => resolve(null));
    });
};

(async () => {
    console.log('🕷️ Iniciando Scraper de 300 productos para Listo POS...');

    // Leemos el archivo base para mantener la estructura de configuración y otros campos
    const baseBackupPath = path.join(__dirname, 'RESPALDO_LISTO_2026-01-25.json');
    let backupBase = {
        dexie: {
            productos: [],
            ventas: [],
            clientes: [],
            config: [],
            logs: [],
            cortes: [],
            caja_sesion: [],
            tickets_espera: [],
            outbox: []
        },
        localStorage: {},
        _meta: {
            version_software: "1.4.0",
            fecha: new Date().toISOString(),
            origen: "LISTO_POS",
            schema_version: "v2-unified"
        }
    };

    if (fs.existsSync(baseBackupPath)) {
        try {
            backupBase = JSON.parse(fs.readFileSync(baseBackupPath, 'utf8'));
            // Limpiamos los productos existentes para el nuevo respaldo
            backupBase.dexie.productos = [];
        } catch (e) {
            console.error('⚠️ Error al leer el respaldo base, se usará estructura por defecto.');
        }
    }

    const browser = await puppeteer.launch({
        headless: "new",
        defaultViewport: { width: 1366, height: 768 }
    });
    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    try {
        console.log('🌐 Navegando a https://tuzonamarket.com/carabobo ...');
        await page.goto('https://tuzonamarket.com/carabobo', { waitUntil: 'networkidle2', timeout: 90000 });

        console.log('📜 Haciendo scroll profundo para capturar 300 productos...');
        // Aumentamos el scroll para asegurar cantidad de productos
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;
                    // Scrolear mucho más para obtener 300+ productos
                    // Aumentamos a 30,000 pixels o fin de página
                    if (totalHeight >= 30000 || totalHeight >= scrollHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });

        await new Promise(r => setTimeout(r, 5000)); // Esperar render final

        console.log('⛏️ Analizando productos en la página...');

        const extractedData = await page.evaluate(() => {
            const products = [];
            const processedImages = new Set();

            const images = Array.from(document.querySelectorAll('img')).filter(img =>
                img.width > 120 && img.height > 120 && img.src.startsWith('http')
            );

            images.forEach(img => {
                if (processedImages.has(img.src)) return;

                let card = img.parentElement;
                let foundName = null;
                let foundPrice = null;

                // Subir hasta encontrar un contenedor que parezca un producto
                for (let i = 0; i < 5; i++) {
                    if (!card) break;

                    const textContent = card.innerText || "";
                    const lines = textContent.split('\n').map(l => l.trim()).filter(l => l.length > 0);

                    // Buscar precio
                    const priceLine = lines.find(l => l.match(/[\d.,]+\s*[$]/) || l.includes('Bs'));
                    if (priceLine && !foundPrice) {
                        const match = priceLine.match(/[\d.,]+/);
                        if (match) foundPrice = parseFloat(match[0].replace(',', '.'));
                    }

                    // Buscar nombre (excluir cosas que parecen categorías o estados)
                    const potentialNames = lines.filter(l =>
                        l.length > 5 &&
                        l.length < 100 &&
                        !l.includes('$') &&
                        !l.toLowerCase().includes('bs') &&
                        !l.toLowerCase().includes('disponible') &&
                        !l.toLowerCase().includes('agotado') &&
                        !l.toLowerCase().includes('unidades') &&
                        !l.toLowerCase().includes('ver más') &&
                        !l.match(/^\(\d+/) // No empezar con (# Disponibles)
                    );

                    if (potentialNames.length > 0) {
                        // El nombre suele ser la línea más larga o la primera que no es basura
                        foundName = potentialNames[0];
                    }

                    if (foundName && foundPrice) break;
                    card = card.parentElement;
                }

                if (foundName && foundPrice && !foundName.toLowerCase().includes('banner')) {
                    products.push({
                        name: foundName,
                        src: img.src,
                        price: foundPrice
                    });
                    processedImages.add(img.src);
                }
            });

            return products;
        });

        console.log(`✅ Detectados ${extractedData.length} productos potenciales.`);

        const finalProducts = [];
        let count = 0;
        const targetCount = 300;

        const baseId = Date.now();
        for (const p of extractedData) {
            if (count >= targetCount) break;

            let cleanName = p.name.replace(/\s+/g, ' ').trim();
            if (cleanName.length < 5) continue;
            if (finalProducts.some(gp => gp.nombre === cleanName)) continue;

            process.stdout.write(`\r📥 Procesando: ${count + 1}/${targetCount}...`);

            const base64 = await urlToBase64(p.src);
            if (!base64) continue;

            const precio = parseFloat(p.price);
            const costo = parseFloat((precio * 0.7).toFixed(2));

            finalProducts.push({
                nombre: cleanName,
                codigo: `PROD-${baseId}-${count + 1}`,
                categoria: "Importado",
                precio: precio,
                costo: costo,
                stock: 100,
                tipoUnidad: "unidad",
                favorito: count < 20,
                fecha_registro: new Date().toISOString(),
                jerarquia: {
                    bulto: { activo: false, nombre: "Bulto", contenido: 12, precio: precio * 11, codigo: "" },
                    paquete: { activo: false, nombre: "Paquete", contenido: 1, precio: 0, codigo: "" },
                    unidad: { activo: true, precio: precio, seVende: true, nombre: "Unidad" }
                },
                aplicaIva: true,
                exento: false,
                id: baseId + count,
                imagen: base64 // USAMOS 'imagen' CON N PARA QUE LISTO POS LA RECONOZCA
            });
            count++;
        }



        console.log(`\n📦 Total productos finales: ${finalProducts.length}`);

        backupBase.dexie.productos = finalProducts;
        backupBase._meta.fecha = new Date().toISOString();

        const outputPath = path.join(__dirname, 'RESPALDO_300_PRODUCTOS.json');
        fs.writeFileSync(outputPath, JSON.stringify(backupBase, null, 2));

        console.log(`\n✨ ¡Éxito! Respaldo generado en: ${outputPath}`);

    } catch (e) {
        console.error('\n❌ Error durante el scraping:', e);
    } finally {
        await browser.close();
    }
})();
