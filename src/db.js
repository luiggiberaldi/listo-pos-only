// ✅ SYSTEM IMPLEMENTATION - V. 4.0 (CLOUD READY)
// Archivo: src/db.js
// Autorizado por Auditor en Fase 4 (Sync Architecture)

import Dexie from 'dexie';

export const db = new Dexie('ListoPosDB');

// DEFINICIÓN DEL ESQUEMA (VERSIÓN 6 - INTEGRIDAD COMPLETA)
// Incluye tablas de sistema (Config y Caja) para atomicidad
db.version(6).stores({
  // 📦 INVENTARIO
  productos: '++id, nombre, codigo, categoria, stock',

  // 🛒 VENTAS
  ventas: '++id, fecha, corteId, clienteId, status',

  // 👥 CLIENTES
  clientes: '++id, nombre, documento',

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
db.version(7).stores({
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
db.version(8).stores({
  logs: '++id, tipo, fecha, usuarioId, productId'
});

// 🔄 V. 9: CASCADE UPDATE SUPPORT (Name Indexing)
db.version(9).stores({
  logs: '++id, tipo, fecha, usuarioId, productId, producto'
});

// 🖼️ V. 10: POS 2.0 (Image Support)
// Habilitamos soporte para imágenes en tabla 'productos'.
// NOTA: El campo 'imagen' NO se indiza para evitar overhead en el arranque.
// 🛡️ V. 11: RBAC GRANULAR PERSISTENCE
// Agregamos tabla de usuarios si no existe, o actualizamos esquema.
// PERO PRIMERO DEBO CONFIRMAR DÓNDE VIVEN LOS USUARIOS.
// EL PROMPT ANTERIOR INDICABA QUE ESTABAN EN LOCALSTORAGE ('listo_users_v1')
// SI ES ASÍ, DEBEMOS MIGRARLOS O SEGUIR USANDO LOCALSTORAGE.
// VOY A INVESTIGAR PRIMERO.

// CLASE UTILITARIA PARA MIGRACIÓN
export const migrarDatosLocales = async () => {
  const MIG_ID = 'fenix_db_migrated_v3_full_integrity';
  const yaMigrado = localStorage.getItem(MIG_ID);

  if (yaMigrado) return;

  console.log("🔄 FÉNIX V6: Iniciando migración crítica a IndexedDB...");

  try {
    // 1. Productos (Legacy)
    const prodRaw = localStorage.getItem('listo-productos');
    if (prodRaw) {
      const productos = JSON.parse(prodRaw);
      const cleanProds = productos.map(p => {
        const { id, ...resto } = p;
        return typeof id === 'number' ? p : resto;
      });
      await db.productos.bulkPut(cleanProds);
    }

    // 2. Clientes (Legacy)
    const cliRaw = localStorage.getItem('listo-clientes');
    if (cliRaw) {
      const clientes = JSON.parse(cliRaw);
      await db.clientes.bulkPut(clientes);
    }

    // 3. CONFIGURACIÓN (NUEVO)
    const configRaw = localStorage.getItem('listo-config');
    if (configRaw) {
      const config = JSON.parse(configRaw);
      await db.config.put({ key: 'general', ...config });
      console.log("✅ Configuración migrada.");
    }

    // 4. ESTADO DE CAJA (NUEVO)
    const cajaRaw = localStorage.getItem('caja-sesion-activa');
    if (cajaRaw) {
      const caja = JSON.parse(cajaRaw);
      await db.caja_sesion.put({ key: 'actual', ...caja });
      console.log("✅ Estado de Caja migrado.");
    }

    localStorage.setItem(MIG_ID, 'true');
    console.log("✅ FÉNIX V6: Migración Completada. Integridad Asegurada.");

  } catch (error) {
    console.error("❌ FATAL: Error en migración DB:", error);
    // No marcamos como migrado para reintentar luego
  }
};