// 📄 CORTE Z PDF GENERATOR
// Genera reporte de Cierre de Caja (Corte Z) en PDF profesional.
// V1.0

import { savePdfUniversal } from './savePdfUniversal';

const fmtMoney = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
const fmtBs = (val) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

/**
 * Genera un PDF de Corte Z / Cierre de Caja.
 * @param {Object} corte - Objeto de corte con todos los datos del cierre
 * @param {Object} configuracion - Configuración del negocio (nombre, rif, etc.)
 */
export const generateCorteZPDF = async (corte, configuracion = {}) => {
    const { default: jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const tasa = configuracion?.tasa || corte?.tasaCambio || 1;

    // COLORS
    const primary = [30, 41, 59];
    const accent = [99, 102, 241];
    const success = [16, 185, 129];
    const danger = [239, 68, 68];
    const muted = [148, 163, 184];

    // ═══ HEADER ═══
    doc.setFillColor(...accent);
    doc.rect(0, 0, pw, 5, 'F');

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text(configuracion?.nombreNegocio || 'MI NEGOCIO', 14, 18);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    let yInfo = 24;
    if (configuracion?.rif) { doc.text(`RIF: ${configuracion.rif}`, 14, yInfo); yInfo += 5; }
    if (configuracion?.telefono) { doc.text(`Tel: ${configuracion.telefono}`, 14, yInfo); yInfo += 5; }
    if (configuracion?.direccion) { doc.text(configuracion.direccion.substring(0, 60), 14, yInfo); }

    // Title right
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accent);
    doc.text('CORTE Z', pw - 14, 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80);
    doc.text(`Ref: ${corte.id || corte.corteRef || '—'}`, pw - 14, 24, { align: 'right' });
    doc.text(`Fecha: ${new Date(corte.fecha).toLocaleString()}`, pw - 14, 29, { align: 'right' });
    doc.text(`Operador: ${corte.usuario || '—'}`, pw - 14, 34, { align: 'right' });

    // ═══ SEPARATOR ═══
    doc.setDrawColor(220);
    doc.line(14, 42, pw - 14, 42);

    // ═══ KPIs CARDS (2x3) ═══
    let y = 48;
    const cardW = (pw - 28 - 10) / 3;
    const cardH = 22;

    const kpiCards = [
        { label: 'VENTAS TOTALES', value: `$${fmtMoney(corte.ventasTotales || corte.ventasNetas)}`, color: success },
        { label: 'TOTAL GASTOS', value: `$${fmtMoney(corte.totalGastos)}`, color: danger },
        { label: 'UTILIDAD BRUTA', value: `$${fmtMoney(corte.utilidadBruta)}`, color: accent },
        { label: 'TRANSACCIONES', value: `${corte.totalTransacciones || 0}`, color: [59, 130, 246] },
        { label: 'MARGEN', value: `${corte.margenReal || 0}%`, color: [236, 72, 153] },
        { label: 'DESCUADRE', value: `$${fmtMoney(corte.descuadre || 0)}`, color: corte.descuadre ? danger : success },
    ];

    kpiCards.forEach((card, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 14 + col * (cardW + 5);
        const cy = y + row * (cardH + 5);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(x, cy, cardW, cardH, 2, 2, 'FD');

        doc.setFontSize(7);
        doc.setTextColor(120);
        doc.setFont('helvetica', 'bold');
        doc.text(card.label, x + 4, cy + 7);

        doc.setFontSize(14);
        doc.setTextColor(...card.color);
        doc.text(card.value, x + 4, cy + 17);
    });

    // ═══ BALANCES TABLE ═══
    y = y + 2 * (cardH + 5) + 10;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text('BALANCES DE CAJA', 14, y);
    y += 6;

    const balAp = corte.balancesApertura || {};
    const balFin = corte.balancesFinales || {};

    const balanceRows = [
        ['USD Efectivo', `$${fmtMoney(balAp.usdCash || balAp.USD)}`, `$${fmtMoney(balFin.usdCash || balFin.USD)}`],
        ['USD Digital', `$${fmtMoney(balAp.usdDigital)}`, `$${fmtMoney(balFin.usdDigital)}`],
        ['VES Efectivo', `Bs ${fmtBs(balAp.vesCash || balAp.VES)}`, `Bs ${fmtBs(balFin.vesCash || balFin.VES)}`],
        ['VES Digital', `Bs ${fmtBs(balAp.vesDigital)}`, `Bs ${fmtBs(balFin.vesDigital)}`],
    ];

    doc.autoTable({
        startY: y,
        head: [['Medio', 'Apertura', 'Cierre']],
        body: balanceRows,
        theme: 'striped',
        headStyles: { fillColor: primary, fontSize: 9, fontStyle: 'bold', halign: 'center' },
        columnStyles: {
            0: { fontStyle: 'bold' },
            1: { halign: 'right' },
            2: { halign: 'right', fontStyle: 'bold' },
        },
        styles: { fontSize: 9, cellPadding: 3 },
        margin: { left: 14, right: 14 }
    });

    // ═══ ADDITIONAL INFO ═══
    y = doc.lastAutoTable.finalY + 10;

    if (corte.totalAbonos || corte.totalCreditos) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...primary);
        doc.text('OPERACIONES ADICIONALES', 14, y);
        y += 5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(80);
        if (corte.totalAbonos) { doc.text(`Abonos cobrados: $${fmtMoney(corte.totalAbonos)}`, 14, y); y += 5; }
        if (corte.totalCreditos) { doc.text(`Ventas a crédito: $${fmtMoney(corte.totalCreditos)}`, 14, y); y += 5; }
        if (corte.ventasAnuladas) { doc.text(`Ventas anuladas: $${fmtMoney(corte.ventasAnuladas)}`, 14, y); y += 5; }
    }

    if (tasa > 1) {
        y += 3;
        doc.setFontSize(8);
        doc.setTextColor(...muted);
        doc.text(`Tasa de cambio: Bs ${fmtBs(tasa)} / USD`, 14, y);
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

    // ═══ SAVE ═══
    const dateStr = new Date(corte.fecha).toISOString().slice(0, 10);
    const fileName = `CorteZ_${corte.id || dateStr}_${dateStr}.pdf`;
    return savePdfUniversal(doc, fileName);
};
