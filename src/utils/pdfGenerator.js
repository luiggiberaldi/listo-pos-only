import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const fmtMoney = (val) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);
const fmtBs = (val) => new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val || 0);

export const generateAccountStatementPDF = (cliente, transactions, stats, configuracion) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new jsPDF();
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            const tasa = configuracion?.tasa || 1;

            // COLORS
            const primaryColor = [30, 41, 59]; // Slate 800
            const accentColor = [99, 102, 241]; // Indigo 500
            const successColor = [16, 185, 129]; // Emerald 500
            const dangerColor = [239, 68, 68]; // Red 500

            // === HEADER ===
            // Top Strip
            doc.setFillColor(...accentColor);
            doc.rect(0, 0, pageWidth, 4, 'F');

            // Business Info (Left)
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text(configuracion?.nombreNegocio || 'MI NEGOCIO', 14, 20);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(100);
            if (configuracion?.rif) doc.text(`RIF: ${configuracion.rif}`, 14, 26);
            if (configuracion?.telefono) doc.text(`Tel: ${configuracion.telefono}`, 14, 31);
            if (configuracion?.direccion) doc.text(configuracion.direccion.substring(0, 50), 14, 36);

            // Document Title (Right)
            doc.setFontSize(16);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(50);
            doc.text('ESTADO DE CUENTA', pageWidth - 14, 20, { align: 'right' });

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Emisión: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, pageWidth - 14, 26, { align: 'right' });
            doc.text(`Tasa: Bs ${fmtBs(tasa)} / USD`, pageWidth - 14, 31, { align: 'right' });

            // === CLIENT INFO ===
            doc.setDrawColor(200);
            doc.line(14, 42, pageWidth - 14, 42);

            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...primaryColor);
            doc.text('INFORMACIÓN DEL CLIENTE', 14, 50);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(80);
            doc.text(`Nombre:`, 14, 56);
            doc.text(`Documento:`, 14, 61);
            doc.text(`Teléfono:`, 14, 66);

            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0);
            doc.text(cliente.nombre?.toUpperCase() || 'CLIENTE', 36, 56);
            doc.text(cliente.cedula || cliente.documento || 'N/A', 36, 61);
            doc.text(cliente.telefono || 'N/A', 36, 66);

            // === SUMMARY CARDS ===
            const startY = 75;
            const cardWidth = (pageWidth - 28 - 10) / 3;
            const cardHeight = 35; // Increased height for dual currency

            // 1. DEUDA
            doc.setFillColor(254, 242, 242); // Red 50
            doc.setDrawColor(252, 165, 165); // Red 200
            doc.roundedRect(14, startY, cardWidth, cardHeight, 3, 3, 'FD');

            doc.setFontSize(8);
            doc.setTextColor(...dangerColor);
            doc.text("DEUDA ACTUAL", 18, startY + 6);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${fmtMoney(cliente.deuda)}`, 18, startY + 14);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Bs ${fmtBs(cliente.deuda * tasa)}`, 18, startY + 20);

            // 2. MONEDERO
            doc.setFillColor(236, 253, 245); // Emerald 50
            doc.setDrawColor(110, 231, 183); // Emerald 300
            doc.roundedRect(14 + cardWidth + 5, startY, cardWidth, cardHeight, 3, 3, 'FD');

            doc.setFontSize(8);
            doc.setTextColor(...successColor);
            doc.text("SALDO A FAVOR", 18 + cardWidth + 5, startY + 6);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.text(`$${fmtMoney(cliente.favor)}`, 18 + cardWidth + 5, startY + 14);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Bs ${fmtBs(cliente.favor * tasa)}`, 18 + cardWidth + 5, startY + 20);


            // 3. NETO
            const neto = (cliente.favor || 0) - (cliente.deuda || 0);
            const boxColor = neto >= 0 ? [236, 253, 245] : [254, 242, 242];
            const textColor = neto >= 0 ? successColor : dangerColor;

            doc.setFillColor(248, 250, 252); // Slate 50
            doc.setDrawColor(226, 232, 240); // Slate 200
            doc.roundedRect(14 + (cardWidth * 2) + 10, startY, cardWidth, cardHeight, 3, 3, 'FD');

            doc.setFontSize(8);
            doc.setTextColor(100);
            doc.text("BALANCE NETO", 18 + (cardWidth * 2) + 10, startY + 6);
            doc.setFontSize(14);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...textColor);
            doc.text(`$${fmtMoney(Math.abs(neto))}`, 18 + (cardWidth * 2) + 10, startY + 14);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.text(`Bs ${fmtBs(Math.abs(neto) * tasa)}`, 18 + (cardWidth * 2) + 10, startY + 20);

            doc.setFontSize(8);
            doc.text(neto >= 0 ? "(A Favor)" : "(Debe)", 18 + (cardWidth * 2) + 10, startY + 28);

            // === TRANSACTIONS TABLE ===
            const tableStartY = startY + cardHeight + 10;

            const columns = [
                { header: 'Fecha', dataKey: 'fecha' },
                { header: 'Transacción', dataKey: 'tipo' },
                { header: 'Ref.', dataKey: 'ref' },
                { header: 'Cargos', dataKey: 'cargo' },
                { header: 'Abonos', dataKey: 'abono' },
                { header: 'Saldo', dataKey: 'saldo' },
            ];

            const rows = transactions.map(t => ({
                fecha: new Date(t.fecha).toLocaleDateString(),
                tipo: t.esAbono ? 'PAGO RECIBIDO' : 'VENTA A CRÉDITO',
                ref: `#${t.idVenta || t.id}`,
                cargo: t.esAbono ? '-' : `$${fmtMoney(t.cargoReal)}\nBs ${fmtBs(t.cargoReal * tasa)}`,
                abono: t.esAbono ? `$${fmtMoney(t.cargoReal)}\nBs ${fmtBs(t.cargoReal * tasa)}` : '-',
                saldo: `$${fmtMoney(t.saldoMomento)}\nBs ${fmtBs(t.saldoMomento * tasa)}`,
                // Styles check
                raw: t
            }));

            autoTable(doc, {
                startY: tableStartY,
                head: [columns.map(c => c.header)],
                body: rows.map(r => columns.map(c => r[c.dataKey])),
                theme: 'grid',
                headStyles: {
                    fillColor: primaryColor,
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold',
                    halign: 'center'
                },
                columnStyles: {
                    0: { cellWidth: 25 },
                    1: { cellWidth: 'auto' },
                    2: { cellWidth: 20 },
                    3: { halign: 'right', textColor: dangerColor, fontStyle: 'bold' },
                    4: { halign: 'right', textColor: successColor, fontStyle: 'bold' },
                    5: { halign: 'right', fontStyle: 'bold', fillColor: [248, 250, 252] }
                },
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    valign: 'middle'
                },
                didParseCell: (data) => {
                    // Highlight Rows or specific cells
                },
                margin: { top: 20 }
            });

            // === FOOTER ===
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text('Generado por BODEGUITA POS', 14, pageHeight - 10);
                doc.text(`Página ${i} de ${pageCount}`, pageWidth - 14, pageHeight - 10, { align: 'right' });
            }

            // === SAVE LÓGICA ROBUSTA ===
            const cleanName = (cliente.nombre || 'Cliente').replace(/[^a-z0-9]/gi, '_');
            const fileName = `EstadoCuenta_${cleanName}_${new Date().toISOString().slice(0, 10)}.pdf`;

            // 🔍 DIAGNÓSTICO DE INICIADO
            if (window.electronAPI && !window.electronAPI.savePDF) {
                alert("⚠️ ACTUALIZACIÓN REQUERIDA: Cierre y abra la aplicación para guardar archivos correctamente.");
            }

            // 1. ELECTRON
            if (window.electronAPI && window.electronAPI.savePDF) {
                const pdfArrayBuffer = doc.output('arraybuffer');
                window.electronAPI.savePDF(pdfArrayBuffer, fileName)
                    .then(result => {
                        if (result.success) {
                            import('sweetalert2').then(SwalModule => {
                                const Swal = SwalModule.default;
                                Swal.fire({
                                    icon: 'success',
                                    title: '¡Guardado Exitoso!',
                                    html: `Ubicación:<br/><small style="color:#666; word-break:break-all;">${result.path}</small>`,
                                    showDenyButton: true,
                                    confirmButtonText: '📄 Abrir Ahora',
                                    denyButtonText: '📂 Ver en Carpeta',
                                    confirmButtonColor: '#6366f1',
                                    denyButtonColor: '#64748b'
                                }).then((swalResult) => {
                                    if (swalResult.isConfirmed && result.path) {
                                        window.electronAPI.openFileDefault(result.path);
                                    } else if (swalResult.isDenied && result.path) {
                                        window.electronAPI.openFileLocation(result.path);
                                    }
                                });
                            });
                            resolve({ success: true, method: 'electron' });
                        } else {
                            if (!result.canceled) alert('Error guardando: ' + result.error);
                            resolve({ success: false, method: 'electron', error: result.error });
                        }
                    })
                    .catch(e => {
                        console.error(e);
                        reject(e);
                    });
                return;
            }

            // 2. BROWSER (MODERNO + FALLBACK)
            const blob = doc.output('blob');
            try {
                if (window.showSaveFilePicker) {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{ description: 'PDF File', accept: { 'application/pdf': ['.pdf'] } }],
                    });
                    const writable = await handle.createWritable();
                    await writable.write(blob);
                    await writable.close();

                    import('sweetalert2').then(SwalModule => {
                        SwalModule.default.fire({
                            icon: 'success',
                            title: 'Guardado',
                            text: 'El archivo se guardó en la carpeta seleccionada.',
                            timer: 3000
                        });
                    });
                } else {
                    throw new Error("API no soportada");
                }
            } catch (err) {
                // Fallback clásico: Blob Link
                console.log("Fallback download...", err);
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }

            resolve({ success: true, method: 'browser' });
        } catch (error) {
            reject(error);
        }
    });
};
