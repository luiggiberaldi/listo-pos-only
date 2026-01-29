// ✅ SYSTEM IMPLEMENTATION - V. 5.0 (RBAC CORE)
// Archivo: src/hooks/store/useRBAC.js
// Evolución: Ahora consume la configuración centralizada src/config/permissions.js

import { ROLES, ROLE_PERMISSIONS, ROLE_META } from '../../config/permissions';

export const useRBAC = (usuarioActivo) => {

  /**
   * 🧠 CEREBRO DE AUTORIZACIÓN
   * @param {string} permission - El string del permiso (ej: 'POS_VOID_ITEM')
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    if (!usuarioActivo) return false;

    const userRole = usuarioActivo.roleId;

    // 1. 👑 SUPERUSER OVERRIDE
    // Si es el Dueño o Admin global, siempre True (God Mode)
    if (userRole === ROLES.OWNER || usuarioActivo.tipo === 'ADMIN' || usuarioActivo.id === 1) {
      return true;
    }

    // 2. 🛡️ VERIFICACIÓN REGULAR
    // Buscamos los permisos base del ROL
    const rolePermissions = ROLE_PERMISSIONS[userRole] || [];

    // 3. 🧩 PERMISOS GRANULARES (CUSTOM USER LEVEL)
    // Buscamos si el usuario tiene "Poderes Extra" asignados manualmente
    const userCustomPermissions = usuarioActivo.customPermissions || [];

    // Fusión de Permisos (Rol + Extra)
    // Esto permite que un Cajero tenga permisos de Inventario sin ser Manager
    const totalPermissions = new Set([...rolePermissions, ...userCustomPermissions]);

    return totalPermissions.has(permission);
  };

  /**
   * Alias sintáctico para legibilidad
   */
  const can = hasPermission;

  return {
    hasPermission,
    can,
    tienePermiso: hasPermission, // Alias Legacy
    roles: Object.values(ROLES), // Para listas desplegables
    roleMeta: ROLE_META
  };
};

// Re-exportamos para compatibilidad
export { PERMISSIONS, PERMISSIONS as PERMISOS } from '../../config/permissions';
export { ROLES };