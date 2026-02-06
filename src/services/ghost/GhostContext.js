import { db } from '../../db';
import { getFullContext } from '../../utils/ghost/chatContext';
import { ghostMemory } from './GhostMemory';

export class GhostContextService {

    async getSystemContext() {
        return await getFullContext();
    }

    /**
     * Búsqueda Reactiva de Contexto
     * Analiza la query del usuario para buscar datos específicos en la BD
     */
    async getReactiveContext(query) {
        const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        let queryNorm = normalize(query);
        let contextData = "";

        // --- MANEJO DE AMBIGÜEDAD (Context merging) ---
        const isDisambiguation = queryNorm.match(/^(el|la|los|las)?\s*(empleado|cliente|trabajador|usuario|primero|segundo|uno|otro)\s*$/) || query.split(' ').length < 3;

        if (isDisambiguation) {
            try {
                const history = await ghostMemory.getHistory(5);
                const userMsgs = history.filter(h => h.role === 'user');
                if (userMsgs.length >= 2) {
                    const lastUserQuery = userMsgs[userMsgs.length - 2].content;
                    queryNorm = normalize(lastUserQuery) + " " + queryNorm;
                }
            } catch (e) {
                console.warn("Context merge failed", e);
            }
        }

        // 1. Clean Query common stop words
        const cleanQuery = queryNorm.replace(/cuanto|que|quien|debe|tiene|saldo|el|la|los|las|cliente|usuario|persona|de|en|un|una|estado|cuenta|por|favor|dime|ver|mostrar|hay|es/gi, " ").trim();

        // 2. Extract potential search terms (words > 1 char)
        const terms = cleanQuery.split(/\s+/).filter(t => t.length > 1);

        if (terms.length > 0) {
            // --- BÚSQUEDA DE CLIENTES ---
            const allClients = await db.clientes.toArray();

            const filterClients = (mode) => allClients.filter(c => {
                const name = normalize(c.nombre || "");
                const doc = normalize(c.documento || "");
                const alias = normalize(c.alias || "");

                if (mode === 'strict') {
                    return terms.every(term => name.includes(term) || doc.includes(term) || alias.includes(term));
                } else {
                    return terms.some(term => term.length > 2 && (name.includes(term) || doc.includes(term) || alias.includes(term)));
                }
            });

            let matches = filterClients('strict');
            let matchType = "EXACT";
            const hasDebtIntent = queryNorm.match(/debe|saldo|cuenta|deuda|pagar|credito/);
            const looksLikeName = terms.length >= 2;

            if (matches.length === 0 && (hasDebtIntent || looksLikeName)) {
                matches = filterClients('relaxed');
                matchType = "PARTIAL";
            }

            if (matches.length > 0) {
                contextData += `\n[DATOS DE CLIENTES ENCONTRADOS (${matchType} MATCH - USAR PARA RESPONDER)]:\n`;
                matches.slice(0, 5).forEach(c => {
                    const deuda = c.deuda || 0;
                    const favor = c.favor || 0;
                    const saldoTotal = deuda - favor;
                    let estado = "SOLVENTE";
                    if (saldoTotal > 0.01) estado = "TIENE DEUDA PENDIENTE";
                    if (saldoTotal < -0.01) estado = "TIENE SALDO A FAVOR";

                    contextData += `- Cliente: ${c.nombre}\n  ID: ${c.documento}\n  Deuda: $${deuda.toFixed(2)}\n  Favor: $${favor.toFixed(2)}\n  Saldo Neto (Pagar): $${saldoTotal.toFixed(2)}\n  Estado: ${estado}\n`;
                });
            }

            // --- BÚSQUEDA DE EMPLEADOS ---
            const { useAuthStore } = await import('../../stores/useAuthStore');
            const allEmployees = useAuthStore.getState().usuarios || [];

            const filterEmployees = (mode) => allEmployees.filter(u => {
                const name = normalize(u.nombre || "");
                const role = normalize(u.rol || "");

                if (mode === 'strict') {
                    // Search in Name OR Role
                    return terms.every(term => name.includes(term) || role.includes(term));
                } else {
                    return terms.some(term => term.length > 2 && (name.includes(term) || role.includes(term)));
                }
            });

            let empMatches = filterEmployees('strict');
            // Add 'debe' related words to employee intent if "empleado" is explicitly mentioned
            const hasSalaryIntent = queryNorm.match(/sueldo|pago|nomina|empleado|trabajador|debe|deuda|prestamo|adelanto/);

            if (empMatches.length === 0 && (hasSalaryIntent || looksLikeName)) {
                empMatches = filterEmployees('relaxed');
            }

            if (empMatches.length > 0) {
                contextData += `\n[DATOS DE EMPLEADOS ENCONTRADOS]:\n`;
                for (const emp of empMatches.slice(0, 3)) {
                    const finances = await db.empleados_finanzas.get(emp.id);
                    if (finances) {
                        contextData += `- Empleado: ${emp.nombre} (${emp.rol})\n  Sueldo Base: $${finances.sueldoBase}\n  Frecuencia: ${finances.frecuenciaPago}\n  Deuda Acumulada: $${finances.deudaAcumulada || 0}\n  Saldo a Favor (Pagos Pendientes): $${finances.favor || 0}\n`;
                    } else {
                        contextData += `- Empleado: ${emp.nombre} (${emp.rol})\n  (Sin datos financieros registrados)\n`;
                    }
                }
            }

            // --- BÚSQUEDA DE PRODUCTOS (Inventario) ---
            const allProducts = await db.productos.toArray();

            const filterProducts = (mode) => allProducts.filter(p => {
                const name = normalize(p.nombre || "");
                const code = normalize(p.codigo || "");
                const cat = normalize(p.categoria || ""); // Si campo 'categoria' existe

                if (mode === 'strict') {
                    return terms.every(term => name.includes(term) || code.includes(term) || cat.includes(term));
                } else {
                    return terms.some(term => term.length > 2 && (name.includes(term) || code.includes(term) || cat.includes(term)));
                }
            });

            let prodMatches = filterProducts('strict');
            const hasProductIntent = queryNorm.match(/precio|costo|cuanto|vale|stock|hay|queda|inventario|producto|articulo|tienes/);

            if (prodMatches.length === 0 && (hasProductIntent || looksLikeName)) {
                prodMatches = filterProducts('relaxed');
            }

            if (prodMatches.length > 0) {
                contextData += `\n[INVENTARIO / PRODUCTOS ENCONTRADOS]:\n`;
                prodMatches.slice(0, 5).forEach(p => {
                    const precio = p.precioVenta || p.precio || p.price || 0;
                    const stock = p.stock || 0;
                    contextData += `- Producto: ${p.nombre}\n  Código: ${p.codigo}\n  Categoría: ${p.categoria || 'N/A'}\n  Precio: $${Number(precio).toFixed(2)}\n  Stock: ${stock} unidades\n`;
                });
            }
        }

        // --- INTENCIÓN GENERAL: DEUDORES ---
        if (queryNorm.includes("deudores") || queryNorm.includes("quien debe") || queryNorm.includes("quienes deben")) {
            const debtors = await db.clientes.where('deuda').above(0).toArray();
            if (debtors.length > 0) {
                contextData += "\n[LISTADO GENERAL DE DEUDORES (TOP 5)]:\n";
                debtors.sort((a, b) => b.deuda - a.deuda).slice(0, 5).forEach(c => {
                    contextData += `- ${c.nombre}: Debe $${c.deuda.toFixed(2)}\n`;
                });
            }
        }

        return contextData;
    }
}

export const ghostContext = new GhostContextService();
