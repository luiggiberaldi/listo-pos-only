import { useState, useCallback } from 'react';
import { useStore } from '../../context/StoreContext';
import { PERMISOS, ROLES, ROLE_PERMISSIONS, ROLE_META } from '../../config/permissions';

/**
 * 🕵️‍♂️ useRBACValidator V2.0 (DEEP SCAN)
 * Suite de auditoría para validar la integridad del sistema de permisos.
 */
export const useRBACValidator = () => {
    const { usuarios, agregarUsuario, eliminarUsuario } = useStore();
    const [testUser, setTestUser] = useState(null);
    const [logs, setLogs] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState({ passed: 0, failed: 0, total: 0 });

    const log = (msg, type = 'INFO', details = null) => {
        const timestamp = new Date().toLocaleTimeString();
        const icons = { INFO: 'ℹ️', SUCCESS: '✅', ERROR: '❌', WARNING: '⚠️', SECURITY: '🛡️', ACTOR: '👤' };
        const icon = icons[type] || '•';
        setLogs(prev => [`[${timestamp}] ${icon} ${msg}${details ? ' ' + JSON.stringify(details) : ''}`, ...prev]);
    };

    const createTestSubject = async (roleId, customPerms = []) => {
        const name = `AUDIT_USER_${roleId}`;
        const existing = usuarios.find(u => u.nombre === name);
        if (existing) await eliminarUsuario(existing.id);

        log(`Preparando Actor: ${ROLE_META[roleId]?.label || roleId}`, 'ACTOR');

        const testSubjectData = {
            id: Date.now(),
            nombre: name,
            pin: '123456',
            roleId: roleId,
            rol: ROLE_META[roleId]?.label || 'Test',
            customPermissions: customPerms
        };

        const res = await agregarUsuario(testSubjectData);

        // 🛡️ DEVUELVO EL DATO LOCAL: El state de context es asíncrono y no estará listo en este frame.
        return res.success ? testSubjectData : null;
    };

    const checkPermissionInternal = (user, permission) => {
        if (!user) return false;
        // Lógica espejo de useRBAC.js
        if (user.roleId === ROLES.OWNER) return true;
        const basePerms = ROLE_PERMISSIONS[user.roleId] || [];
        const customPerms = user.customPermissions || [];
        return basePerms.includes(permission) || customPerms.includes(permission);
    };

    const runScenario = (subject, scenarioName, checks) => {
        if (!subject) {
            log(`Abordando Escenario: ${scenarioName} (Sujeto no creado)`, 'ERROR');
            return { passed: 0, failed: 0 };
        }
        log(`\n--- ESCENARIO: ${scenarioName} ---`, 'INFO');
        let scenarioPassed = 0;
        let scenarioFailed = 0;

        checks.forEach(check => {
            const hasAccess = checkPermissionInternal(subject, check.permission);
            const success = hasAccess === check.shouldPass;

            if (success) {
                log(`[PASS] ${check.desc} -> ${hasAccess ? 'PERMITIDO' : 'BLOQUEADO'}`, 'SUCCESS');
                scenarioPassed++;
            } else {
                log(`[FAIL] ${check.desc} -> ${hasAccess ? 'PERMITIDO' : 'BLOQUEADO'} (Esperaba: ${check.shouldPass ? 'PERMITIDO' : 'BLOQUEADO'})`, 'ERROR');
                scenarioFailed++;
            }
        });

        return { passed: scenarioPassed, failed: scenarioFailed };
    };

    const runFullAudit = async () => {
        setIsRunning(true);
        setLogs([]);
        setStats({ passed: 0, failed: 0, total: 0 });
        log('🚀 INICIANDO AUDITORÍA RBAC V2.0 (DEEP SCAN)', 'SECURITY');

        let totalPassed = 0;
        let totalFailed = 0;

        try {
            // 0. TEST DE BLOQUEO TOTAL (CUSTOM SIN PERMISOS)
            const ghost = await createTestSubject(ROLES.CUSTOM);
            const res0 = runScenario(ghost, 'NIVEL 0: BLOQUEO TOTAL (Sin Permisos)', [
                { permission: PERMISOS.POS_ACCESO, shouldPass: false, desc: 'Entrar al POS' },
                { permission: PERMISOS.INV_VER, shouldPass: false, desc: 'Ver Catálogo' },
                { permission: PERMISOS.CONF_ACCESO, shouldPass: false, desc: 'Configuración' }
            ]);
            totalPassed += res0.passed; totalFailed += res0.failed;

            // 1. TEST DE CAJERO (BASE)
            const cashier = await createTestSubject(ROLES.CASHIER);
            const res1 = runScenario(cashier, 'ROL: CAJERO (Mínimo Privilegio)', [
                { permission: PERMISOS.POS_ACCESO, shouldPass: true, desc: 'Operar Ventas' },
                { permission: PERMISOS.POS_VOID_ITEM, shouldPass: false, desc: 'Anular (Protección PIN)' },
                { permission: PERMISOS.INV_EDITAR, shouldPass: false, desc: 'Modificar Precios' },
                { permission: PERMISOS.REP_VER_TOTAL_DIARIO, shouldPass: false, desc: 'Ver Bóveda' }
            ]);
            totalPassed += res1.passed; totalFailed += res1.failed;

            // 2. TEST DE ENCARGADO (SUPERVISOR)
            const manager = await createTestSubject(ROLES.MANAGER);
            const res2 = runScenario(manager, 'ROL: ENCARGADO (Gestión Completa)', [
                { permission: PERMISOS.POS_VOID_ITEM, shouldPass: true, desc: 'Anulaciones' },
                { permission: PERMISOS.INV_EDITAR, shouldPass: true, desc: 'Editar Inventario' },
                { permission: PERMISOS.CLI_CREDITO, shouldPass: true, desc: 'Gestionar Créditos' },
                { permission: PERMISOS.CONF_USUARIOS_EDITAR, shouldPass: false, desc: 'Gestionar Equipo (Dueño)' }
            ]);
            totalPassed += res2.passed; totalFailed += res2.failed;

            // 3. TEST DE ESCALAMIENTO (SNEAKY CUSTOM)
            log('Inyectando permisos "Sneaky" a un Cajero...', 'WARNING');
            const customCashier = await createTestSubject(ROLES.CASHIER, [PERMISOS.REP_VER_TOTAL_DIARIO]);
            const res3 = runScenario(customCashier, 'Cajero con Acceso a Bóveda', [
                { permission: PERMISOS.POS_ACCESO, shouldPass: true, desc: 'Hereda POS' },
                { permission: PERMISOS.REP_VER_TOTAL_DIARIO, shouldPass: true, desc: 'Inyección de permiso' },
                { permission: PERMISOS.CONF_SISTEMA_EDITAR, shouldPass: false, desc: 'Sigue bloqueado de Admin' }
            ]);
            totalPassed += res3.passed; totalFailed += res3.failed;

            // 4. TEST DE DUEÑO (GOD MODE)
            const owner = await createTestSubject(ROLES.OWNER);
            const res4 = runScenario(owner, 'ROL: DUEÑO (God Mode)', [
                { permission: PERMISOS.SETTINGS_DB_RESET, shouldPass: true, desc: 'Reset de Fábrica' },
                { permission: PERMISOS.CONF_USUARIOS_EDITAR, shouldPass: true, desc: 'Control Total Personal' }
            ]);
            totalPassed += res4.passed; totalFailed += res4.failed;

            setStats({ passed: totalPassed, failed: totalFailed, total: totalPassed + totalFailed });
            log('\n🏁 AUDITORÍA COMPLETADA FINALIZADA', 'SECURITY');
            log(`RESUMEN: ${totalPassed} Pasaron | ${totalFailed} Fallaron`, totalFailed > 0 ? 'ERROR' : 'SUCCESS');

        } catch (error) {
            log(`CRITICAL TEST FAILURE: ${error.message}`, 'ERROR');
        } finally {
            setIsRunning(false);
        }
    };

    return { logs, runFullAudit, isRunning, stats };
};
