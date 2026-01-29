import React, { useState } from 'react';
import { useStore } from '../../context/StoreContext';
import Swal from 'sweetalert2';
import { Lock } from 'lucide-react';
import { ROLES } from '../../config/permissions';

import { useMasterTelemetry } from '../../hooks/sync/useMasterTelemetry';

/**
 * 🛡️ ACTION GUARD
 * Envuelve un elemento clickable (botón, div, etc).
 * Al hacer click:
 * 1. Verifica si tengo permiso -> Ejecuta onClick directo.
 * 2. Si NO tengo permiso -> Pide PIN de Supervisor (MANAGER u OWNER).
 * 3. Si el PIN es válido -> Ejecuta onClick (Elevación de un solo uso).
 */
export const ActionGuard = ({
    permission,
    onClick,
    children,
    className = "",
    actionName = "Acción Protegida"
}) => {
    const { hasPermission, usuarios, compararPin } = useStore();
    const { reportarIncidente } = useMasterTelemetry(); // 🚨 CHISMOSO
    const [isChecking, setIsChecking] = useState(false);

    const handleClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (isChecking) return;

        // 1. TICKET DORADO: Tengo permiso propio
        if (hasPermission(permission)) {
            onClick(e);
            return;
        }

        // 2. ELEVACIÓN DE PRIVILEGIOS
        setIsChecking(true);

        try {
            const { value: pinIngresado } = await Swal.fire({
                title: 'Requiere Autorización',
                html: `
                    <div class="text-slate-500 mb-4">El usuario actual no tiene permiso para: <br/><strong>${actionName}</strong></div>
                    <div class="text-xs font-bold text-violet-600 bg-violet-50 p-2 rounded-lg mb-4">
                        Solicita el PIN a un Encargado o Dueño
                    </div>
                `,
                input: 'password',
                inputAttributes: {
                    autocapitalize: 'off',
                    maxlength: 6,
                    autofocus: ''
                },
                inputPlaceholder: '• • • • • •',
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                confirmButtonText: 'Autorizar',
                cancelButtonText: 'Cancelar',
                backdrop: `rgba(0,0,0,0.8)`
            });

            if (pinIngresado) {
                // Buscamos QUIÉN está autorizando (necesita ser MANAGER o OWNER)
                const supervisor = usuarios.find(u =>
                    (u.roleId === ROLES.OWNER || u.roleId === ROLES.MANAGER || u.tipo === 'ADMIN') &&
                    u.activo
                );

                // Aquí hay un detalle: necesitamos validar que el PIN corresponda a ALGÚN supervisor
                // No sabemos cuál, así que probamos contra los supervisores encontrados
                const supervisores = usuarios.filter(u =>
                    u.activo &&
                    (u.roleId === ROLES.OWNER || u.roleId === ROLES.MANAGER || u.tipo === 'ADMIN' || u.id === 1)
                );

                let autorizado = false;
                let autorizadorNombre = '';

                // Iteramos (generalmente son pocos usuarios, es rápido)
                for (const sup of supervisores) {
                    const esValido = await compararPin(sup.id, pinIngresado);
                    if (esValido) {
                        autorizado = true;
                        autorizadorNombre = sup.nombre;
                        break;
                    }
                }

                if (autorizado) {
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                    Toast.fire({ icon: 'success', title: `Autorizado por ${autorizadorNombre}` });
                    onClick(e);
                } else {
                    Swal.fire('Denegado', 'PIN incorrecto o nivel insuficiente.', 'error');
                    // 🚨 REPORTAR FALLO DE ELEVACIÓN
                    reportarIncidente('ELEVACION_FALLIDA', `Intento fallido acciones protegida: ${actionName} / Permiso: ${permission}`, 'ALERTA');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <div onClick={handleClick} className={className}>
            {children}
        </div>
    );
};
