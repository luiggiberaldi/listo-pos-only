// ✅ SYSTEM IMPLEMENTATION - V. 3.0 (DEXIE CUSTOMERS + LAN SYNC)
// Archivo: src/hooks/store/useCustomers.js

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { dispatchClientChanged } from '../../services/lanSyncDispatcher';

export const useCustomers = () => {
  const clientes = useLiveQuery(() => db.clientes.toArray(), []) || [];

  const agregarCliente = async (datos) => {
    const existe = await db.clientes.where('documento').equals(datos.documento.trim()).first();
    if (existe) throw new Error(`El documento ${datos.documento} ya está registrado.`);

    const nuevo = {
      nombre: datos.nombre.trim(),
      documento: datos.documento.trim(),
      telefono: datos.telefono || '',
      direccion: datos.direccion || '',
      email: datos.email || '',
      saldo: 0,
      deuda: 0,
      favor: 0,
      activo: true,
      fechaRegistro: new Date().toISOString(),
      _lww_updated_at: Date.now(),
    };

    const id = await db.clientes.add(nuevo);
    // [V4] LAN SYNC
    dispatchClientChanged({ ...nuevo, id });
    return { ...nuevo, id };
  };

  const editarCliente = async (id, datos) => {
    if (datos.documento) {
      const conflicto = await db.clientes
        .where('documento').equals(datos.documento.trim())
        .filter(c => c.id !== id)
        .first();
      if (conflicto) throw new Error(`El documento ${datos.documento} pertenece a otro cliente.`);
    }

    const updateData = { ...datos, _lww_updated_at: Date.now() };
    await db.clientes.update(id, updateData);
    // [V4] LAN SYNC
    const updated = await db.clientes.get(id);
    if (updated) dispatchClientChanged(updated);
  };

  const eliminarCliente = async (id) => {
    const c = await db.clientes.get(id);
    if (c && Math.abs(c.saldo) > 0.01) throw new Error(`No se puede eliminar: Tiene saldo pendiente ($${c.saldo.toFixed(2)}).`);
    await db.clientes.delete(id);
  };

  const actualizarSaldoCliente = async (id, montoDelta) => {
    const c = await db.clientes.get(id);
    if (c) {
      const nuevoSaldo = (c.saldo || 0) + montoDelta;
      await db.clientes.update(id, { saldo: nuevoSaldo, _lww_updated_at: Date.now() });
      // [V4] LAN SYNC
      const updated = await db.clientes.get(id);
      if (updated) dispatchClientChanged(updated);
    }
  };

  return {
    clientes,
    agregarCliente,
    editarCliente,
    eliminarCliente,
    actualizarSaldoCliente
  };
};