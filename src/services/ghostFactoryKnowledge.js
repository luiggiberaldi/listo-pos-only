import { ghostKnowledge } from './ghostKnowledge';

/**
 * Factory Knowledge Base Articles for Listo POS
 * Pre-configured articles with essential information about the system
 */

export const FACTORY_KNOWLEDGE = [
    // VENTAS
    {
        title: "Cómo Realizar una Venta",
        content: "Para realizar una venta en Listo POS: 1) Ve a la sección 'Vender' en el menú principal, 2) Busca los productos usando el buscador o navegando por categorías, 3) Haz clic en los productos para agregarlos al carrito, 4) Ajusta cantidades si es necesario, 5) Selecciona el método de pago (Efectivo, Transferencia, Pago Móvil, Tarjeta), 6) Ingresa el monto recibido, 7) Confirma la venta. El sistema calculará automáticamente el cambio y generará el recibo.",
        category: "Ventas",
        keywords: ["venta", "vender", "cobrar", "factura", "recibo", "pago", "cobro"]
    },
    {
        title: "Métodos de Pago Disponibles",
        content: "Listo POS acepta múltiples métodos de pago: 1) Efectivo (Bolívares o Dólares), 2) Transferencia bancaria, 3) Pago Móvil, 4) Tarjeta de débito/crédito, 5) Combinación de métodos (pago mixto). Todos los métodos quedan registrados en el historial de ventas y se reflejan en los reportes financieros.",
        category: "Ventas",
        keywords: ["pago", "efectivo", "transferencia", "pago móvil", "tarjeta", "método de pago"]
    },
    {
        title: "Política de Devoluciones",
        content: "Para procesar una devolución: 1) El cliente debe presentar el comprobante de compra, 2) El producto debe estar en condiciones de reventa, 3) La devolución debe realizarse dentro de los 7 días posteriores a la compra, 4) Ve a 'Historial de Ventas', busca la venta original, 5) Selecciona 'Anular Venta' o procesa un reembolso parcial. El inventario se actualizará automáticamente.",
        category: "Políticas",
        keywords: ["devolución", "devolver", "reembolso", "cambio", "anular venta", "cancelar"]
    },
    {
        title: "Atajos de Teclado en el POS",
        content: "Atajos principales: F2 (enfocar búsqueda), F4 (limpiar carrito), F6 (guardar en espera), F9 (cobrar/finalizar venta), + (aumentar cantidad), - (disminuir cantidad), * (cambiar unidad), Enter (agregar producto), Esc (cancelar). Avanzados: [número]* (multiplicador, ej: 5* para agregar 5 unidades), [monto]+ (venta rápida exenta), [monto]- (venta rápida gravada). Las flechas del teclado permiten navegar entre productos.",
        category: "Ventas",
        keywords: ["atajos", "teclado", "shortcuts", "f9", "f2", "f4", "f6", "teclas"]
    },
    {
        title: "Venta con Escáner de Códigos",
        content: "Para vender con escáner: 1) Presiona F2 para enfocar la búsqueda, 2) Escanea el código de barras del producto, 3) El producto se agrega automáticamente al carrito, 4) Repite para más productos, 5) Presiona F9 para cobrar. Si el código no existe, el sistema buscará coincidencias parciales. El escáner debe estar configurado en modo teclado (HID).",
        category: "Ventas",
        keywords: ["escáner", "código de barras", "scanner", "barcode", "escanear"]
    },
    {
        title: "Guardar y Recuperar Ventas en Espera",
        content: "Para guardar una venta: 1) Con productos en el carrito, presiona F6, 2) Opcionalmente escribe una nota identificativa, 3) El carrito se guarda y limpia. Para recuperar: 1) Haz clic en 'Tickets en Espera' (ícono de reloj), 2) Selecciona el ticket guardado, 3) El carrito se restaura automáticamente. Útil cuando un cliente sale a buscar dinero o hay interrupciones.",
        category: "Ventas",
        keywords: ["espera", "guardar venta", "tickets pendientes", "pausar", "recuperar"]
    },
    {
        title: "Ventas con Balanza Digital",
        content: "Listo POS soporta balanzas con formato EAN-13 prefijo 20. Estructura: 20[PLU][PESO][CHECK]. Ejemplo: código 2001050093 busca el producto con PLU 0105 y lo agrega con peso 0.930 kg. Compatible con balanzas Systel, DIGI y formato estándar venezolano. El PLU del producto debe coincidir con los dígitos 3-6 del código escaneado.",
        category: "Ventas",
        keywords: ["balanza", "peso", "pesados", "ean-13", "peso variable", "kg"]
    },
    {
        title: "Ventas Rápidas Sin Producto",
        content: "Para ventas de monto fijo (servicios, recargas): 1) Venta exenta: escribe el monto y presiona + (ej: 50+), 2) Venta gravada con IVA: escribe el monto y presiona - (ej: 100-). Se crea automáticamente un item 'VENTA RÁPIDA' con el monto especificado. Útil para servicios que no requieren producto específico en inventario.",
        category: "Ventas",
        keywords: ["venta rápida", "servicio", "sin producto", "monto fijo", "recarga"]
    },

    // INVENTARIO
    {
        title: "Gestión de Inventario",
        content: "Para gestionar el inventario: 1) Ve a la sección 'Inventario', 2) Usa la barra de búsqueda para encontrar productos, 3) Haz clic en un producto para editar stock, precio, o detalles, 4) Para agregar productos nuevos, usa el botón '+ Nuevo Producto', 5) Establece alertas de stock mínimo para recibir notificaciones, 6) Utiliza categorías para organizar mejor tus productos.",
        category: "Inventario",
        keywords: ["inventario", "stock", "productos", "agregar producto", "editar producto", "stock mínimo"]
    },
    {
        title: "Control de Stock Mínimo",
        content: "El sistema de stock mínimo te alerta cuando un producto está bajo. Para configurarlo: 1) Ve al producto en Inventario, 2) Edita el campo 'Stock Mínimo', 3) Si el stock disponible cae por debajo de este valor, recibirás una alerta visual en el dashboard (⚠️) y Ghost te notificará. Esto te ayuda a evitar roturas de stock en productos clave.",
        category: "Inventario",
        keywords: ["stock mínimo", "alerta", "reabastecimiento", "inventario bajo", "agotado"]
    },
    {
        title: "Categorías de Productos",
        content: "Organiza tu inventario usando categorías para facilitar la búsqueda: 1) Ve a Configuración > Categorías, 2) Crea categorías lógicas según tu negocio (ej: Bebidas, Snacks, Lácteos, Limpieza), 3) Asigna productos a categorías desde la pantalla de edición de producto, 4) En el POS, los clientes podrán filtrar por categoría para encontrar productos más rápido.",
        category: "Inventario",
        keywords: ["categorías", "organizar", "clasificar", "filtros", "buscar productos"]
    },
    {
        title: "Kardex de Inventario",
        content: "El Kardex es el registro histórico de movimientos de inventario. Muestra: entradas (compras, ajustes positivos), salidas (ventas, ajustes negativos), saldo resultante. IMPORTANTE: El Kardex es solo de LECTURA (auditoría). Para modificar stock, usa 'Ajustar Stock' en la sección de Inventario. El Kardex es útil para auditorías y rastrear por qué cambió el stock de un producto.",
        category: "Inventario",
        keywords: ["kardex", "movimientos", "historial", "auditoría", "trazabilidad", "registro"]
    },
    {
        title: "Jerarquías de Productos (Unidad/Paquete/Bulto)",
        content: "Los productos pueden tener múltiples unidades de venta: Unidad (pieza individual), Paquete (conjunto de unidades), Bulto (conjunto de paquetes). Cada jerarquía tiene su propio precio. En el POS: 1) Al agregar un producto con jerarquías, se abre un modal de selección, 2) Presiona * para cambiar entre unidades del último item agregado, 3) El precio se ajusta automáticamente según la unidad seleccionada.",
        category: "Inventario",
        keywords: ["unidad", "paquete", "bulto", "jerarquía", "unidad de venta", "transformar"]
    },

    // CLIENTES
    {
        title: "Registro de Clientes",
        content: "Para registrar un cliente: 1) Ve a la sección 'Clientes', 2) Haz clic en '+ Nuevo Cliente', 3) Ingresa los datos: nombre, cédula/DNI, teléfono, dirección (opcional), 4) Marca si el cliente es frecuente o VIP, 5) Guarda. Los clientes registrados aparecerán en el sistema de fiados y podrás generar reportes personalizados de sus compras.",
        category: "Clientes",
        keywords: ["cliente", "registrar cliente", "nuevo cliente", "datos cliente", "cédula"]
    },
    {
        title: "Sistema de Fiados",
        content: "Listo POS incluye gestión completa de fiados (ventas a crédito): 1) En una venta, selecciona 'Fiado' como método de pago, 2) Elige el cliente o regístralo si es nuevo, 3) La venta queda registrada como deuda pendiente, 4) Para cobrar, ve a 'Clientes' > 'Ver Fiados', selecciona al cliente y registra el pago (parcial o total), 5) El sistema mantiene historial completo de deudas y abonos.",
        category: "Clientes",
        keywords: ["fiado", "crédito", "deuda", "abono", "cobrar fiado", "cliente debe"]
    },
    {
        title: "Monedero de Clientes",
        content: "El Monedero es saldo a favor del cliente (vueltos no retirados). Cuando un cliente paga de más y no quiere el cambio, ese monto se guarda en su monedero. El cliente puede usar ese saldo en su próxima compra. Es un dinero virtual del cliente que el negocio debe cuando el cliente lo solicite (considerado como pasivo en tesorería).",
        category: "Clientes",
        keywords: ["monedero", "saldo a favor", "vuelto", "wallet", "crédito cliente"]
    },

    // CIERRE Y FINANZAS
    {
        title: "Cierre de Caja Diario",
        content: "El cierre de caja es fundamental para el control financiero: 1) Ve a 'Cierre de Caja' al final del día, 2) El sistema muestra automáticamente: total de ventas del día, ventas por método de pago, gastos registrados, dinero esperado en caja, 3) Cuenta físicamente el efectivo, 4) Registra el monto real contado, 5) Si hay diferencia (faltante o sobrante), el sistema lo registra, 6) Confirma el cierre. Los datos se guardan en reportes históricos.",
        category: "Procedimientos",
        keywords: ["cierre", "cierre de caja", "cuadre", "arqueo", "contar dinero", "efectivo"]
    },
    {
        title: "Apertura de Caja",
        content: "Antes de vender, debes abrir la caja: 1) Clic en 'Abrir Caja' en el menú, 2) Ingresa balances iniciales (USD Cash, VES Cash, opcionalmente Digital), 3) Este monto es tu 'base' o dinero semilla para vueltos, 4) Presiona 'Abrir Caja'. IMPORTANTE: La base se suma al total del día para calcular el dinero esperado al cierre. Ejemplo: Base $100 + Ventas $500 = Debes tener $600 en caja.",
        category: "Procedimientos",
        keywords: ["apertura", "abrir caja", "base", "fondo inicial", "dinero semilla"]
    },
    {
        title: "Reporte Z (Corte Z)",
        content: "El Reporte Z es el cierre fiscal del turno: 1) Genera número correlativo secuencial (Z-000001, Z-000002...), 2) Documenta todas las transacciones del turno, 3) Calcula totales de ventas, IVA, métodos de pago, 4) 'Sella' las ventas (ya no pueden modificarse), 5) Reinicia contadores para nuevo turno, 6) Se imprime comprobante fiscal (opcional). Es obligatorio para auditorías fiscales.",
        category: "Reportes",
        keywords: ["reporte z", "corte z", "cierre fiscal", "correlativo", "turno"]
    },
    {
        title: "Total Diario y Tesorería",
        content: "Para ver el resumen financiero del día: 1) Ve a 'Total Diario' en el menú, 2) Verás: ventas totales, desglose por método de pago, ganancia neta, gastos del día, fiados del día, 3) Puedes filtrar por fecha para ver días anteriores, 4) Exporta reportes en PDF para contabilidad externa.",
        category: "Reportes",
        keywords: ["total diario", "ventas del día", "finanzas", "ganancias", "reporte", "tesorería"]
    },
    {
        title: "Diferencia entre Total Diario y Cierre de Caja",
        content: "TOTAL DIARIO: Auditoría global de ventas por día/semana/mes. Muestra rendimiento general del negocio. CIERRE DE CAJA: Cuadre de 1 turno específico con arqueo de efectivo. Genera Reporte Z fiscal. Diferencia clave: Total Diario = análisis, Cierre de Caja = control operativo + fiscal.",
        category: "Reportes",
        keywords: ["diferencia", "total diario", "cierre", "comparación", "cuál usar"]
    },

    // REPORTES
    {
        title: "Reportes Disponibles",
        content: "Listo POS ofrece varios reportes: 1) Reporte de Ventas (por día, rango de fechas, método de pago), 2) Reporte de Productos Más Vendidos, 3) Reporte de Inventario (stock actual, valorización), 4) Reporte de Clientes (compras totales, fiados pendientes), 5) Historial de Ventas (búsqueda detallada de facturas). Todos los reportes pueden exportarse a PDF usando Ctrl+P.",
        category: "Reportes",
        keywords: ["reportes", "informes", "estadísticas", "ventas", "exportar", "pdf", "excel"]
    },

    // USUARIOS Y PERMISOS
    {
        title: "Gestión de Usuarios y Permisos",
        content: "Para gestionar empleados: 1) Ve a Configuración > Usuarios, 2) Crea usuarios con roles específicos: Dueño (acceso total), Cajero (solo ventas y clientes), Contador (reportes), Empleado (operaciones básicas), 3) Cada rol tiene permisos predefinidos que limitan acceso a secciones sensibles, 4) Cada usuario tiene un PIN único para iniciar sesión, 5) El dueño puede cambiar PINs y desactivar usuarios.",
        category: "Procedimientos",
        keywords: ["usuarios", "permisos", "roles", "empleados", "cajero", "pin", "acceso"]
    },
    {
        title: "Roles y Permisos RBAC",
        content: "Listo POS usa RBAC (Role-Based Access Control): ADMIN/OWNER = acceso total, GERENTE = operaciones + reportes + configuración básica, CAJERO = solo ventas y clientes, CONTADOR = solo reportes financieros, CUSTOM = rol personalizable. Cada permiso controla acceso a funciones específicas (ej: POS_ACCESO, INV_VER_COSTOS, VENTAS_ANULAR). Los permisos se asignan automáticamente según el rol.",
        category: "Procedimientos",
        keywords: ["rbac", "roles", "permisos", "acceso", "seguridad", "privilegios"]
    },
    {
        title: "Recuperación de PIN Olvidado",
        content: "Si un EMPLEADO olvida su PIN: El administrador puede restablecerlo desde Configuración > Usuarios. Si el ADMINISTRADOR olvida su PIN: No hay reset automático por seguridad. Debe contactar soporte técnico o acceder a la base de datos directamente. PREVENCIÓN: Cambia tu PIN a uno memorable pero seguro, anótalo en lugar físico seguro (no digital).",
        category: "Procedimientos",
        keywords: ["pin olvidado", "recuperar pin", "reset", "contraseña", "olvido"]
    },

    // CONFIGURACIÓN
    {
        title: "Configuración de la Tienda",
        content: "Personaliza Listo POS en Configuración: 1) Datos de la tienda (nombre, dirección, teléfono, RIF/NIT), 2) Logo (aparecerá en recibos), 3) Moneda principal (Bolívares o Dólares), 4) Tasa de cambio (si manejas ambas monedas), 5) Impresora (configura impresora térmica o normal), 6) Modo oscuro, 7) Sonidos del sistema, 8) Backup automático de datos.",
        category: "Procedimientos",
        keywords: ["configuración", "ajustes", "tienda", "logo", "moneda", "tasa", "impresora"]
    },
    {
        title: "Tasa de Cambio BCV",
        content: "Para actualizar la tasa de cambio: 1) Configuración > Finanzas/Tasa, 2) Clic en 'Sincronizar con BCV' (requiere internet), 3) El sistema consulta la tasa oficial del Banco Central de Venezuela, 4) Si no hay internet o falla la API, puedes ingresar la tasa manualmente, 5) La tasa afecta la conversión USD ↔ VES en todas las operaciones. Recomendación: Sincronizar diariamente.",
        category: "Procedimientos",
        keywords: ["tasa", "cambio", "bcv", "dólar", "bolívar", "conversión", "usd", "ves"]
    },
    {
        title: "Configuración de Impresora",
        content: "Para configurar impresora: 1) Configuración > Diseño Ticket, 2) Selecciona tipo de impresora (térmica 58mm, 80mm, o normal A4), 3) Sube tu logo, 4) Personaliza encabezado y pie de página, 5) Botón 'Probar Impresión' para verificar, 6) Si falla: verifica drivers instalados, conexión USB/Bluetooth, y permisos del navegador. Alternativa: Usa impresora PDF para guardar tickets digitalmente.",
        category: "Procedimientos",
        keywords: ["impresora", "ticket", "recibo", "configurar", "termica", "58mm", "80mm"]
    },
    {
        title: "IVA e IGTF en Listo POS",
        content: "IVA (Impuesto al Valor Agregado): 16% sobre productos gravados. Configurable en Configuración > Finanzas. Afecta solo ventas futuras. IGTF (Impuesto a Grandes Transacciones Financieras): 3% sobre pagos en divisas (USD). Se calcula automáticamente en ventas con métodos de pago en dólares. Ambos se muestran desglosados en tickets y reportes.",
        category: "Procedimientos",
        keywords: ["iva", "igtf", "impuestos", "16%", "3%", "fiscal", "gravado"]
    },

    // GHOST AI
    {
        title: "Cómo Usar Ghost AI",
        content: "Ghost es tu asistente de inteligencia artificial: 1) Haz clic en el ícono flotante de Ghost (esquina inferior), 2) Pregunta cualquier cosa sobre el negocio: '¿Cuánto vendí hoy?', '¿Qué clientes me deben?', '¿Cuál es mi producto más vendido?', 3) Ghost puede ejecutar acciones: buscar productos, ver reportes, consultar inventario, 4) Ghost aprende de tu negocio con la Base de Conocimiento, 5) Puedes usar Ghost desde cualquier pantalla del sistema.",
        category: "Otros",
        keywords: ["ghost", "ia", "inteligencia artificial", "asistente", "ayuda", "pregunta"]
    },

    // SEGURIDAD
    {
        title: "Seguridad y Respaldo de Datos",
        content: "Tus datos están protegidos: 1) Listo POS guarda todo localmente en tu dispositivo (sin depender de internet), 2) Sincronización en la nube opcional con Supabase (encriptado), 3) Respaldo automático cada noche, 4) Puedes exportar manualmente en Configuración > Respaldo, 5) Sistema de bloqueo por inactividad, 6) Logs de auditoría de todas las operaciones críticas (ventas, eliminaciones, cambios de precio).",
        category: "Procedimientos",
        keywords: ["seguridad", "respaldo", "backup", "datos", "sincronización", "nube", "protección"]
    },
    {
        title: "Optimización de Base de Datos",
        content: "Si el sistema está lento: 1) Configuración > Salud de Datos, 2) Ver porcentaje de saturación, 3) Si > 70%: Clic 'Optimizar Base de Datos', 4) Selecciona días a conservar (ej: 30 días), 5) Confirma limpieza, 6) El sistema archiva ventas antiguas en JSON (puedes guardar el archivo), 7) Reinicia el navegador. Nota: La optimización no borra datos, solo los mueve a archivo externo.",
        category: "Procedimientos",
        keywords: ["optimizar", "lento", "rendimiento", "base de datos", "saturación", "limpieza"]
    },

    // SOLUCIÓN DE PROBLEMAS
    {
        title: "Solución de Problemas Comunes",
        content: "Problemas frecuentes y soluciones: 1) 'No puedo imprimir recibos' → Verifica que la impresora esté conectada y configurada en Ajustes, 2) 'El stock no se actualiza' → Fuerza una sincronización en Configuración > Sincronización, 3) 'Olvidé mi PIN' → El dueño puede restablecerlo desde Configuración > Usuarios, 4) 'La app está lenta' → Cierra pestañas innecesarias y reinicia la aplicación, 5) 'Error de conexión' → Listo POS funciona offline, solo necesitas internet para sincronización en la nube.",
        category: "Otros",
        keywords: ["problemas", "ayuda", "error", "no funciona", "solución", "fallo", "bug"]
    },
    {
        title: "Venta sin Stock (Permitir Stock Negativo)",
        content: "Para permitir vender sin stock disponible: 1) Configuración > Inventario, 2) Activa 'Permitir Vender sin Stock', 3) Ahora puedes procesar ventas aunque el stock sea 0 o negativo, 4) Útil para: preventas, productos bajo pedido, servicios. ADVERTENCIA: El stock negativo debe corregirse pronto con entradas de inventario para mantener precisión en valorización.",
        category: "Inventario",
        keywords: ["stock negativo", "sin stock", "preventa", "permitir", "agotado"]
    },
    {
        title: "Reimprimir Tickets",
        content: "Para reimprimir un ticket de venta: 1) Ve a Historial de Ventas, 2) Busca la venta por fecha, cliente, o número de factura, 3) Haz clic en el ícono de impresora 🖨️ junto a la venta, 4) El ticket se imprime o muestra en pantalla. También puedes reimprimir Reportes Z desde Cierre de Caja > Historial Z.",
        category: "Ventas",
        keywords: ["reimprimir", "ticket", "factura", "recibo", "duplicado", "copia"]
    },
    {
        title: "Glosario de Términos",
        content: "Términos clave en Listo POS: APERTURA = Dinero inicial para vueltos. ARQUEO = Conteo físico de efectivo. BASE IMPONIBLE = Precio sin IVA. BCV = Banco Central de Venezuela (tasa oficial). CIERRE Z = Reporte fiscal de turno. CORRELATIVO = Número secuencial de documentos. FONDO = Capital inicial. KARDEX = Historial de movimientos de stock. PASIVO = Dinero que el negocio debe (ej: monedero clientes). PATRIMONIO = Total en caja. POS = Punto de Venta. RBAC = Control de permisos por roles. STOCK MÍNIMO = Umbral de alerta. TESORERÍA = Gestión de fondos. TURNO = Período de trabajo (apertura a cierre).",
        category: "Otros",
        keywords: ["glosario", "términos", "definiciones", "vocabulario", "significado"]
    }
];

/**
 * Initialize factory knowledge base
 * Checks if KB is empty and populates it with default articles
 */
export async function initializeFactoryKnowledge(systemId) {
    try {
        // Check if there are already articles
        const { data: existingArticles } = await ghostKnowledge.getArticles(systemId);

        if (existingArticles && existingArticles.length > 0) {
            console.log('📚 Knowledge Base already initialized');
            return { success: true, articlesCreated: 0 };
        }

        console.log('📚 Initializing Factory Knowledge Base...');
        let successCount = 0;

        for (const article of FACTORY_KNOWLEDGE) {
            const { error } = await ghostKnowledge.createArticle({
                ...article,
                systemId,
                createdBy: 'System'
            });

            if (!error) {
                successCount++;
            } else {
                console.warn(`Failed to create article: ${article.title}`, error);
            }
        }

        console.log(`✅ Created ${successCount}/${FACTORY_KNOWLEDGE.length} factory knowledge articles`);
        return { success: true, articlesCreated: successCount };

    } catch (e) {
        console.error('Error initializing factory knowledge:', e);
        return { success: false, error: e.message };
    }
}
