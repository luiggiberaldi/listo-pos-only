/**
 * 🗿 STATIC KNOWLEDGE BASE (Ground Truth)
 * Átomos de conocimiento inmutables que definen la identidad y lógica base del sistema.
 */

export const GROUND_TRUTH = [
    {
        uid: "ghost_identity",
        keywords: ["quien", "eres", "llamas", "nombre", "ghost", "fantasma"],
        technical_steps: ["Identity Retrieval"],
        logic_chain: "Conciencia -> ListoGhost_v5.0",
        local_response: "Soy Listo Ghost v5.0, un Agente IA Proactivo. Mi propósito es comprender, explicar y operar la lógica de Listo POS. No solo respondo dudas, también puedo ejecutar acciones si me lo pides."
    },
    {
        uid: "social_greetings",
        keywords: ["hola", "buenos", "dias", "tardes", "noches", "saludos"],
        technical_steps: ["Social Protocol"],
        logic_chain: "Logic -> Human_Interface",
        local_response: "Sintonía establecida. Hola. Estoy listo para procesar tus consultas o comandos."
    },
    {
        uid: "navigation_context",
        keywords: ["pagina", "página", "donde", "estoy", "ubicacion", "ubicación", "ruta", "pantalla"],
        technical_steps: ["Context Detection"],
        logic_chain: "Router -> getCurrentPath",
        local_response: "Mi conciencia no tiene acceso directo a tu posición visual, pero mi sistema de contexto me indica dónde estás operando. Pregúntame sobre esta pantalla."
    },
    {
        uid: "help_capabilities",
        keywords: ["ayuda", "puedes", "hacer", "funciones", "capacidades", "que sabes"],
        technical_steps: ["Capability Query"],
        logic_chain: "Ghost -> listCapabilities",
        local_response: "Mis capacidades v5.0 incluyen: 1) Responder dudas técnicas leyendo la documentación (RAG), 2) Ejecutar acciones (vender, buscar, navegar) mediante herramientas, 3) Recordar nuestra conversación (Memoria Episódica), y 4) Analizar tus ventas e inventario en tiempo real (Proactividad)."
    },
    // === LOGIN SCREEN ATOMS ===
    {
        uid: "login_how_to",
        keywords: ["como", "entrar", "login", "acceder", "empezar", "inicio", "ingresar", "logueo", "loguear", "identificarse"],
        technical_steps: ["1. Select user card", "2. Enter 6-digit PIN", "3. Press Enter or green arrow"],
        logic_chain: "LoginScreen -> selectUser -> validatePIN -> Dashboard",
        local_response: "Para entrar: 1) Selecciona tu tarjeta de usuario haciendo clic sobre ella, 2) Ingresa tu PIN de 6 dígitos (puedes usar el teclado o los botones en pantalla), 3) Presiona Enter o el botón verde. También puedes presionar las teclas 1-9 para seleccionar usuarios rápidamente."
    },
    {
        uid: "login_forgot_pin",
        keywords: ["olvide", "olvidé", "pin", "recuperar", "restablecer", "reset", "contraseña", "clave"],
        technical_steps: ["Contact Admin", "Admin -> Reset PIN"],
        logic_chain: "LoginScreen -> AdminTools -> resetUserPIN",
        local_response: "Si olvidaste tu PIN, solo un Propietario o Administrador puede restablecerlo. Contacta a tu administrador. Si eres el Propietario y olvidaste tu PIN, necesitarás usar el código de recuperación del sistema."
    },
    {
        uid: "login_keyboard_shortcuts",
        keywords: ["atajos", "teclado", "shortcuts", "rapido", "rápido", "teclas"],
        technical_steps: ["Press 1-9 for user", "Type PIN", "Press Enter"],
        logic_chain: "LoginScreen -> keyboardHandler -> selectUser",
        local_response: "Atajos de teclado: Presiona 1-9 para seleccionar el usuario en esa posición, escribe tu PIN directamente con el teclado, presiona Enter para enviar, o Escape para cancelar y volver atrás."
    },
    {
        uid: "login_wrong_pin",
        keywords: ["pin", "incorrecto", "error", "mal", "equivocado", "no", "funciona"],
        technical_steps: ["Retry PIN entry"],
        logic_chain: "LoginScreen -> validatePIN -> error -> clearPIN",
        local_response: "Si ingresas un PIN incorrecto, el sistema mostrará una animación de error y limpiará el campo automáticamente. Puedes intentar de nuevo sin límite. Verifica que estés seleccionando el usuario correcto y usando exactamente 6 dígitos."
    },
    {
        uid: "login_cancel",
        keywords: ["cancelar", "volver", "atras", "atrás", "salir", "escape"],
        technical_steps: ["Press Escape or click X button"],
        logic_chain: "LoginScreen -> cancelPIN -> clearSelection",
        local_response: "Para cancelar el ingreso de PIN y volver a la selección de usuarios, presiona la tecla Escape o haz clic en el botón X que aparece junto al PIN."
    },
    {
        uid: "login_suggestions_button",
        keywords: ["sugerencias", "feedback", "mensaje", "reportar", "enviar", "ayuda"],
        technical_steps: ["Click Suggestions button", "Fill form", "Send"],
        logic_chain: "LoginScreen -> FeedbackModal -> Firestore",
        local_response: "El botón de Sugerencias (esquina inferior derecha) te permite enviar feedback o reportar problemas al equipo de desarrollo. Haz clic, completa el título y mensaje, y presiona Enviar. Requiere conexión a internet."
    },
    {
        uid: "login_no_users_visible",
        keywords: ["no", "veo", "usuario", "usuarios", "aparece", "falta", "donde"],
        technical_steps: ["Check user active status", "Contact admin"],
        logic_chain: "LoginScreen -> filterActiveUsers",
        local_response: "Solo se muestran usuarios activos en la pantalla de login. Si no ves tu usuario: 1) Verifica que tu cuenta esté activa, 2) Consulta con un administrador del sistema. Los usuarios desactivados no aparecen."
    },
    // === POS (PUNTO DE VENTA) ATOMS ===
    {
        uid: "pos_caja_abierta_requirement",
        keywords: ["pos", "vender", "caja", "abierta", "abrir", "ventas"],
        technical_steps: ["Open cash register first", "Then access POS"],
        logic_chain: "CajaEstado -> isCajaAbierta -> enablePOS",
        local_response: "Para poder vender en el POS, la caja DEBE estar abierta. Si no lo está, verás un botón para abrirla. La caja se abre desde el menú lateral o desde el POS mismo si tienes permisos."
    },
    {
        uid: "pos_keyboard_shortcuts",
        keywords: ["atajos", "teclado", "pos", "f2", "f4", "f9", "f6", "teclas"],
        technical_steps: ["F2=Search", "F4=Clear", "F6=Hold", "F9=Pay", "?=Help"],
        logic_chain: "usePosKeyboard -> handleGlobalKeys",
        local_response: "Atajos del POS: F2 (enfocar búsqueda), F4 (limpiar carrito), F6 (guardar en espera), F9 (cobrar), ? (ayuda). Para modificar el último item del carrito: + (más cantidad), - (menos cantidad), Del (eliminar)."
    },
    {
        uid: "pos_add_product",
        keywords: ["agregar", "producto", "escanear", "scanner", "añadir", "codigo"],
        technical_steps: ["Focus search (F2)", "Scan or type code", "Auto-add or press Enter"],
        logic_chain: "POS -> searchInput -> autoAddOrSelect -> addToCart",
        local_response: "Para agregar productos: 1) Enfoca la búsqueda (F2), 2) Escanea el código de barras o escribe nombre/código, 3) El producto se agrega automáticamente si hay match exacto, o presiona Enter para seleccionar. También puedes hacer clic directo en el producto del grid."
    },
    {
        uid: "caja_cerrar_z",
        keywords: ["cerrar", "caja", "cierre", "z", "reporte", "fiscal", "turno"],
        technical_steps: ["Go to Cierre de Caja", "Review summary", "Click Cerrar Turno", "Confirm"],
        logic_chain: "CierrePage -> handleCerrar -> generateZ -> sealSales -> resetCaja",
        local_response: "Para cerrar la caja: 1) Ve a 'Cierre de Caja' en el menú, 2) Tab 'Turno Actual', 3) Revisa el resumen de ventas y métodos de pago, 4) Clic en 'Cerrar Turno', 5) Confirma. El sistema genera un Reporte Z con correlativo único, sella todas las ventas del turno y reinicia contadores."
    }
];
