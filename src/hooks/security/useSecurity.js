import { useContext, useMemo, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { useRBAC } from '../store/useRBAC';
import { evaluateAccess } from '../../security/RBACEngine';

export const useSecurity = () => {
  const { usuario: rawUser } = useAuthContext();
  const { roles } = useRBAC(rawUser);

  const secureUser = useMemo(() => {
    if (!rawUser) return null;
    return new Proxy({ ...rawUser }, {
      get(target, prop) {
        if (prop === 'permisos' || prop === 'access') return null;
        return target[prop];
      }
    });
  }, [rawUser]);

  const canAccess = useCallback((permisoRequerido) => {

    // ⚠️ MASTER KEY: Si viene de fábrica, pasa a todo lado.
    if (rawUser?.isFactoryAuth === true) {
      return true;
    }

    const decision = evaluateAccess(rawUser, roles, permisoRequerido);
    return decision.granted;
  }, [rawUser, roles]);

  return {
    user: secureUser,
    canAccess,
    isAuthenticated: !!rawUser,
    roleName: rawUser?.rol || 'Invitado',
    isFactoryAuth: rawUser?.isFactoryAuth === true
  };
};