/**
 * @typedef {import('../config/permissions').ROLES} RolesEnum
 */

/**
 * @typedef {Object} User
 * @property {string|number} id - UUID o ID legacy
 * @property {string} nombre - Nombre visible
 * @property {string} roleId - Uno de los valores de ROLES (ej: 'ROL_DUENO')
 * @property {string} pinHash - Hash del PIN de seguridad
 * @property {boolean} activo - Si el usuario puede loguearse
 * @property {string[]} [permisos] - (Legacy) Lista explícita de permisos
 */

/**
 * @typedef {Object} AuthContextType
 * @property {User|null} usuario - Usuario actualmente logueado
 * @property {function(string): boolean} hasPermission - Verifica si tiene un permiso
 * @property {function(string): boolean} can - Alias de hasPermission
 */
