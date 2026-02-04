import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Upload, X, Download, AlertTriangle, FileSpreadsheet, Check } from 'lucide-react';
import Swal from 'sweetalert2';
import { db } from '../../db';

export const BulkImportModal = ({ isOpen, onClose, onImportCompleted }) => {
    const fileInputRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [previewData, setPreviewData] = useState(null);
    const [stats, setStats] = useState({ total: 0, nuevos: 0, existentes: 0 });

    if (!isOpen) return null;

    // 1. DESCARGAR PLANTILLA
    const downloadTemplate = () => {
        const rows = [
            ["codigo", "nombre", "categoria", "costo", "precio", "stock", "minimo"],
            ["750123456789", "ARROZ PREMIUM 1KG", "VIVERES", 0.85, 1.25, 100, 10],
            ["P002", "DETERGENTE MULTIUSO", "LIMPIEZA", 2.10, 3.50, 48, 6],
            ["", "PRODUCTO SIN CODIGO", "GENERAL", 5.00, 7.50, 10, 2]
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
        XLSX.writeFile(wb, "Plantilla_Inventario_ListoPOS.xlsx");
    };

    // 2. LEER ARCHIVO
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();

        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { defval: null });

                if (data.length === 0) {
                    throw new Error("El archivo está vacío.");
                }

                await analyzeData(data);
            } catch (error) {
                console.error(error);
                Swal.fire("Error", error.message || "No se pudo procesar el archivo.", "error");
                setIsProcessing(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    // 3. ANÁLISIS Y SANITIZACIÓN
    const analyzeData = async (rawData) => {
        // Mapeo Inteligente: Diccionario de sinónimos
        const columnMap = {
            nombre: ['nombre', 'producto', 'articulo', 'descripcion', 'name', 'item'],
            codigo: ['codigo', 'cod', 'sku', 'id_externo', 'barcode', 'ean'],
            precio: ['precio', 'p.venta', 'venta', 'p.publico', 'price', 'precioventa'],
            costo: ['costo', 'p.compra', 'compra', 'p.costo', 'cost', 'preciocosto'],
            stock: ['stock', 'cantidad', 'cant', 'existencia', 'qty', 'amount'],
            categoria: ['categoria', 'cat', 'rubro', 'category', 'departamento'],
            minimo: ['minimo', 'stockminimo', 'min', 'alerta']
        };

        const getColumnValue = (row, target) => {
            const keys = Object.keys(row);
            const synonyms = columnMap[target] || [];
            const key = keys.find(k => {
                const normalizedKey = k.toLowerCase().replace(/[\s_/]/g, '');
                return synonyms.includes(normalizedKey) || normalizedKey === target;
            });
            return key ? row[key] : null;
        };

        const allProducts = await db.productos.toArray();
        const codeMap = new Map();
        allProducts.forEach(p => {
            if (p.codigo) codeMap.set(String(p.codigo).trim(), p.id);
        });

        let nuevos = 0;
        let existentes = 0;
        let validRows = [];
        const timestamp = Date.now();

        rawData.forEach((row, i) => {
            // Sanitización: Quitar símbolos de moneda y manejar comas
            const cleanNumber = (val) => {
                if (val === null || val === undefined) return 0;
                if (typeof val === 'number') return val;
                const cleanStr = String(val).replace(/[$\sBs]/g, '').replace(',', '.');
                return parseFloat(cleanStr) || 0;
            };

            let codigo = String(getColumnValue(row, 'codigo') || '').trim();
            const nombre = String(getColumnValue(row, 'nombre') || '').trim().toUpperCase();

            // Si no tiene nombre, saltar (REQUISITO: Nombre es vital)
            if (!nombre) return;

            // REQUISITO: Código automático si está vacío
            if (!codigo) {
                codigo = `IMP-${timestamp}-${i}`;
            }

            const item = {
                codigo,
                nombre,
                categoria: String(getColumnValue(row, 'categoria') || 'General').trim().toUpperCase(),
                costo: cleanNumber(getColumnValue(row, 'costo')),
                precio: cleanNumber(getColumnValue(row, 'precio')),
                stock: cleanNumber(getColumnValue(row, 'stock')),
                stockMinimo: cleanNumber(getColumnValue(row, 'minimo')) || 5,
                jerarquia: {
                    unidad: { activo: true, precio: cleanNumber(getColumnValue(row, 'precio')), contenido: 1 },
                    paquete: { activo: false, precio: 0, contenido: 0 },
                    bulto: { activo: false, precio: 0, contenido: 0 }
                },
                tipoUnidad: 'unidad',
                fecha_creacion: new Date().toISOString()
            };

            if (codeMap.has(codigo)) {
                existentes++;
                item._exists = true;
                item.id = codeMap.get(codigo);
            } else {
                nuevos++;
            }
            validRows.push(item);
        });

        setStats({ total: validRows.length, nuevos, existentes });
        setPreviewData(validRows);
        setIsProcessing(false);
    };

    // 4. GUARDAR EN BD
    const handleImport = async () => {
        if (!previewData) return;

        let updateExisting = false;
        if (stats.existentes > 0) {
            const { isConfirmed } = await Swal.fire({
                title: 'Duplicados Detectados',
                text: `Hay ${stats.existentes} productos ya registrados. ¿Quieres actualizar sus datos (Precio/Stock) o saltarlos?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'ACTUALIZAR EXISTENTES',
                cancelButtonText: 'SALTAR (Solo Nuevos)',
                reverseButtons: true
            });
            updateExisting = isConfirmed;
        }

        setIsProcessing(true);
        try {
            const toSave = previewData
                .filter(p => !p._exists || updateExisting)
                .map(({ _exists, ...p }) => p);

            if (toSave.length === 0) {
                Swal.fire("Sin cambios", "No hay productos nuevos para importar.", "info");
                return;
            }

            // --- TRANSACCIÓN ATÓMICA CON KARDEX ---
            await db.transaction('rw', db.productos, db.logs, async () => {
                // REQUISITO: bulkAdd para nuevos, bulkPut si actualizamos
                if (updateExisting) {
                    await db.productos.bulkPut(toSave);
                } else {
                    await db.productos.bulkAdd(toSave);
                }

                // Registro Maestro en Kardex
                await db.logs.add({
                    fecha: new Date().toISOString(),
                    tipo: 'ENTRADA_INICIAL',
                    producto: 'IMPORTACIÓN MASIVA',
                    cantidad: toSave.length,
                    stockFinal: 0,
                    referencia: 'EXCEL/CSV',
                    detalle: `Importación masiva de ${toSave.length} productos${updateExisting ? ' (incluye actualizaciones)' : ''}.`,
                    usuarioId: 'admin',
                    usuarioNombre: 'Administrador'
                });
            });

            Swal.fire({
                title: '¡Importación Completada!',
                text: `Se procesaron ${toSave.length} registros exitosamente.`,
                icon: 'success',
                timer: 3000
            });

            if (onImportCompleted) onImportCompleted();
            onClose();
        } catch (error) {
            console.error(error);
            Swal.fire("Fallo Crítico", "Error en la transacción: " + error.message, "error");
        } finally {
            setIsProcessing(false);
            setPreviewData(null);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
            <div className="bg-surface-light dark:bg-surface-dark w-full max-w-2xl rounded-2xl shadow-2xl border border-white/10 flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="p-6 border-b border-border-subtle dark:border-white/5 flex justify-between items-center bg-app-light dark:bg-slate-900/50 rounded-t-2xl">
                    <h2 className="text-xl font-black text-content-main dark:text-white uppercase tracking-tight flex items-center gap-3">
                        <FileSpreadsheet className="text-emerald-500" />
                        Importación Masiva
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-black/10 rounded-full transition-colors">
                        <X size={20} className="text-content-secondary" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 flex-1 overflow-y-auto">
                    {!previewData ? (
                        <div className="flex flex-col items-center gap-8">

                            {/* Step 1: Template */}
                            <div className="w-full p-4 bg-primary-light/10 border border-primary-light/30 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-primary-light text-white rounded-full flex items-center justify-center font-bold">1</div>
                                    <div className="text-sm">
                                        <p className="font-bold text-content-main dark:text-white">Descarga la Plantilla</p>
                                        <p className="text-content-secondary">Usa este formato para evitar errores.</p>
                                    </div>
                                </div>
                                <button onClick={downloadTemplate} className="text-xs font-bold text-primary hover:underline flex items-center gap-1">
                                    <Download size={14} /> DESCARGAR
                                </button>
                            </div>

                            {/* Step 2: Upload */}
                            <div
                                onClick={() => fileInputRef.current.click()}
                                className="w-full h-48 border-2 border-dashed border-border-subtle hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group"
                            >
                                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx, .xls" className="hidden" />
                                <Upload size={48} className="text-content-tertiary group-hover:text-emerald-500 mb-4 transition-colors" />
                                <p className="font-bold text-content-secondary group-hover:text-emerald-600">Arrastra tu Excel aquí o Haz Click</p>
                                <p className="text-xs text-content-tertiary mt-2">Soporta .xlsx y .xls</p>
                            </div>
                        </div>
                    ) : (
                        <div className="animate-in slide-in-from-bottom-4">
                            {/* Preview Stats */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 bg-app-light dark:bg-slate-800 rounded-xl text-center">
                                    <p className="text-xs font-bold text-content-secondary uppercase">Total Leído</p>
                                    <p className="text-2xl font-black text-content-main dark:text-white">{stats.total}</p>
                                </div>
                                <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-center">
                                    <p className="text-xs font-bold text-emerald-600 uppercase">Nuevos</p>
                                    <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{stats.nuevos}</p>
                                </div>
                                <div className="p-4 bg-amber-100 dark:bg-amber-900/30 rounded-xl text-center">
                                    <p className="text-xs font-bold text-amber-600 uppercase">Existentes</p>
                                    <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{stats.existentes}</p>
                                </div>
                            </div>

                            {stats.existentes > 0 && (
                                <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl mb-6 text-sm text-amber-800 dark:text-amber-200">
                                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                                    <p>Atención: Se encontraron <strong>{stats.existentes} códigos duplicados</strong>. Podrás elegir si actualizarlos o ignorarlos al confirmar.</p>
                                </div>
                            )}

                            <div className="border border-border-subtle dark:border-white/10 rounded-xl overflow-hidden mb-4">
                                <table className="w-full text-[10px] text-left">
                                    <thead className="bg-app-light dark:bg-slate-800 text-content-secondary uppercase font-bold">
                                        <tr>
                                            <th className="p-2">Código</th>
                                            <th className="p-2">Nombre</th>
                                            <th className="p-2">Precio</th>
                                            <th className="p-2">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-subtle dark:divide-white/5">
                                        {previewData.slice(0, 5).map((p, i) => (
                                            <tr key={i} className="dark:text-slate-300">
                                                <td className="p-2 font-mono">{p.codigo}</td>
                                                <td className="p-2 font-bold truncate max-w-[150px]">{p.nombre}</td>
                                                <td className="p-2">${p.precio.toFixed(2)}</td>
                                                <td className="p-2">{p.stock}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <p className="text-center text-[10px] text-content-tertiary mb-2">Mostrando primeros 5 de {stats.total} productos detectados.</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border-subtle dark:border-white/5 flex justify-end gap-3 bg-app-light dark:bg-slate-900/50 rounded-b-2xl">
                    {previewData ? (
                        <>
                            <button onClick={() => setPreviewData(null)} className="px-6 py-3 font-bold text-xs text-content-secondary hover:bg-black/5 rounded-xl transition-colors">
                                CANCELAR
                            </button>
                            <button onClick={handleImport} disabled={isProcessing} className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2">
                                <Check size={16} /> CONFIRMAR IMPORTACIÓN
                            </button>
                        </>
                    ) : (
                        <button onClick={onClose} className="px-6 py-3 font-bold text-xs text-content-secondary hover:bg-black/5 rounded-xl transition-colors">
                            CERRAR
                        </button>
                    )}
                </div>

                {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 dark:bg-black/80 flex flex-col items-center justify-center z-10 rounded-2xl backdrop-blur-sm">
                        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="font-bold text-emerald-600 animate-pulse">Procesando datos...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
