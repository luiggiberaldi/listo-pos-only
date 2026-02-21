/**
 * 🧪 CORE UNIT TESTS — Self-contained validation for critical financial logic
 * No external test framework needed. Run via: CoreTests.runAll()
 * Integrated into SimValidator or callable from DevTools.
 */

import { FinancialController } from '../controllers/FinancialController';
import math from '../utils/mathCore';

// ── Micro test framework ──
let _passed = 0, _failed = 0, _results = [];

function assert(condition, testName, detail = '') {
    if (condition) {
        _passed++;
        _results.push({ test: testName, passed: true, detail });
    } else {
        _failed++;
        _results.push({ test: testName, passed: false, detail: detail || 'Assertion failed' });
    }
}

function assertClose(actual, expected, testName, tolerance = 0.01) {
    const diff = Math.abs(actual - expected);
    assert(diff <= tolerance, testName, `Expected ${expected}, got ${actual} (diff: ${diff})`);
}

// ═══════════════════════════════════════════
// TEST SUITE 1: mathCore (decimal.js precision)
// ═══════════════════════════════════════════

function testMathCore() {
    // T1: Classic floating point trap: 0.1 + 0.2 !== 0.3 in JS
    assertClose(math.add(0.1, 0.2), 0.3, 'MATH_ADD_PRECISION');

    // T2: Multiplication precision
    assertClose(math.mul(19.99, 3), 59.97, 'MATH_MUL_PRECISION');

    // T3: Division precision
    assertClose(math.div(100, 3), 33.33, 'MATH_DIV_ROUND', 0.01);

    // T4: Subtraction precision
    assertClose(math.sub(100.10, 0.10), 100, 'MATH_SUB_PRECISION');

    // T5: Round function
    assertClose(math.round(2.555, 2), 2.56, 'MATH_ROUND_HALF_UP');

    // T6: Zero handling
    assertClose(math.add(0, 0), 0, 'MATH_ZERO_ADD');
    assertClose(math.mul(100, 0), 0, 'MATH_ZERO_MUL');

    // T7: Negative handling
    assertClose(math.sub(5, 10), -5, 'MATH_NEGATIVE');

    // T8: Large numbers
    assertClose(math.mul(999999.99, 1.16), 1159999.99, 'MATH_LARGE_MUL', 0.02);
}

// ═══════════════════════════════════════════
// TEST SUITE 2: FinancialController.calculateCartTotals
// ═══════════════════════════════════════════

function testCartTotals() {
    // T1: Single item, no tax
    const r1 = FinancialController.calculateCartTotals(
        [{ precio: 10, cantidad: 2, exento: true }], 0, 1
    );
    assertClose(r1.totalUSD, 20, 'CART_SINGLE_ITEM_NO_TAX');

    // T2: Multiple items with IVA 16%
    const r2 = FinancialController.calculateCartTotals(
        [
            { precio: 10, cantidad: 1 },
            { precio: 5.50, cantidad: 3 }
        ], 16, 36.5
    );
    assert(r2.totalUSD > 0, 'CART_MULTI_ITEM_POSITIVE');
    assert(r2.totalImpuesto > 0, 'CART_IVA_CALCULATED');
    assert(r2.totalBS > 0, 'CART_BS_CONVERTED');

    // T3: Empty cart
    const r3 = FinancialController.calculateCartTotals([], 16, 36.5);
    assertClose(r3.totalUSD, 0, 'CART_EMPTY');

    // T4: Weight-based item (fractional qty)
    const r4 = FinancialController.calculateCartTotals(
        [{ precio: 8.50, cantidad: 1.5, exento: true }], 0, 1
    );
    assertClose(r4.totalUSD, 12.75, 'CART_WEIGHT_ITEM');

    // T5: Mixed exento + gravado
    const r5 = FinancialController.calculateCartTotals(
        [
            { precio: 10, cantidad: 1, exento: true },
            { precio: 10, cantidad: 1, exento: false }
        ], 16, 1
    );
    assertClose(r5.totalExento, 10, 'CART_EXENTO_TRACKED');
    assert(r5.totalImpuesto > 0, 'CART_GRAVADO_HAS_TAX');
}

// ═══════════════════════════════════════════
// TEST SUITE 3: FinancialController.calculatePaymentStatus
// ═══════════════════════════════════════════

function testPaymentStatus() {
    const config = { igtfActivo: false };
    const rate = 36.5;

    // T1: Exact payment
    const r1 = FinancialController.calculatePaymentStatus(
        100, [{ amount: 100, currency: 'USD' }], config, rate
    );
    assertClose(r1.faltaPorPagar, 0, 'PAY_EXACT');
    assertClose(r1.cambioUSD, 0, 'PAY_EXACT_NO_CHANGE');

    // T2: Overpayment → change
    const r2 = FinancialController.calculatePaymentStatus(
        50, [{ amount: 100, currency: 'USD' }], config, rate
    );
    assertClose(r2.cambioUSD, 50, 'PAY_CHANGE_50');

    // T3: Underpayment → faltaPorPagar
    const r3 = FinancialController.calculatePaymentStatus(
        100, [{ amount: 60, currency: 'USD' }], config, rate
    );
    assertClose(r3.faltaPorPagar, 40, 'PAY_REMAINING_40');

    // T4: VES payment
    const r4 = FinancialController.calculatePaymentStatus(
        10, [{ amount: 365, currency: 'VES' }], config, rate
    );
    assertClose(r4.faltaPorPagar, 0, 'PAY_VES_EXACT');

    // T5: Mixed payment (USD + VES)
    const r5 = FinancialController.calculatePaymentStatus(
        100,
        [
            { amount: 50, currency: 'USD' },
            { amount: 1825, currency: 'VES' }
        ],
        config, rate
    );
    assertClose(r5.faltaPorPagar, 0, 'PAY_MIXED');

    // T6: IGTF enabled
    const configIGTF = { igtfActivo: true, igtfTasa: 3 };
    const r6 = FinancialController.calculatePaymentStatus(
        100,
        [{ amount: 100, currency: 'USD', tipo: 'DIVISA' }],
        configIGTF, rate
    );
    assert(r6.montoIGTF > 0, 'PAY_IGTF_CHARGED');
    assert(r6.totalConIGTF > 100, 'PAY_IGTF_INCREASES_TOTAL');
}

// ═══════════════════════════════════════════
// TEST SUITE 4: FinancialController.simulateCustomerUpdate
// ═══════════════════════════════════════════

function testCustomerUpdate() {
    // T1: Add debt
    const r1 = FinancialController.simulateCustomerUpdate({ deuda: 0, favor: 0 }, 50);
    assertClose(r1.deuda, 50, 'CUST_ADD_DEBT');

    // T2: Change pays down debt (Fénix Rule)
    const r2 = FinancialController.simulateCustomerUpdate({ deuda: 30, favor: 0 }, 0, 50);
    assertClose(r2.deuda, 0, 'CUST_CHANGE_PAYS_DEBT');
    assertClose(r2.favor, 20, 'CUST_CHANGE_REMAINDER_TO_FAVOR');

    // T3: Wallet used to pay
    const r3 = FinancialController.simulateCustomerUpdate({ deuda: 0, favor: 100 }, 0, 0, 40);
    assertClose(r3.favor, 60, 'CUST_WALLET_USED');

    // T4: Net normalization
    const r4 = FinancialController.simulateCustomerUpdate({ deuda: 50, favor: 80 });
    assertClose(r4.deuda, 0, 'CUST_NET_NORMALIZE_DEBT_ZERO');
    assertClose(r4.favor, 30, 'CUST_NET_NORMALIZE_FAVOR');
}

// ═══════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════

export const CoreTests = {
    runAll() {
        _passed = 0;
        _failed = 0;
        _results = [];

        testMathCore();
        testCartTotals();
        testPaymentStatus();
        testCustomerUpdate();

        return {
            passed: _passed,
            failed: _failed,
            total: _passed + _failed,
            results: _results,
            summary: `${_passed}/${_passed + _failed} tests passed`
        };
    }
};
