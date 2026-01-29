import { useState } from 'react';
import { useStore } from '../../context/StoreContext';

export const useRoleSimulation = () => {
  const { roles, usuario, actualizarSesionLocal } = useStore();
  const [logs, setLogs] = useState([]);
  const [originalUser, setOriginalUser] = useState(null);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg, type }]);
  };

  const simularIdentidad = (rol) => {
    // Guardamos el usuario original solo la primera vez para poder restaurarlo
    if (!originalUser) {
        setOriginalUser({ ...usuario });
    }

    // Creamos el usuario simulado mezclando el actual con el nuevo rol
    const usuarioSimulado = {
      ...usuario,
      role: rol.nombre,
      roleId: rol.id,
      permisos: rol.permisos || [], // Asumimos que el objeto rol trae permisos
      isSimulated: true
    };

    if (actualizarSesionLocal) {
        actualizarSesionLocal(usuarioSimulado);
        addLog(`🎭 Identidad cambiada a: ${rol.nombre}`, 'warning');
    } else {
        addLog("❌ Error: El sistema no permite cambio de sesión local.", 'error');
    }
  };

  const restaurarIdentidad = () => {
    if (originalUser && actualizarSesionLocal) {
        actualizarSesionLocal(originalUser);
        setOriginalUser(null);
        addLog("🔙 Identidad original restaurada.", 'success');
    } else {
        addLog("⚠️ No hay identidad para restaurar o función no disponible.", 'warning');
    }
  };

  // Si no hay roles en el store, usamos unos por defecto para pruebas
  const rolesDisponibles = (roles && roles.length > 0) ? roles : [
      { id: 'admin', nombre: 'Administrador' },
      { id: 'gerente', nombre: 'Gerente' },
      { id: 'cajero', nombre: 'Cajero' },
      { id: 'inventario', nombre: 'Almacenista' }
  ];

  return {
    rolesDisponibles,
    simularIdentidad,
    restaurarIdentidad,
    logs
  };
};