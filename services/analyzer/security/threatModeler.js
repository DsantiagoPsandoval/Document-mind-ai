/**
 * DOCUMIND AI — STRIDE THREAT MODELING ENGINE
 * Maps real detected repository components into the STRIDE methodology:
 * - Spoofing (Suplantación de identidad)
 * - Tampering (Manipulación no autorizada de datos)
 * - Repudiation (Repudio de acciones)
 * - Information Disclosure (Divulgación de información confidencial)
 * - Denial of Service (Denegación de servicio)
 * - Elevation of Privilege (Elevación de privilegios)
 */

function generateStrideThreatModel(projectMap = {}, endpoints = [], detectedDatabases = [], files = [], findings = []) {
    const filePaths = Array.isArray(files) ? files.map(f => f.path).filter(Boolean) : [];
    const authFiles = filePaths.filter(p => /auth|login|session|jwt|supabase|oauth/i.test(p)).slice(0, 3);
    const apiFiles = filePaths.filter(p => /server|app|route|controller|api/i.test(p)).slice(0, 3);
    const dbFiles = filePaths.filter(p => /schema|model|db|database|sql|prisma|supabase/i.test(p)).slice(0, 3);
    const sampleEndpoints = Array.isArray(endpoints) ? endpoints.slice(0, 4).map(e => `${e.method} ${e.path}`) : [];

    const hasInjectionFinding = Array.isArray(findings) && findings.some(f => f.dimensionId === 'injectionProtection');
    const hasSecretFinding = Array.isArray(findings) && findings.some(f => f.dimensionId === 'secretsManagement');
    const hasAuthFinding = Array.isArray(findings) && findings.some(f => f.dimensionId === 'authentication' || f.dimensionId === 'accessControl');

    const threats = [
        // 1. SPOOFING
        {
            id: 'STRIDE-S-01',
            category: 'Spoofing',
            vector: 'Spoofing (Suplantación)',
            component: authFiles.length > 0 ? `Autenticación (${authFiles.join(', ')})` : 'Capa de Autenticación / Cliente-API',
            realComponents: authFiles.length > 0 ? authFiles : (apiFiles.length > 0 ? apiFiles : ['Endpoints de entrada']),
            scenario: 'Suplantación de identidad mediante falsificación de tokens de sesión, cabeceras de usuario o redirecciones OAuth no validadas.',
            threat: 'Suplantación de identidad mediante falsificación de tokens de sesión, cabeceras de usuario o redirecciones OAuth no validadas.',
            description: 'Un actor externo intenta autenticarse como otro usuario manipulando cabeceras de identidad o interceptando flujos de sesión.',
            impact: 'Alto — Acceso no autorizado a cuentas de usuario, historial de análisis y operaciones privadas.',
            likelihood: hasAuthFinding ? 'Alta' : 'Media',
            severity: hasAuthFinding ? 'HIGH' : 'MEDIUM',
            existingControl: projectMap.auth?.detected
                ? `Módulo de autenticación detectado en el repositorio (${authFiles.join(', ') || 'Auth activa'}).`
                : 'No se detectó un middleware de autenticación explícito en las rutas analizadas.',
            recommendedControl: 'Verificar criptográficamente los JWT emitidos por el proveedor OAuth (Supabase Auth) en el servidor y validar estrictamente las URLs de callback.',
            mitigation: 'Verificar criptográficamente los JWT emitidos por el proveedor OAuth (Supabase Auth) en el servidor y validar estrictamente las URLs de callback.'
        },

        // 2. TAMPERING
        {
            id: 'STRIDE-T-01',
            category: 'Tampering',
            vector: 'Tampering (Manipulación)',
            component: sampleEndpoints.length > 0 ? `Rutas API (${sampleEndpoints.slice(0, 2).join(', ')})` : (apiFiles.join(', ') || 'Controladores de Entrada'),
            realComponents: sampleEndpoints.length > 0 ? sampleEndpoints : apiFiles,
            scenario: 'Alteración maliciosa de cargas útiles (req.body, parámetros o archivos ZIP/documentos subidos) para inyectar código o modificar datos.',
            threat: 'Alteración maliciosa de cargas útiles (req.body, parámetros o archivos subidos) para inyectar código o modificar datos.',
            description: 'Modificación de parámetros HTTP, payloads JSON o estructuras de archivos durante el tránsito o procesamiento.',
            impact: 'Crítico — Corrupción de integridad de datos, inyección de scripts (XSS/SQLi) o alteración de lógica de negocio.',
            likelihood: hasInjectionFinding ? 'Alta' : 'Media',
            severity: hasInjectionFinding ? 'CRITICAL' : 'MEDIUM',
            existingControl: endpoints.length > 0
                ? `Se analizaron ${endpoints.length} endpoints HTTP en ${apiFiles.join(', ') || 'el servidor'}.`
                : 'Procesamiento de entradas en módulos principales.',
            recommendedControl: 'Aplicar validación de esquemas estricta en cada controlador, consultas parametrizadas, protección anti-ZipSlip y sanitización de salidas DOM.',
            mitigation: 'Aplicar validación de esquemas estricta en cada controlador, consultas parametrizadas, protección anti-ZipSlip y sanitización de salidas DOM.'
        },

        // 3. REPUDIATION
        {
            id: 'STRIDE-R-01',
            category: 'Repudiation',
            vector: 'Repudiation (Repudio)',
            component: apiFiles.length > 0 ? `Servicios y Bitácora (${apiFiles[0]})` : 'Capa de Servicios y Auditoría',
            realComponents: apiFiles.length > 0 ? apiFiles : ['Módulos de negocio'],
            scenario: 'Ejecución de operaciones críticas (modificación de configuración, aprobación o borrado de datos) sin trazabilidad inmutable de autoría.',
            threat: 'Ejecución de operaciones críticas sin trazabilidad inmutable de autoría, marca de tiempo ni correlación de evento.',
            description: 'Un usuario o proceso realiza cambios sensibles sin que quede un registro forense verificable de quién y cuándo ejecutó la acción.',
            impact: 'Medio — Dificultad para realizar análisis forense o auditoría de incidentes de seguridad.',
            likelihood: 'Media',
            severity: 'LOW',
            existingControl: filePaths.some(p => /audit|log|eventStore/i.test(p))
                ? 'Se detectaron módulos de registro de eventos/auditoría en el repositorio.'
                : 'Logging estándar de consola detectado; sin bitácora de auditoría dedicada.',
            recommendedControl: 'Mantener registros de auditoría estructurados (UTC timestamp, user_id autenticado, acción e integridad) sin almacenar secretos en texto plano.',
            mitigation: 'Mantener registros de auditoría estructurados (UTC timestamp, user_id autenticado, acción e integridad) sin almacenar secretos en texto plano.'
        },

        // 4. INFORMATION DISCLOSURE
        {
            id: 'STRIDE-I-01',
            category: 'Information Disclosure',
            vector: 'Information Disclosure (Fuga de Información)',
            component: dbFiles.length > 0 ? `Persistencia y Config (${dbFiles.join(', ')})` : 'Variables de Entorno, Logs y Respuestas API',
            realComponents: dbFiles.length > 0 ? dbFiles : ['.env.example', ...apiFiles.slice(0, 2)],
            scenario: 'Exposición de claves API, tokens, cadenas de conexión o trazas internas (stack traces) en respuestas HTTP o código fuente.',
            threat: 'Exposición de claves API, tokens, cadenas de conexión o trazas internas (stack traces) en respuestas HTTP o código fuente.',
            description: 'Divulgación accidental de credenciales, configuración interna del servidor o datos de otros usuarios.',
            impact: 'Crítico — Compromiso de servicios externos (IA, base de datos, OAuth) y acceso a información privada.',
            likelihood: hasSecretFinding ? 'Alta' : 'Baja',
            severity: hasSecretFinding ? 'CRITICAL' : 'MEDIUM',
            existingControl: detectedDatabases.length > 0
                ? `Persistencia detectada (${detectedDatabases.join(', ')}) y escaneo de secretos ejecutado.`
                : 'Escaneo estático de credenciales y sanitización de errores.',
            recommendedControl: 'Aislar secretos exclusivamente en variables de entorno del backend, habilitar Row Level Security (RLS) en base de datos y redactar errores en producción.',
            mitigation: 'Aislar secretos exclusivamente en variables de entorno del backend, habilitar Row Level Security (RLS) en base de datos y redactar errores en producción.'
        },

        // 5. DENIAL OF SERVICE
        {
            id: 'STRIDE-D-01',
            category: 'Denial of Service',
            vector: 'Denial of Service (Denegación de Servicio)',
            component: sampleEndpoints.length > 0 ? `Gateway HTTP (${sampleEndpoints[0]})` : 'Servidor Principal / Endpoints de Análisis',
            realComponents: sampleEndpoints.length > 0 ? sampleEndpoints : apiFiles,
            scenario: 'Agotamiento de CPU, memoria o cuota de API mediante peticiones masivas concurrentes o archivos comprimidos sobredimensionados.',
            threat: 'Agotamiento de CPU, memoria o cuota de API mediante peticiones masivas concurrentes o archivos comprimidos sobredimensionados.',
            description: 'Saturación de los endpoints de análisis o carga de archivos para degradar la disponibilidad de la plataforma.',
            impact: 'Alto — Interrupción del servicio y agotamiento de cuotas de inferencia o ancho de banda.',
            likelihood: 'Media',
            severity: 'MEDIUM',
            existingControl: filePaths.some(p => /server\.js|rateLimit|safeZip/i.test(p))
                ? 'Se identificaron controles de Rate Limiting y límites de tamaño de carga en el servidor.'
                : 'Límites de concurrencia y tamaño de payload sujetos a configuración del servidor.',
            recommendedControl: 'Aplicar Rate Limiting estricto por ventana de tiempo, límites de tamaño en Multer/BodyParser y timeouts en peticiones externas.',
            mitigation: 'Aplicar Rate Limiting estricto por ventana de tiempo, límites de tamaño en Multer/BodyParser y timeouts en peticiones externas.'
        },

        // 6. ELEVATION OF PRIVILEGE
        {
            id: 'STRIDE-E-01',
            category: 'Elevation of Privilege',
            vector: 'Elevation of Privilege (Elevación de Privilegios)',
            component: authFiles.length > 0 ? `Control de Acceso (${authFiles[0]})` : 'Controladores de Recursos y Perfiles',
            realComponents: [...authFiles, ...dbFiles].slice(0, 3),
            scenario: 'Un usuario con rol estándar intenta modificar su propio rol, acceder a recursos de otra cuenta (IDOR/BOLA) o ejecutar acciones administrativas.',
            threat: 'Un usuario con rol estándar intenta modificar su propio rol, acceder a recursos de otra cuenta (IDOR/BOLA) o ejecutar acciones administrativas.',
            description: 'Escalada horizontal o vertical de privilegios al omitir validaciones de propiedad o rol en el servidor y base de datos.',
            impact: 'Crítico — Toma de control de recursos ajenos o alteración de políticas del sistema.',
            likelihood: hasAuthFinding ? 'Media' : 'Baja',
            severity: hasAuthFinding ? 'HIGH' : 'MEDIUM',
            existingControl: dbFiles.some(p => /schema\.sql/i.test(p))
                ? 'Políticas Row Level Security (RLS) y restricción de columnas sensibles detectadas en esquema SQL.'
                : 'Validación de acceso según lógica de controladores.',
            recommendedControl: 'Forzar validación de propiedad (`auth.uid() = user_id`) mediante políticas RLS en PostgreSQL/Supabase y revocar permisos de auto-asignación de roles.',
            mitigation: 'Forzar validación de propiedad (`auth.uid() = user_id`) mediante políticas RLS en PostgreSQL/Supabase y revocar permisos de auto-asignación de roles.'
        }
    ];

    return {
        methodology: 'STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)',
        summary: `Matriz de amenazas STRIDE vinculada a los componentes reales analizados (${filePaths.length} archivos, ${endpoints.length} endpoints${detectedDatabases.length > 0 ? `, BD: ${detectedDatabases.join(', ')}` : ''}).`,
        threats
    };
}

module.exports = {
    generateStrideThreatModel
};
