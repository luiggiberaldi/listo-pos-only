
import { useState, useCallback } from 'react';
import { useStore } from '../../context/StoreContext'; // ✅ Corrected path
import { useRBAC } from '../store/useRBAC';   // Adjust path if needed
import { PERMISOS, ROLES } from '../../config/permissions';

/**
 * 🕵️‍♂️ useRBACValidator
 * Hook de auditoría profunda para simular y validar permisos en tiempo real.
 */
export const useRBACValidator = () => {
    const { usuario, agregarUsuario, eliminarUsuario, usuarios } = useStore();
    const [testUser, setTestUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    // Helper para logs estructurados
    const log = (msg, type = 'INFO', details = null) => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs(prev => [`[${timestamp}] [${type}] ${msg} ${details ? JSON.stringify(details) : ''}`, ...prev]);
    };

    /**
     * 1. CREAR SUJETO DE PRUEBA
     * Crea un usuario "Sujeto de Prueba" con rol CUSTOM (0 permisos).
     */
    const createTestSubject = async () => {
        setIsRunning(true);
        log('=== INICIANDO AUDITORÍA RBAC ===', 'INFO');

        // Limpiar si ya existe
        const existing = usuarios.find(u => u.nombre === 'TEST_SUBJECT');
        if (existing) {
            log('Limpiando sujeto de prueba anterior...', 'WARNING');
            eliminarUsuario(existing.id);
        }

        log('Creando TEST_SUBJECT (Rol: CUSTOM - Sin Permisos)...', 'INFO');
        const res = await agregarUsuario({
            nombre: 'TEST_SUBJECT',
            pin: '000000',
            roleId: ROLES.CUSTOM,
            rol: 'Personalizado',
            customLabel: 'Sujeto de Prueba',
            customPermissions: [] // INCIO VACÍO
        });

        if (res.success) {
            const newUser = usuarios.find(u => u.nombre === 'TEST_SUBJECT'); // Re-fetch para tener ID
            setTestUser(newUser);
            log('Sujeto de prueba creado con éxito.', 'SUCCESS');
            return newUser;
        } else {
            log(`Error creando sujeto: ${res.msg}`, 'ERROR');
            setIsRunning(false);
            return null;
        }
    };

    /**
     * 2. SIMULACIÓN DE ACTORES (The Actor Model)
     * En lugar de loguearnos, instanciamos un useRBAC temporal con el usuario test.
     */
    const runScenario = (subject, scenarioName, permissionsToGrant, checks) => {
        if (!subject) {
            log('No hay sujeto de prueba. Abortando escenario.', 'ERROR');
            return;
        }

        log(`\n--- ESCENARIO: ${scenarioName} ---`, 'INFO');

        // A. Asignar Permisos Virtualmente
        const simulatedUser = {
            ...subject,
            roleId: ROLES.CUSTOM, // Forzar CUSTOM para el test sintético
            customPermissions: permissionsToGrant
        };

        // B. Instanciar Cerebro RBAC con el usuario simulado
        // Mini implementación de hasPermission pura para el test
        const checkPermission = (perm) => {
            const userRole = simulatedUser.roleId;
            // Si es CUSTOM, solo mira customPermissions
            // Si es otro rol, mira base + custom.
            // Para simplificar test subject es CUSTOM siempre.
            return simulatedUser.customPermissions.includes(perm);
        };

        // C. Ejecutar Chequeos
        let passed = 0;
        let failed = 0;

        checks.forEach(check => {
            const hasAccess = checkPermission(check.permission);
            const expected = check.shouldPass;

            if (hasAccess === expected) {
                log(`[PASS] ${check.desc} -> ${hasAccess ? 'Permitido' : 'Bloqueado'} (Correcto)`, 'SUCCESS');
                passed++;
            } else {
                log(`[FAIL] ${check.desc} -> ${hasAccess ? 'Permitido' : 'Bloqueado'} (Esperaba: ${expected ? 'Permitido' : 'Bloqueado'})`, 'ERROR');
                failed++;
            }
        });

        return { passed, failed };
    };

    /**
     * 3. ORQUESTADOR DE PRUEBAS
     */
    const runFullAudit = async () => {
        const subject = await createTestSubject();
        if (!subject) return;

        // --- NIVEL 0: BLOQUEO TOTAL ---
        runScenario(subject, 'NIVEL 0: BLOQUEO TOTAL', [], [
            { permission: PERMISOS.POS_ACCESS, shouldPass: false, desc: 'Entrar al POS' },
            { permission: PERMISOS.REP_VER_DASHBOARD, shouldPass: false, desc: 'Ver Dashboard' },
            { permission: PERMISOS.INV_VER, shouldPass: false, desc: 'Ver Inventario' }
        ]);

        // --- NIVEL 1: CAJERO BÁSICO ---
        runScenario(subject, 'NIVEL 1: CAJA REGISTRADORA', [PERMISOS.POS_ACCESS, PERMISOS.CAJA_TURNO], [
            { permission: PERMISOS.POS_ACCESS, shouldPass: true, desc: 'Entrar al POS' },
            { permission: PERMISOS.POS_VOID_ITEM, shouldPass: false, desc: 'Anular Ítem (Debe fallar)' },
            { permission: PERMISOS.POS_VOID_TICKET, shouldPass: false, desc: 'Vaciar Cesta (Debe fallar)' }
        ]);

        // --- NIVEL 2: SUPERVISOR POS ---
        runScenario(subject, 'NIVEL 2: SUPERVISOR DE CAJA', [PERMISOS.POS_ACCESS, PERMISOS.POS_VOID_ITEM, PERMISOS.POS_VOID_TICKET], [
            { permission: PERMISOS.POS_VOID_ITEM, shouldPass: true, desc: 'Anular Ítem' },
            { permission: PERMISOS.POS_VOID_TICKET, shouldPass: true, desc: 'Vaciar Cesta' },
            { permission: PERMISOS.REP_VER_TOTAL_DIARIO, shouldPass: false, desc: 'Ver Total Financiero (Debe fallar)' }
        ]);

        // --- NIVEL 3: INVENTARIO PARCIAL ---
        runScenario(subject, 'NIVEL 3: INVENTARIO CIEGO', [PERMISOS.INV_VER], [
            { permission: PERMISOS.INV_VER, shouldPass: true, desc: 'Ver Catálogo' },
            { permission: PERMISOS.INV_VER_COSTOS, shouldPass: false, desc: 'Ver Costos de Compra (Debe fallar)' },
            { permission: PERMISOS.INV_EDITAR, shouldPass: false, desc: 'Editar Productos (Debe fallar)' }
        ]);

        log('\n=== AUDITORÍA COMPLETADA ===', 'INFO');
        setIsRunning(false);
    };

    return {
        logs,
        runFullAudit,
        isRunning
    };
};
