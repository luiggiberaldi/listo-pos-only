import jsPDF from 'jspdf';

/**
 * GENERADOR DE ETIQUETAS "PRO" (WYSIWYG)
 * Genera el documento PDF y lo devuelve para descarga o preview.
 * 
 * V2.1 - Soporte de Jerarquías (Bulto/Paquete)
 */

// --- API PÚBLICA ---

export const generarEtiquetas = (productos, tasa, config) => {
    const doc = createPDFDoc(productos, tasa, config);
    if (!doc) return;

    if (config.papel === 'letter') {
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`ETIQUETAS_${dateStr}.pdf`);
    } else {
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        const iframe = document.createElement('iframe');
        Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
        iframe.src = blobUrl;
        document.body.appendChild(iframe);

        iframe.onload = () => {
            try {
                iframe.contentWindow.focus();
                iframe.contentWindow.print();
            } catch (e) {
                console.error("Error printing from iframe:", e);
                window.open(blobUrl, '_blank');
            }
        };
    }
};

export const generarPreviewURL = (productos, tasa, config) => {
    const doc = createPDFDoc(productos, tasa, config);
    if (!doc) return null;
    return doc.output('bloburl');
};

// --- CORE ENGINE ---

const createPDFDoc = (productos, tasa, config) => {
    if (!productos || productos.length === 0) return null;

    const cfg = {
        papel: config.papel || '58mm',
        moneda: config.moneda || 'mix',
        fontSize: config.fontSize || 28,
        fontSizeSecondary: config.fontSizeSecondary || 14,
        tituloSize: config.tituloSize || 10,
        showDate: config.showDate ?? true,
        showCode: config.showCode ?? true,
        showBorder: config.showBorder ?? false,
        fontFamily: config.fontFamily || 'helvetica',
        designTemplate: config.designTemplate || 'modern',
        hierarchyScale: config.hierarchyScale ?? 1,
        hierarchyY: config.hierarchyY ?? 0,
        titleY: config.titleY ?? 0,
        priceY: config.priceY ?? 0,
        secondaryPriceY: config.secondaryPriceY ?? 0,
        footerY: config.footerY ?? 0,
        footerFontSize: config.footerFontSize ?? 7,
        marginX: config.marginX ?? 1,
        marginY: config.marginY ?? 1
    };

    const isTicket = cfg.papel === '58mm' || cfg.papel === '80mm';
    const width = cfg.papel === '58mm' ? 58 : cfg.papel === '80mm' ? 80 : 215.9;
    const height = isTicket ? 40 : 279.4;

    const orientation = width > height ? 'landscape' : 'portrait';

    const doc = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: isTicket ? [width, height] : 'letter'
    });

    if (isTicket) {
        productos.forEach((p, index) => {
            if (index > 0) doc.addPage([width, height], orientation);
            renderEtiqueta(doc, p, tasa, 0, 0, width, height, cfg);
        });
    } else {
        renderGrid(doc, productos, tasa, cfg);
    }

    return doc;
};

// --- RENDERERS ---

const renderGrid = (doc, productos, tasa, cfg) => {
    const cols = 3;
    const rows = 7;
    const cellW = 66;
    const cellH = 36;
    const pageMarginX = 7;
    const pageMarginY = 12;
    const gapX = 3;
    const gapY = 0;

    let col = 0;
    let row = 0;

    productos.forEach((p) => {
        const x = pageMarginX + (col * (cellW + gapX));
        const y = pageMarginY + (row * (cellH + gapY));
        renderEtiqueta(doc, p, tasa, x, y, cellW, cellH, cfg);
        col++;
        if (col >= cols) {
            col = 0;
            row++;
            if (row >= rows) {
                doc.addPage();
                row = 0;
            }
        }
    });
};

const renderEtiqueta = (doc, p, tasa, x, y, w, h, cfg) => {
    // 🛡️ MÁRGENES SEGUROS (User Defined)
    const isTicket = cfg.papel === '58mm' || cfg.papel === '80mm';
    const marginX = cfg.marginX ?? (isTicket ? 4 : 1);
    const marginY = cfg.marginY ?? 1;
    const printableWidth = w - (marginX * 2);
    const printableHeight = h - (marginY * 2);

    const centerX = x + (w / 2);

    // --- 1. GEOMETRÍA & PRE-CÁLCULO ---
    // Calculamos alturas ANTES de dibujar nada para adaptar los fondos

    doc.setFont(cfg.fontFamily, "bold");
    doc.setFontSize(cfg.tituloSize);
    const titleLines = doc.splitTextToSize(p.nombre.toUpperCase(), printableWidth - 2);
    const safeLines = titleLines.slice(0, 2);

    const lineHeight = cfg.tituloSize * 0.3527 * 1.2;
    const titleHeight = safeLines.length * lineHeight;

    // Posición Vertical Título (Base)
    let titleTopV = y + marginY + 0.5; // Empezamos pegados al margen
    if (cfg.designTemplate === 'retail') titleTopV += 2; // Retail baja un poco el texto dentro de la caja
    if (cfg.designTemplate === 'boutique') titleTopV += 4; // Boutique baja más

    // Offset Título
    titleTopV += (cfg.titleY || 0);
    titleTopV = Math.max(titleTopV, y + marginY + 0.5);

    // Dynamic Header Height (Retail)
    let retailHeaderH = 0;
    if (cfg.designTemplate === 'retail') {
        retailHeaderH = Math.max(12, titleHeight + 4); // Mínimo 12mm, o lo que ocupe el texto + padding
    }

    // --- 2. DIBUJO DE FONDOS (CAPA 0) ---

    if (cfg.designTemplate === 'retail') {
        doc.setFillColor(0, 0, 0);
        // El header nace en el margen Y, altura dinámica
        doc.rect(x + marginX, y + marginY, printableWidth, retailHeaderH, 'F');

        if (cfg.showBorder) {
            doc.setDrawColor(0); doc.setLineWidth(0.5);
            doc.rect(x + marginX, y + marginY, printableWidth, printableHeight);
        }
    } else if (cfg.designTemplate === 'boutique') {
        // Marco Doble Elegante
        doc.setDrawColor(0); doc.setLineWidth(0.4);
        doc.rect(x + marginX, y + marginY, printableWidth, printableHeight);

        const innerGap = 1.5;
        doc.setLineWidth(0.2);
        // Verificamos que cabe el marco interno
        if (printableWidth > innerGap * 2 && printableHeight > innerGap * 2) {
            doc.rect(x + marginX + innerGap, y + marginY + innerGap, printableWidth - (innerGap * 2), printableHeight - (innerGap * 2));
        }
    } else {
        // Modern / Default
        if (cfg.showBorder) {
            doc.setLineWidth(0.5); doc.setDrawColor(0);
            doc.rect(x + marginX, y + marginY, printableWidth, printableHeight);
        }
    }

    // ==========================================
    // 🛡️ SISTEMA "CAÍDA LIBRE" (GRAVITY LAYOUT)
    // ==========================================

    let safeY = y + marginY + 0.5;
    const MIN_GAP = 0.5;

    // --- 3. RENDER TÍTULO ---
    if (cfg.designTemplate === 'retail') {
        // Si es Retail, forzamos color blanco, PERO si el usuario sacó el título del header (titleY muy grande),
        // deberíamos cambiarlo a negro. Por simplicidad, asumimos que Retail = Fondo Negro en Header.
        doc.setTextColor(255, 255, 255);
        if (titleTopV > y + marginY + retailHeaderH) doc.setTextColor(0, 0, 0); // Oops, se salió
    } else {
        doc.setTextColor(0, 0, 0);
    }

    doc.text(safeLines, centerX, titleTopV, { align: "center", baseline: "top" });

    // safeY update
    safeY = titleTopV + titleHeight + MIN_GAP;

    // Si estamos en Retail, el SafeY debe respetar el header SI O SI
    if (cfg.designTemplate === 'retail') {
        safeY = Math.max(safeY, y + marginY + retailHeaderH + 1);
    }

    doc.setTextColor(0, 0, 0);

    // --- 4. BADGE JERARQUÍA ---
    if (p._hierarchyLabel) {
        const hScale = cfg.hierarchyScale || 1;
        const hOffsetY = cfg.hierarchyY || 0;
        const hBadge = 4 * hScale;

        let badgeIntendedTop = safeY + 1 + hOffsetY;
        const finalBadgeTop = Math.max(badgeIntendedTop, safeY);

        // Estilo Badge según plantilla
        if (cfg.designTemplate === 'boutique') doc.setDrawColor(0); // Negro puro
        else doc.setDrawColor(100); // Gris

        doc.setLineWidth(0.1);
        const radius = 1.5 * hScale;
        const currentPadding = 4 * hScale;
        const badgeW = doc.getTextWidth(p._hierarchyLabel) + currentPadding;

        doc.roundedRect(centerX - (badgeW / 2), finalBadgeTop, badgeW, hBadge, radius, radius, 'S');

        const fontSizeBadge = 7 * hScale;
        doc.setFontSize(fontSizeBadge);
        doc.setFont(cfg.fontFamily, 'normal');
        doc.setTextColor(60);
        doc.text(p._hierarchyLabel, centerX, finalBadgeTop + (hBadge / 2) + (0.1 * hScale), { align: 'center', baseline: 'middle' });
        doc.setTextColor(0);

        safeY = finalBadgeTop + hBadge + MIN_GAP;
    }

    // --- 5. PRECIOS ---
    const pxToMm = 0.3527;
    const hPrimary = cfg.fontSize * pxToMm * 0.8;

    const precioRef = parseFloat(p.precioVenta || p.precio || 0);
    const precioBs = Math.ceil(precioRef * tasa);

    const renderPrimary = () => {
        doc.setFont(cfg.fontFamily, "bold");
        doc.setFontSize(cfg.fontSize);

        let defaultGap = p._hierarchyLabel ? 1 : 2;
        let intendedTop = safeY + defaultGap;
        intendedTop += (cfg.priceY || 0);

        let finalTop = Math.max(intendedTop, safeY);

        // 🛡️ Enforcement Margen Inferior
        const bottomBoundary = y + h - marginY - 4;
        if (finalTop + hPrimary > bottomBoundary) {
            finalTop = Math.max(safeY, bottomBoundary - hPrimary);
        }

        const text = cfg.moneda === 'bs'
            ? `Bs ${precioBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
            : `$${precioRef.toFixed(2)}`;

        doc.text(text, centerX, finalTop, { align: "center", baseline: "top" });

        safeY = finalTop + hPrimary + MIN_GAP;
    };

    renderPrimary();

    if (cfg.moneda === 'mix') {
        const hSecondary = cfg.fontSizeSecondary * pxToMm * 0.8;
        doc.setFont(cfg.fontFamily, "normal");
        doc.setFontSize(cfg.fontSizeSecondary);

        let intendedTop = safeY;
        intendedTop += (cfg.secondaryPriceY || 0);

        let finalTop = Math.max(intendedTop, safeY);

        const bottomBoundary = y + h - marginY - 2;
        if (finalTop + hSecondary > bottomBoundary) {
            finalTop = Math.max(safeY, bottomBoundary - hSecondary);
        }

        const bsText = `Bs ${precioBs.toLocaleString('es-VE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        const finalBsText = cfg.designTemplate === 'boutique' ? `~ ${bsText} ~` : bsText;

        doc.text(finalBsText, centerX, finalTop, { align: 'center', baseline: "top" });
        safeY = finalTop + hSecondary + MIN_GAP;
    }

    // --- 6. FOOTER ---
    const footerParts = [];
    if (cfg.showCode) footerParts.push(p.codigo || 'S/C');
    if (cfg.showDate) footerParts.push(new Date().toLocaleDateString());

    if (footerParts.length > 0) {
        // Vertical Position: Base (Bottom - Margin) + Offset User
        let footerY = y + h - marginY - 1;
        footerY += (cfg.footerY || 0);

        // 🛡️ GRAVITY ENFORCEMENT (Anti-Colisión)
        // El footer no puede subir más allá del último elemento (safeY)
        footerY = Math.max(footerY, safeY + MIN_GAP);

        // 🛡️ PAGE BOUNDARY ENFORCEMENT
        // El footer no puede caerse del papel
        // Si safeY ya empujó el footer fuera del papel, priorizamos safeY (evitar solapamiento) 
        // aunque se corte el footer, es preferible a que tape el precio.
        const maxFooterY = y + h - marginY - 2; // -2mm buffer
        if (footerY > maxFooterY) {
            // Opcional: Warning visual? Por ahora dejamos que se renderice o se corte
            // pero intentamos mantenerlo dentro si es posible
        }

        doc.setFont(cfg.fontFamily, "normal");
        doc.setFontSize(cfg.footerFontSize || 7);
        doc.setTextColor(80);

        // Render
        doc.text(footerParts.join('  |  '), centerX, footerY, { align: "center", baseline: "bottom" });
        doc.setTextColor(0);
    }
};
