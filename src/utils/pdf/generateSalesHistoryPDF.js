// 📄 SALES HISTORY PDF GENERATOR
// Genera listado de ventas filtrado en PDF.
// V1.0

import { savePdfUniversal } from './savePdfUniversal';
import { s } from './pdfTextSanitizer';

const fmtMoney = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

/**
 * Genera PDF de Historial de Ventas con detalle de transacciones.
 * @param {Array} ventas - Array de ventas filtradas
 * @param {Object} filtros - { fechaDesde, fechaHasta, busqueda }
 * @param {Object} configuracion - Configuración del negocio
 */
export const generateSalesHistoryPDF = async (ventas = [], filtros = {}, configuracion = {}) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');

    const doc = new jsPDF('landscape'); // Landscape for more columns
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const simbolo = configuracion?.monedaPrincipal === 'VES' ? 'Bs' : '$';

    // COLORS
    const primary = [30, 41, 59];
    const accent = [99, 102, 241];
    const success = [16, 185, 129];
    const danger = [239, 68, 68];
    const muted = [148, 163, 184];

    // ═══ HEADER ═══
    doc.setFillColor(...accent);
    doc.rect(0, 0, pw, 4, 'F');

    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text(configuracion?.nombreNegocio || 'MI NEGOCIO', 14, 14);

    doc.setFontSize(14);
    doc.setTextColor(...accent);
    doc.text('HISTORIAL DE VENTAS', pw - 14, 14, { align: 'right' });

    // Filter info
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    let filterText = `Emitido: ${new Date().toLocaleString()}`;
    if (filtros.fechaDesde) filterText += ` • Desde: ${filtros.fechaDesde}`;
    if (filtros.fechaHasta) filterText += ` • Hasta: ${filtros.fechaHasta}`;
    if (filtros.busqueda) filterText += ` • Filtro: "${filtros.busqueda}"`;
    doc.text(filterText, 14, 20);
    doc.text(`${ventas.length} transacciones`, pw - 14, 20, { align: 'right' });

    doc.setDrawColor(220);
    doc.line(14, 24, pw - 14, 24);

    // ═══ SUMMARY ROW ═══
    const validSales = ventas.filter(v => v.status !== 'ANULADA');
    const totalVentas = validSales.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);
    const totalItems = validSales.reduce((sum, v) => sum + (v.items?.length || 0), 0);
    const anuladas = ventas.filter(v => v.status === 'ANULADA').length;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...primary);
    doc.text(`Total: ${simbolo}${fmtMoney(totalVentas)}`, 14, 30);
    doc.text(`Ítems vendidos: ${totalItems}`, pw / 3, 30);
    doc.setTextColor(...danger);
    doc.text(`Anuladas: ${anuladas}`, pw * 2 / 3, 30);
    doc.setTextColor(...success);
    doc.text(`Válidas: ${validSales.length}`, pw - 14, 30, { align: 'right' });

    // ═══ SALES TABLE ═══
    const tableData = ventas.map(v => {
        const fecha = new Date(v.fecha);
        const statusLabel = v.status === 'ANULADA' ? 'ANULADA' : 'VALIDA';
        const clienteNombre = s(v.clienteNombre || v.cliente?.nombre || 'Contado');
        const items = s(v.items?.map(i => i.nombre).join(', ').substring(0, 40) || '—');
        // Extraer métodos de pago desde v.payments (estructura real)
        const pagos = v.payments || [];
        const metodosUnicos = [...new Set(pagos.map(p => p.method))];
        const metodos = metodosUnicos.length > 0 ? metodosUnicos.join(', ') : (v.esCredito ? 'Credito' : '—');

        return [
            `${fecha.toLocaleDateString()}\n${fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            `#${v.correlativo || v.id?.toString().slice(-6) || '—'}`,
            clienteNombre.substring(0, 20),
            items,
            metodos,
            `${simbolo}${fmtMoney(v.total)}`,
            statusLabel
        ];
    });

    autoTable(doc, {
        startY: 34,
        head: [['Fecha', 'Ref', 'Cliente', 'Productos', 'Pago', 'Total', 'Estado']],
        body: tableData,
        theme: 'grid',
        headStyles: {
            fillColor: primary,
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold',
            halign: 'center'
        },
        columnStyles: {
            0: { cellWidth: 28 },
            1: { cellWidth: 22, halign: 'center' },
            2: { cellWidth: 30 },
            3: { cellWidth: 'auto', fontSize: 7 },
            4: { cellWidth: 28, fontSize: 7 },
            5: { cellWidth: 24, halign: 'right', fontStyle: 'bold', textColor: primary },
            6: { cellWidth: 22, halign: 'center', fontSize: 7 },
        },
        styles: {
            fontSize: 7.5,
            cellPadding: 2,
            valign: 'middle',
            overflow: 'ellipsize'
        },
        didParseCell: (data) => {
            // Highlight anuladas in red background
            if (data.section === 'body' && data.row.raw) {
                const statusCell = data.row.raw[6];
                if (statusCell && statusCell.includes('ANULADA')) {
                    if (data.column.index === 6) {
                        data.cell.styles.textColor = danger;
                        data.cell.styles.fontStyle = 'bold';
                    }
                    data.cell.styles.fillColor = [254, 242, 242]; // Red 50
                } else if (data.column.index === 6) {
                    data.cell.styles.textColor = success;
                }
            }
        },
        margin: { left: 14, right: 14, top: 30 },
    });

    // ═══ FOOTER ═══
    const pages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFillColor(...accent);
        doc.rect(0, ph - 3, pw, 3, 'F');
        doc.setFontSize(7);
        doc.setTextColor(...muted);
        doc.text(`Generado por ${configuracion?.nombreNegocio || 'LISTO POS'} • ${new Date().toLocaleString()}`, 14, ph - 6);
        doc.text(`Página ${i}/${pages}`, pw - 14, ph - 6, { align: 'right' });
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    return savePdfUniversal(doc, `HistorialVentas_${dateStr}.pdf`);
};
