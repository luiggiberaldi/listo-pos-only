// ✅ SYSTEM IMPLEMENTATION - V. 6.0 (DEXIE MIGRATION)
// Archivo: src/hooks/caja/CajaEstadoProvider.jsx
// Objetivo: Gestionar Estado Actual (Apertura) + Historial de Cortes (Z) usando Dexie para evitar pérdida de datos.

import React, { useState, useCallback, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CajaEstadoContext } from './CajaEstadoContext';
import { db } from '../../db';

const DEFAULT_STATE = {
  isAbierta: false,
  fechaApertura: null,
  usuarioApertura: null,
  balances: {
    usdCash: 0,
    vesCash: 0,
    usdDigital: 0,
    vesDigital: 0
  },
  balancesApertura: { // ✅ Added to prevent undefined
    usdCash: 0,
    vesCash: 0,
    usdDigital: 0,
    vesDigital: 0
  },
  idApertura: null
};

export const CajaEstadoProvider = ({ children }) => {
  // 1. ESTADO DE LA SESIÓN ACTUAL (Vivo - Dexie)
  // useLiveQuery se suscribe a cambios en DB.
  const sesionDB = useLiveQuery(
    () => db.caja_sesion.get('actual'),
    []
  );

  // Fallback seguro mientras carga o si no hay sesión
  const estado = sesionDB || DEFAULT_STATE;

  // 2. HISTORIAL (Cortes Z)
  // Mantenemos esto separado para no mezclar lógica viva con histórica
  const cortes = useLiveQuery(
    () => db.cortes.orderBy('fecha').reverse().toArray(),
    []
  ) || [];

  // --- MÉTODOS DE ESTADO ---

  const isCajaAbierta = useCallback(() => {
    return estado.isAbierta === true;
  }, [estado]);

  const getEstadoCaja = useCallback(() => {
    return estado;
  }, [estado]);

  const abrirCaja = useCallback(async (montoInicialInput, usuario) => {
    if (estado.isAbierta) {
      throw new Error("ERROR DE ESTADO: La caja ya se encuentra abierta.");
    }

    // console.log("[CAJA] Abriendo caja con input:", montoInicialInput);

    // 🧠 LOGIC: Normalize Input to 4-Quadrants
    let initialBalances = {
      usdCash: 0,
      vesCash: 0,
      usdDigital: 0,
      vesDigital: 0
    };

    if (typeof montoInicialInput === 'number') {
      initialBalances.usdCash = montoInicialInput;
    } else if (typeof montoInicialInput === 'object' && montoInicialInput !== null) {
      initialBalances.usdCash = parseFloat(montoInicialInput.usdCash || montoInicialInput.monto || montoInicialInput.usd || 0);
      initialBalances.vesCash = parseFloat(montoInicialInput.vesCash || montoInicialInput.bs || 0);
      initialBalances.usdDigital = parseFloat(montoInicialInput.usdDigital || 0);
      initialBalances.vesDigital = parseFloat(montoInicialInput.vesDigital || 0);
    }

    // console.log("[CAJA] Balances Iniciales calculados:", initialBalances);

    const nuevoEstado = {
      key: 'actual', // IMPORTANTE para Dexie
      isAbierta: true,
      fechaApertura: new Date().toISOString(),
      usuarioApertura: {
        id: usuario?.id || 'sys',
        nombre: usuario?.nombre || 'Sistema'
      },
      balances: { ...initialBalances },
      balancesApertura: { ...initialBalances },
      idApertura: `caja_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    };

    try {
      await db.caja_sesion.put(nuevoEstado);
      return true;
    } catch (error) {
      console.error("Error persistiendo apertura de caja:", error);
      return false;
    }
  }, [estado]);

  // --- 💰 MÉTODO CRÍTICO: ACTUALIZAR BALANCES EN TIEMPO REAL (ATOMIC) ---
  const actualizarBalances = useCallback(async (transactionType, payments = [], change = []) => {
    // Nota: Como usePOS usa transactions, si llamamos esto dentro de una transaction de Dexie,
    // se unirá a ella automáticamente (si el parent transaction incluye 'caja_sesion').

    // Si no estamos en transaction, crea una nueva.
    return await db.transaction('rw', db.caja_sesion, async () => {
      const currentSession = await db.caja_sesion.get('actual');
      if (!currentSession || !currentSession.isAbierta) {
        console.warn('[CAJA] Cannot update balances: register closed');
        return false;
      }

      const multiplier = transactionType === 'SALE' ? 1 : -1;
      const newBalances = { ...currentSession.balances };

      // Process payments (money IN for sales, money OUT for refunds)
      payments.forEach(payment => {
        const amount = parseFloat(payment.amount || payment.amountNominal || 0);
        if (payment.currency === 'USD') {
          if (payment.medium === 'CASH') newBalances.usdCash += amount * multiplier;
          else newBalances.usdDigital += amount * multiplier;
        } else if (payment.currency === 'VES') {
          if (payment.medium === 'CASH') newBalances.vesCash += amount * multiplier;
          else newBalances.vesDigital += amount * multiplier;
        }
      });

      // Process change (money OUT for sales, money IN for refunds)
      change.forEach(vuelto => {
        const amount = parseFloat(vuelto.amount || 0);
        if (vuelto.currency === 'USD') {
          if (vuelto.medium === 'CASH') newBalances.usdCash -= amount * multiplier;
          else newBalances.usdDigital -= amount * multiplier;
        } else if (vuelto.currency === 'VES') {
          if (vuelto.medium === 'CASH') newBalances.vesCash -= amount * multiplier;
          else newBalances.vesDigital -= amount * multiplier;
        }
      });

      await db.caja_sesion.update('actual', { balances: newBalances });
      return newBalances;
    });
  }, []);

  // --- 🔥 MÉTODO CRÍTICO: CERRAR CAJA + GUARDAR EN DB (ATOMIC) ---
  const cerrarCaja = useCallback(async (datosExtra = {}) => {
    return await db.transaction('rw', db.caja_sesion, db.cortes, async () => {
      const currentSession = await db.caja_sesion.get('actual');
      if (!currentSession || !currentSession.isAbierta) return false;

      // 1. Construir el Corte Z Final
      const nuevoCorte = {
        id: `Z-${Date.now()}`,
        fecha: new Date().toISOString(),
        idApertura: currentSession.idApertura,
        balancesApertura: currentSession.balancesApertura,
        usuario: currentSession.usuarioApertura,
        ...datosExtra,
      };

      // 2. Guardar Historial
      await db.cortes.put(nuevoCorte);

      // 3. Borrar Sesión Activa (Cierre)
      await db.caja_sesion.delete('actual');

      return true;
    });
  }, []);

  const cerrarSesionCaja = useCallback((datos) => cerrarCaja(datos), [cerrarCaja]);

  const value = React.useMemo(() => ({
    estado,
    cortes,
    isCajaAbierta,
    getEstadoCaja,
    abrirCaja,
    cerrarCaja,
    cerrarSesionCaja,
    actualizarBalances
  }), [estado, cortes, isCajaAbierta, getEstadoCaja, abrirCaja, cerrarCaja, cerrarSesionCaja, actualizarBalances]);

  return (
    <CajaEstadoContext.Provider value={value}>
      {children}
    </CajaEstadoContext.Provider>
  );
};