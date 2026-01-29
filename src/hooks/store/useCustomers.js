// ✅ SYSTEM IMPLEMENTATION - V. 2.0 (DEXIE CUSTOMERS)
// Archivo: src/hooks/store/useCustomers.js

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';

export const useCustomers = () => {
  // 1. LECTURA EN TIEMPO REAL
  const clientes = useLiveQuery(() => db.clientes.toArray(), []) || [];

  // --- CRUD ASÍNCRONO ---

  const agregarCliente = async (datos) => {
    // Validación de Unicidad
    const existe = await db.clientes.where('documento').equals(datos.documento.trim()).first();
    if (existe) throw new Error(`El documento ${datos.documento} ya está registrado.`);

    const nuevo = {
      nombre: datos.nombre.trim(),
      documento: datos.documento.trim(),
      telefono: datos.telefono || '',
      direccion: datos.direccion || '',
      email: datos.email || '',
      saldo: 0,
      deuda: 0, // 🆕 FÉNIX Standard (Quadrant 1)
      favor: 0, // 🆕 FÉNIX Standard (Quadrant 2)
      activo: true,
      fechaRegistro: new Date().toISOString()
    };

    const id = await db.clientes.add(nuevo);
    return { ...nuevo, id };
  };

  const editarCliente = async (id, datos) => {
    // Validar que el documento no pertenezca a otro
    if (datos.documento) {
      const conflicto = await db.clientes
        .where('documento').equals(datos.documento.trim())
        .filter(c => c.id !== id)
        .first();

      if (conflicto) throw new Error(`El documento ${datos.documento} pertenece a otro cliente.`);
    }

    await db.clientes.update(id, datos);
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
      await db.clientes.update(id, { saldo: nuevoSaldo });
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