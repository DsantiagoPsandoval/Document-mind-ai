/**
 * DOCUMIND AI — SECURITY REMEDIATION PLANNER
 * Transforms raw security findings into an actionable, prioritized engineering remediation backlog.
 * Organizes recommendations into 4 official queues:
 *   1. Acciones urgentes (urgentes / inmediata)
 *   2. Mejoras de alta prioridad (alta)
 *   3. Mejoras de prioridad media (media)
 *   4. Recomendaciones preventivas (preventivas / baja)
 */

const REMEDIATION_TEMPLATES = {
    'SAST-SQLI-001': {
        title: 'Migrar Consultas Dinámicas a Consultas Parametrizadas',
        effort: '2-4 horas',
        whatIsWrong: 'Se construyen sentencias SQL concatenando o interpolando directamente variables de entrada en tiempo de ejecución.',
        whyItIsARisk: 'El intérprete SQL no distingue entre la estructura de la consulta original y los datos suministrados por el usuario (CWE-89).',
        systemImpact: 'Un atacante puede eludir controles de autenticación, leer tablas confidenciales completas, alterar registros o eliminar datos.',
        whatToModify: 'Sustituir todas las cadenas SQL interpoladas por placeholders parametrizados ($1, ?) o métodos seguros del ORM.',
        expectedOutcome: 'Neutralización total de vectores de inyección SQL; toda entrada se procesa estrictamente como literal tipado.',
        vulnerable: `// VULNERABLE: Concatenación directa de entradas de usuario
const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";
const result = await db.query(query);`,
        remediated: `// REMEDIADO: Parámetros tipados y sentencias preparadas
const query = "SELECT * FROM users WHERE email = $1";
const result = await db.query(query, [req.body.email]);`,
        explanation: 'Los parámetros ligados son tratados como datos literales por el motor SQL y nunca como código ejecutable.',
        verification: 'Ejecutar pruebas unitarias con payloads como `admin@test.com\' OR \'1\'=\'1` y verificar que no alteren la lógica SQL.'
    },

    'SAST-XSS-001': {
        title: 'Sanitización Estricta de Salidas HTML en el DOM',
        effort: '1-3 horas',
        whatIsWrong: 'Asignación directa de contenido dinámico a propiedades de renderizado HTML (`innerHTML`, `outerHTML`, `document.write`).',
        whyItIsARisk: 'Permite que cadenas con etiquetas `<script>` o atributos de eventos (`onerror`, `onload`) se ejecuten en el contexto del navegador (CWE-79).',
        systemImpact: 'Secuestro de sesiones de usuario, robo de tokens almacenados en el cliente o modificación maliciosa de la interfaz.',
        whatToModify: 'Reemplazar `innerHTML` por `textContent` cuando se muestre texto plano, o envolver el HTML con `DOMPurify.sanitize()` / `escapeHtml()`.',
        expectedOutcome: 'Renderizado seguro en el navegador sin ejecución de scripts inyectados por terceros.',
        vulnerable: `// VULNERABLE: Inserción directa de marcado dinámico
document.getElementById('user-bio').innerHTML = userBio;`,
        remediated: `// REMEDIADO: Uso de textContent o DOMPurify para HTML rico
import DOMPurify from 'dompurify';
document.getElementById('user-bio').textContent = userBio;
// O si se requiere HTML enriquecido:
document.getElementById('user-bio').innerHTML = DOMPurify.sanitize(userBio);`,
        explanation: '`textContent` escapa automáticamente etiquetas HTML y `DOMPurify` elimina vectores ejecutables.',
        verification: 'Inyectar `<img src=x onerror=alert(1)>` en pruebas y comprobar que el navegador lo renderice inerte.'
    },

    'SAST-CMDI-001': {
        title: 'Sustitución de exec() por spawn()/execFile() con Argumentos Separados',
        effort: '2-5 horas',
        whatIsWrong: 'Invocación de comandos del sistema operativo pasando cadenas concatenadas a un intérprete shell.',
        whyItIsARisk: 'Metacaracteres como `;`, `&&`, `|` o backticks permiten encadenar comandos arbitrarios en el host (CWE-78).',
        systemImpact: 'Ejecución remota de código (RCE) con los privilegios del proceso del servidor y compromiso total de la instancia.',
        whatToModify: 'Cambiar `exec()` por `execFile()` o `spawn()` pasando los argumentos en un arreglo y deshabilitando la shell (`shell: false`).',
        expectedOutcome: 'Los argumentos se pasan directamente al ejecutable binario sin evaluación por parte de `/bin/sh` o `cmd.exe`.',
        vulnerable: `// VULNERABLE: shell exec concatenado
const { exec } = require('child_process');
exec(\`git clone \${repoUrl} \${destPath}\`, callback);`,
        remediated: `// REMEDIADO: spawn sin invocar subshell
const { spawn } = require('child_process');
const child = spawn('git', ['clone', repoUrl, destPath], { shell: false });`,
        explanation: 'Al deshabilitar la shell (`shell: false`) y pasar argumentos en array, los operadores de encadenamiento no son interpretados.',
        verification: 'Probar entradas con `; whoami` y confirmar que el proceso rechace el argumento sin ejecutar el comando adicional.'
    },

    'SAST-EVAL-001': {
        title: 'Eliminación de eval() y Constructores Dinámicos de Código',
        effort: '2-4 horas',
        whatIsWrong: 'Uso de `eval()`, `new Function()` o ejecución dinámica de cadenas de texto.',
        whyItIsARisk: 'Convierte datos en código ejecutable dentro del mismo contexto de memoria de la aplicación (CWE-95).',
        systemImpact: 'Ejecución arbitraria de código en el cliente o en el servidor Node.js.',
        whatToModify: 'Sustituir `eval()` por `JSON.parse()` o mapeos estáticos de funciones autorizadas.',
        expectedOutcome: 'Procesamiento determinista de datos sin compilación dinámica de cadenas.',
        vulnerable: `// VULNERABLE: eval dinámico
const parsed = eval("(" + jsonString + ")");`,
        remediated: `// REMEDIADO: Serializadores nativos seguros
const parsed = JSON.parse(jsonString);`,
        explanation: '`JSON.parse()` valida estrictamente la gramática de datos sin ejecutar funciones.',
        verification: 'Confirmar que no existan llamadas activas a `eval()` en el análisis estático.'
    },

    'SAST-TRAV-001': {
        title: 'Confinamiento y Normalización de Rutas de Archivos (Anti Path Traversal)',
        effort: '1-3 horas',
        whatIsWrong: 'Operaciones de sistema de archivos (`fs.readFile`, `res.sendFile`) utilizan rutas construidas con entradas del cliente.',
        whyItIsARisk: 'Secuencias `../` o `..\\` permiten escapar del directorio previsto y acceder a archivos del sistema (CWE-22).',
        systemImpact: 'Fuga de archivos `.env`, código fuente privado o archivos de configuración del sistema operativo.',
        whatToModify: 'Aplicar `path.basename()` sobre el nombre de archivo y verificar que `path.resolve(baseDir, file).startsWith(baseDir)`.',
        expectedOutcome: 'Confinamiento estricto de todas las lecturas/escrituras dentro del directorio autorizado.',
        vulnerable: `// VULNERABLE: Lectura directa de ruta suministrada
const filePath = path.join(__dirname, 'uploads', req.query.filename);
fs.readFile(filePath, callback);`,
        remediated: `// REMEDIADO: Normalización y verificación de confinamiento
const safeFileName = path.basename(req.query.filename);
const baseDir = path.resolve(__dirname, 'uploads');
const safePath = path.resolve(baseDir, safeFileName);
if (!safePath.startsWith(baseDir)) {
    throw new Error('Acceso fuera del directorio permitido');
}
fs.readFile(safePath, callback);`,
        explanation: 'Trunca cualquier intento de salto de directorio antes de tocar el disco.',
        verification: 'Enviar `filename=../../.env` y comprobar que la petición sea rechazada con código 400/403.'
    },

    'SAST-SSRF-001': {
        title: 'Lista Blanca de Dominios y Bloqueo de IPs Internas (Anti-SSRF)',
        effort: '3-6 horas',
        whatIsWrong: 'El servidor realiza peticiones HTTP hacia URLs proporcionadas por el usuario sin validar el host de destino.',
        whyItIsARisk: 'Permite usar el backend como pivote hacia redes internas o servicios de metadatos cloud (CWE-918).',
        systemImpact: 'Exposición de servicios en localhost, redes privadas (10.0.0.0/8, 192.168.0.0/16) o credenciales IAM en 169.254.169.254.',
        whatToModify: 'Parsear la URL con `new URL()`, exigir protocolo `https:` y validar el `hostname` contra una lista blanca.',
        expectedOutcome: 'El servidor solo establece conexiones salientes hacia dominios externos explícitamente autorizados.',
        vulnerable: `// VULNERABLE: Petición HTTP a URL arbitraria del cliente
const res = await fetch(req.body.targetUrl);`,
        remediated: `// REMEDIADO: Lista blanca de dominios y protocolo HTTPS
const ALLOWED_HOSTS = ['api.github.com'];
const parsedUrl = new URL(req.body.targetUrl);
if (parsedUrl.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    throw new Error('Host o protocolo de destino no autorizado');
}
const res = await fetch(parsedUrl.toString());`,
        explanation: 'Bloquea peticiones hacia direcciones de loopback, enlaces locales y dominios no confiables.',
        verification: 'Probar con `http://127.0.0.1:3000` o `http://169.254.169.254` y verificar que se rechace antes de abrir socket.'
    },

    'SAST-CORS-001': {
        title: 'Restricción de Orígenes CORS a Dominios Autorizados',
        effort: '1 hora',
        whatIsWrong: 'Política CORS configurada de forma abierta (`*`) permitiendo solicitudes desde cualquier origen.',
        whyItIsARisk: 'Debilita el aislamiento cross-origin si se exponen endpoints sensibles (CWE-942).',
        systemImpact: 'Sitios web de terceros pueden invocar la API desde el navegador de los usuarios.',
        whatToModify: 'Configurar el middleware `cors({ origin: allowedOrigins })` leyendo los dominios permitidos desde variables de entorno.',
        expectedOutcome: 'Solo los orígenes autorizados reciben cabeceras `Access-Control-Allow-Origin`.',
        vulnerable: `// VULNERABLE: CORS abierto sin restricción
app.use(cors());`,
        remediated: `// REMEDIADO: Lista explícita de orígenes permitidos
const allowedOrigins = (process.env.CORS_ORIGIN || 'https://tu-dominio.com').split(',');
app.use(cors({ origin: allowedOrigins, methods: ['GET', 'POST'] }));`,
        explanation: 'Restringe el acceso cross-origin únicamente a los frontends legítimos.',
        verification: 'Verificar cabeceras HTTP enviando un `Origin` no autorizado.'
    },

    'SAST-CSRF-001': {
        title: 'Protección Anti-CSRF y Atributo SameSite en Cookies de Sesión',
        effort: '2-3 horas',
        whatIsWrong: 'Uso de sesiones basadas en cookies sin evidencia de token Anti-CSRF o política SameSite.',
        whyItIsARisk: 'Los navegadores adjuntan cookies automáticamente en peticiones cross-site si no se restringe `SameSite` (CWE-352).',
        systemImpact: 'Ejecución de acciones no autorizadas en nombre de un usuario con sesión activa.',
        whatToModify: 'Configurar cookies con `sameSite: "strict"` o `"lax"` e implementar tokens CSRF o autenticación Bearer por cabecera.',
        expectedOutcome: 'Las peticiones mutantes originadas desde sitios externos son rechazadas.',
        vulnerable: `// VULNERABLE: Sesión de cookie sin SameSite ni token CSRF
app.use(session({ secret: process.env.SESSION_SECRET }));`,
        remediated: `// REMEDIADO: Cookie con SameSite estricto, HttpOnly y Secure
app.use(session({
    secret: process.env.SESSION_SECRET,
    cookie: { httpOnly: true, secure: true, sameSite: 'lax' }
}));`,
        explanation: 'Impide el envío automático de cookies en solicitudes forjadas desde otros dominios.',
        verification: 'Inspeccionar la cabecera `Set-Cookie` y confirmar la presencia de `SameSite=Lax` o `Strict`.'
    },

    'SAST-JWT-001': {
        title: 'Verificación Criptográfica Estricta de Firma JWT',
        effort: '1-2 horas',
        whatIsWrong: 'Uso de `jwt.decode()` sin validar la firma o aceptación de algoritmos inseguros.',
        whyItIsARisk: 'Cualquier atacante puede modificar el payload JSON del token en base64 si no se valida la firma (CWE-345).',
        systemImpact: 'Suplantación de identidad (Spoofing) y escalada de privilegios.',
        whatToModify: 'Reemplazar `jwt.decode()` por `jwt.verify(token, secret, { algorithms: ["HS256"] })`.',
        expectedOutcome: 'Rechazo inmediato de cualquier token con firma alterada o expirada.',
        vulnerable: `// VULNERABLE: Decodificar sin verificar firma
const payload = jwt.decode(token);`,
        remediated: `// REMEDIADO: Verificación criptográfica de firma
const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });`,
        explanation: 'Garantiza autenticidad e integridad criptográfica del token.',
        verification: 'Alterar un carácter del payload de un JWT en pruebas y comprobar que lance excepción.'
    },

    'SAST-INPUT-001': {
        title: 'Validación Estricta de Esquemas de Entrada (Zod / Joi / Express-Validator)',
        effort: '2-4 horas',
        whatIsWrong: 'Consumo directo de propiedades de `req.body` sin validar tipos, longitudes ni estructura.',
        whyItIsARisk: 'Datos inesperados u objetos anidados pueden provocar errores de lógica o Mass Assignment (CWE-20).',
        systemImpact: 'Procesamiento de cargas malformadas, caída de controladores o contaminación de atributos.',
        whatToModify: 'Incorporar validación de esquema en la entrada de cada endpoint `POST`, `PUT` y `PATCH`.',
        expectedOutcome: 'Rechazo temprano con HTTP 400 ante cualquier payload que incumpla el contrato.',
        vulnerable: `// VULNERABLE: Desestructuración sin validación
app.post('/api/items', (req, res) => {
    const { name, config } = req.body;
});`,
        remediated: `// REMEDIADO: Validación explícita de tipos y longitudes
app.post('/api/items', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
    if (!name) return res.status(400).json({ error: 'Nombre inválido' });
});`,
        explanation: 'Asegura que los tipos y límites de datos sean verificados antes de llegar a la capa de servicio.',
        verification: 'Enviar tipos inválidos (arrays/objetos en vez de strings) y comprobar respuesta HTTP 400.'
    },

    'SAST-LEAK-001': {
        title: 'Ocultamiento de Trazas Internas (Stack Traces) en Respuestas HTTP',
        effort: '1-2 horas',
        whatIsWrong: 'El manejador de errores envía `err.stack` o detalles internos directamente al cliente HTTP.',
        whyItIsARisk: 'Expone estructura de carpetas, paquetes instalados y líneas exactas del servidor (CWE-209).',
        systemImpact: 'Facilita el reconocimiento técnico para preparar ataques dirigidos.',
        whatToModify: 'En el middleware de errores, registrar el detalle en servidor pero responder con un mensaje genérico en producción.',
        expectedOutcome: 'Las respuestas HTTP 500 nunca revelan rutas internas ni trazas de ejecución.',
        vulnerable: `// VULNERABLE: Fuga de stack trace
res.status(500).json({ error: err.stack });`,
        remediated: `// REMEDIADO: Mensaje controlado al cliente
console.error('[Internal Error]', err.message);
res.status(500).json({ error: 'Ocurrió un error interno procesando la solicitud.' });`,
        explanation: 'Separa el diagnóstico interno de la respuesta pública expuesta al usuario.',
        verification: 'Provocar un error 500 en modo producción y verificar que no contenga rutas de archivos.'
    },

    'SAST-CSP-001': {
        title: 'Endurecimiento de Content-Security-Policy (CSP)',
        effort: '2-3 horas',
        whatIsWrong: 'La política CSP incluye directivas permisivas como `unsafe-eval`.',
        whyItIsARisk: 'Permite ejecución de código dinámico desde cadenas si un atacante logra inyectar scripts (CWE-693).',
        systemImpact: 'Menor capacidad de contención ante eventuales vulnerabilidades XSS en dependencias de interfaz.',
        whatToModify: 'Revisar las dependencias frontend para eliminar la necesidad de `unsafe-eval` y restringir `scriptSrc` a orígenes de confianza.',
        expectedOutcome: 'Política CSP restrictiva que bloquea evaluación dinámica no autorizada.',
        vulnerable: `// VULNERABLE: scriptSrc con unsafe-eval
scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"]`,
        remediated: `// REMEDIADO: scriptSrc sin unsafe-eval y orígenes explícitos
scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com"]`,
        explanation: 'Deshabilita la evaluación de cadenas como JavaScript en el navegador.',
        verification: 'Inspeccionar la cabecera `Content-Security-Policy` en las respuestas del servidor.'
    },

    'SECRETS-DEFAULT': {
        title: 'Extracción de Secretos hacia Variables de Entorno y Rotación de Credenciales',
        effort: '1-2 horas',
        whatIsWrong: 'Credenciales, tokens o claves API se encuentran escritas directamente en archivos del repositorio.',
        whyItIsARisk: 'Cualquier persona con acceso de lectura al repositorio o a su historial Git obtiene acceso directo a los servicios (CWE-798).',
        systemImpact: 'Compromiso de servicios cloud, consumo fraudulento de cuotas de API o acceso a bases de datos.',
        whatToModify: 'Eliminar el secreto del archivo fuente, cargarlo mediante `process.env.NOMBRE_CLAVE` y rotar inmediatamente la credencial en el proveedor.',
        expectedOutcome: 'Cero secretos en el código versionado y gestión centralizada por entorno.',
        vulnerable: `// VULNERABLE: Clave API hardcodeada en código
const apiKey = "sk-proj-9843a789423b49f9823...";`,
        remediated: `// REMEDIADO: Carga segura desde variables de entorno
const apiKey = process.env.API_KEY;
if (!apiKey) throw new Error('Variable API_KEY requerida');`,
        explanation: 'Desacopla las credenciales secretas del código fuente distribuible.',
        verification: 'Ejecutar nuevamente el escáner de secretos y confirmar 0 coincidencias.'
    },

    'DEPS-DEFAULT': {
        title: 'Actualización y Fijación de Dependencias de Terceros (SCA)',
        effort: '1-3 horas',
        whatIsWrong: 'Uso de dependencias con versiones vulnerables conocidas o rangos comodín (`*` / `latest`).',
        whyItIsARisk: 'Las vulnerabilidades públicas en librerías permiten explotar fallos ya documentados (CWE-1395 / CWE-1104).',
        systemImpact: 'Posible compromiso por Prototype Pollution, SSRF, DoS o ataques de cadena de suministro.',
        whatToModify: 'Actualizar los paquetes afectados en `package.json` / `requirements.txt` y regenerar el archivo de bloqueo (`package-lock.json`).',
        expectedOutcome: 'Árbol de dependencias determinista y libre de CVEs conocidos.',
        vulnerable: `// VULNERABLE: Rango comodín o versión obsoleta
"dependencies": { "lodash": "*" }`,
        remediated: `// REMEDIADO: Versión estable fijada
"dependencies": { "lodash": "^4.17.21" }`,
        explanation: 'Garantiza instalaciones reproducibles y parches de seguridad aplicados.',
        verification: 'Ejecutar `npm audit` y verificar 0 vulnerabilidades críticas o altas.'
    }
};

function buildRemediationPlan(findings = []) {
    const queues = {
        urgentes: [],    // 1. Acciones urgentes (Críticas)
        alta: [],        // 2. Mejoras de alta prioridad (Altas)
        media: [],       // 3. Mejoras de prioridad media (Medias)
        preventivas: []  // 4. Recomendaciones preventivas (Bajas / Info)
    };

    const grouped = new Map();

    findings.forEach(f => {
        const ruleKey = f.ruleId || (f.type ? 'SECRETS-DEFAULT' : (f.dimensionId === 'dependencies' ? 'DEPS-DEFAULT' : 'DEFAULT'));
        if (!grouped.has(ruleKey)) {
            grouped.set(ruleKey, {
                ruleKey,
                name: f.name || f.title || 'Hallazgo de Seguridad',
                dimensionId: f.dimensionId || 'general',
                category: f.category || 'Seguridad General',
                severity: (f.severity || 'INFO').toUpperCase(),
                description: f.description || f.explanation || '',
                impact: f.impact || '',
                recommendation: f.recommendation || '',
                files: new Set(),
                findingIds: []
            });
        }
        const item = grouped.get(ruleKey);
        if (f.file) item.files.add(f.file);
        if (f.id) item.findingIds.push(f.id);
        if (f.severity === 'CRITICAL') item.severity = 'CRITICAL';
    });

    let remCounter = 1;

    grouped.forEach((group, ruleKey) => {
        const tmpl = REMEDIATION_TEMPLATES[ruleKey] ||
            (group.dimensionId === 'secretsManagement' ? REMEDIATION_TEMPLATES['SECRETS-DEFAULT'] :
            (group.dimensionId === 'dependencies' ? REMEDIATION_TEMPLATES['DEPS-DEFAULT'] : null));

        const affectedList = Array.from(group.files).slice(0, 8);

        const remItem = {
            id: `REM-${String(remCounter++).padStart(3, '0')}`,
            title: tmpl ? tmpl.title : `Remediación técnica para: ${group.name}`,
            dimensionId: group.dimensionId,
            category: group.category,
            severity: group.severity,
            estimatedEffort: tmpl ? tmpl.effort : (group.severity === 'CRITICAL' ? '2-4 horas' : '1-2 días'),
            affectedFilesCount: group.files.size,
            affectedFiles: affectedList,
            findingIds: group.findingIds,
            whatIsWrong: tmpl ? tmpl.whatIsWrong : group.description,
            whyItIsARisk: tmpl ? tmpl.whyItIsARisk : `Incumple controles defensivos de ${group.category}.`,
            systemImpact: tmpl ? tmpl.systemImpact : group.impact,
            impact: tmpl ? tmpl.systemImpact : group.impact,
            whatToModify: tmpl ? `${tmpl.whatToModify} (Archivos: ${affectedList.join(', ') || 'Repositorio'})` : group.recommendation,
            expectedOutcome: tmpl ? tmpl.expectedOutcome : 'Mitigación verificable del vector de riesgo y mejora en la puntuación de seguridad.',
            codeExample: tmpl ? {
                vulnerable: tmpl.vulnerable,
                remediated: tmpl.remediated,
                explanation: tmpl.explanation,
                verification: tmpl.verification
            } : null
        };

        if (group.severity === 'CRITICAL') {
            remItem.priority = '1. Acción urgente';
            remItem.timeframe = 'Inmediata (0 a 24 horas)';
            queues.urgentes.push(remItem);
        } else if (group.severity === 'HIGH') {
            remItem.priority = '2. Mejora de alta prioridad';
            remItem.timeframe = 'Corto plazo (1 a 3 días)';
            queues.alta.push(remItem);
        } else if (group.severity === 'MEDIUM') {
            remItem.priority = '3. Mejora de prioridad media';
            remItem.timeframe = 'Mediano plazo (1 a 2 semanas)';
            queues.media.push(remItem);
        } else {
            remItem.priority = '4. Recomendación preventiva';
            remItem.timeframe = 'Mejora continua / Preventiva';
            queues.preventivas.push(remItem);
        }
    });

    // Backward-compatible aliases (`inmediata` -> `urgentes`, `baja` -> `preventivas`)
    queues.inmediata = queues.urgentes;
    queues.baja = queues.preventivas;

    const totalActions = queues.urgentes.length + queues.alta.length + queues.media.length + queues.preventivas.length;

    return {
        totalActions,
        queues,
        summary: {
            urgentes: queues.urgentes.length,
            inmediata: queues.urgentes.length,
            alta: queues.alta.length,
            media: queues.media.length,
            preventivas: queues.preventivas.length,
            baja: queues.preventivas.length
        }
    };
}

module.exports = {
    REMEDIATION_TEMPLATES,
    buildRemediationPlan
};
