/**
 * RBAC ENGINE - FÉNIX v4
 * Single Source of Truth para decisiones de autorización.
 * ------------------------------------------------------
 * ESTE MÓDULO NO TIENE ESTADO. SOLO EVALÚA REGLAS.
 */

// Si tienes un archivo de permisos, impórtalo para validar existencia
// import { PERMISSIONS } from './permissions'; 

export const evaluateAccess = (usuario, rolesDefinidos, permisoRequerido) => {
  // 1. 🛑 RECHAZO INMEDIATO: Sin identidad no hay acceso
  if (!usuario) {
    return { granted: false, reason: 'NO_IDENTITY' };
  }

  // 2. ⚡ GOD MODE: Admin Supremo
  // Si es ADMIN, cortocircuitamos cualquier chequeo. Pasa directo.
  if (usuario.tipo === 'ADMIN' || usuario.role === 'admin') {
    return { granted: true, reason: 'ADMIN_OVERRIDE' };
  }

  // 3. 🛡️ VALIDACIÓN DE INTEGRIDAD
  if (!permisoRequerido) {
    console.error("⚠️ [RBAC] Error de implementación: Se llamó a canAccess() sin permiso.");
    return { granted: false, reason: 'INVALID_QUERY' };
  }

  // 4. 🔍 BÚSQUEDA DE AUTORIDAD (ROL)
  // El usuario solo tiene un ID de rol. Buscamos la definición completa.
  const rolUsuario = rolesDefinidos.find(r => r.id === usuario.roleId);

  if (!rolUsuario) {
    // Caso borde: El usuario tiene un roleId que ya no existe en la DB.
    console.warn(`⚠️ [RBAC] Rol huérfano detectado para usuario ${usuario.nombre} (RoleID: ${usuario.roleId})`);
    return { granted: false, reason: 'ROLE_DEFINITION_MISSING' };
  }

  // 5. ✅ COTEJO FINAL (CRUCE DE ARRAYS)
  // ¿La lista de permisos del rol contiene la llave solicitada?
  const tienePermiso = rolUsuario.permisos.includes(permisoRequerido);

  if (!tienePermiso && process.env.NODE_ENV === 'development') {
    // Log silencioso para debug en desarrollo
    // console.debug(`⛔ [RBAC] Denegado: ${usuario.nombre} -> ${permisoRequerido}`);
  }

  return { 
    granted: tienePermiso, 
    reason: tienePermiso ? 'GRANTED' : 'MISSING_PERMISSION' 
  };
};