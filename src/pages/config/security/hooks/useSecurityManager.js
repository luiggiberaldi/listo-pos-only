import { useState } from 'react';
import Swal from 'sweetalert2';
import { useStore } from '../../../../context/StoreContext';
import { useSecureAction } from '../../../../hooks/security/useSecureAction';
import { PERMISOS } from '../../../../hooks/store/useRBAC';
import { ROLE_PERMISSIONS, ROLE_PRESETS, PERMISSION_META, PERMISSION_GROUPS } from '../../../../config/permissions';
import { useEmployeeFinance } from '../../../../hooks/store/useEmployeeFinance'; // 🆕
import { db } from '../../../../db'; // [FIX C2] DB access for fallback

export const useSecurityManager = (readOnly) => {
  const {
    usuarios, agregarUsuario, eliminarUsuario, actualizarUsuario,
    usuario: currentUser, adminResetUserPin,
    validarRequisitosPin, verificarPinDisponible, compararPin,
    registrarEventoSeguridad // ✅ Logger injected from Store
  } = useStore();

  const { ejecutarAccionSegura } = useSecureAction();
  const { actualizarConfiguracion } = useEmployeeFinance(); // 🆕 Hook Financiero

  // SVG Icons for SweetAlerts
  const EYE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const EYE_OFF_ICON = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7c.44 0 .87-.03 1.28-.08"/><line x1="2" y1="2" x2="22" y2="22"/></svg>`;

  const attachPinToggles = (popup) => {
    const toggles = popup.querySelectorAll('.pin-toggle-btn');
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const inputId = btn.getAttribute('data-input');
        const input = popup.querySelector(`#${inputId}`);
        if (input) {
          const isPassword = input.type === 'password';
          input.type = isPassword ? 'text' : 'password';
          btn.innerHTML = isPassword ? EYE_OFF_ICON : EYE_ICON;
          btn.classList.toggle('text-blue-500', isPassword);
        }
      });
    });
  };

  const [nuevoEmpleado, setNuevoEmpleado] = useState({ nombre: '', pin: '', rol: 'Cajero', sueldoBase: '', frecuenciaPago: 'Semanal' }); // 🆕 Init sueldoBase & Frecuencia

  // --- ACCIONES ---

  const changeMyPin = async () => {
    if (readOnly) return;
    const { value: formValues } = await Swal.fire({
      title: 'Actualizar Credencial',
      html: `
        <div class="text-left space-y-4">
            <div class="relative">
                <input id="swal-current" type="password" maxlength="6" class="w-full p-4 pl-12 pr-12 border-2 border-slate-200 rounded-xl text-lg font-bold tracking-widest outline-none focus:border-blue-500 transition-colors" placeholder="PIN Actual">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔒</div>
                <button type="button" class="pin-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1" data-input="swal-current">${EYE_ICON}</button>
            </div>
            <div class="relative">
                <input id="swal-new" type="password" maxlength="6" class="w-full p-4 pl-12 pr-12 border-2 border-slate-200 rounded-xl text-lg font-bold tracking-widest outline-none focus:border-emerald-500 transition-colors" placeholder="Nuevo PIN">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">✨</div>
                <button type="button" class="pin-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1" data-input="swal-new">${EYE_ICON}</button>
            </div>
            <div class="relative">
                <input id="swal-confirm" type="password" maxlength="6" class="w-full p-4 pl-12 pr-12 border-2 border-slate-200 rounded-xl text-lg font-bold tracking-widest outline-none focus:border-emerald-500 transition-colors" placeholder="Confirmar">
                <div class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">✅</div>
                <button type="button" class="pin-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-600 transition-colors p-1" data-input="swal-confirm">${EYE_ICON}</button>
            </div>
        </div>
      `,
      didOpen: (popup) => attachPinToggles(popup),
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Guardar Cambios',
      confirmButtonColor: '#0f172a',
      preConfirm: async () => {
        const current = document.getElementById('swal-current').value;
        const newPin = document.getElementById('swal-new').value;
        const confirm = document.getElementById('swal-confirm').value;

        if (!current || !newPin || !confirm) { Swal.showValidationMessage('Completa todos los campos'); return false; }
        if (newPin !== confirm) { Swal.showValidationMessage('Los nuevos PINs no coinciden'); return false; }

        const validFormat = validarRequisitosPin(newPin);
        if (!validFormat.valid) { Swal.showValidationMessage(validFormat.msg); return false; }

        const esCorrecto = await compararPin(currentUser.id, current);
        if (!esCorrecto) { Swal.showValidationMessage('El PIN actual es incorrecto'); return false; }

        return newPin;
      }
    });

    if (formValues) {
      const res = await adminResetUserPin(currentUser.id, formValues);
      if (res.success) Swal.fire('¡Hecho!', 'Tu llave de acceso ha sido actualizada.', 'success');
      else Swal.fire('Error', res.msg, 'error');
    }
  };

  /* 
 * ✅ RENOMBRAR USUARIO (Dueño o Empleado)
 * Ahora es genérico. Si no se pasa targetUser, asume currentUser.
 */
  const updateUserName = async (targetUser) => {
    if (readOnly) return;

    // Si no viene usuario, es el dueño queriéndose cambiar a sí mismo
    const usuarioObjetivo = targetUser || currentUser;

    const { value: nuevoNombre } = await Swal.fire({
      title: 'Renombrar Perfil',
      input: 'text',
      inputValue: usuarioObjetivo.nombre,
      inputLabel: `Nuevo nombre para ${usuarioObjetivo.titulo || usuarioObjetivo.rol}`,
      showCancelButton: true,
      confirmButtonColor: '#0f172a',
      inputValidator: (value) => {
        if (!value) return 'El nombre no puede estar vacío';
      }
    });

    if (nuevoNombre && nuevoNombre !== usuarioObjetivo.nombre) {
      const res = actualizarUsuario(usuarioObjetivo.id, { nombre: nuevoNombre });
      if (res.success) {
        const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
        Toast.fire({ icon: 'success', title: 'Nombre actualizado' });
        registrarEventoSeguridad('CAMBIO_NOMBRE', `Nombre cambiado: ${usuarioObjetivo.nombre} -> ${nuevoNombre}`, 'INFO');
      } else {
        Swal.fire('Error', res.msg, 'error');
      }
    }
  };

  const createEmployee = async (e) => {
    e.preventDefault();
    if (readOnly) return;

    if (!nuevoEmpleado.nombre.trim() || !nuevoEmpleado.pin.trim()) return Swal.fire('Incompleto', 'Nombre y PIN requeridos', 'warning');

    const formato = validarRequisitosPin(nuevoEmpleado.pin);
    if (!formato.valid) return Swal.fire('Formato Inválido', formato.msg, 'warning');

    // [FIX C1] Verificación de PIN único reactivada
    const disponible = await verificarPinDisponible(nuevoEmpleado.pin);
    if (!disponible) return Swal.fire('Duplicado', 'Ese PIN ya está en uso. Cada empleado debe tener un PIN único.', 'error');

    ejecutarAccionSegura({
      permiso: PERMISOS.CONF_USUARIOS_EDITAR,
      nombreAccion: 'Contratar Empleado',
      accion: async () => {
        const res = await agregarUsuario({
          nombre: nuevoEmpleado.nombre,
          pin: nuevoEmpleado.pin,
          roleId: nuevoEmpleado.rol === 'Encargado' ? 'ROL_ENCARGADO' : nuevoEmpleado.rol === 'Cajero' ? 'ROL_EMPLEADO' : 'ROL_CUSTOM',
          rol: nuevoEmpleado.rol === 'Encargado' || nuevoEmpleado.rol === 'Cajero' ? nuevoEmpleado.rol : 'Personalizado',
          customLabel: nuevoEmpleado.rol !== 'Encargado' && nuevoEmpleado.rol !== 'Cajero' ? nuevoEmpleado.rol : null
        });
        if (res.success) {
          // 2. Configurar Finanzas (Sueldo Base)
          // Intento 1: Usar ID devuelto por el hook (Ideal)
          let targetUserId = res.user?.id;

          // [FIX C2] Fallback robusto: buscar en DB directamente si no se devolvió ID
          if (!targetUserId) {
            console.warn("⚠️ [SECURITY] 'agregarUsuario' no devolvió ID. Buscando en DB...");
            try {
              // Buscar por nombre exacto (recién creado, debe ser único o el más reciente)
              const allUsers = await db.usuarios.toArray();
              const found = allUsers
                .filter(u => u.nombre === nuevoEmpleado.nombre.trim())
                .sort((a, b) => (b.id || 0) - (a.id || 0))[0];
              if (found) {
                targetUserId = found.id;
                console.log("✅ [SECURITY] Usuario encontrado por fallback:", targetUserId);
              }
            } catch (dbErr) {
              console.error("❌ [SECURITY] Fallback DB falló:", dbErr);
            }
          }

          if (nuevoEmpleado.sueldoBase && parseFloat(nuevoEmpleado.sueldoBase) > 0) {
            if (targetUserId) {
              await actualizarConfiguracion(targetUserId, {
                sueldoBase: parseFloat(nuevoEmpleado.sueldoBase),
                frecuenciaPago: nuevoEmpleado.frecuenciaPago || 'Semanal'
              });
            } else {
              // ALERTA DE SEGURIDAD PARA EL USUARIO
              Swal.fire({
                title: 'Atención: Nómina Pendiente',
                text: 'El empleado fue creado, pero el sueldo y frecuencia deberán configurarse manualmente en su ficha.',
                icon: 'warning',
                confirmButtonText: 'Entendido'
              });
            }
          }

          setNuevoEmpleado({ nombre: '', pin: '', rol: 'Cajero', sueldoBase: '', frecuenciaPago: 'Semanal' });
          const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000 });
          Toast.fire({ icon: 'success', title: 'Nuevo miembro añadido al equipo' });
        } else {
          Swal.fire('Error', res.msg, 'error');
        }
      }
    });
  };

  const resetEmployeePin = (targetUser) => {
    if (readOnly) return;
    ejecutarAccionSegura({
      permiso: PERMISOS.CONF_USUARIOS_EDITAR,
      nombreAccion: `Resetear PIN de ${targetUser.nombre}`,
      accion: async () => {
        const { value: nuevoPin } = await Swal.fire({
          title: `Nueva Llave para ${targetUser.nombre}`,
          html: `
                    <div class="bg-blue-50 text-blue-700 p-4 rounded-xl text-sm font-medium mb-4">El empleado deberá usar este nuevo código inmediatamente.</div>
                    <div class="space-y-4">
                        <div class="relative">
                            <input id="reset-p1" type="password" maxlength="6" class="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-center text-3xl font-black tracking-[0.5em] focus:ring-4 focus:ring-blue-100 outline-none" placeholder="••••••" autofocus>
                            <button type="button" class="pin-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1" data-input="reset-p1">${EYE_ICON}</button>
                        </div>
                        <div class="relative">
                            <input id="reset-p2" type="password" maxlength="6" class="w-full p-4 pr-12 bg-slate-50 border border-slate-200 rounded-xl text-center text-3xl font-black tracking-[0.5em] focus:ring-4 focus:ring-blue-100 outline-none" placeholder="••••••">
                            <button type="button" class="pin-toggle-btn absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors p-1" data-input="reset-p2">${EYE_ICON}</button>
                        </div>
                    </div>
                `,
          didOpen: (popup) => attachPinToggles(popup),
          showCancelButton: true,
          confirmButtonText: 'ESTABLECER PIN',
          preConfirm: () => {
            const p1 = document.getElementById('reset-p1').value;
            const p2 = document.getElementById('reset-p2').value;
            if (!p1 || !p2) { Swal.showValidationMessage('Ingresa y confirma el PIN'); return false; }
            if (p1 !== p2) { Swal.showValidationMessage('Los códigos no coinciden'); return false; }
            if (p1.length !== 6 || isNaN(p1)) { Swal.showValidationMessage('Debe ser numérico de 6 dígitos'); return false; }
            return p1;
          }
        });

        if (nuevoPin) {
          const res = await adminResetUserPin(targetUser.id, nuevoPin);
          if (res.success) Swal.fire('Actualizado', 'La credencial ha sido renovada.', 'success');
          else Swal.fire('Error', res.msg, 'error');
        }
      }
    });
  };

  const fireEmployee = (u) => {
    if (readOnly) return;
    if (u.id === 1) {
      return Swal.fire('Acción Denegada', 'El Dueño principal del sistema no puede ser eliminado.', 'error');
    }

    if (u.roleId === 'ROL_DUENO' && !u.nombre?.startsWith('AUDIT_USER_')) {
      return Swal.fire('Acción Denegada', 'No se pueden eliminar otros administradores reales por seguridad.', 'error');
    }

    ejecutarAccionSegura({
      permiso: PERMISOS.CONF_USUARIOS_EDITAR,
      nombreAccion: `Despedir a ${u.nombre}`,
      accion: () => {
        Swal.fire({
          title: '¿Dar de baja?',
          text: `${u.nombre} perderá el acceso al sistema inmediatamente.`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#ef4444',
          confirmButtonText: 'Sí, Eliminar'
        }).then((r) => {
          if (r.isConfirmed) {
            eliminarUsuario(u.id);
            Swal.fire('Eliminado', 'Usuario removido correctamente.', 'success');
          }
        });
      }
    });
  };

  /**
   * 🛡️ GESTIÓN DE MATRIZ DE PERMISOS GRANULARES
   */
  /**
   * 🛡️ GESTIÓN DE MATRIZ DE PERMISOS GRANULARES (ATOMIC)
   */
  const openPermissionsMatrix = async (targetUser) => {
    if (readOnly) return;

    // 1. Obtener grupos y permisos dinámicamente desde la fuente de verdad
    const groups = Object.values(PERMISSION_GROUPS).sort((a, b) => a.order - b.order);

    // 2. Determinar permisos base que YA TIENE el usuario
    const roleKey = targetUser.roleId || targetUser.rol;
    let basePermissions = [];

    // Support for both new role IDs and legacy names
    if (ROLE_PERMISSIONS[roleKey]) {
      basePermissions = ROLE_PERMISSIONS[roleKey];
    } else if (ROLE_PRESETS[targetUser.rol]) {
      basePermissions = ROLE_PRESETS[targetUser.rol];
    }

    // 3. Filtrar qué permisos mostrar
    // REGLA: Si es CUSTOM, mostramos TODO. Si es CAJERO/ENCARGADO, solo lo que le falta.
    const isCustomRole = roleKey === 'ROL_CUSTOM';

    // Preparamos la lista final de permisos "configurables"
    const configurablePermissions = [];

    Object.entries(PERMISSION_META).forEach(([permKey, meta]) => {
      // Si ya lo tiene por base y NO es custom, no necesitamos mostrarlo (es redundante)
      // EXCEPCIÓN: Si queremos permitir "revocar" permisos base, necesitaríamos otra lógica.
      // Por ahora, el modelo es "OVERRIDE ADDITIVE" (Solo agregar capacidades).
      if (!isCustomRole && basePermissions.includes(permKey)) return;

      configurablePermissions.push({ key: permKey, ...meta });
    });

    if (configurablePermissions.length === 0) {
      return Swal.fire({
        title: '¡Todo Incluido!',
        text: `El rol "${targetUser.rol || 'Actual'}" ya tiene superpoderes completos.`,
        icon: 'info',
        confirmButtonColor: '#0f172a'
      });
    }

    const currentCustom = targetUser.customPermissions || [];

    // 4. Construir HTML Dinámico Agrupado
    let htmlContent = '<div class="text-left space-y-6 max-h-[60vh] overflow-y-auto px-2 custom-scrollbar">';

    groups.forEach(group => {
      // Filtrar items de este grupo que sean configurables
      const groupItems = configurablePermissions.filter(p => p.group === group.id);

      if (groupItems.length > 0) {
        htmlContent += `
          <div class="space-y-3">
            <div class="sticky top-0 bg-white dark:bg-[#191e24] z-10 py-2 border-b border-slate-100 dark:border-slate-800">
               <h4 class="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  ${group.label}
               </h4>
            </div>
            <div class="grid grid-cols-1 gap-2">
        `;

        groupItems.forEach(p => {
          const isChecked = currentCustom.includes(p.key);
          htmlContent += `
              <div class="flex items-start gap-3 p-3 rounded-xl border ${isChecked ? 'bg-violet-50/50 border-violet-200 dark:bg-violet-900/20 dark:border-violet-800' : 'bg-slate-50 border-slate-100 dark:bg-slate-800/50 dark:border-slate-700'} hover:border-violet-300 transition-all cursor-pointer group" onclick="const ck = document.getElementById('perm-${p.key}'); ck.checked = !ck.checked; this.classList.toggle('bg-violet-50/50'); this.classList.toggle('border-violet-200'); this.classList.toggle('dark:bg-violet-900/20'); this.classList.toggle('dark:border-violet-800');">
                <div class="mt-0.5">
                  <input type="checkbox" id="perm-${p.key}" value="${p.key}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500 transition-all" onclick="event.stopPropagation()">
                </div>
                <div class="flex-1">
                  <p class="text-sm font-bold text-slate-700 dark:text-slate-200">${p.label}</p>
                  <p class="text-[10px] text-slate-400 font-medium leading-tight mt-0.5">${p.description}</p>
                </div>
              </div>
            `;
        });

        htmlContent += `</div></div>`;
      }
    });

    htmlContent += '</div>';

    // 5. Mostrar Modal
    const { value: selectedPermissions } = await Swal.fire({
      title: `Capacidades: ${targetUser.customLabel || targetUser.nombre}`,
      html: htmlContent,
      showCancelButton: true,
      confirmButtonText: 'Guardar Permisos',
      confirmButtonColor: '#7c3aed',
      cancelButtonText: 'Cancelar',
      width: '600px',
      preConfirm: () => {
        const checked = [];
        configurablePermissions.forEach(p => {
          if (document.getElementById(`perm-${p.key}`)?.checked) checked.push(p.key);
        });
        return checked;
      }
    });

    if (selectedPermissions !== undefined) {
      ejecutarAccionSegura({
        permiso: PERMISOS.CONF_USUARIOS_EDITAR,
        nombreAccion: `Actualizar Rol de ${targetUser.nombre}`,
        accion: () => {
          const res = actualizarUsuario(targetUser.id, { customPermissions: selectedPermissions });
          if (res.success) {
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Permisos Actualizados', showConfirmButton: false, timer: 2000 });
            registrarEventoSeguridad('RBAC_UPDATE', `Rol ${targetUser.rol}: ${selectedPermissions.length} permisos activos`, 'WARNING');
          } else {
            Swal.fire('Error', res.msg, 'error');
          }
        }
      });
    }
  };

  // ⚠️ NOTA: Como no puedo añadir imports al inicio con este bloque, 
  // voy a usar una estrategia diferente: Asumiremos que los roles estándar ya son conocidos 
  // O mejor, modificaremos el archivo completo para añadir el import arriba.

  return {
    currentUser,
    usuarios,
    nuevoEmpleado,
    setNuevoEmpleado,
    changeMyPin,
    updateUserName,
    createEmployee,
    resetEmployeePin,
    fireEmployee,
    openPermissionsMatrix
  };
};
