import { useState } from 'react';
import Swal from 'sweetalert2';
import { useStore } from '../../context/StoreContext';
import { useSecurityAudit } from './useSecurityAudit';

// --- UTILIDADES CRIPTOGRÁFICAS (AISLADAS PARA ESTABILIDAD) ---
// Se duplican intencionalmente para evitar dependencias circulares con useAuth
const bufferToHex = (buffer) => Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
const hexToBuffer = (hex) => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  return bytes;
};
const generarSalt = () => bufferToHex(crypto.getRandomValues(new Uint8Array(16)));

const hashPin = async (pin, saltHex) => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(pin), { name: "PBKDF2" }, false, ["deriveBits", "deriveKey"]);
  const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBuffer(saltHex), iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  return bufferToHex(derivedBits);
};

/**
 * usePinUpgrade: Hook de Gestión de Migración de Credenciales.
 * Facilita la transición de PIN Legacy (4 dígitos) a PIN Seguro (6 dígitos).
 */
export const usePinUpgrade = () => {
  const { usuario, actualizarUsuario } = useStore();
  const { registrarEventoSeguridad } = useSecurityAudit();
  const [isUpgrading, setIsUpgrading] = useState(false);

  // Detector de elegibilidad: ¿El usuario actual usa credenciales legacy?
  const canUpgradePin = usuario && (!usuario.pinVersion || usuario.pinVersion < 2);

  /**
   * Inicia el flujo interactivo de actualización de PIN.
   */
  const iniciarMigracion = async () => {
    if (!canUpgradePin) return;
    setIsUpgrading(true);

    try {
      // 1. Solicitar Nuevo PIN (UI Modal)
      const { value: nuevoPin } = await Swal.fire({
        title: 'Mejorar Seguridad',
        text: 'Actualiza tu PIN a 6 dígitos para mayor protección y menos interrupciones.',
        input: 'password',
        inputPlaceholder: 'Nuevo PIN (6 dígitos)',
        inputAttributes: {
          maxlength: 6,
          autocapitalize: 'off',
          inputmode: 'numeric',
          style: 'text-align: center; letter-spacing: 0.5em; font-weight: bold; font-size: 24px;'
        },
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Más tarde',
        confirmButtonColor: '#10b981', // Emerald-500
        preConfirm: (value) => {
          if (!/^\d{6}$/.test(value)) {
            Swal.showValidationMessage('El PIN debe tener exactamente 6 números');
          }
          return value;
        }
      });

      if (!nuevoPin) {
        setIsUpgrading(false);
        return; // Cancelado por usuario
      }

      // 2. Confirmación (Doble factor visual)
      const { value: confirmacion } = await Swal.fire({
        title: 'Confirmar Nuevo PIN',
        input: 'password',
        inputPlaceholder: 'Repite el PIN',
        inputAttributes: { maxlength: 6, inputmode: 'numeric', style: 'text-align: center; letter-spacing: 0.5em;' },
        showCancelButton: true,
        confirmButtonText: 'Confirmar',
        preConfirm: (value) => {
          if (value !== nuevoPin) Swal.showValidationMessage('Los PINs no coinciden');
          return value;
        }
      });

      if (!confirmacion) {
        setIsUpgrading(false);
        return;
      }

      // 3. Proceso Criptográfico (Client-Side)
      const nuevoSalt = generarSalt();
      const nuevoHash = await hashPin(nuevoPin, nuevoSalt);

      // 4. Persistencia Atómica (Actualiza sin logout)
      actualizarUsuario(usuario.id, {
        pinHash: nuevoHash,
        salt: nuevoSalt,
        pinVersion: 2,
        pinMigrationStatus: 'UPGRADED'
      });

      // 5. Auditoría
      registrarEventoSeguridad({
        tipo: 'SECURITY_NOTICE',
        subTipo: 'PIN_UPGRADED',
        contexto: 'MIGRACION_CREDENCIALES',
        usuarioId: usuario.id,
        metadata: { prevVersion: 1, newVersion: 2 }
      });

      // 6. Feedback
      await Swal.fire({
        title: '¡Seguridad Mejorada!',
        text: 'Tu cuenta ahora está protegida con cifrado de alto nivel.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });

    } catch (error) {
      console.error("Error en migración de PIN:", error);
      Swal.fire('Error', 'No se pudo actualizar el PIN.', 'error');
    } finally {
      setIsUpgrading(false);
    }
  };

  return {
    canUpgradePin,
    iniciarMigracion,
    isUpgrading
  };
};