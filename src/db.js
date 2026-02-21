// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (CLOUD READY)
// Archivo: src/db.js
// Autorizado por Auditor en Fase 4 (Sync Architecture)

import Dexie from 'dexie';

// 👻 GHOST MODE CONFIGURATION
const GHOST_MODE_KEY = 'LISTO_GHOST_MODE';
export const isGhostMode = localStorage.getItem(GHOST_MODE_KEY) === 'true';

export const toggleGhostMode = (enable) => {
  localStorage.setItem(GHOST_MODE_KEY, enable);
  window.location.reload();
};

// 🏭 SCHEMA FACTORY (DRY PRINCIPLE)
const applySchema = (dbInstance) => {
  // DEFINICIÓN DEL ESQUEMA (VERSIÓN 6 - INTEGRIDAD COMPLETA)
  // Incluye tablas de sistema (Config y Caja) para atomicidad
  dbInstance.version(6).stores({
    // 📦 INVENTARIO
    productos: '++id, nombre, codigo, categoria, stock',

    // 🛒 VENTAS
    ventas: '++id, fecha, corteId, clienteId, status',

    // 👥 CLIENTES
    clientes: '++id, nombre, documento, deuda, favor', // ✅ Updated Schema implicit

    // ⚙️ CONFIGURACIÓN (Key-Value Atomic)
    config: 'key',

    // 🔐 AUDITORÍA
    logs: '++id, tipo, fecha, usuarioId',

    // ⏳ TICKETS EN ESPERA
    tickets_espera: '++id, fecha, usuarioNombre',

    // ☁️ COLA DE SINCRONIZACIÓN
    outbox: '++id, collection, status, timestamp',

    // 📜 HISTORIAL DE CORTES Z (V. 5)
    cortes: 'id, fecha, idApertura',

    // 🏦 ESTADO DE CAJA (V. 6)
    // Reemplaza localStorage para permitir transactions seguras en cierres
    caja_sesion: 'key'
  });

  // 🚀 V. 7: QUADRANTS MIGRATION (Deuda vs Favor)
  dbInstance.version(7).stores({
    clientes: '++id, nombre, documento, deuda, favor'
  }).upgrade(tx => {
    return tx.table('clientes').toCollection().modify(cliente => {
      // 1. Inicializar nuevos campos
      cliente.deuda = 0;
      cliente.favor = 0;

      // 2. Migrar saldo existente
      const saldoViejo = cliente.saldo || 0;

      if (saldoViejo > 0.001) {
        // Saldo positivo = DEUDA (El cliente debe)
        cliente.deuda = saldoViejo;
      } else if (saldoViejo < -0.001) {
        // Saldo negativo = FAVOR (El negocio debe)
        cliente.favor = Math.abs(saldoViejo);
      }

      // 3. Normalizar
      cliente.deuda = Math.round((cliente.deuda + Number.EPSILON) * 100) / 100;
      cliente.favor = Math.round((cliente.favor + Number.EPSILON) * 100) / 100;
    });
  });

  // 🛡️ V. 8: KARDEX TRACEABILITY (ID Linking)
  dbInstance.version(8).stores({
    logs: '++id, tipo, fecha, usuarioId, productId'
  });

  // 🔄 V. 9: CASCADE UPDATE SUPPORT (Name Indexing)
  dbInstance.version(9).stores({
    logs: '++id, tipo, fecha, usuarioId, productId, producto'
  });

  // 🖼️ V. 10: POS 2.0 (Image Support)
  // Habilitamos soporte para imágenes en tabla 'productos'.
  // NOTA: El campo 'imagen' NO se indiza para evitar overhead en el arranque.
  // 🛡️ V. 11: RBAC GRANULAR PERSISTENCE
  // Agregamos tabla de usuarios si no existe, o actualizamos esquema.

  // 💼 V. 12: PAYROLL & FINANCE MODULE
  dbInstance.version(12).stores({
    empleados_finanzas: 'userId, sueldoBase, frecuenciaPago, deudaAcumulada, favor, ultimoPago',
    historial_nomina: '++id, userId, fecha, tipo, monto, referenceId'
  });

  // 📈 V. 13: FINANCE 2.0 LEDGER (Immutable Transactions)
  dbInstance.version(13).stores({
    nomina_ledger: '++id, empleadoId, tipo, monto, fecha, periodoId, status' // status: 'PENDIENTE', 'PAGADO', 'ANULADO'
  });

  // 🗓️ V. 14: PERIOD MANAGEMENT (Cierres)
  dbInstance.version(14).stores({
    periodos_nomina: '++id, fechaInicio, fechaFin, totalPagado, totalDeuda, status' // status: 'ABIERTO', 'CERRADO'
  });

  // 🧠 V. 16: GHOST BEHAVIOR PERSISTENCE
  dbInstance.version(16).stores({
    ghost_config: 'key'
  });

  // 📝 V. 17: GHOST EPISODIC MEMORY
  dbInstance.version(17).stores({
    ghost_history: '++id, sessionId, role, content, timestamp'
  });

  // 🏪 V. 18: MULTI-CAJA SUPPORT
  // Agrega cajaId a ventas y cortes para filtrar por caja
  // Migra sesión 'actual' → 'caja-1'
  dbInstance.version(18).stores({
    ventas: '++id, fecha, corteId, clienteId, status, cajaId',
    cortes: 'id, fecha, idApertura, cajaId'
  }).upgrade(tx => {
    // Renombrar sesión 'actual' → 'caja-1'
    return tx.table('caja_sesion').get('actual').then(sesion => {
      if (sesion) {
        return tx.table('caja_sesion').delete('actual').then(() => {
          sesion.key = 'caja-1';
          sesion.cajaId = 'caja-1';
          sesion.nombreCaja = 'Caja Principal';
          return tx.table('caja_sesion').put(sesion);
        });
      }
    }).then(() => {
      // Etiquetar ventas existentes como caja-1
      return tx.table('ventas').toCollection().modify(v => {
        if (!v.cajaId) v.cajaId = 'caja-1';
      });
    }).then(() => {
      // Etiquetar cortes existentes como caja-1
      return tx.table('cortes').toCollection().modify(c => {
        if (!c.cajaId) c.cajaId = 'caja-1';
      });
    });
  });

  // 👻 V. 19: GHOST AUDIT LOG (Operational Intelligence)
  // Persistent event storage for the Ghost Auditor system.
  // Date-indexed for efficient daily digest queries.
  dbInstance.version(19).stores({
    ghost_audit_log: '++id, category, date, timestamp'
  });
};

// 🏭 DATABASE INSTANCE CREATION
const createDB = () => {
  const dbName = isGhostMode ? 'ListoGhostDB' : 'ListoPosDB';
  const db = new Dexie(dbName);
  applySchema(db);
  return db;
};

export const db = createDB();

// CLASE UTILITARIA PARA MIGRACIÓN
// ✅ HELPER: Migración de Productos (Legacy -> IDB)
const migrarProductos = async () => {
  const prodRaw = localStorage.getItem('listo-productos');
  if (!prodRaw) return;

  const productos = JSON.parse(prodRaw);
  const cleanProds = productos.map(p => {
    const { id, ...resto } = p;
    // Evita conflictos de IDs numéricos antiguos vs auto-increment
    return typeof id === 'number' ? p : resto;
  });

  // Bulk add para mejor rendimiento
  await db.productos.bulkPut(cleanProds);
};

// ✅ HELPER: Migración de Clientes
const migrarClientes = async () => {
  const cliRaw = localStorage.getItem('listo-clientes');
  if (!cliRaw) return;

  const clientes = JSON.parse(cliRaw);
  await db.clientes.bulkPut(clientes);
};

// ✅ HELPER: Migración de Configuración
const migrarConfiguracion = async () => {
  const configRaw = localStorage.getItem('listo-config');
  if (!configRaw) return;

  const config = JSON.parse(configRaw);
  await db.config.put({ key: 'general', ...config });
};

// ✅ HELPER: Migración de Caja (Sesión Activa)
const migrarCaja = async () => {
  const cajaRaw = localStorage.getItem('caja-sesion-activa');
  if (!cajaRaw) return;

  const caja = JSON.parse(cajaRaw);
  await db.caja_sesion.put({ key: 'caja-1', cajaId: 'caja-1', nombreCaja: 'Caja Principal', ...caja });
};

// 🧹 V. 15: SANITIZACIÓN DE DEUDAS (Dust Sweeper)
// Elimina saldos infinitesimales (< 0.01) que causan inconsistencias
const migrarSaneamientoDeudas = async () => {
  const LIMITE_DUST = 0.01;
  let saneados = 0;

  await db.clientes.toCollection().modify(cliente => {
    let dirty = false;

    // 1. Sanear Deuda Fantasma
    if (cliente.deuda > 0 && cliente.deuda < LIMITE_DUST) {
      cliente.deuda = 0;
      dirty = true;
    }

    // 2. Sanear Favor Fantasma
    if (cliente.favor > 0 && cliente.favor < LIMITE_DUST) {
      cliente.favor = 0;
      dirty = true;
    }

    // 3. Normalizar Precisión (Math Core Emulation)
    // Aunque no importemos mathCore aquí para no romper deps circulares, usamos rounding seguro.
    if (cliente.deuda) {
      const d = Math.round((cliente.deuda + Number.EPSILON) * 100) / 100;
      if (d !== cliente.deuda) { cliente.deuda = d; dirty = true; }
    }
    if (cliente.favor) {
      const f = Math.round((cliente.favor + Number.EPSILON) * 100) / 100;
      if (f !== cliente.favor) { cliente.favor = f; dirty = true; }
    }

    // 4. Sync Saldo Legacy
    const s = parseFloat((cliente.deuda - cliente.favor).toFixed(2));
    if (cliente.saldo !== s) {
      cliente.saldo = s;
      dirty = true;
    }

    if (dirty) saneados++;
  });

  if (saneados > 0) console.log(`🧹 Saneamiento completado: ${saneados} clientes corregidos.`);
};

// CLASE UTILITARIA PARA MIGRACIÓN (Main Orchestrator)
export const migrarDatosLocales = async () => {
  const MIG_ID = 'fenix_db_migrated_v4_math_sanitized'; // 🚀 Bumped Version
  const yaMigrado = localStorage.getItem(MIG_ID);

  if (yaMigrado) return;
  try {
    // Ejecutar migraciones en paralelo para mejorar velocidad de arranque
    await Promise.all([
      migrarProductos(),
      migrarClientes(),
      migrarConfiguracion(),
      migrarCaja(),
      migrarSaneamientoDeudas()
    ]);

    localStorage.setItem(MIG_ID, 'true');
  } catch (error) {
    console.error('❌ FÉNIX V6: Error en migración crítica:', error);
    // No marcamos como migrado para reintentar luego en caso de fallo real
  }
};

/**
 * 📊 DEMO SHIELD AUDITOR
 * Cuenta absoluta de ventas para control de licencias demo.
 * Rendimiento optimizado para IndexedDB.
 */
export const getLifetimeSales = async () => {
  return await db.ventas.count();
};