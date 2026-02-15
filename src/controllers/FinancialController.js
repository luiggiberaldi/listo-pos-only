import math from '../utils/mathCore';

/**
 * 🧠 FINANCE CONTROLLER (FÉNIX CORE)
 * Single Source of Truth for all financial logic.
 * Pure functions only. No React State. No DB side effects.
 */
export const FinancialController = {

    /**
     * Calculates cart totals including taxes and currency conversion.
     * @param {Array} items - Cart items
     * @param {number} taxRate - Tax percentage (e.g., 16)
     * @param {number} exchangeRate - VES/USD rate
     */
    calculateCartTotals: (items, taxRate = 0, exchangeRate = 1) => {
        let subtotalBase = 0;
        let totalImpuesto = 0;
        let totalBS_Sum = 0;
        let totalExento = 0;

        const processedItems = items.map(item => {
            const precio = math.round(item.precio);
            const cantidad = math.round(item.cantidad, 4); // Allow decimals for weight
            const subtotalItemUSD = math.mul(precio, cantidad);

            let impuestoItem = 0;
            if (!item.exento && item.aplicaIva !== false) {
                impuestoItem = math.mul(subtotalItemUSD, math.div(taxRate, 100));
            } else {
                totalExento = math.add(totalExento, subtotalItemUSD);
            }

            // 🛡️ Pre-rounding totals per item as per Fénix Protocol
            const totalItemUSD = math.round(math.add(subtotalItemUSD, impuestoItem), 2);
            const totalItemBS = math.round(math.mul(totalItemUSD, exchangeRate), 2);

            subtotalBase = math.add(subtotalBase, subtotalItemUSD);
            totalImpuesto = math.add(totalImpuesto, impuestoItem);
            totalBS_Sum = math.add(totalBS_Sum, totalItemBS);

            return {
                ...item,
                subtotalUSD: subtotalItemUSD, // Raw subtotal
                impuestoUSD: impuestoItem,
                totalUSD: totalItemUSD, // Rounded
                totalBS: totalItemBS // Rounded
            };
        });

        // Sum of rounded items (The "Ticket" truth)
        const totalUSD = processedItems.reduce((acc, item) => math.add(acc, item.totalUSD), 0);

        // Sum of rounded BS items (Visual consistency)
        const totalBS = totalBS_Sum;

        return {
            subtotalBase: math.round(subtotalBase),
            totalImpuesto: math.round(totalImpuesto),
            totalExento: math.round(totalExento),
            totalUSD: math.round(totalUSD),
            totalBS: math.round(totalBS),
            processedItems
        };
    },

    /**
     * Calculates IGTF and remaining balance based on payments.
     * @param {number} totalUSD - Invoice total to pay
     * @param {Array} payments - Array of { amount, currency, rate, type }
     * @param {Object} config - { igtfActivo, igtfTasa }
     * @param {number} exchangeRate - Rate for BS payments
     */
    calculatePaymentStatus: (totalUSD, payments, config, exchangeRate) => {
        const igtfRate = config?.igtfActivo ? math.div(config.igtfTasa || 3, 100) : 0;

        let montoPagadoNoIGTF = 0;
        let montoPagadoConIGTF = 0; // Usually Foreign Currency Cash
        let totalPagadoUSD = 0;
        let totalPagadoBS = 0;

        payments.filter(p => p.amount > 0).forEach(p => {
            const amount = math.round(p.amount);

            // Normalize to USD for totals
            let valInUSD = amount;
            if (p.currency === 'VES' || p.currency === 'BS' || p.tipo === 'BS') {
                valInUSD = exchangeRate > 0 ? math.div(amount, exchangeRate) : 0;
                totalPagadoBS = math.add(totalPagadoBS, amount);
            } else {
                totalPagadoUSD = math.add(totalPagadoUSD, amount);
            }

            // IGTF Logic
            const appliesIGTF = config?.igtfActivo && (
                p.aplicaIGTF === true ||
                (p.aplicaIGTF === undefined && (p.tipo === 'DIVISA' || p.currency === 'USD') && p.medium !== 'DIGITAL')
            );

            if (appliesIGTF) {
                montoPagadoConIGTF = math.add(montoPagadoConIGTF, valInUSD);
            } else {
                montoPagadoNoIGTF = math.add(montoPagadoNoIGTF, valInUSD);
            }
        });

        // Logic: Taxable Base = Min(Debt - NonTaxedPayments, TaxedPayments)
        const deudaSusceptible = math.max(0, math.sub(totalUSD, montoPagadoNoIGTF));
        const baseImponibleIGTF = math.min(deudaSusceptible, montoPagadoConIGTF);

        const montoIGTF = math.round(math.mul(baseImponibleIGTF, igtfRate));
        const totalConIGTF = math.add(totalUSD, montoIGTF);

        const totalPagadoGlobalUSD = math.add(totalPagadoUSD, math.div(totalPagadoBS, exchangeRate));
        const remaining = math.sub(totalConIGTF, totalPagadoGlobalUSD);

        const TOLERANCE = 0.01;
        const faltaPorPagar = remaining > TOLERANCE ? math.round(remaining) : 0;
        const cambioUSD = remaining < -TOLERANCE ? math.round(Math.abs(remaining)) : 0;

        return {
            montoIGTF,        // Extra charge
            totalConIGTF,     // New Total
            totalPagadoUSD,   // Pure USD
            totalPagadoBS,    // Pure BS
            totalPagadoGlobalUSD: math.round(totalPagadoGlobalUSD),
            faltaPorPagar,
            cambioUSD,
            baseImponibleIGTF
        };
    },

    /**
     * Calculates the exact Change distribution (Hybrid Model).
     * @param {number} changeDueUSD - Total change to give in USD
     * @param {number} paidUSD - USD given by client
     * @param {number} exchangeRate - Current Rate
     */
    suggestChangeDistribution: (changeDueUSD, paidUSD, exchangeRate) => {
        // Simple suggestion: All in USD if possible, else mix?
        // For now, this just validates. logic is usually manual in UI.
        return {
            usd: changeDueUSD,
            bs: 0
        };
    },

    /**
     * Applies payments and change to customer balance (Quadrants).
     * @param {Object} client - { deuda, favor }
     * @param {number} newDebtDelta - (+Credit Sale)
     * @param {number} changeToWallet - (+Change sent to Wallet)
     * @param {number} walletUsed - (-Wallet used to pay)
     */
    simulateCustomerUpdate: (client, newDebtDelta = 0, changeToWallet = 0, walletUsed = 0) => {
        let deuda = client.deuda || 0;
        let favor = client.favor || 0;

        // 1. Consume Wallet (Pay with Favor)
        if (walletUsed > 0) {
            favor = math.sub(favor, walletUsed);
            if (favor < 0) favor = 0; // Should be validated before
        }

        // 2. Add New Debt (Credit Sale)
        if (newDebtDelta > 0) {
            deuda = math.add(deuda, newDebtDelta);
        }

        // 3. Add Change to Wallet (Favor Increase)
        if (changeToWallet > 0) {
            // Auto-pay Debt logic?
            // "Fénix Rule": If you have debt, change pays debt first.
            if (deuda > 0) {
                if (deuda >= changeToWallet) {
                    deuda = math.sub(deuda, changeToWallet);
                    // change fully absorbed
                } else {
                    const remainder = math.sub(changeToWallet, deuda);
                    deuda = 0;
                    favor = math.add(favor, remainder);
                }
            } else {
                favor = math.add(favor, changeToWallet);
            }
        }

        // 4. Normalize (Zero Sum Guarantee)
        if (deuda > 0 && favor > 0) {
            const net = math.sub(favor, deuda);
            if (net >= 0) {
                favor = net;
                deuda = 0;
            } else {
                favor = 0;
                deuda = math.abs(net);
            }
        }

        return {
            deuda: math.round(deuda),
            favor: math.round(favor)
        };
    }
};
