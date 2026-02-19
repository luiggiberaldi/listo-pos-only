// 🔐 LICENSE LEGACY — Salt compartida para validación SHA-256 (V1)
// Archivo: src/config/licenseLegacy.js
//
// ⚠️  DEUDA TÉCNICA: Este archivo solo existe para compatibilidad con licencias V1 (SHA-256).
//     Una vez que todos los terminales hayan migrado a JWT (RS256), eliminar este archivo.
//     TODO: Eliminar en Q4-2026
//
// La razón de existir: Antes, el salt estaba duplicado en useLicenseGuard.js y LicenseGate.jsx.
// Ahora tiene un único lugar de definición (Single Source of Truth).

export const LICENSE_SALT_LEGACY = import.meta.env.VITE_LICENSE_SALT || "LISTO_POS_V1_SECURE_SALT_998877";
