// 📄 DAILY REPORT PDF GENERATOR
// Genera reporte diario de análisis de negocio (Dashboard KPIs).
// V1.0

import { savePdfUniversal } from './savePdfUniversal';

const fmtMoney = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

/**
 * Genera PDF de Reporte Diario con KPIs, Top Productos y Top Clientes.
 * @param {Object} data - { kpis, variacionAyer, topProductos, topClientes, saludDatos }
 * @param {Object} configuracion - Configuración del negocio
 */
export const generateDailyReportPDF = async (data, configuracion = {}) => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const simbolo = configuracion?.monedaPrincipal === 'VES' ? 'Bs' : '$';

    // COLORS
    const primary = [30, 41, 59];
    const accent = [99, 102, 241];
    const success = [16, 185, 129];
    const muted = [148, 163, 184];

    const { kpis = {}, variacionAyer = 0, topProductos = [], topClientes = [], saludDatos = {} } = data;

    // ═══ HEADER ═══
    doc.setFillColor(...accent);
    doc.rect(0, 0, pw, 5, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text(configuracion?.nombreNegocio || 'MI NEGOCIO', 14, 18);

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accent);
    doc.text('REPORTE DIARIO', pw - 14, 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, pw - 14, 24, { align: 'right' });
    doc.text(`Registros analizados: ${saludDatos.totalRegistros || 0}`, pw - 14, 29, { align: 'right' });

    if (configuracion?.rif) doc.text(`RIF: ${configuracion.rif}`, 14, 24);

    doc.setDrawColor(220);
    doc.line(14, 34, pw - 14, 34);

    // ═══ KPIs ═══
    let y = 42;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('INDICADORES CLAVE', 14, y);
    y += 8;

    const cardW = (pw - 28 - 15) / 4;
    const cardH = 28;
    const hoy = kpis.hoy || {};
    const mes = kpis.mes || {};

    const kpiCards = [
        { label: 'VENTAS HOY', value: `${simbolo}${fmtMoney(hoy.total)}`, sub: `${hoy.count || 0} operaciones`, color: success },
        { label: 'GANANCIA', value: `${simbolo}${fmtMoney(hoy.ganancia)}`, sub: 'Margen neto', color: [59, 130, 246] },
        { label: 'TICKET PROM.', value: `${simbolo}${fmtMoney(hoy.ticketPromedio)}`, sub: 'Gasto por cliente', color: accent },
        { label: 'TOTAL MES', value: `${simbolo}${fmtMoney(mes.total)}`, sub: `${mes.count || 0} ventas`, color: [236, 72, 153] },
    ];

    kpiCards.forEach((card, i) => {
        const x = 14 + i * (cardW + 5);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

        doc.setFontSize(6.5);
        doc.setTextColor(120);
        doc.setFont('helvetica', 'bold');
        doc.text(card.label, x + 3, y + 7);

        doc.setFontSize(13);
        doc.setTextColor(...card.color);
        doc.text(card.value, x + 3, y + 17);

        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.setFont('helvetica', 'normal');
        doc.text(card.sub, x + 3, y + 23);
    });

    // Variación badge
    if (variacionAyer !== 0) {
        const vSign = variacionAyer >= 0 ? '▲' : '▼';
        const vColor = variacionAyer >= 0 ? success : [239, 68, 68];
        doc.setFontSize(8);
        doc.setTextColor(...vColor);
        doc.setFont('helvetica', 'bold');
        doc.text(`${vSign} ${Math.abs(variacionAyer)}% vs ayer`, 14, y + cardH + 6);
    }

    // ═══ TOP PRODUCTOS ═══
    y = y + cardH + 14;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('TOP PRODUCTOS', 14, y);
    y += 4;

    if (topProductos.length > 0) {
        doc.autoTable({
            startY: y,
            head: [['#', 'Producto', 'Cantidad', 'Ingresos']],
            body: topProductos.slice(0, 10).map((p, i) => [
                i + 1,
                (p.nombre || '').toUpperCase(),
                `${p.cantidad || 0} uds`,
                `${simbolo}${fmtMoney(p.ingresos)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], fontSize: 8, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { fontStyle: 'bold' },
                2: { halign: 'center' },
                3: { halign: 'right', textColor: success, fontStyle: 'bold' },
            },
            styles: { fontSize: 8, cellPadding: 2.5 },
            margin: { left: 14, right: pw / 2 + 5 }
        });
    }

    // ═══ TOP CLIENTES ═══
    const topCliY = y;
    if (topClientes.length > 0) {
        doc.autoTable({
            startY: topCliY,
            head: [['#', 'Cliente', 'Visitas', 'Total']],
            body: topClientes.slice(0, 10).map((c, i) => [
                i + 1,
                (c.nombre || '').toUpperCase(),
                `${c.visitas || 0}`,
                `${simbolo}${fmtMoney(c.totalGasto)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: accent, fontSize: 8, fontStyle: 'bold' },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { fontStyle: 'bold' },
                2: { halign: 'center' },
                3: { halign: 'right', textColor: accent, fontStyle: 'bold' },
            },
            styles: { fontSize: 8, cellPadding: 2.5 },
            margin: { left: pw / 2 + 5, right: 14 }
        });
    }

    // ═══ FOOTER ═══
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(...accent);
        doc.rect(0, ph - 3, pw, 3, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(`Generado por ${configuracion?.nombreNegocio || 'LISTO POS'} • ${new Date().toLocaleString()}`, 14, ph - 7);
        doc.text(`Página ${i}/${pages}`, pw - 14, ph - 7, { align: 'right' });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    return savePdfUniversal(doc, `ReporteDiario_${dateStr}.pdf`);
};
