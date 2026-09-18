/**
 * DOCUMENT-MIND AI — GEMINI AI SERVICE LAYER
 * Integrates Google Gemini 2.5 Flash via official @google/genai SDK with intelligent heuristic fallback.
 */

const { GoogleGenAI } = require('@google/genai');

/**
 * Returns an initialized GoogleGenAI instance if GEMINI_API_KEY is present in process.env.
 */
function getGenAIClient() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey.trim().startsWith('tu_clave')) {
        return null;
    }
    return new GoogleGenAI({ apiKey: apiKey.trim() });
}

const DEFAULT_MODEL = process.env.AI_MODEL || 'gemini-2.5-flash';

// ============================================================
// 1. DOCUMENT ANALYSIS
// ============================================================

/**
 * Analyzes document text and returns structured cognitive insights.
 */
async function analyzeDocument(docData) {
    const client = getGenAIClient();
    const { text, filename, pageCount, wordCount } = docData;

    // Truncate text if massive to respect safe token budgets (~60,000 characters)
    const truncatedText = text.length > 60000 ? text.substring(0, 60000) + '\n\n[...Texto restante truncado para análisis...]' : text;

    if (!client) {
        // Fallback: Generate real static analysis from the document text
        return generateHeuristicDocumentAnalysis(docData);
    }

    const systemPrompt = `Eres Document-Mind AI, un motor de inteligencia artificial avanzado para análisis de documentos técnicos y académicos.
Analiza con rigor el texto provisto y genera un reporte en formato JSON estricto sin delimitadores markdown adicionales.
REGLAS:
1. Basa cada punto exclusivamente en la información real provista en el documento. NO inventes hechos, fechas ni cifras.
2. Si algo no se menciona en el documento, no lo agregues.
3. El resultado DEBE ser un objeto JSON con la estructura especificada a continuación.

Estructura JSON requerida:
{
  "summary": "Resumen ejecutivo conciso y riguroso (1-2 párrafos)",
  "mainIdeas": ["Idea principal 1", "Idea principal 2", "Idea principal 3", "Idea principal 4"],
  "keyConcepts": ["Concepto 1", "Concepto 2", "Concepto 3", "Concepto 4", "Concepto 5"],
  "keywords": ["palabra1", "palabra2", "palabra3", "palabra4", "palabra5", "palabra6"],
  "conclusions": ["Conclusión 1 verificable en el texto", "Conclusión 2"],
  "explanations": {
    "basic": "Explicación sencilla, intuitiva y accesible para cualquier persona sin conocimientos previos.",
    "intermediate": "Explicación técnica intermedia orientada a estudiantes o profesionales generales.",
    "advanced": "Explicación profunda, analítica y metodológica para especialistas del área."
  },
  "studyQuestions": [
    "¿Pregunta de comprensión 1?",
    "¿Pregunta de análisis 2?",
    "¿Pregunta de aplicación 3?"
  ],
  "entities": {
    "dates": ["Fechas explícitas mencionadas"],
    "names": ["Nombres o autores citados"],
    "metrics": ["Cifras, métricas o porcentajes clave"],
    "keyTopics": ["Temas centrales abordados"]
  }
}`;

    const prompt = `DOCUMENTO: "${filename}" (${pageCount} páginas, ~${wordCount} palabras)\n\nCONTENIDO REAL DEL DOCUMENTO:\n${truncatedText}\n\nGenera el análisis JSON estructurado:`;

    try {
        const response = await client.models.generateContent({
            model: DEFAULT_MODEL,
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n' + prompt }] }
            ],
            config: {
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });

        const rawText = response.text || '';
        const parsed = JSON.parse(rawText);
        parsed.isAiGenerated = true;
        parsed.modelUsed = DEFAULT_MODEL;
        return parsed;
    } catch (err) {
        console.warn('[AI Service] Gemini API call failed, reverting to heuristic extraction:', err.message);
        const fallback = generateHeuristicDocumentAnalysis(docData);
        fallback.apiNotice = `Aviso: No se pudo conectar con el servicio Gemini (${err.message}). Se presenta análisis estático determinista.`;
        return fallback;
    }
}

/**
 * Contextual chat grounded in the document text.
 */
async function chatWithDocument(docText, chatHistory, userMessage) {
    const client = getGenAIClient();
    const truncatedText = docText.length > 50000 ? docText.substring(0, 50000) : docText;

    if (!client) {
        return heuristicDocumentChat(docText, userMessage);
    }

    const systemInstruction = `Eres el asistente de lectura analítica de Document-Mind AI.
Tu objetivo es responder a las preguntas del usuario basándote ESTRICTAMENTE en el contenido real del documento analizado.
Si la información no aparece en el texto, di con claridad: "Esta información no se encuentra en el documento proporcionado."
Cuando sea relevante, cita frases clave o menciona las secciones donde se encuentra la respuesta. Mantén un tono técnico, profesional y conciso.`;

    const contents = [
        {
            role: 'user',
            parts: [{ text: `CONTEXTO DEL DOCUMENTO ANALIZADO:\n"""\n${truncatedText}\n"""\n\nPor favor asiste al usuario respondiendo preguntas sobre este documento.` }]
        },
        {
            role: 'model',
            parts: [{ text: 'Entendido. Responderé fundamentándome de manera rigurosa y exclusiva en el texto del documento que me has proporcionado.' }]
        }
    ];

    if (Array.isArray(chatHistory)) {
        chatHistory.slice(-8).forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        });
    }

    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    try {
        const response = await client.models.generateContent({
            model: DEFAULT_MODEL,
            contents,
            config: {
                systemInstruction,
                temperature: 0.3
            }
        });
        return {
            reply: response.text || 'No se obtuvo respuesta del modelo.',
            source: 'gemini',
            model: DEFAULT_MODEL
        };
    } catch (err) {
        console.warn('[AI Service] Gemini Chat failed, falling back to keyword heuristic:', err.message);
        return heuristicDocumentChat(docText, userMessage);
    }
}

// ============================================================
// 2. GITHUB REPOSITORY ANALYSIS
// ============================================================

/**
 * Analyzes repository architecture, files, and potential issues with Gemini.
 */
async function analyzeRepository(repoAnalysisData) {
    const client = getGenAIClient();
    const { repository, stats, detectedTechnologies, treeDiagram, prioritizedFiles } = repoAnalysisData;

    if (!client) {
        return generateHeuristicRepoAnalysis(repoAnalysisData);
    }

    const systemPrompt = `Eres Document-Mind AI, un arquitecto de software senior y especialista en análisis estático de código.
Analiza el repositorio provisto y genera un informe de arquitectura técnica y seguridad en formato JSON estricto sin bloques markdown externos.
REGLAS:
1. Basa cada análisis exclusivamente en los archivos, dependencias y estructura real provista.
2. NO afirmes que existe una vulnerabilidad si solo es una posibilidad.
3. Clasifica los hallazgos en:
   - "Confirmado": problema evidente comprobado en el código/configuración analizado.
   - "Posible problema": aspecto que podría causar inconvenientes bajo ciertas condiciones.
   - "Recomendación": buena práctica de arquitectura, pruebas o seguridad aplicable.
4. Explica con claridad la razón técnica de cada hallazgo.

Estructura JSON requerida:
{
  "overview": "Visión general del propósito y funcionalidad del proyecto.",
  "architecture": "Explicación de cómo están organizados sus módulos y capas (frontend, backend, servicios, etc.).",
  "flow": "Cómo se comunican los componentes y fluyen los datos.",
  "technologiesSummary": "Resumen técnico de las tecnologías y frameworks detectados.",
  "dependenciesAnalysis": "Análisis de las dependencias clave y su impacto en el proyecto.",
  "keyFiles": [
    {
      "path": "ruta/al/archivo",
      "role": "Propósito del archivo",
      "description": "Qué contiene y por qué es crítico."
    }
  ],
  "findings": [
    {
      "category": "Confirmado | Posible problema | Recomendación",
      "title": "Título del hallazgo",
      "description": "Descripción clara del hallazgo.",
      "rationale": "Justificación técnica basada en el código real."
    }
  ],
  "onboardingGuide": "Instrucciones paso a paso para que un desarrollador nuevo ejecute y contribuya al proyecto."
}`;

    let filesSummary = '';
    prioritizedFiles.forEach(f => {
        filesSummary += `\n--- ARCHIVO: ${f.path} (${f.size} bytes) ---\n${f.content.substring(0, 4000)}\n`;
    });

    const prompt = `REPOSITORIO: ${repository.fullName}
Descripción: ${repository.description}
Lenguaje principal: ${repository.primaryLanguage}
Tecnologías detectadas: ${detectedTechnologies.join(', ') || 'No especificadas'}
Total archivos relevantes: ${stats.relevantFilesCount}

ÁRBOL DE DIRECTORIOS:
${treeDiagram.substring(0, 3000)}

CONTENIDO DE ARCHIVOS CLAVE ANALIZADOS:
${filesSummary.substring(0, 45000)}

Genera el reporte de arquitectura técnica en formato JSON estricto:`;

    try {
        const response = await client.models.generateContent({
            model: DEFAULT_MODEL,
            contents: [
                { role: 'user', parts: [{ text: systemPrompt + '\n\n' + prompt }] }
            ],
            config: {
                responseMimeType: 'application/json',
                temperature: 0.2
            }
        });

        const rawText = response.text || '';
        const parsed = JSON.parse(rawText);
        parsed.isAiGenerated = true;
        parsed.modelUsed = DEFAULT_MODEL;
        return parsed;
    } catch (err) {
        console.warn('[AI Service] Gemini Repo Analysis failed, reverting to heuristic extraction:', err.message);
        const fallback = generateHeuristicRepoAnalysis(repoAnalysisData);
        fallback.apiNotice = `Aviso: No se pudo conectar con el servicio Gemini (${err.message}). Se presenta análisis estático determinista.`;
        return fallback;
    }
}

/**
 * Contextual chat grounded in the repository source files.
 */
async function chatWithRepository(repoAnalysisData, chatHistory, userMessage) {
    const client = getGenAIClient();
    const { repository, detectedTechnologies, treeDiagram, prioritizedFiles } = repoAnalysisData;

    if (!client) {
        return heuristicRepoChat(repoAnalysisData, userMessage);
    }

    let filesContext = '';
    prioritizedFiles.forEach(f => {
        filesContext += `\n[ARCHIVO: ${f.path}]\n${f.content.substring(0, 3500)}\n`;
    });

    const systemInstruction = `Eres el asistente de arquitectura de código de Document-Mind AI.
Estás dialogando con un desarrollador sobre el repositorio "${repository.fullName}".
Responde con precisión técnica basándote en los archivos reales analizados.
REGLAS:
1. Cita siempre las rutas exactas de los archivos analizados (ej. ${prioritizedFiles.length > 0 ? prioritizedFiles[0].path : 'src/index.js'}).
2. No inventes archivos ni funciones que no aparezcan en el contexto proporcionado.
3. Si un archivo no fue incluido en la muestra analizada, acláralo honestamente.`;

    const contents = [
        {
            role: 'user',
            parts: [{ text: `CONTEXTO DEL REPOSITORIO:\nNombre: ${repository.fullName}\nTecnologías: ${detectedTechnologies.join(', ')}\n\nÁrbol:\n${treeDiagram.substring(0, 2000)}\n\nArchivos clave:\n${filesContext.substring(0, 35000)}\n\nPor favor asiste al desarrollador respondiendo preguntas sobre este código.` }]
        },
        {
            role: 'model',
            parts: [{ text: 'Entendido. Estoy listo para responder preguntas sobre la estructura, dependencias y archivos reales analizados de este repositorio.' }]
        }
    ];

    if (Array.isArray(chatHistory)) {
        chatHistory.slice(-8).forEach(msg => {
            contents.push({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            });
        });
    }

    contents.push({
        role: 'user',
        parts: [{ text: userMessage }]
    });

    try {
        const response = await client.models.generateContent({
            model: DEFAULT_MODEL,
            contents,
            config: {
                systemInstruction,
                temperature: 0.3
            }
        });
        return {
            reply: response.text || 'No se obtuvo respuesta del modelo.',
            source: 'gemini',
            model: DEFAULT_MODEL
        };
    } catch (err) {
        console.warn('[AI Service] Gemini Repo Chat failed:', err.message);
        return heuristicRepoChat(repoAnalysisData, userMessage);
    }
}

// ============================================================
// 3. HEURISTIC / DETERMINISTIC STATIC FALLBACKS
// ============================================================

/**
 * Deterministic real text analysis when Gemini API key is not configured.
 */
function generateHeuristicDocumentAnalysis(docData) {
    const { text, filename, pageCount, wordCount } = docData;
    const sentences = text.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 25);
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 30);

    // 1. Executive Summary from real first paragraphs
    let summary = paragraphs.slice(0, 2).join('\n\n').trim();
    if (summary.length > 450) summary = summary.substring(0, 450) + '...';
    if (!summary) summary = `Documento "${filename}" con un total de ${wordCount} palabras distribuidas en aproximadamente ${pageCount} página(s).`;

    // 2. Extract Main Ideas from informative sentences
    const mainIdeas = sentences
        .slice(0, 5)
        .map(s => s.replace(/\n/g, ' ').trim())
        .filter(Boolean);

    // 3. Keyword frequency calculation (stop-words filtered)
    const stopWords = new Set([
        'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
        'con', 'no', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o',
        'este', 'sí', 'porque', 'esta', 'son', 'entre', 'está', 'cuando', 'muy', 'sin', 'sobre',
        'the', 'and', 'to', 'of', 'in', 'is', 'that', 'for', 'it', 'with', 'as', 'was', 'on', 'at'
    ]);
    const wordFreq = {};
    const rawTokens = text.toLowerCase().match(/[a-záéíóúüñ]{4,}/gi) || [];
    rawTokens.forEach(t => {
        const lower = t.toLowerCase();
        if (!stopWords.has(lower)) {
            wordFreq[lower] = (wordFreq[lower] || 0) + 1;
        }
    });
    const sortedWords = Object.keys(wordFreq).sort((a, b) => wordFreq[b] - wordFreq[a]);
    const keywords = sortedWords.slice(0, 8);
    const keyConcepts = sortedWords.slice(8, 14).map(w => w.charAt(0).toUpperCase() + w.slice(1));

    // 4. Real dates & metrics detection
    const dateMatches = text.match(/\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}|(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+\d{4})\b/gi) || [];
    const metricMatches = text.match(/\b\d+(?:[\.,]\d+)?\s*(?:%|kg|km|mb|gb|ms|segundos|horas|usuarios|dólares|usd|cop)\b/gi) || [];

    // 5. Conclusions from the final section of the text
    const conclusionCandidates = sentences.slice(-3).map(s => s.replace(/\n/g, ' ').trim());

    return {
        isStaticAnalysis: true,
        summary,
        mainIdeas: mainIdeas.length > 0 ? mainIdeas : ['El documento presenta una estructura descriptiva lineal.'],
        keyConcepts: keyConcepts.length > 0 ? keyConcepts : ['Estructura', 'Contenido', 'Datos'],
        keywords: keywords.length > 0 ? keywords : ['documento', 'análisis', 'texto'],
        conclusions: conclusionCandidates.length > 0 ? conclusionCandidates : ['El documento concluye con la información presentada en los párrafos finales.'],
        explanations: {
            basic: `Este documento titulado "${filename}" aborda temas relacionados con ${keywords.slice(0, 3).join(', ')}. Contiene aproximadamente ${wordCount} palabras y ${pageCount} página(s).`,
            intermediate: `El texto estructura conceptos en torno a ${keyConcepts.slice(0, 4).join(', ')}. En sus pasajes principales se evidencia un enfoque hacia ${keywords.slice(0, 4).join(', ')}.`,
            advanced: `Análisis cuantitativo léxico: documento de ${wordCount} términos con densidad de palabras clave centrada en ${keywords.slice(0, 5).join(', ')}, registrando ${dateMatches.length} referencias cronológicas y ${metricMatches.length} métricas tabuladas.`
        },
        studyQuestions: [
            `¿Cuál es el rol principal que desempeña "${keywords[0] || 'el tema principal'}" en el documento?`,
            `¿Cómo se relacionan los conceptos de "${keyConcepts[0] || 'análisis'}" y "${keyConcepts[1] || 'estructura'}" según el texto?`,
            `¿Qué métricas o conclusiones relevantes se derivan del análisis de "${filename}"?`
        ],
        entities: {
            dates: Array.from(new Set(dateMatches)).slice(0, 6),
            names: [filename],
            metrics: Array.from(new Set(metricMatches)).slice(0, 6),
            keyTopics: keywords.slice(0, 5)
        }
    };
}

/**
 * Heuristic document chat without active Gemini API key.
 */
function heuristicDocumentChat(docText, userMessage) {
    const queryWords = userMessage.toLowerCase().match(/[a-záéíóúüñ]{3,}/gi) || [];
    const sentences = docText.split(/(?<=[.?!])\s+/).filter(s => s.trim().length > 20);

    let bestSentence = '';
    let maxMatchScore = 0;

    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();
        let score = 0;
        queryWords.forEach(word => {
            if (lowerSentence.includes(word)) score += 1;
        });
        if (score > maxMatchScore) {
            maxMatchScore = score;
            bestSentence = sentence.trim();
        }
    });

    let reply;
    if (bestSentence && maxMatchScore > 0) {
        reply = `Basado en el texto del documento:\n\n"${bestSentence}"\n\n*(Extracto relevante encontrado en el documento)*`;
    } else {
        reply = 'No se encontró una coincidencia directa en el texto del documento para tu consulta. Para respuestas generativas complejas y razonamiento semántico avanzado, configura tu GEMINI_API_KEY en el servidor.';
    }

    return {
        reply,
        source: 'heuristic',
        notice: 'Modo análisis estático local. Configura tu GEMINI_API_KEY en el backend para habilitar síntesis de lenguaje natural con Gemini 2.5 Flash.'
    };
}

/**
 * Deterministic repository analysis fallback when Gemini API key is not configured.
 */
function generateHeuristicRepoAnalysis(repoAnalysisData) {
    const { repository, stats, detectedTechnologies, treeDiagram, prioritizedFiles } = repoAnalysisData;

    const findings = [
        {
            category: 'Confirmado',
            title: 'Estructura de repositorio organizada',
            description: `Se detectaron ${stats.relevantFilesCount} archivos relevantes en el árbol de código.`,
            rationale: `El repositorio cuenta con lenguaje principal "${repository.primaryLanguage}" y ${detectedTechnologies.length} tecnología(s) identificada(s).`
        },
        {
            category: 'Recomendación',
            title: 'Verificación continua de dependencias y pruebas',
            description: 'Mantener las dependencias de paquetes sincronizadas y agregar pruebas unitarias automatizadas.',
            rationale: 'Buenas prácticas de ingeniería de software para prevenir regresiones y vulnerabilidades en dependencias.'
        }
    ];

    if (!prioritizedFiles.some(f => f.path.toLowerCase().includes('test') || f.path.toLowerCase().includes('spec'))) {
        findings.push({
            category: 'Posible problema',
            title: 'Ausencia visible de suite de pruebas en directorio raíz',
            description: 'No se identificaron carpetas o archivos explícitos con nomenclatura de tests en los archivos principales examinados.',
            rationale: 'Un repositorio sin pruebas automatizadas presenta mayor riesgo de regresiones en entornos de producción.'
        });
    }

    const keyFiles = prioritizedFiles.slice(0, 6).map(f => {
        const name = f.path.split('/').pop();
        let role = 'Módulo de código fuente';
        if (name === 'package.json') role = 'Manifiesto de dependencias y scripts de Node.js';
        else if (name.startsWith('readme')) role = 'Documentación principal del proyecto';
        else if (name.includes('server') || name.includes('app')) role = 'Punto de entrada de la aplicación';
        return {
            path: f.path,
            role,
            description: `Archivo de ${f.size} bytes analizado estáticamente en el repositorio.`
        };
    });

    return {
        isStaticAnalysis: true,
        overview: `${repository.fullName}: ${repository.description} Proyecto desarrollado principalmente en ${repository.primaryLanguage}.`,
        architecture: `Arquitectura modular con estructura en rama "${repository.defaultBranch}". Incluye ${stats.relevantFilesCount} archivos fuente relevantes.`,
        flow: `El flujo de control se articula a través de los componentes principales identificados en: ${keyFiles.map(k => k.path).join(', ')}.`,
        technologiesSummary: detectedTechnologies.length > 0 
            ? `Tecnologías detectadas: ${detectedTechnologies.join(', ')}.` 
            : `Lenguaje principal: ${repository.primaryLanguage}.`,
        dependenciesAnalysis: `Se detectaron ${detectedTechnologies.length} tecnologías asociadas. Se recomienda auditar versiones periódicamente.`,
        keyFiles,
        findings,
        onboardingGuide: `1. Clona el repositorio: git clone ${repository.url}\n2. Revisa la documentación en README.md.\n3. Instala las dependencias del stack (${detectedTechnologies.join(', ') || repository.primaryLanguage}).\n4. Ejecuta el proyecto en tu entorno local.`
    };
}

/**
 * Heuristic repo chat without active Gemini API key.
 */
function heuristicRepoChat(repoAnalysisData, userMessage) {
    const { prioritizedFiles } = repoAnalysisData;
    const queryWords = userMessage.toLowerCase().match(/[a-zA-Z0-9_\-\.]{3,}/gi) || [];

    let matchedFile = null;
    let matchedLine = '';

    for (const f of prioritizedFiles) {
        const lines = f.content.split('\n');
        for (const line of lines) {
            const lower = line.toLowerCase();
            if (queryWords.some(w => lower.includes(w))) {
                matchedFile = f.path;
                matchedLine = line.trim();
                break;
            }
        }
        if (matchedFile) break;
    }

    let reply;
    if (matchedFile) {
        reply = `En el archivo \`${matchedFile}\` se localizó la siguiente referencia:\n\n\`\`\`\n${matchedLine}\n\`\`\`\n\n*(Extraído del código fuente real analizado)*`;
    } else {
        reply = `No se encontró una coincidencia directa en los archivos clave analizados. Los archivos examinados son:\n${prioritizedFiles.map(f => '- `' + f.path + '`').join('\n')}\n\nPara análisis semántico profundo y respuestas de código generativo, configura tu GEMINI_API_KEY en el servidor.`;
    }

    return {
        reply,
        source: 'heuristic',
        notice: 'Modo análisis estático local. Configura tu GEMINI_API_KEY en el backend para habilitar síntesis generativa con Gemini 2.5 Flash.'
    };
}

module.exports = {
    analyzeDocument,
    chatWithDocument,
    analyzeRepository,
    chatWithRepository,
    getGenAIClient
};
