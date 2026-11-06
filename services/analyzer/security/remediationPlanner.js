/**
 * DOCUMENT-MIND AI — SECURITY REMEDIATION PLANNER
 * Transforms raw security findings into an actionable, prioritized engineering remediation backlog.
 * Structures fixes into 4 execution queues: Inmediata (0-24h), Alta (1-3d), Media (1-2w), Baja (preventivo).
 * Provides concrete before-and-after code remediation templates.
 */

// Remediation Code Snippets Library by Rule / Pattern
const REMEDIATION_TEMPLATES = {
    'SAST-SQLI-001': {
        title: 'Migrar Consultas Dinámicas a Consultas Parametrizadas',
        effort: '2-4 horas',
        vulnerable: `// VULNERABLE: Concatenación directa de entradas de usuario
const query = "SELECT * FROM users WHERE email = '" + req.body.email + "'";
const result = await db.query(query);`,
        remediated: `// REMEDIADO: Parámetros tipados y sentencias preparadas
const query = "SELECT * FROM users WHERE email = $1";
const result = await db.query(query, [req.body.email]);`,
        explanation: 'Los parámetros ligados son tratados como datos literales por el motor SQL y nunca como código ejecutable, neutralizando cualquier intento de inyección.',
        verification: 'Ejecutar pruebas unitarias de inyección con payloads como `admin@test.com\' OR \'1\'=\'1` y verificar que no alteren la consulta.'
    },

    'SAST-XSS-001': {
        title: 'Sanitización Estricta de Salidas HTML en el DOM',
        effort: '1-3 horas',
        vulnerable: `// VULNERABLE: Inserción directa de marcado dinámico
document.getElementById('user-bio').innerHTML = userBio;`,
        remediated: `// REMEDIADO: Uso de textContent o DOMPurify para HTML rico
import DOMPurify from 'dompurify';
// Para texto plano:
document.getElementById('user-bio').textContent = userBio;
// O si se requiere renderizar HTML enriquecido permitido:
document.getElementById('user-bio').innerHTML = DOMPurify.sanitize(userBio);`,
        explanation: '`textContent` escapa automáticamente todas las etiquetas HTML. DOMPurify filtra scripts y eventos peligrosos (onerror, onload).',
        verification: 'Intentar inyectar `<img src=x onerror=alert(1)>` y comprobar que el script no se ejecuta en el navegador.'
    },

    'SAST-CMDI-001': {
        title: 'Sustitución de exec() por spawn() con Array de Argumentos Seguro',
        effort: '2-5 horas',
        vulnerable: `// VULNERABLE: shell exec concatenado
const { exec } = require('child_process');
exec(\`git clone \${repoUrl} \${destPath}\`, callback);`,
        remediated: `// REMEDIADO: spawn sin invocar subshell
const { spawn } = require('child_process');
const child = spawn('git', ['clone', repoUrl, destPath], { shell: false });`,
        explanation: 'Al deshabilitar la shell (`shell: false`) y pasar los argumentos en un array, los caracteres de control shell (`;`, `&&`, `|`) no son interpretados.',
        verification: 'Pasar un argumento con metacaracteres shell (ej. `repo; rm -rf /`) y verificar que git devuelva un error de URL inválida sin ejecutar comandos extra.'
    },

    'SAST-EVAL-001': {
        title: 'Eliminación Definitiva de eval() y Constructores Dinámicos',
        effort: '2-4 horas',
        vulnerable: `// VULNERABLE: eval dinámico
const parsed = eval("(" + jsonString + ")");`,
        remediated: `// REMEDIADO: Serializadores nativos seguros
const parsed = JSON.parse(jsonString);`,
        explanation: '`JSON.parse()` valida estrictamente la gramática JSON y nunca ejecuta código arbitrario.',
        verification: 'Verificar la compatibilidad del formato de entrada y confirmar que no se utilicen llamadas a `eval()` en todo el repositorio.'
    },

    'SAST-TRAV-001': {
        title: 'Sanitización de Rutas con path.resolve() y path.basename()',
        effort: '1-3 horas',
        vulnerable: `// VULNERABLE: Lectura directa de ruta suministrada
const filePath = path.join(__dirname, 'uploads', req.query.filename);
fs.readFile(filePath, callback);`,
        remediated: `// REMEDIADO: Normalización y verificación de confinamiento
const safeFileName = path.basename(req.query.filename);
const baseDir = path.resolve(__dirname, 'uploads');
const safePath = path.resolve(baseDir, safeFileName);

if (!safePath.startsWith(baseDir)) {
    throw new Error('Acceso no autorizado fuera del directorio permitido');
}
fs.readFile(safePath, callback);`,
        explanation: 'Garantiza que secuencias como `../../etc/passwd` sean truncadas o rechazadas antes de acceder al sistema de archivos.',
        verification: 'Probar peticiones con `filename=../../etc/passwd` y comprobar que retorne error 400/403.'
    },

    'SAST-SSRF-001': {
        title: 'Implementación de Lista Blanca de Destinos y Bloqueo de Redes Locales',
        effort: '3-6 horas',
        vulnerable: `// VULNERABLE: Petición HTTP a URL arbitraria del cliente
const res = await axios.get(req.query.targetUrl);`,
        remediated: `// REMEDIADO: Lista blanca de dominios y rechazo de IPs privadas
const ALLOWED_HOSTS = ['api.github.com', 'api.stripe.com'];
const parsedUrl = new URL(req.query.targetUrl);

if (!ALLOWED_HOSTS.includes(parsedUrl.hostname)) {
    throw new Error('Host de destino no autorizado');
}
const res = await axios.get(parsedUrl.toString());`,
        explanation: 'Impide que el servidor sea utilizado para sondear la red interna (127.0.0.1, 10.0.0.0/8) o acceder a los metadatos de la nube (169.254.169.254).',
        verification: 'Intentar consultar `http://169.254.169.254/latest/meta-data/` y certificar el bloqueo estricto.'
    },

    'SAST-CORS-001': {
        title: 'Restricción de Orígenes CORS a Dominios Autorizados',
        effort: '1 hora',
        vulnerable: `// VULNERABLE: CORS abierto a todo internet
app.use(cors());`,
        remediated: `// REMEDIADO: Orígenes explícitos configurados por entorno
const allowedOrigins = process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : ['https://midominio.com'];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Bloqueado por política CORS'));
        }
    },
    credentials: true
}));`,
        explanation: 'Solo los clientes web alojados en tus dominios legítimos podrán realizar solicitudes AJAX y leer respuestas protegidas.',
        verification: 'Ejecutar `curl -H "Origin: https://malicious-site.com" -I http://localhost:PORT` y verificar que no retorne `Access-Control-Allow-Origin: *`.'
    },

    'SAST-JWT-001': {
        title: 'Verificación Criptográfica Estricta de Tokens JWT',
        effort: '1-2 horas',
        vulnerable: `// VULNERABLE: Decodificar sin verificar la firma criptográfica
const payload = jwt.decode(token);
req.user = payload;`,
        remediated: `// REMEDIADO: Verificación de firma y algoritmos permitidos
const payload = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256']
});
req.user = payload;`,
        explanation: 'Garantiza la autenticidad e integridad del token y previene ataques de firma nula (`alg: none`).',
        verification: 'Probar un token manipulado manualmente y verificar que `jwt.verify` lance un error de firma inválida.'
    },

    'SAST-INPUT-001': {
        title: 'Validación de Esquema de Entradas con Zod o Joi',
        effort: '3-6 horas',
        vulnerable: `// VULNERABLE: Confianza ciega en req.body
app.post('/api/profile', (req, res) => {
    const { role, balance } = req.body;
    updateUser(req.user.id, { role, balance });
});`,
        remediated: `// REMEDIADO: Esquema Zod validado antes de procesar
import { z } from 'zod';

const UpdateProfileSchema = z.object({
    displayName: z.string().min(2).max(50),
    bio: z.string().max(250).optional()
}).strict(); // Rechaza campos no autorizados como role o balance

app.post('/api/profile', (req, res) => {
    const validatedData = UpdateProfileSchema.parse(req.body);
    updateUser(req.user.id, validatedData);
});`,
        explanation: 'Filtra parámetros inesperados previniendo Mass Assignment y asegurando consistencia de tipos de datos.',
        verification: 'Enviar un payload con `{ role: "admin" }` y confirmar que sea rechazado o ignorado.'
    },

    'SAST-LEAK-001': {
        title: 'Supresión de Fuga de Stack Traces en Respuestas de Error',
        effort: '1-2 horas',
        vulnerable: `// VULNERABLE: Retorno de error con detalles internos
app.use((err, req, res, next) => {
    res.status(500).send(err.stack);
});`,
        remediated: `// REMEDIADO: Logging interno y mensaje opaco al cliente
app.use((err, req, res, next) => {
    const errorId = crypto.randomUUID();
    console.error(\`[Error \${errorId}]\`, err);
    res.status(500).json({
        error: 'Ocurrió un error interno en el servidor',
        referenceId: errorId
    });
});`,
        explanation: 'Protege las rutas del sistema, nombres de módulos y versiones contra reconocimiento pasivo por parte de atacantes.',
        verification: 'Forzar un error 500 y comprobar que la respuesta JSON contenga únicamente el mensaje seguro y el `referenceId`.'
    },

    'SAST-COOKIE-001': {
        title: 'Configuración Segura de Cookies (HttpOnly, Secure, SameSite)',
        effort: '1 hora',
        vulnerable: `// VULNERABLE: Cookie accesible por JavaScript
res.cookie('token', jwtToken);`,
        remediated: `// REMEDIADO: Flags de máxima seguridad
res.cookie('token', jwtToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
});`,
        explanation: '`httpOnly` impide que scripts maliciosos lean el token en ataques XSS. `secure` fuerza el envío exclusivo sobre HTTPS.',
        verification: 'Inspeccionar `document.cookie` en la consola del navegador y comprobar que la cookie de autenticación no es accesible.'
    },

    'SAST-HEADER-001': {
        title: 'Blindaje de Cabeceras HTTP con Helmet',
        effort: '30 minutos',
        vulnerable: `// VULNERABLE: Sin cabeceras de seguridad
const express = require('express');
const app = express();`,
        remediated: `// REMEDIADO: Helmet integrado y X-Powered-By desactivado
const express = require('express');
const helmet = require('helmet');
const app = express();

app.disable('x-powered-by');
app.use(helmet());`,
        explanation: 'Activa automáticamente CSP, HSTS, X-Content-Type-Options, X-Frame-Options y elimina la firma del framework.',
        verification: 'Consultar el servidor con `curl -I http://localhost:PORT` y verificar la presencia de las cabeceras `Strict-Transport-Security` y `X-Content-Type-Options: nosniff`.'
    },

    'SECRETS-DEFAULT': {
        title: 'Extracción de Secretos hacia Variables de Entorno y Gestor de Claves',
        effort: '1-2 horas',
        vulnerable: `// VULNERABLE: Clave API hardcodeada en el código
const apiKey = "sk-proj-9843a789423b49f9823...";`,
        remediated: `// REMEDIADO: Consumo mediante process.env con validación
require('dotenv').config();
const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) {
    throw new Error('Falta configurar la variable de entorno OPENAI_API_KEY');
}`,
        explanation: 'Mantiene las credenciales fuera del control de versiones (Git) y permite rotaciones sin redistribuir el código.',
        verification: 'Buscar en Git que `.env` esté listado en `.gitignore` y que ninguna clave real quede en el historial de commits.'
    },

    'DEPS-DEFAULT': {
        title: 'Actualización y Fijación de Dependencias Vulnerables',
        effort: '1-3 horas',
        vulnerable: `// VULNERABLE: Versión comodín flotante
"dependencies": {
    "lodash": "*"
}`,
        remediated: `// REMEDIADO: Versión estable fijada y lockfile versionado
"dependencies": {
    "lodash": "^4.17.21"
}`,
        explanation: 'Previene descargas automáticas de versiones comprometidas y garantiza builds deterministas.',
        verification: 'Ejecutar `npm audit` o `pip audit` y certificar que la salida reporte 0 vulnerabilidades.'
    }
};

/**
 * Builds an actionable, 4-tier remediation plan from detected findings.
 * @param {Array<object>} findings
 * @returns {object} Remediation plan organized by queues
 */
function buildRemediationPlan(findings = []) {
    const queues = {
        inmediata: [], // Críticas (0 - 24 horas)
        alta: [],      // Altas (1 - 3 días)
        media: [],     // Medias (1 - 2 semanas)
        baja: []       // Bajas / Preventivas (próximo ciclo de release)
    };

    // Group findings by rule / pattern to prevent duplicate advice
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
                impact: f.impact,
                files: new Set(),
                findingIds: []
            });
        }
        const item = grouped.get(ruleKey);
        if (f.file) item.files.add(f.file);
        if (f.id) item.findingIds.push(f.id);
        // Elevate severity if multiple findings exist
        if (f.severity === 'CRITICAL') item.severity = 'CRITICAL';
    });

    let remCounter = 1;

    grouped.forEach((group, ruleKey) => {
        const tmpl = REMEDIATION_TEMPLATES[ruleKey] || 
            (group.dimensionId === 'secretsManagement' ? REMEDIATION_TEMPLATES['SECRETS-DEFAULT'] :
            (group.dimensionId === 'dependencies' ? REMEDIATION_TEMPLATES['DEPS-DEFAULT'] : null));

        const remItem = {
            id: `REM-${String(remCounter++).padStart(3, '0')}`,
            title: tmpl ? tmpl.title : `Mitigación para ${group.name}`,
            dimensionId: group.dimensionId,
            category: group.category,
            severity: group.severity,
            estimatedEffort: tmpl ? tmpl.effort : (group.severity === 'CRITICAL' ? '2-4 horas' : '1-2 días'),
            affectedFilesCount: group.files.size,
            affectedFiles: Array.from(group.files).slice(0, 5),
            findingIds: group.findingIds,
            impact: group.impact,
            codeExample: tmpl ? {
                vulnerable: tmpl.vulnerable,
                remediated: tmpl.remediated,
                explanation: tmpl.explanation,
                verification: tmpl.verification
            } : null
        };

        if (group.severity === 'CRITICAL') {
            remItem.priority = 'Inmediata';
            remItem.timeframe = '0 a 24 horas';
            queues.inmediata.push(remItem);
        } else if (group.severity === 'HIGH') {
            remItem.priority = 'Alta';
            remItem.timeframe = '1 a 3 días';
            queues.alta.push(remItem);
        } else if (group.severity === 'MEDIUM') {
            remItem.priority = 'Media';
            remItem.timeframe = '1 a 2 semanas';
            queues.media.push(remItem);
        } else {
            remItem.priority = 'Baja';
            remItem.timeframe = 'Próximo ciclo de release';
            queues.baja.push(remItem);
        }
    });

    const totalActions = queues.inmediata.length + queues.alta.length + queues.media.length + queues.baja.length;

    return {
        totalActions,
        queues,
        summary: {
            inmediata: queues.inmediata.length,
            alta: queues.alta.length,
            media: queues.media.length,
            baja: queues.baja.length
        }
    };
}

module.exports = {
    REMEDIATION_TEMPLATES,
    buildRemediationPlan
};
