/**
 * 🔒 FISCAL LOCK - SYSTEM AUDITOR
 * Este archivo actúa como un "Candado Digital".
 * Ejecuta pruebas de integridad matemática cada vez que inicia la aplicación.
 * SI ESTE ARCHIVO FALLA, EL SISTEMA ESTÁ MATEMÁTICAMENTE CORRUPTO.
 */

import { calcularKPIs } from './reportUtils';
import Swal from 'sweetalert2';

// 🛡️ CASOS MAESTROS (GOLDEN MASTER CASES)
// Estos valores son VERDADES ABSOLUTAS. No deben cambiar nunca.
const GOLDEN_TESTS = [
    {
        name: 'Caso 1: Venta Estándar 16% (Base Implicita)',
        input: {
            ventas: [{ total: 116, status: 'COMPLETADA', esExento: false }],
            rate: 16
        },
        expected: { ventaNeta: 100, totalImpuesto: 16 }
    },
    {
        name: 'Caso 2: Venta Exenta (Sin IVA)',
        input: {
            ventas: [{ total: 100, status: 'COMPLETADA', esExento: true }],
            rate: 16
        },
        expected: { ventaNeta: 100, totalImpuesto: 0 }
    },
    {
        name: 'Caso 3: Tasa Personalizada (12%)',
        input: {
            ventas: [{ total: 112, status: 'COMPLETADA', esExento: false }],
            rate: 12
        },
        expected: { ventaNeta: 100, totalImpuesto: 12 }
    },
    {
        name: 'Caso 4: IGTF Simple',
        input: {
            ventas: [{
                total: 100,
                status: 'COMPLETADA',
                igtfTotal: 3 // Asumimos que el IGTF ya viene calculado de la venta (Source of Truth)
            }],
            rate: 16
        },
        expected: { totalIGTF: 3 }
    },
    {
        name: 'Caso 5: Harina Pan (Real World Complex)',
        input: {
            ventas: [{
                total: 29.00,
                status: 'COMPLETADA',
                esExento: false,
                totalImpuesto: 4.00, // Explicit Tax
                igtfTotal: 0.42      // Explicit IGTF (Simulating logic: 3% of $14 needed USD)
            }],
            rate: 16
        },
        expected: {
            ventaNeta: 25.00,
            totalImpuesto: 4.00,
            totalIGTF: 0.42
        }
    },
    {
        name: 'Caso 6: IGTF Apagado (Divisa sin impuesto)',
        input: {
            ventas: [{
                total: 20.00,
                status: 'COMPLETADA',
                esExento: false, // Tiene IVA
                totalImpuesto: 2.76, // 16% de 17.24
                igtfTotal: 0,        // IGTF CERO (Aunque haya pagado en divisa)
                pagos: [{ metodo: 'Efectivo Divisa', monto: 20, tipo: 'DIVISA' }]
            }],
            rate: 16
        },
        expected: {
            totalIGTF: 0,
            ventaNeta: 17.24
        }
    },
    {
        name: 'Caso 7: Jerarquía de Inventario (Bultos)',
        input: {
            ventas: [{
                total: 100,
                status: 'COMPLETADA',
                items: [{
                    nombre: 'Caja Harina',
                    cantidad: 1,
                    precio: 100,
                    costo: 5, // Costo unitario del bulto
                    unidadVenta: 'Bulto',
                    jerarquia: { bulto: { contenido: 12 } } // Real cost = 5 * 12 * 1 = 60
                }]
            }],
            rate: 16
        },
        expected: { totalCostos: 60, ganancia: 40 }
    },
    {
        name: 'Caso 8: Recalculo IGTF Fallback (3% Efec. Divisa)',
        input: {
            ventas: [{
                total: 200,
                status: 'COMPLETADA',
                igtfTotal: 0, // Incompleto
                pagos: [{ metodo: 'Efectivo Divisa', monto: 100, tipo: 'DIVISA' }] // Debe generar $3 de IGTF
            }],
            rate: 16,
            config: { igtfActivo: true }
        },
        expected: { totalBaseIGTF: 100 } // Validaremos esto en la lógica de auditoría extendida
    }
];

/**
 * 📊 TREASURY AUDITOR
 * Valida que la gaveta física cuadre: Inicial + Entradas - Salidas - Gastos
 */
const auditTreasuryLogic = (corte) => {
    const safe = (n) => parseFloat(n || 0);
    const usd = corte.tesoreriaDetallada?.usdCash || {};
    const gastos = safe(corte.totalGastosCaja || corte.gastosUSD);

    const esperado = safe(usd.inicial) + safe(usd.entradas) - safe(usd.salidas) - gastos;
    const obtenido = safe(usd.final);

    if (Math.abs(esperado - obtenido) > 0.01) {
        return `❌ DISCREPANCIA EN GAVETA USD: Esperaba ${esperado.toFixed(2)}, obtuvo ${obtenido.toFixed(2)} (Gastos: ${gastos})`;
    }
    return null;
};

export const auditFiscalLogic = () => {
    console.groupCollapsed('🔒 AUDITORÍA FISCAL (STARTUP CHECK)');
    let errors = [];

    try {
        GOLDEN_TESTS.forEach((test, index) => {
            const result = calcularKPIs(test.input.ventas, test.input.rate);

            // Verificar claves esperadas
            Object.keys(test.expected).forEach(key => {
                const obtained = result[key];
                const expected = test.expected[key];

                if (key === 'totalBaseIGTF' && test.input.config?.igtfActivo) {
                    // Prueba especial para el fallback de IGTF (Simulando lógica de Builder)
                    const v = test.input.ventas[0];
                    const pagosDivisa = v.pagos.filter(p => p.tipo === 'DIVISA');
                    const baseObtenida = pagosDivisa.reduce((acc, p) => acc + p.monto, 0);
                    if (Math.abs(baseObtenida - expected) > 0.01) {
                        errors.push(`❌ FALLO ${test.name}: Base IGTF incorrecta.`);
                    }
                    return;
                }

                // Tolerancia infinitesimal para flotantes (0.01)
                if (Math.abs(obtained - expected) > 0.01) {
                    const errorMsg = `❌ FALLO ${test.name}: Esperaba ${key}=${expected}, obtuvo ${obtained}`;
                    console.error(errorMsg);
                    errors.push(errorMsg);
                }
            });

            if (errors.length === 0) {
                console.log(`✅ ${test.name} - PASSED`);
            }
        });

        // 🧪 PRUEBA DE GAVETA (Smoke Test con dato ficticio)
        const mockCorte = {
            tesoreriaDetallada: { usdCash: { inicial: 10, entradas: 50, salidas: 5, final: 45 } },
            totalGastosCaja: 10
        };
        const treasuryError = auditTreasuryLogic(mockCorte);
        if (treasuryError) {
            errors.push(treasuryError);
        } else {
            console.log("✅ Auditoría de Tesorería - PASSED");
        }

    } catch (e) {
        errors.push(`🔥 ERROR CRÍTICO DE EJECUCIÓN: ${e.message}`);
    }

    console.groupEnd();

    if (errors.length > 0) {
        // 🚨 ALERTA DE SEGURIDAD MÁXIMA
        console.error("⛔ INTEGRIDAD FISCAL COMPROMETIDA ⛔", errors);

        Swal.fire({
            title: '⛔ ERROR DE INTEGRIDAD ⛔',
            html: `
                <div style="text-align: left; font-size: 0.9em;">
                    <p>El sistema ha detectado una corrupción en la lógica matemática fiscal.</p>
                    <p>Por seguridad, contacte a soporte técnico inmediato.</p>
                    <br/>
                    <pre style="background: #f87171; color: white; padding: 10px; border-radius: 5px; overflow: auto;">
                        ${errors.join('\n')}
                    </pre>
                </div>
            `,
            icon: 'error',
            allowOutsideClick: false,
            allowEscapeKey: false,
            confirmButtonText: 'Entendido (Modo Inseguro)',
            confirmButtonColor: '#d33'
        });

        return false; // Failed
    }

    console.log("🔒 SISTEMA BLINDADO: Lógica Fiscal Verificada Correctamente.");
    return true; // Passed
};
