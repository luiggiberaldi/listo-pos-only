// ✅ SYSTEM IMPLEMENTATION - V. 5.0 (RBAC CORE)
// Archivo: src/hooks/store/useRBAC.js
// Evolución: Ahora consume la configuración centralizada src/config/permissions.js

import { ROLES, ROLE_PERMISSIONS, ROLE_META } from '../../config/permissions';
import { PLAN_REQUIREMENTS, hasFeature } from '../../config/planTiers';

export const useRBAC = (usuarioActivo) => {

  /**
   * 🧠 CEREBRO DE AUTORIZACIÓN
   * @param {string} permission - El string del permiso (ej: 'POS_VOID_ITEM')
   * @returns {boolean}
   */
  const hasPermission = (permission) => {
    if (!usuarioActivo) return false;

    const userRole = usuarioActivo.roleId;

    // 0. 🛑 PLAN LIMITS (HARD CEILING)
    // Primero validamos si el PLAN ACTIVO permite esta funcionalidad.
    // Esto sobreescribe cualquier rol (incluso Admin), porque si no pagas, no lo tienes.
    const requiredFeature = PLAN_REQUIREMENTS[permission];
    if (requiredFeature) {
      const currentPlanId = localStorage.getItem('listo_plan') || 'bodega'; // Fallback a lo más básico
      const planAllows = hasFeature(currentPlanId, requiredFeature);

      if (!planAllows) {
        // 🔓 EXCEPCIÓN: GOD MODE (Developer/Owner real debugging)
        // Si es usuario ID 1 Y está en modo DEV, permitimos bypass.
        // Pero para uso normal, se bloquea.
        if (usuarioActivo.id === 1 && localStorage.getItem('dev_mode') === 'true') {
          // Pass through to Role check
        } else {
          return false;
        }
      }
    }

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