/**
 * DOCUMENT-MIND AI — SECURITY REQUIREMENTS GENERATOR
 * Automatically synthesizes actionable, prioritized security requirements (SEC-001...)
 * based on concrete findings and detected architectural components.
 */

/**
 * Generates security requirements tailored to the project.
 * @param {Array<object>} findings - SAST & Secret findings
 * @param {object} projectData - Architectural metadata
 * @returns {Array<object>} List of security requirements
 */
function generateSecurityRequirements(findings = [], projectData = {}) {
    const requirements = [];
    let counter = 1;

    function addReq(description, priority, category, justification, status = 'Pendiente') {
        const id = `SEC-${String(counter).padStart(3, '0')}`;
        counter++;
        requirements.push({
            id,
            description,
            priority,
            category,
            justification,
            status
        });
    }

    // 1. Secrets Management Requirements
    const hasSecrets = findings.some(f => (f.type || '').includes('Secret') || (f.name || '').includes('Secreto'));
    if (hasSecrets) {
        addReq(
            'Las credenciales, claves API y tokens de acceso no deberán almacenarse directamente en el código fuente ni en archivos versionados.',
            'CRITICAL',
            'Secrets Management',
            'Se detectaron secretos o tokens hardcodeados en el código analizado.',
            'Pendiente'
        );
    } else {
        addReq(
            'El sistema deberá mantener todas las credenciales y claves de API aisladas en variables de entorno seguras o un gestor de secretos (Secrets Manager).',
            'HIGH',
            'Secrets Management',
            'Requisito mandatorio de Secure by Design para prevenir fugas accidentales en el historial de Git.',
            'Cumplido'
        );
    }

    // 2. Input Validation & Injection Prevention
    const hasInjection = findings.some(f => (f.cwe || '') === 'CWE-89' || (f.cwe || '') === 'CWE-79' || (f.cwe || '') === 'CWE-78');
    if (hasInjection) {
        addReq(
            'El sistema deberá validar, tipar y sanitizar todas las entradas proporcionadas por el usuario antes de procesarlas o persistirlas.',
            'CRITICAL',
            'Input Validation',
            'Se identificaron riesgos de inyección (SQLi / XSS / Command Injection) en el análisis estático.',
            'Pendiente'
        );
    } else {
        addReq(
            'El sistema deberá utilizar esquemas de validación estrictos en la capa de controladores y consultas parametrizadas hacia la base de datos.',
            'HIGH',
            'Input Validation',
            'Prevención proactiva contra vectores de inyección OWASP Top 10.',
            'Revisión Requerida'
        );
    }

    // 3. Password Hashing & Cryptography
    addReq(
        'El sistema deberá almacenar las contraseñas de los usuarios utilizando algoritmos de hashing seguros y adaptativos con sal única (Argon2id, bcrypt o PBKDF2).',
        'CRITICAL',
        'Cryptography',
        'Garantizar la confidencialidad de las credenciales frente a posibles brechas de la base de datos.',
        'Revisión Requerida'
    );

    // 4. Rate Limiting & DoS Protection
    addReq(
        'La API deberá implementar limitación de tasa de solicitudes (Rate Limiting) y políticas de cuotas por dirección IP o token de usuario en todos sus endpoints públicos.',
        'HIGH',
        'API Security',
        'Mitigación contra ataques de fuerza bruta, escaneo automatizado y denegación de servicio (DoS).',
        'Pendiente'
    );

    // 5. Access Control & Authorization (IDOR / BOLA)
    addReq(
        'Cada endpoint que acceda a recursos específicos deberá verificar explícitamente en el backend que el usuario autenticado posee autorización sobre dicho recurso.',
        'HIGH',
        'Authorization',
        'Protección contra Vulnerabilidades de Referencia Directa a Objetos Insegura (IDOR / BOLA - OWASP API1:2023).',
        'Pendiente'
    );

    // 6. Security Headers & Transport Security
    addReq(
        'El servidor deberá forzar el uso de conexiones cifradas HTTPS/TLS 1.3 y emitir cabeceras de seguridad HTTP robustas (Content-Security-Policy, HSTS, X-Content-Type-Options, Frame-Options).',
        'MEDIUM',
        'Network Security',
        'Protección del cliente web contra ataques Man-in-the-Middle, MIME-sniffing y Clickjacking.',
        'Pendiente'
    );

    // 7. Safe Error Handling & Audit Logging
    addReq(
        'El sistema deberá evitar la divulgación de trazas de error (stack traces) en entornos de producción y registrar eventos de seguridad críticos en un log centralizado.',
        'MEDIUM',
        'Logging & Monitoring',
        'Prevenir fuga de información técnica sobre la infraestructura interna (Information Disclosure).',
        'Pendiente'
    );

    return requirements;
}

module.exports = {
    generateSecurityRequirements
};
