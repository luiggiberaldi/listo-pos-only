import { useState, useEffect } from 'react';

const INITIAL_STATE = {
  nombre: '', precio: '', costo: '', codigo: '', categoria: 'General',
  fechaVencimiento: '',
  aplicaIva: true,
  cajasPorBulto: 1, unidadesPorCaja: 1, stock: 0,
  stockMinimo: 5,
  tipoUnidad: 'unidad',
  defaultScannedUnit: 'ASK', // 🆕 Smart Scan Config
  jerarquia: {
    bulto: { activo: false, contenido: 1, precio: '', seVende: true },
    paquete: { activo: false, contenido: 1, precio: '', seVende: true },
    unidad: { activo: true, precio: '', seVende: true }
  },
  variantes: []
};

export const useProductForm = (productoEditar) => {
  const [form, setForm] = useState(INITIAL_STATE);

  useEffect(() => {
    if (productoEditar) {
      const fechaLimpia = productoEditar.fechaVencimiento ? productoEditar.fechaVencimiento.slice(0, 7) : '';

      // Fusión profunda de jerarquías para evitar undefined
      const jerarquiaFusionada = {
        bulto: { ...INITIAL_STATE.jerarquia.bulto, ...(productoEditar.jerarquia?.bulto || {}) },
        paquete: { ...INITIAL_STATE.jerarquia.paquete, ...(productoEditar.jerarquia?.paquete || {}) },
        unidad: { ...INITIAL_STATE.jerarquia.unidad, ...(productoEditar.jerarquia?.unidad || {}) }
      };

      setForm({
        ...INITIAL_STATE,
        ...productoEditar,
        fechaVencimiento: fechaLimpia,
        jerarquia: jerarquiaFusionada,
        cajasPorBulto: parseFloat(productoEditar.cajasPorBulto) || 1,
        unidadesPorCaja: parseFloat(productoEditar.unidadesPorCaja) || 1,
        costo: parseFloat(productoEditar.costo) || 0,
        precio: parseFloat(productoEditar.precio) || '',
        stockMinimo: parseFloat(productoEditar.stockMinimo) || 5,
        defaultScannedUnit: productoEditar.defaultScannedUnit || 'ASK' // 🆕 Persistence
      });
    } else {
      setForm(INITIAL_STATE);
    }
  }, [productoEditar]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateJerarquia = (nivel, campo, valor) => {
    setForm(prev => ({
      ...prev,
      jerarquia: {
        ...prev.jerarquia,
        [nivel]: { ...prev.jerarquia[nivel], [campo]: valor }
      }
    }));
  };

  return { form, setForm, updateField, updateJerarquia, INITIAL_STATE };
};