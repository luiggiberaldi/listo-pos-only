
export class GhostVision {
    constructor(page) {
        this.page = page;
        this.lastSignature = null;
    }

    async getScreenSignature() {
        const signature = await this.page.evaluate(() => {
            const text = document.body.innerText;
            const hasText = (t) => text.toLowerCase().includes(t.toLowerCase());

            if (hasText('¿Quién está operando?')) return 'AUTH_FLOW';

            const hasAbrirCaja = [...document.querySelectorAll('button')]
                .some(b => b.innerText.toUpperCase().includes('ABRIR CAJA'));
            if (hasAbrirCaja) return 'REGISTER_OPENING_SCREEN';

            if (hasText('Caja Cerrada') || hasText('Abrir Turno')) return 'REGISTER_CLOSED';

            // Prioridad específica: Modales conocidos
            if (hasText('Procesar Pago') || hasText('Falta por pagar')) return 'PAYMENT_SCREEN';
            if (hasText('Información Básica') || hasText('Nuevo Producto')) return 'PRODUCT_MODAL';

            // Detección de Modales Genéricos/Bloqueadores (Tailwind/HeadlessUI)
            if (document.querySelector('.swal2-container, .swal2-popup, .modal-overlay, .fixed.inset-0.bg-slate-900\\/60, .z-50.bg-slate-900\\/60')) return 'MODAL_INTERCEPTOR';

            if (window.location.hash.includes('/vender')) return 'POS_READY';

            return 'UNKNOWN';
        });

        this.lastSignature = signature;
        return signature;
    }
}
