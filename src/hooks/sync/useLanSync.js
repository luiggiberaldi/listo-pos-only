// ✅ SYSTEM IMPLEMENTATION - V. 1.0
// Archivo: src/hooks/sync/useLanSync.js
// Hook React para manejar sincronización LAN multi-caja.
// - En PC1 (Principal): envía productos al servidor vía IPC
// - En PC2 (Secundaria): descarga y sincroniza productos desde PC1

import { useEffect, useRef } from 'react';
import { useStore } from '../../context/StoreContext';
import {
    configureLanSync,
    startPolling,
    stopPolling,
    sendStockUpdate,
} from '../../services/lanSyncService';

/**
 * Hook para sincronizar inventario con la caja principal.
 * Se usa en App.jsx — corre siempre en background.
 *
 * @param {string} role - 'principal' | 'secundaria'
 * @param {string} targetIP - IP del servidor (solo para 'secundaria')
 */
export function useLanSync(role = 'principal', targetIP = '') {
    const { productos, categorias, configuracion } = useStore();
    const lastSyncRef = useRef('');

    // ── PC1: ENVIAR PRODUCTOS AL SERVIDOR LOCAL ──
    // Cuando productos cambian, enviarlos al cache del servidor HTTP
    useEffect(() => {
        if (role !== 'principal') return;
        if (!window.electronAPI?.lanSyncProducts) return;
        if (!productos || productos.length === 0) return;

        // Crear un hash simple para evitar envíos duplicados
        const hash = productos.length + '_' + productos.reduce((s, p) => s + (p.stock || 0), 0);
        if (hash === lastSyncRef.current) return;
        lastSyncRef.current = hash;

        window.electronAPI.lanSyncProducts(
            productos.map(p => ({
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
            })),
            categorias || [],
            {
                nombreNegocio: configuracion?.nombreNegocio || '',
                moneda: configuracion?.moneda || 'VES',
                tasa: configuracion?.tasa || 1,
                _licenseActive: !!localStorage.getItem('listo_license_key'),
                _plan: localStorage.getItem('listo_plan') || 'bodega',
            }
        );
    }, [productos, categorias, configuracion, role]);

    // ── PC2: CONECTAR AL SERVIDOR DE PC1 ──
    useEffect(() => {
        if (role !== 'secundaria' || !targetIP) return;

        configureLanSync(targetIP, (status) => {
            console.log(`📡 [LAN] Estado: ${status}`);
        });

        startPolling();

        // Escuchar stock updates que llegan vía IPC (desde el servidor LAN)
        if (window.electronAPI?.onLanStockUpdate) {
            window.electronAPI.onLanStockUpdate((updates) => {
                console.log('📡 [LAN] Stock update recibido:', updates);
                // Los updates ya se aplicaron vía fullSync polling
            });
        }

        return () => {
            stopPolling();
            if (window.electronAPI?.removeLanListeners) {
                window.electronAPI.removeLanListeners();
            }
        };
    }, [role, targetIP]);
}

/**
 * Helper: Notificar al servidor que se vendió algo (para PC2)
 * Llamar después de completar una venta.
 */
export function notifyStockSale(productName, quantitySold) {
    sendStockUpdate(productName, -quantitySold);
}
