// ✅ SYSTEM IMPLEMENTATION - V. 5.2 (SEED FIX)
// Archivo: src/hooks/store/useAuth.js
// Corrección: El usuario por defecto ahora nace con el rol correcto (ROL_EMPLEADO).

import { useState, useEffect, useCallback } from 'react';
import { safeLoad } from '../../utils/storageUtils';
import { ROLE_PRESETS } from '../../config/permissions';
import { hashPin } from '../../utils/securityUtils'; // 🟢 PBKDF2 IMPORT

const PIN_LENGTH = 6;
const SUPER_ADMIN_ID = 1; // 👑 ID Intocable

// 🔒 LAYER 2: VENDOR BACKDOOR (Daily Support Token)
const INTERNAL_SYNC_SALT = "L1STO_SUPP0RT_S3CR3T_K3Y_X9#77_V2";

const generarTokenDiario = async (systemID) => {
  if (!systemID) return null;
  const today = new Date();
  const dateStr = today.getUTCFullYear().toString() +
    (today.getUTCMonth() + 1).toString().padStart(2, '0') +
    today.getUTCDate().toString().padStart(2, '0'); // YYYYMMDD (UTC)

  const rawString = `${systemID}|${dateStr}|${INTERNAL_SYNC_SALT}`;
  const msgBuffer = new TextEncoder().encode(rawString);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const numericPart = fullHash.replace(/\D/g, '');
  const token = numericPart.slice(-6).padStart(6, '0');
  return token;
};

export const useAuth = (configuracion, registrarEventoSeguridad = null) => {
  const [usuarios, setUsuarios] = useState(() => safeLoad('listo_users_v1', []));
  const [usuarioActivo, setUsuarioActivo] = useState(null);

  // 🛡️ PROTOCOLO DE AUTO-REPARACIÓN (SELF-HEALING) ASYNC
  useEffect(() => {
    const runSelfHealing = async () => {
      let currentUsers = [...usuarios];
      let huboCambios = false;

      // 🛑 MIGRACIÓN FORZADA A PBKDF2 (FACTORY RESET SI NO MIGRADO)
      const MIGRATION_KEY = 'sys_auth_migrated_pbkdf2_v2.1';
      const isMigrated = localStorage.getItem(MIGRATION_KEY);

      if (!isMigrated) {
        console.warn("⚠️ [AUTH] Detectado sistema legacy. Ejecutando Factory Reset para seguridad PBKDF2.");
        currentUsers = []; // Borramos todo para regenerar Admin limpio
        localStorage.setItem(MIGRATION_KEY, 'true');
        huboCambios = true;
      }

      // PASO 1: Sincronizar Permisos
      currentUsers = currentUsers.map(u => {
        const permisosAlDia = ROLE_PRESETS[u.rol];
        if (permisosAlDia) {
          if (JSON.stringify(u.permisos) !== JSON.stringify(permisosAlDia)) {
            huboCambios = true;
            return { ...u, permisos: permisosAlDia };
          }
        }
        return u;
      });

      // PASO 2: Garantizar Super Admin (Dueño)
      const existeDueno = currentUsers.some(u => u.id === SUPER_ADMIN_ID);
      if (!existeDueno) {
        console.log("👑 [AUTH] Restaurando Super Admin (Dueño) con PBKDF2...");

        // 🔐 GENERACIÓN DINÁMICA DE HASH
        // No usamos constantes hardcodeadas. Calculamos el hash real de '123456'.
        const defaultPin = '123456';
        const dynamicHash = await hashPin(defaultPin);

        currentUsers.push({
          id: SUPER_ADMIN_ID,
          nombre: 'Dueño',
          rol: 'admin',
          roleId: 'ROL_DUENO',
          tipo: 'ADMIN',
          pinHash: dynamicHash, // ✅ Hash PBKDF2 real
          activo: true,
          isFactoryAuth: true,
          permisos: ROLE_PRESETS.admin
        });
        huboCambios = true;
      }

      if (huboCambios) {
        setUsuarios(currentUsers);
      }
    };

    runSelfHealing();
  }, []); // ✅ Dependencia vacía: Solo al inicio.


  useEffect(() => { localStorage.setItem('listo_users_v1', JSON.stringify(usuarios)); }, [usuarios]);

  // --- FUNCIONES DE SESIÓN ---

  const login = async (pinInput, requiredUserId = null) => {
    const inputHash = await hashPin(pinInput);

    let usuarioEncontrado;

    if (requiredUserId) {
      // 🔒 MODO STRICT: Validamos solo contra el usuario seleccionado
      usuarioEncontrado = usuarios.find(u => u.id === requiredUserId && u.activo && u.pinHash === inputHash);
    } else {
      // 🔓 MODO LEGACY/BROAD: Validamos contra cualquiera (útil para quick-actions si existieran)
      usuarioEncontrado = usuarios.find(u => u.activo && u.pinHash === inputHash);
    }

    if (usuarioEncontrado) {
      // 🔄 SECURITY PATCH: Sincronizar permisos "Fresh" desde el código al hacer login
      // Esto asegura que si editamos permissions.js, el usuario obtenga los cambios al entrar.
      const freshPermissions = ROLE_PRESETS[usuarioEncontrado.rol] || usuarioEncontrado.permisos;
      const usuarioLogueado = { ...usuarioEncontrado, permisos: freshPermissions };

      setUsuarioActivo(usuarioLogueado);
      if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('LOGIN', `Acceso de ${usuarioLogueado.nombre}`, 'INFO');
      }
      return true;
    }
    return false;
  };

  const logout = () => {
    setUsuarioActivo(null);
    sessionStorage.clear();
  };

  // --- FUNCIONES DE VALIDACIÓN ---

  const compararPin = async (userId, pinInput) => {
    const inputHash = await hashPin(pinInput);
    const targetUser = usuarios.find(u => u.id == userId);
    if (!targetUser) return false;
    return targetUser.pinHash === inputHash;
  };

  const validarRequisitosPin = (pin) => {
    if (!pin || pin.length !== PIN_LENGTH) return { valid: false, msg: `El PIN debe tener ${PIN_LENGTH} dígitos` };
    if (!/^\d+$/.test(pin)) return { valid: false, msg: 'Solo números permitidos' };
    return { valid: true };
  };

  const verificarPinDisponible = async (pin, excludeUserId = null) => {
    const inputHash = await hashPin(pin);
    const conflicto = usuarios.find(u => u.id !== excludeUserId && u.pinHash === inputHash);
    return !conflicto;
  };

  const validarPinDueno = async (pinInput) => {
    const inputHash = await hashPin(pinInput);
    // Validamos contra el ID 1 o el rol explicito
    return usuarios.some(u => (u.id === SUPER_ADMIN_ID || u.roleId === 'ROL_DUENO') && u.pinHash === inputHash);
  };

  // --- FUNCIONES DE GESTIÓN (CRUD) ---

  const agregarUsuario = async (datos) => {
    try {
      const nuevoHash = await hashPin(datos.pin);

      // Asignar permisos según el rol seleccionado usando los PRESETS
      const permisosAsignados = ROLE_PRESETS[datos.rol] || [];

      const nuevoUsuario = {
        id: crypto.randomUUID(), // ✅ ID ÚNICO REAL
        nombre: datos.nombre,
        roleId: datos.roleId, // ✅ Usamos el ID que viene del formulario (ROL_EMPLEADO)
        rol: datos.rol,
        tipo: 'EMPLEADO',
        pinHash: nuevoHash,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        permisos: permisosAsignados
      };
      setUsuarios(prev => [...prev, nuevoUsuario]);

      if (typeof registrarEventoSeguridad === 'function') {
        registrarEventoSeguridad('CREACION_USUARIO', `Nuevo usuario: ${datos.nombre} (${datos.rol})`, 'INFO');
      }

      return { success: true };
    } catch (e) {
      return { success: false, msg: e.message };
    }
  };

  const eliminarUsuario = (id) => {
    if (id === SUPER_ADMIN_ID) {
      return { success: false, msg: "⛔ ACCESO DENEGADO: El usuario Dueño es parte del núcleo del sistema." };
    }
    setUsuarios(prev => prev.filter(u => u.id !== id));

    if (typeof registrarEventoSeguridad === 'function') {
      registrarEventoSeguridad('ELIMINACION_USUARIO', `Usuario eliminado ID: ${id}`, 'WARNING');
    }

    return { success: true };
  };

  const actualizarUsuario = (id, datos) => {
    if (id === SUPER_ADMIN_ID && datos.rol && datos.rol !== 'admin') {
      return { success: false, msg: "⛔ El Dueño siempre debe ser Administrador." };
    }

    setUsuarios(prev => prev.map(u => {
      if (u.id === id) {
        const nuevosPermisos = datos.rol ? ROLE_PRESETS[datos.rol] : u.permisos;
        const usuarioActualizado = { ...u, ...datos, permisos: nuevosPermisos };

        // 🔄 SYNC: Si estamos editando al usuario logueado, actualizamos la sesión en vivo
        if (usuarioActivo && usuarioActivo.id === id) {
          setUsuarioActivo(usuarioActualizado);
        }

        return usuarioActualizado;
      }
      return u;
    }));

    if (typeof registrarEventoSeguridad === 'function') {
      registrarEventoSeguridad('MODIFICACION_USUARIO', `Usuario actualizado ID: ${id}`, 'INFO');
    }

    return { success: true };
  };

  const adminResetUserPin = useCallback(async (userId, nuevoPin) => {
    const nuevoHash = await hashPin(nuevoPin);
    const factoryHash = await hashPin('123456');

    setUsuarios(prev => prev.map(u => {
      if (u.id === userId) {
        const updatedUser = {
          ...u,
          pinHash: nuevoHash,
          isFactoryAuth: nuevoHash === factoryHash // 🟢 FIX: Si cambia a algo distinto, se quita la alerta
        };

        // 🔄 SYNC: Si estamos editando al usuario logueado, actualizamos la sesión en vivo
        if (usuarioActivo && usuarioActivo.id === userId) {
          setUsuarioActivo(updatedUser);
        }

        return updatedUser;
      }
      return u;
    }));
    return { success: true };
  }, [usuarioActivo]);

  // Función expuesta para la Simulación o Live Updates
  const actualizarSesionLocal = (nuevoUsuario) => {
    setUsuarioActivo(nuevoUsuario);
  };

  // --- 🔒 SISTEMA DE RECUPERACIÓN SOBERANA (PUK) ---
  const [tempPukCode, setTempPukCode] = useState(null);

  // Generador de UUID v4 para System ID
  const getSystemID = () => {
    let sysId = localStorage.getItem('sys_installation_id');
    if (!sysId) {
      sysId = crypto.randomUUID();
      localStorage.setItem('sys_installation_id', sysId);
    }
    return sysId;
  };

  const generarCodigoRescate = async () => {
    // Generamos 4 bloques de 4 caracteres (ABCD-EFGH-IJKL-MNOP)
    const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin I, O, 0, 1 para evitar confusión
    let codigo = "";
    for (let i = 0; i < 4; i++) {
      if (i > 0) codigo += "-";
      for (let j = 0; j < 4; j++) {
        codigo += charset.charAt(Math.floor(Math.random() * charset.length));
      }
    }

    const hash = await hashPin(codigo); // Reusamos el hasher SHA-256 existente
    localStorage.setItem('sys_recovery_hash', hash);
    return codigo;
  };

  const validarCodigoRescate = async (inputCode) => {
    if (!inputCode) return false;
    const storedHash = localStorage.getItem('sys_recovery_hash');
    if (!storedHash) return false; // Si no hay PUK, nada valida (seguridad por defecto)

    // Normalizamos input: mayúsculas y trim
    const normalizedInput = inputCode.toUpperCase().trim();
    const inputHash = await hashPin(normalizedInput);

    return inputHash === storedHash;
  };

  // Check inicial de PUK
  useEffect(() => {
    const checkPuk = async () => {
      const storedHash = localStorage.getItem('sys_recovery_hash');
      // Si no existe PUK, lo creamos y lo mostramos
      if (!storedHash) {
        const newCode = await generarCodigoRescate();
        setTempPukCode(newCode);
        console.log("🛡️ [SECURITY] PUK generado. Esperando confirmación de usuario.");
      }
    };
    checkPuk();
  }, []);

  const validarTokenSoporte = async (inputToken) => {
    if (!inputToken) return false;
    const sysID = getSystemID();
    const expectedToken = await generarTokenDiario(sysID);
    return inputToken === expectedToken;
  };

  const confirmarLecturaPuk = () => {
    setTempPukCode(null);
  };

  return {
    usuario: usuarioActivo,
    usuarios,
    actualizarSesionLocal,
    login,
    logout,
    compararPin,
    validarRequisitosPin,
    verificarPinDisponible,
    agregarUsuario,
    actualizarUsuario,
    eliminarUsuario,
    adminResetUserPin,
    validarPinDueno,
    SUPER_ADMIN_ID,
    // EXPORTS PUK
    tempPukCode,
    confirmarLecturaPuk,
    validarCodigoRescate,
    validarTokenSoporte,
    getSystemID
  };
};