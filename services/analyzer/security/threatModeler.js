/**
 * DOCUMENT-MIND AI — STRIDE THREAT MODELING ENGINE
 * Maps detected architecture components into the STRIDE methodology:
 * - Spoofing (Suplantación de identidad)
 * - Tampering (Modificación no autorizada de datos)
 * - Repudiation (Negación de acciones)
 * - Information Disclosure (Fuga de información confidencial)
 * - Denial of Service (Agotamiento de recursos y caída de servicio)
 * - Elevation of Privilege (Acceso no autorizado a funciones superiores)
 */

/**
 * Generates a component-based STRIDE Threat Model.
 * @param {object} projectMap - Detected architectural layers (frontend, backend, api, db, auth)
 * @param {Array<object>} endpoints - Detected API routes
 * @param {Array<string>} detectedDatabases - Databases
 * @returns {object} Structured STRIDE Threat Model
 */
function generateStrideThreatModel(projectMap = {}, endpoints = [], detectedDatabases = []) {
    const threats = [];

    // 1. SPOOFING (Suplantación)
    threats.push({
        id: 'THREAT-S-01',
        category: 'Spoofing',
        component: 'Cliente Web / API Gateway',
        scenario: 'Un atacante falsifica encabezados o tokens de sesión para autenticarse como otro usuario.',
        impact: 'Acceso indebido a cuentas de usuario y capacidades de modificación de recursos ajenos.',
        existingControl: projectMap.auth?.detected ? 'Módulo de autenticación detectado en la base de código.' : 'No se detectó validación centralizada de firma JWT.',
        recommendedControl: 'Validar la firma criptográfica de tokens (HMAC/RSA) en cada solicitud con expiración corta y tokens de refresco seguros (HttpOnly, SameSite=Strict).'
    });

    // 2. TAMPERING (Manipulación)
    threats.push({
        id: 'THREAT-T-01',
        category: 'Tampering',
        component: 'Capa de Rutas & Controladores API',
        scenario: 'Manipulación de parámetros de solicitud (query, body) inyectando cargas maliciosas (SQLi, NoSQLi, XSS) hacia la base de datos.',
        impact: 'Alteración de registros en la base de datos, corrupción de esquemas o inserción de datos espurios.',
        existingControl: endpoints.length > 0 ? `Se identificaron ${endpoints.length} endpoints en el sistema.` : 'Puntos de entrada estándar identificados.',
        recommendedControl: 'Implementar validación rigurosa de esquemas con librerías formales (Joi, Zod, Pydantic) y utilizar siempre consultas parametrizadas.'
    });

    // 3. REPUDIATION (Repudio)
    threats.push({
        id: 'THREAT-R-01',
        category: 'Repudiation',
        component: 'Servicios de Negocio / Registro de Auditoría',
        scenario: 'Un usuario ejecuta una acción crítica (ej. eliminación de datos, cambio de contraseña) y la niega posteriormente.',
        impact: 'Imposibilidad forense de determinar la autoría y la cronología exacta de incidentes de seguridad.',
        existingControl: 'No se detectó un sistema formal de logging de auditoría inmutable.',
        recommendedControl: 'Registrar eventos críticos de seguridad con marcas de tiempo UTC, ID de usuario, dirección IP ofuscada y hash de integridad (Audit Trail).'
    });

    // 4. INFORMATION DISCLOSURE (Fuga de Información)
    threats.push({
        id: 'THREAT-I-01',
        category: 'Information Disclosure',
        component: 'Servidor Backend & Conexión a Base de Datos',
        scenario: 'Fuga de secretos de entorno, cadenas de conexión o mensajes de error que exponen trazas internas de la aplicación (stack traces).',
        impact: 'Revelación de detalles de la infraestructura interna que facilitan ataques dirigidos y comprometen credenciales maestras.',
        existingControl: detectedDatabases.length > 0 ? `Uso de ${detectedDatabases.join(', ')}.` : 'Almacenamiento del sistema.',
        recommendedControl: 'Ocultar stack traces en producción, aislar variables de entorno fuera del código versionado y cifrar datos en reposo y en tránsito (TLS 1.3).'
    });

    // 5. DENIAL OF SERVICE (Denegación de Servicio)
    threats.push({
        id: 'THREAT-D-01',
        category: 'Denial of Service',
        component: 'API Gateway / Endpoints Públicos',
        scenario: 'Envío masivo de solicitudes concurrentes o subida de archivos sobredimensionados para saturar memoria y CPU del servidor.',
        impact: 'Degradación severa del servicio, falta de disponibilidad para usuarios legítimos y sobrecostos por consumo de infraestructura.',
        existingControl: 'Límites de tamaño estándar en middlewares de carga.',
        recommendedControl: 'Implementar limitación de tasa (Rate Limiting) por IP/token, compresión controlada y timeouts estrictos en todas las rutas.'
    });

    // 6. ELEVATION OF PRIVILEGE (Elevación de Privilegios)
    threats.push({
        id: 'THREAT-E-01',
        category: 'Elevation of Privilege',
        component: 'Controladores Administrativos & BOLA/IDOR',
        scenario: 'Un usuario con privilegios estándar accede o modifica recursos de nivel administrativo cambiando identificadores en la URL.',
        impact: 'Toma de control del sistema, escalada horizontal/vertical de privilegios y bypass de controles de acceso.',
        existingControl: endpoints.some(e => e.requiresAuth) ? 'Algunas rutas exigen autenticación básica.' : 'Control de acceso no explícito en código.',
        recommendedControl: 'Implementar Control de Acceso Basado en Roles (RBAC) o Atributos (ABAC) verificado en el backend para cada recurso individual.'
    });

    return {
        methodology: 'STRIDE (Microsoft Threat Modeling Standard)',
        summary: `Modelo de amenazas generado a partir de la arquitectura identificada: ${projectMap.frontend?.detected ? 'Frontend ' : ''}${projectMap.backend?.detected ? '→ Backend ' : ''}${projectMap.api?.detected ? '→ API Gateway ' : ''}${detectedDatabases.length > 0 ? `→ BD (${detectedDatabases.join(', ')})` : ''}.`,
        threats
    };
}

module.exports = {
    generateStrideThreatModel
};
