
// 🛡️ LEGAL CONSTANTS
// Textos estáticos para el contrato legal unificado

export const EULA_CONTENT = `
CONTRATO DE LICENCIA DE USUARIO FINAL (EULA)
LISTO POS - Sistema de Punto de Venta
Versión 1.2 | Mayo 2026

==========================================================

IDENTIFICACIÓN DEL DESARROLLADOR

Desarrollador:          Luigi Beraldi
Cédula de Identidad:    V-24.457.713
Dirección:              El Socorro, Calle Sucre, Casa #144, Valencia
Ciudad/Estado:          Valencia, Estado Carabobo, Venezuela
Marca Comercial:        LISTO POS (Desde 2025)
Sitio Web:              www.kiplystart.com
Correo:                 TechSupport@kiplystart.com
Teléfono/WhatsApp:      +58 412-405-1793

==========================================================

1. ACEPTACIÓN DEL CONTRATO

Al instalar, copiar o utilizar de cualquier forma el software LISTO POS (en adelante "el Software"), usted (en adelante "el Usuario") acepta quedar obligado por los términos de este Contrato.

SI NO ESTÁ DE ACUERDO CON ESTOS TÉRMINOS, NO INSTALE NI UTILICE EL SOFTWARE.

==========================================================

2. CONCESIÓN DE LICENCIA

2.1 Licencia Limitada
El desarrollador Luigi Beraldi le concede una licencia NO EXCLUSIVA, INTRANSFERIBLE y LIMITADA para:
• Instalar y usar el Software en UN (1) SOLO EQUIPO o acceder a la versión web (SaaS) mediante una cuenta autorizada.
• Utilizar el Software únicamente para fines comerciales legítimos.

2.2 Identificador Único
El Software está vinculado criptográficamente al identificador único de hardware del equipo donde se instaló, o a una cuenta de usuario en la versión web. Esta licencia NO es transferible sin autorización expresa.

2.3 Planes y Niveles de Servicio
El Software opera bajo un modelo de planes escalonados (Bodega, Abasto, Minimarket) que determinan las funcionalidades disponibles.

==========================================================

3. RESTRICCIONES DE USO

El Usuario NO PUEDE:
• Copiar, duplicar o clonar el Software para equipos adicionales.
• Modificar, descompilar o realizar ingeniería inversa del código.
• Sublicenciar, alquilar o transferir la licencia a terceros.
• Remover avisos de propiedad intelectual o logos.
• Utilizar el Software para actividades ilícitas.
• Compartir credenciales de acceso con terceros no autorizados.

==========================================================

4. PROPIEDAD INTELECTUAL

El Software, incluyendo su código, diseño e interfaces, es propiedad exclusiva de Luigi Beraldi y está protegido por:
• Ley sobre el Derecho de Autor de Venezuela (Gaceta Oficial N° 4.638)
• Tratados internacionales de propiedad intelectual

"LISTO POS" y sus logos son marcas comerciales de Luigi Beraldi.
`;

export const FISCAL_CONTENT = `
==========================================================

DESCARGO DE RESPONSABILIDAD FISCAL
Declaración ante Autoridades Tributarias (SENIAT)

==========================================================

⚠️ AVISO IMPORTANTE:

LISTO POS ES UN SOFTWARE DE GESTIÓN ADMINISTRATIVA Y NO CONSTITUYE UN SISTEMA DE FACTURACIÓN FISCAL AUTORIZADO POR EL SENIAT.

==========================================================

1. NATURALEZA DEL SOFTWARE

LISTO POS es una herramienta de GESTIÓN INTERNA diseñada para:
• Registrar transacciones comerciales de forma organizada.
• Generar reportes de ventas para control interno.
• Administrar inventario y flujo de caja.
• Sincronizar datos entre múltiples terminales y dispositivos móviles (según plan).

El Software NO ESTÁ DISEÑADO NI AUTORIZADO para:
• Emitir facturas con valor fiscal ante el SENIAT.
• Sustituir las obligaciones de facturación legal.
• Generar documentos que cumplan la Providencia SNAT/2011/0071.

==========================================================

2. RESPONSABILIDAD DEL USUARIO

El Usuario es ÚNICO Y EXCLUSIVO RESPONSABLE de:
• Cumplir con TODAS las obligaciones tributarias.
• Emitir facturas fiscales por medios autorizados (impresoras fiscales, etc.).
• Declarar y pagar impuestos (IVA, ISLR) en los plazos establecidos.
• Mantener los libros contables exigidos por ley.
• RESPONSABILIDAD CAMBIARIA E IGTF: El Usuario es el único responsable de la correcta actualización, configuración y aplicación de las tasas de cambio oficiales (BCV) o de mercado dentro del sistema, así como del cálculo, cobro y declaración del IGTF (Impuesto a las Grandes Transacciones Financieras) según la normativa legal vigente. El Desarrollador no asume responsabilidad alguna por pérdidas económicas, multas o discrepancias derivadas de errores en la tasa de cambio o en el cálculo de impuestos.

==========================================================

3. EXENCIÓN DE RESPONSABILIDAD

El desarrollador de LISTO POS NO ASUME NINGUNA RESPONSABILIDAD por:
• Multas impuestas por el SENIAT o cualquier autoridad tributaria.
• Sanciones derivadas del incumplimiento de obligaciones fiscales.
• Cierres del establecimiento por razones tributarias.
• Errores en el cálculo de impuestos (IVA, retenciones).
• Pérdida de datos por cortes eléctricos (USE UPS OBLIGATORIO en versión local).
• Fallas de hardware o ataques cibernéticos.
• Pérdida de conexión a internet que impida la sincronización.

==========================================================

4. REQUISITOS OBLIGATORIOS

4.1 SISTEMA DE RESPALDO ELÉCTRICO (UPS) — VERSIÓN LOCAL
ES OBLIGATORIO que el Usuario que utilice la versión local cuente con un UPS para:
• Proteger los datos ante cortes de luz.
• Permitir el cierre seguro del sistema.
• Evitar corrupción de la base de datos.

4.2 RESPALDOS DE INFORMACIÓN
• Realizar respaldos DIARIOS de la información.
• Almacenar copias en ubicaciones externas.
• Consultar con un contador público para temas fiscales.
`;

export const PRIVACY_CONTENT = `
==========================================================

POLÍTICA DE PRIVACIDAD Y PROTECCIÓN DE DATOS
Manejo de Información en la Nube

==========================================================

1. INFORMACIÓN QUE RECOPILAMOS

Datos del Negocio:
• Nombre del establecimiento comercial.
• Identificador único de hardware (HWID).
• Registro de ventas (montos, fechas, métodos de pago).
• Inventario de productos.

Telemetría de Soporte:
• Versión del Software instalada.
• Estado de conexión y errores técnicos.
• Estadísticas de uso agregadas (NO montos específicos).

Datos que NO Recopilamos:
• Números de cédula de clientes finales.
• Información de tarjetas de crédito.
• Contraseñas bancarias.
• Datos biométricos.

==========================================================

2. ALMACENAMIENTO Y SEGURIDAD

Los datos se almacenan en servidores de Google Firebase y Supabase con:
• Certificación ISO 27001
• Encriptación TLS 1.2+ en tránsito
• Encriptación AES-256 en reposo

La versión web (SaaS) se distribuye a través de Cloudflare.

Nos comprometemos a NO:
• Vender sus datos a terceros.
• Compartir información con fines publicitarios.
• Acceder a sus transacciones sin consentimiento.

==========================================================

3. SUS DERECHOS

Usted tiene derecho a:
• Acceso: Solicitar copia de sus datos.
• Rectificación: Corregir información inexacta.
• Eliminación: Solicitar borrado de sus datos.
• Portabilidad: Exportar datos en formato estándar.

Contacto: TechSupport@kiplystart.com

==========================================================

AL HACER CLIC EN "ACEPTO Y FIRMO", USTED RECONOCE QUE HA LEÍDO, ENTENDIDO Y ACEPTA TODOS LOS TÉRMINOS DE ESTE CONTRATO UNIFICADO.

Fecha de revisión del documento: Mayo 2026
`;

export const FULL_CONTRACT = EULA_CONTENT + FISCAL_CONTENT + PRIVACY_CONTENT;
