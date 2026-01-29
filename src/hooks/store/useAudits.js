import { useState, useEffect, useRef } from 'react';
import { safeSave } from '../../utils/storageUtils';
import { loadWithSchema } from '../../utils/schemaUtils';
import { auditTemplateSchema, auditSessionSchema } from '../../schemas/dataSchemas';
import { fixFloat } from '../../utils/mathUtils';

export const useAudits = (productos, actualizarProducto) => {
    // 1. ESTADO REACTIVO (Para la UI)
    const [plantillasAuditoria, setPlantillasAuditoria] = useState(() => loadWithSchema('listo-plantillas-audit', auditTemplateSchema, []));
    const [sesionesAuditoria, setSesionesAuditoria] = useState(() => loadWithSchema('listo-sesiones-audit', auditSessionSchema, []));

    // 2. ESPEJO MAESTRO (Para lógica síncrona y simulaciones)
    const plantillasRef = useRef(plantillasAuditoria);
    const sesionesRef = useRef(sesionesAuditoria);

    // Sincronización Persistente
    useEffect(() => {
        plantillasRef.current = plantillasAuditoria; // Mantener ref fresca
        localStorage.setItem('listo-plantillas-audit', JSON.stringify(plantillasAuditoria));
    }, [plantillasAuditoria]);

    useEffect(() => {
        sesionesRef.current = sesionesAuditoria; // Mantener ref fresca
        localStorage.setItem('listo-sesiones-audit', JSON.stringify(sesionesAuditoria));
    }, [sesionesAuditoria]);

    // --- CRUD ATÓMICO CON RETORNO DE ID ---

    const crearPlantillaAuditoria = (n, ids) => {
        const nueva = { id: Date.now(), nombre: n, productosIds: ids };
        const nuevoEstado = [...plantillasRef.current, nueva];

        // Actualización Síncrona (Verdad Absoluta)
        plantillasRef.current = nuevoEstado;
        // Actualización Asíncrona (UI)
        setPlantillasAuditoria(nuevoEstado);

        return nueva.id; // ✅ RETORNAMOS EL ID PARA LA SIMULACIÓN
    };

    const actualizarPlantillaAuditoria = (id, n, ids) => {
        setPlantillasAuditoria(p => p.map(x => x.id === id ? { ...x, nombre: n, productosIds: ids } : x));
    };

    const eliminarPlantillaAuditoria = (id) => {
        setPlantillasAuditoria(p => p.filter(x => x.id !== id));
    };

    const iniciarAuditoria = (plantillaId) => {
        // ✅ LEEMOS DEL REF (No del estado obsoleto)
        const plantilla = plantillasRef.current.find(p => p.id === plantillaId);

        if (!plantilla) {
            console.error("❌ RBAC AUDIT: Plantilla no encontrada en REF:", plantillaId);
            return false;
        }

        const items = plantilla.productosIds.map(pid => {
            const prod = productos.find(p => p.id === pid);
            if (!prod) return null;
            const snapshotJerarquia = prod.jerarquia ? JSON.parse(JSON.stringify(prod.jerarquia)) : {};
            return {
                productoId: pid,
                nombre: prod.nombre,
                stock_sistema_snapshot: fixFloat(prod.stock),
                snapshot_jerarquia: snapshotJerarquia,
                conteo_fisico: null,
                conteo_desglosado: null,
                estado_conciliacion: 'PENDIENTE'
            };
        }).filter(Boolean);

        const sesion = {
            id: Date.now(),
            fechaInicio: new Date().toISOString(),
            nombrePlantilla: plantilla.nombre,
            estado: 'EN_PROCESO',
            items
        };

        // Actualizar Refs y State
        const nuevasSesiones = [sesion, ...sesionesRef.current];
        sesionesRef.current = nuevasSesiones;
        setSesionesAuditoria(nuevasSesiones);

        return sesion.id;
    };

    const actualizarConteoAuditoria = (sesionId, productoId, input) => {
        setSesionesAuditoria(prev => prev.map(s => {
            if (s.id !== sesionId) return s;
            const items = s.items.map(item => {
                if (item.productoId !== productoId) return item;
                let b = 0, p = 0, u = 0; let datosLimpios = null;
                if (typeof input === 'object' && input !== null) {
                    b = fixFloat(input.bultos); p = fixFloat(input.paquetes); u = fixFloat(input.unidades);
                    datosLimpios = { bultos: b, paquetes: p, unidades: u };
                } else {
                    u = fixFloat(input); datosLimpios = null;
                }
                const j = item.snapshot_jerarquia || {};
                const contPaq = fixFloat(j.paquete?.contenido || 1);
                const contBulto = fixFloat(j.bulto?.contenido || 1);
                const factorPaquete = j.paquete?.activo ? contPaq : 0;
                const factorBultoTotal = j.bulto?.activo ? (j.paquete?.activo ? (contBulto * contPaq) : contBulto) : 0;
                const totalBase = fixFloat((b * factorBultoTotal) + (p * factorPaquete) + u);
                return { ...item, conteo_fisico: totalBase, conteo_desglosado: datosLimpios, estado_conciliacion: 'PENDIENTE' };
            }); return { ...s, items };
        }));
    };

    const resolverDiferencia = (sid, pid, accion) => {
        setSesionesAuditoria(prev => prev.map(s => {
            if (s.id !== sid) return s;
            const items = s.items.map(item => {
                if (item.productoId !== pid) return item;
                if (accion === 'RECONTEO') return { ...item, conteo_fisico: null, conteo_desglosado: null, estado_conciliacion: 'PENDIENTE', nota_admin: 'Reconteo solicitado' };
                if (accion === 'IGNORAR') return { ...item, estado_conciliacion: 'IGNORADO' };
                if (accion === 'ACEPTAR') {
                    const nuevoStock = fixFloat(item.conteo_fisico);
                    // ✅ FIX: Usar la función de persistencia real, no un setter de estado
                    actualizarProducto(pid, { stock: nuevoStock }, `Ajuste por Auditoría (${s.nombrePlantilla})`);
                    return { ...item, estado_conciliacion: 'RESUELTO' };
                }
                return item;
            }); return { ...s, items };
        }));
    };

    const cerrarAuditoria = (sid) => {
        setSesionesAuditoria(prev => prev.map(s => {
            if (s.id !== sid) return s;
            const itemsFinalizados = s.items.map(item => {
                if (item.estado_conciliacion === 'PENDIENTE' && item.conteo_fisico !== null) {
                    const stockNuevo = fixFloat(item.conteo_fisico);
                    // ✅ FIX: Usar la función de persistencia real
                    actualizarProducto(item.productoId, { stock: stockNuevo }, `Auto-ajuste al cerrar auditoría (${s.nombrePlantilla})`);
                    return { ...item, estado_conciliacion: 'RESUELTO', nota_admin: 'Auto-resuelto al cerrar' };
                } return item;
            }); return { ...s, items: itemsFinalizados, estado: 'CERRADA', fechaFin: new Date().toISOString() };
        }));
    };

    const obtenerVentasDuranteAuditoria = (pid, fechaInicio) => { return 0; };

    return {
        plantillasAuditoria,
        sesionesAuditoria,
        crearPlantillaAuditoria,
        actualizarPlantillaAuditoria,
        eliminarPlantillaAuditoria,
        iniciarAuditoria,
        actualizarConteoAuditoria,
        resolverDiferencia,
        cerrarAuditoria,
        obtenerVentasDuranteAuditoria
    };
};