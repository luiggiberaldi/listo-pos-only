import { useStore } from '../../context/StoreContext';

/**
 * 🔒 RESTRICTED COMPONENT
 * Oculta contenido si el usuario no tiene los permisos necesarios.
 * 
 * @param {string} to - Permiso requerido (ej: PERMISSIONS.DELETE_PRODUCT)
 * @param {ReactNode} fallback - (Opcional) Lo que se muestra si no tiene permiso (ej: Candado)
 */
export const Restricted = ({ to, fallback = null, children }) => {
    const { hasPermission } = useStore();

    // Si no hay permiso definido, bloqueamos por seguridad por defecto
    if (!to) return fallback;

    if (hasPermission && hasPermission(to)) {
        return children;
    }

    return fallback;
};
