// ✅ SYSTEM IMPLEMENTATION - V. 2.5 (FINAL GUARD)
// Archivo: src/hooks/security/useSecureAction.js
// Rastro: Sistema Binario Puro. Validación directa contra PIN de Dueño.

import { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import Swal from 'sweetalert2';

export const useSecureAction = () => {
  // Ahora extraemos 'compararPin' y 'usuarios' del contexto limpio
  const { tienePermiso, usuarios, compararPin } = useStore();
  const [loading, setLoading] = useState(false);

  const ejecutarAccionSegura = async ({ 
    permiso, 
    accion, 
    nombreAccion = 'Acción Protegida' 
  }) => {
    setLoading(true);

    try {
        // 1. Permiso Directo (El usuario ya tiene permiso, ej: Cajero vendiendo)
        if (tienePermiso && tienePermiso(permiso)) {
            await accion();
            return;
        }

        // 2. Elevación de Privilegios (Pedir PIN de Dueño)
        const { value: pinIngresado } = await Swal.fire({
            title: 'Autorización Requerida',
            text: `Esta acción requiere nivel de Dueño: ${nombreAccion}`,
            input: 'password',
            inputPlaceholder: 'PIN del Dueño',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Autorizar',
            confirmButtonColor: '#0f172a',
            cancelButtonText: 'Cancelar',
            backdrop: `rgba(0,0,0,0.8)`
        });

        if (pinIngresado) {
            // Buscamos al dueño (ID 1, Rol Dueño o Tipo Admin)
            const dueno = usuarios.find(u => u.roleId === 'ROL_DUENO' || u.tipo === 'ADMIN' || u.id === 1);
            
            if (dueno) {
                // Validamos el PIN ingresado contra el hash del dueño
                const esValido = await compararPin(dueno.id, pinIngresado);
                
                if (esValido) {
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
                    Toast.fire({ icon: 'success', title: 'Autorizado' });
                    await accion();
                } else {
                    Swal.fire('Denegado', 'PIN de Dueño incorrecto.', 'error');
                }
            } else {
                Swal.fire('Error Crítico', 'No se encontró un usuario Dueño configurado.', 'error');
            }
        }

    } catch (error) {
        console.error("Error en acción segura:", error);
        Swal.fire('Error', 'Fallo al procesar la autorización.', 'error');
    } finally {
        setLoading(false);
    }
  };

  return { ejecutarAccionSegura, loading };
};