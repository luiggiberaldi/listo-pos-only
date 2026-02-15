// ✅ SYSTEM IMPLEMENTATION - V. 1.0
// Archivo: src/utils/catalogTransfer.js
// Propósito: Exportar/Importar SOLO el catálogo de productos (sin ventas ni datos sensibles).
// Diseñado para migrar catálogos entre PCs (multi-caja offline).

import { db } from '../db';
import Swal from 'sweetalert2';

/**
 * Exporta SOLO productos y categorías como archivo JSON.
 * No incluye ventas, clientes, cortes, ni datos sensibles.
 */
export async function exportarCatalogo(productos, categorias, configuracion = {}) {
    try {
        if (!productos || productos.length === 0) {
            Swal.fire('Sin productos', 'No hay productos para exportar.', 'warning');
            return;
        }

        const catalogo = {
            _meta: {
                tipo: 'LISTO_POS_CATALOGO',
                version: '1.0',
                fecha: new Date().toISOString(),
                negocio: configuracion.nombreNegocio || 'Sin nombre',
                totalProductos: productos.length,
                totalCategorias: categorias?.length || 0,
            },
            categorias: categorias || [],
            productos: productos.map(p => ({
                nombre: p.nombre,
                precio: p.precio,
                costo: p.costo || 0,
                stock: p.stock,
                categoria: p.categoria || 'General',
                codigoBarras: p.codigoBarras || '',
                unidad: p.unidad || 'unidad',
                impuesto: p.impuesto || 0,
                stockMinimo: p.stockMinimo || 0,
                descripcion: p.descripcion || '',
                activo: p.activo !== false,
                imagen: p.imagen || '',
                // No exportamos: id, timestamps, ventas asociadas
            })),
        };

        const json = JSON.stringify(catalogo, null, 2);
        const blob = new Blob([json], { type: 'application/json' });

        // En Electron: usar API nativa de guardado
        if (window.electronAPI?.saveFile) {
            const buffer = await blob.arrayBuffer();
            const result = await window.electronAPI.saveFile(
                Array.from(new Uint8Array(buffer)),
                `catalogo_${configuracion.nombreNegocio || 'listo'}_${new Date().toISOString().slice(0, 10)}.json`
            );
            if (result?.success) {
                Swal.fire({
                    icon: 'success',
                    title: `✅ ${productos.length} productos exportados`,
                    text: `Guardado en: ${result.path}`,
                    timer: 3000,
                    showConfirmButton: false,
                });
            }
            return;
        }

        // En navegador: download directo
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `catalogo_${configuracion.nombreNegocio || 'listo'}_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire({
            icon: 'success',
            title: `✅ ${productos.length} productos exportados`,
            text: 'Archivo JSON descargado. Cópialo a la otra PC.',
            timer: 3000,
            showConfirmButton: false,
        });
    } catch (error) {
        console.error('Error exportando catálogo:', error);
        Swal.fire('Error', 'No se pudo exportar el catálogo.', 'error');
    }
}

/**
 * Importa productos desde un archivo JSON de catálogo.
 * Permite elegir: REEMPLAZAR todo o AGREGAR solo los nuevos.
 */
export async function importarCatalogo(agregarProducto, crearCategoria) {
    try {
        // 1. Seleccionar archivo
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        const file = await new Promise((resolve) => {
            input.onchange = (e) => resolve(e.target.files[0]);
            input.click();
        });

        if (!file) return;

        // 2. Leer y validar
        const text = await file.text();
        let catalogo;
        try {
            catalogo = JSON.parse(text);
        } catch {
            Swal.fire('Error', 'El archivo no es un JSON válido.', 'error');
            return;
        }

        if (catalogo._meta?.tipo !== 'LISTO_POS_CATALOGO') {
            Swal.fire('Archivo inválido', 'Este archivo no es un catálogo de Listo POS.', 'error');
            return;
        }

        if (!catalogo.productos || catalogo.productos.length === 0) {
            Swal.fire('Catálogo vacío', 'El archivo no contiene productos.', 'warning');
            return;
        }

        // 3. Confirmar importación
        const { isConfirmed, value: modo } = await Swal.fire({
            title: '📦 Importar Catálogo',
            html: `
        <div style="text-align:left; font-size:14px; line-height:1.8;">
          <p><strong>Origen:</strong> ${catalogo._meta.negocio}</p>
          <p><strong>Fecha:</strong> ${new Date(catalogo._meta.fecha).toLocaleDateString('es')}</p>
          <p><strong>Productos:</strong> ${catalogo.productos.length}</p>
          <p><strong>Categorías:</strong> ${catalogo.categorias?.length || 0}</p>
          <hr style="margin: 12px 0;">
          <p>¿Cómo deseas importar?</p>
        </div>
      `,
            input: 'radio',
            inputOptions: {
                agregar: '➕ Agregar — solo los productos nuevos (sin duplicar)',
                reemplazar: '🔄 Reemplazar — borrar inventario actual e importar todo',
            },
            inputValue: 'agregar',
            showCancelButton: true,
            confirmButtonText: 'Importar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563EB',
        });

        if (!isConfirmed) return;

        // 4. Obtener productos existentes para comparar
        const existentes = await db.productos.toArray();
        const nombresExistentes = new Set(existentes.map(p => p.nombre.trim().toLowerCase()));

        let importados = 0;
        let omitidos = 0;

        // 5. Si modo reemplazar, borrar todo primero
        if (modo === 'reemplazar') {
            await db.productos.clear();
            nombresExistentes.clear();
        }

        // 6. Crear categorías primero
        if (catalogo.categorias && crearCategoria) {
            for (const cat of catalogo.categorias) {
                if (cat && cat !== 'General' && cat !== 'Todas') {
                    try { crearCategoria(cat); } catch { /* ya existe */ }
                }
            }
        }

        // 7. Importar productos
        for (const prod of catalogo.productos) {
            const nombreNorm = prod.nombre?.trim().toLowerCase();
            if (!nombreNorm) continue;

            if (nombresExistentes.has(nombreNorm)) {
                omitidos++;
                continue;
            }

            await agregarProducto({
                nombre: prod.nombre.trim(),
                precio: Number(prod.precio) || 0,
                costo: Number(prod.costo) || 0,
                stock: Number(prod.stock) || 0,
                categoria: prod.categoria || 'General',
                codigoBarras: prod.codigoBarras || '',
                unidad: prod.unidad || 'unidad',
                impuesto: Number(prod.impuesto) || 0,
                stockMinimo: Number(prod.stockMinimo) || 0,
                descripcion: prod.descripcion || '',
                activo: prod.activo !== false,
                imagen: prod.imagen || '',
            });

            nombresExistentes.add(nombreNorm);
            importados++;
        }

        // 8. Resultado
        Swal.fire({
            icon: 'success',
            title: '✅ Catálogo Importado',
            html: `
        <div style="font-size:14px; line-height:1.8;">
          <p>✅ <strong>${importados}</strong> productos importados</p>
          ${omitidos > 0 ? `<p>⏭️ <strong>${omitidos}</strong> omitidos (ya existían)</p>` : ''}
          <p style="margin-top:8px; color:#64748b;">El inventario está actualizado.</p>
        </div>
      `,
            timer: 4000,
            showConfirmButton: false,
        });

    } catch (error) {
        console.error('Error importando catálogo:', error);
        Swal.fire('Error', `No se pudo importar: ${error.message}`, 'error');
    }
}
