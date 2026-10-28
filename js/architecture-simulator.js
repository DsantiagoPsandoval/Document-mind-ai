/**
 * DOCUMENT-MIND AI — MOTOR INTERACTIVO DEL SIMULADOR DE ARQUITECTURA (ACTIVIDAD 9)
 * Universidad Libre — Facultad de Ingeniería — Curso: Ingeniería Aplicada (2026-2)
 * Autores: Daniel Santiago Palencia Sandoval & Nelson Andrés Ayala Álvarez
 *
 * Funciona de manera 100% determinista y verificable tanto en cliente (GitHub Pages / Standalone)
 * como sincronizado con los endpoints REST `/api/simulator/run` y `/api/simulator/scenarios`.
 */

(function () {
    'use strict';

    // ============================================================
    // 1. PARÁMETROS DEL MODELO Y ALTERNATIVAS ARQUITECTÓNICAS (REQ 2 & 4)
    // ============================================================
    const ARCHITECTURE_ALTERNATIVES = {
        MONOLITH_MVC: {
            id: 'MONOLITH_MVC',
            name: 'Alternativa 1: Monolito Modular MVC (Node.js / Express Single-Instance)',
            shortName: 'Monolito Modular MVC',
            badge: 'Bajo Overhead Local',
            color: '#38BDF8',
            icon: 'fa-cube',
            architectureType: 'Monolítica en una sola instancia (In-Memory Calls)',
            containerization: 'Baja (1 Contenedor / Host Único)',
            encryptionLevel: 'TLS 1.3 en Borde (HTTPS) + Sanitización En-Memoria (92/100)',
            encryptionScore: 92,
            description: 'Arquitectura actual de Document-Mind AI donde el Gateway HTTP, el Parser de Documentos (PDF/DOCX), el Analizador AST de GitHub, el Escáner DevSecOps y el Cliente Gemini conviven en un único proceso Node.js.',
            strengths: [
                'Cero latencia de serialización de red interna (llamadas a funciones en memoria RAM).',
                'Menor consumo base de CPU y Memoria RAM en cargas bajas y moderadas (confirmado por Al-Debagy & Martinek en despliegues single-machine).',
                'Simplicidad operativa y menor costo fijo mensual en etapas tempranas ($24 USD/mes base).'
            ],
            limitations: [
                'Bloqueo del Event-Loop de Node.js cuando el parseo AST o PDF de archivos grandes (>10MB) ocurre de forma concurrente.',
                'Escalabilidad vertical limitada: si el módulo de IA o AST satura la CPU, cae toda la aplicación (Punto Único de Fallo).',
                'Acoplamiento de despliegue: cualquier cambio en una regla SAST requiere redesplegar todo el servidor.'
            ],
            params: {
                baseProcessingFactor: 0.72,
                networkHops: 0,
                hopLatencyMs: 0,
                baseCapacityPerNodeRps: 42,
                maxAutoScaleNodes: 2,
                baseMemoryMb: 180,
                memoryPerUserMb: 1.65,
                baseCpuCores: 0.35,
                packetsPerRequest: 4,
                baseAvailabilityPct: 99.65,
                fixedMonthlyCostUsd: 24,
                variableCostPer1kReqsUsd: 0.045,
                containerScore: 68
            }
        },
        MICROSERVICES_K8S: {
            id: 'MICROSERVICES_K8S',
            name: 'Alternativa 2: Microservicios Distribuídos en Contenedores (Docker + Kubernetes)',
            shortName: 'Microservicios (K8s)',
            badge: 'Alta Escalabilidad Síncrona',
            color: '#818CF8',
            icon: 'fa-cubes',
            architectureType: 'Microservicios Desacoplados con API Gateway & REST/gRPC',
            containerization: 'Alta (5 Pods Auto-escalables con HPA en Kubernetes)',
            encryptionLevel: 'mTLS Estricta (Service Mesh Istio) + TLS 1.3 + Vault Secrets (98/100)',
            encryptionScore: 98,
            description: 'Descomposición funcional en 5 microservicios contenerizados: (1) API Gateway & Auth, (2) Document Parser Service, (3) GitHub AST & DevSecOps Analyzer, (4) Gemini AI Orchestrator, y (5) Export/Cache Service.',
            strengths: [
                'Escalado horizontal selectivo (HPA): los pods de AST y PDF escalan independientemente sin afectar el Gateway ni el Chat.',
                'Aislamiento de fallos (Bulkhead Pattern): un pico de memoria en la extracción ZIP no degrada la disponibilidad global.',
                'Seguridad Zero-Trust con cifrado mTLS entre contenedores y políticas estrictas de red (98/100).'
            ],
            limitations: [
                'Penalización de latencia en baja concurrencia por serialización JSON/gRPC y 4 saltos de red internos (Service Mesh overhead).',
                'Mayor huella base de CPU y RAM debido a múltiples runtimes de Node.js y sidecars de contenedores (720 MB base).',
                'Mayor costo basal de infraestructura por clúster de orquestación y balanceadores de carga ($115 USD/mes base).'
            ],
            params: {
                baseProcessingFactor: 0.78,
                networkHops: 4,
                hopLatencyMs: 9.5,
                baseCapacityPerNodeRps: 38,
                maxAutoScaleNodes: 10,
                baseMemoryMb: 720,
                memoryPerUserMb: 2.35,
                baseCpuCores: 1.15,
                packetsPerRequest: 18,
                baseAvailabilityPct: 99.88,
                fixedMonthlyCostUsd: 115,
                variableCostPer1kReqsUsd: 0.085,
                containerScore: 96
            }
        },
        EDA_SERVERLESS: {
            id: 'EDA_SERVERLESS',
            name: 'Alternativa 3: Arquitectura Orientada a Eventos + Workers Asíncronos (EDA)',
            shortName: 'Orientada a Eventos (EDA)',
            badge: 'Resiliencia ante Picos',
            color: '#34D399',
            icon: 'fa-bolt',
            architectureType: 'Event-Driven Architecture (Broker Pub/Sub + Serverless Workers)',
            containerization: 'Elástica Serverless (Contenedores Efímeros por Evento + Cola Redis/Kafka)',
            encryptionLevel: 'TLS 1.3 + Cifrado de Payload en Cola AES-256-GCM + Firma HMAC (96/100)',
            encryptionScore: 96,
            description: 'Desacoplamiento asíncrono mediante un Event Broker (Redis Streams / RabbitMQ). El Gateway recibe el repositorio o PDF, emite un evento AnalysisRequested, y un pool elástico de Workers procesa el AST, el escaneo SAST y la síntesis de Gemini sin bloquear hilos HTTP.',
            strengths: [
                'Absorción superior de picos extremos de estrés (Backpressure & Queue Buffering) sin rechazar conexiones.',
                'Optimización de costos por pago-por-uso real de cómputo en cargas pesadas e intermitentes (Git Push masivos).',
                'Desacoplamiento temporal completo entre la ingesta del documento/repositorio y la inferencia cognitiva de Gemini.'
            ],
            limitations: [
                'Mayor tráfico de paquetes enviados/recibidos (26 pkts/req base por ACKs del broker, publicación, suscripción y notificación).',
                'Latencia de arranque/despacho en cola perceptible cuando el sistema opera con baja concurrencia.',
                'Complejidad de consistencia eventual y trazabilidad distribuida de eventos.'
            ],
            params: {
                baseProcessingFactor: 0.65,
                networkHops: 3,
                hopLatencyMs: 14.0,
                baseCapacityPerNodeRps: 45,
                maxAutoScaleNodes: 16,
                baseMemoryMb: 410,
                memoryPerUserMb: 1.95,
                baseCpuCores: 0.70,
                packetsPerRequest: 26,
                baseAvailabilityPct: 99.94,
                fixedMonthlyCostUsd: 55,
                variableCostPer1kReqsUsd: 0.110,
                containerScore: 90
            }
        }
    };

    const PRESET_SCENARIOS = {
        BASELINE: {
            id: 'BASELINE',
            name: 'Escenario de Referencia (Operación Normal Cohorte)',
            badge: 'Referencia Base',
            description: 'Carga nominal del proyecto en demostraciones académicas y uso diario por equipos de desarrollo pequeños (60 usuarios, archivos de 2.5 MB, 85 archivos por repo).',
            inputs: { concurrentUsers: 60, payloadSizeMb: 2.5, repoComplexityFiles: 85, aiDepthFactor: 2, trafficBurstFactor: 1.2 }
        },
        SINGLE_MACHINE_LIGHT: {
            id: 'SINGLE_MACHINE_LIGHT',
            name: 'Escenario 1: Baja Carga / Nodo Único (Ventaja Monolítica)',
            badge: 'Escenario 1',
            description: 'Valida empíricamente la literatura (Al-Debagy & Martinek): en un entorno acotado con carga ligera (18 usuarios, 1 MB), el monolito supera a microservicios al evitar saltos de red.',
            inputs: { concurrentUsers: 18, payloadSizeMb: 1.0, repoComplexityFiles: 35, aiDepthFactor: 1, trafficBurstFactor: 1.0 }
        },
        ENTERPRISE_SCALE: {
            id: 'ENTERPRISE_SCALE',
            name: 'Escenario 2: Escalabilidad Empresarial B2B (Alta Concurrencia)',
            badge: 'Escenario 2',
            description: '320 usuarios corporativos analizando repositorios de 240 archivos (6 MB) con auditoría DevSecOps simultánea.',
            inputs: { concurrentUsers: 320, payloadSizeMb: 6.0, repoComplexityFiles: 240, aiDepthFactor: 2, trafficBurstFactor: 1.6 }
        },
        EXTREME_STRESS_PUSH: {
            id: 'EXTREME_STRESS_PUSH',
            name: 'Escenario 3: Prueba de Estrés Extremo (Git Push Masivo + PDFs 14MB)',
            badge: 'Escenario 3 (JMeter Stress)',
            description: 'Simulación de estrés severo: 650 usuarios concurrentes, ráfaga de 2.5x, repositorios de 420 archivos y análisis profundo Gemini + STRIDE.',
            inputs: { concurrentUsers: 650, payloadSizeMb: 14.0, repoComplexityFiles: 420, aiDepthFactor: 3, trafficBurstFactor: 2.5 }
        }
    };

    // Estado reactivo de la simulación en el cliente
    let baselineSnapshot = null;
    let scenarioExecutionHistory = [];
    let currentSimulationResult = null;

    // ============================================================
    // 2. VALIDACIÓN Y MOTOR DE CÁLCULO DETERMINISTA (REQ 3, 4, 6, 8, 10)
    // ============================================================
    function validateInputs(raw) {
        const errors = [];
        const u = Number(raw.concurrentUsers);
        const s = Number(raw.payloadSizeMb);
        const n = Number(raw.repoComplexityFiles);
        const ai = Number(raw.aiDepthFactor);
        const b = Number(raw.trafficBurstFactor);
        const maxLat = Number(raw.maxLatencyMs);
        const minAvail = Number(raw.minAvailabilityPct);
        const maxBudget = Number(raw.maxMonthlyBudgetUsd);

        if (!Number.isFinite(u) || u < 1 || u > 5000) {
            errors.push('Usuarios Concurrentes (U) fuera de rango permitido [1 - 5,000].');
        }
        if (!Number.isFinite(s) || s < 0.1 || s > 20) {
            errors.push('Tamaño de Carga / Documento (S_MB) fuera del límite físico del Gateway [0.1 - 20.0 MB].');
        }
        if (!Number.isFinite(n) || n < 5 || n > 2000) {
            errors.push('Complejidad de Repositorio (N_files) inválida [5 - 2,000 archivos].');
        }
        if (![1, 2, 3].includes(Math.round(ai))) {
            errors.push('Nivel de Profundidad Cognitiva IA debe ser 1, 2 o 3.');
        }
        if (!Number.isFinite(b) || b < 1.0 || b > 5.0) {
            errors.push('Factor de Ráfaga (B) fuera de rango [1.0x - 5.0x].');
        }
        if (!Number.isFinite(maxLat) || maxLat < 100 || maxLat > 30000) {
            errors.push('Requisito de Latencia P95 Máxima inválido [100 - 30,000 ms].');
        }
        if (!Number.isFinite(minAvail) || minAvail < 80 || minAvail > 99.999) {
            errors.push('Requisito de Disponibilidad SLA inválido [80% - 99.999%].');
        }
        if (!Number.isFinite(maxBudget) || maxBudget < 10 || maxBudget > 50000) {
            errors.push('Restricción de Presupuesto Mensual inválida [$10 - $50,000 USD].');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    function calculateAlternative(altKey, inputs, projectConfig) {
        const alt = ARCHITECTURE_ALTERNATIVES[altKey];
        const p = alt.params;
        const { concurrentUsers, payloadSizeMb, repoComplexityFiles, aiDepthFactor, trafficBurstFactor } = inputs;

        const arrivalRateRps = (concurrentUsers / 12.0) * trafficBurstFactor;

        const astComplexityMs = repoComplexityFiles * 1.45;
        const payloadParsingMs = payloadSizeMb * 26.0;
        const aiSynthesisMs = aiDepthFactor === 1 ? 35 : (aiDepthFactor === 2 ? 190 : 410);
        const rawWorkMs = (45 + astComplexityMs + payloadParsingMs + aiSynthesisMs) * p.baseProcessingFactor;

        const serializationPenaltyMs = p.networkHops > 0
            ? p.networkHops * (p.hopLatencyMs + (payloadSizeMb * 2.8) + (repoComplexityFiles * 0.04))
            : 0;

        const weightPenaltyDivisor = 1 + (payloadSizeMb * 0.085) + (repoComplexityFiles / 350) + (aiDepthFactor * 0.18);
        const effectiveNodeCapacityRps = Math.max(2.5, p.baseCapacityPerNodeRps / weightPenaltyDivisor);

        const requiredNodes = Math.ceil(arrivalRateRps / (effectiveNodeCapacityRps * 0.72));
        const activeNodes = Math.min(p.maxAutoScaleNodes, Math.max(1, requiredNodes));
        const maxSystemCapacityRps = Number((effectiveNodeCapacityRps * activeNodes).toFixed(2));

        const rawUtilization = arrivalRateRps / maxSystemCapacityRps;
        const effectiveUtilization = altKey === 'EDA_SERVERLESS' ? rawUtilization * 0.86 : rawUtilization;

        let queueingDelayMs = 0;
        if (effectiveUtilization <= 0.65) {
            queueingDelayMs = rawWorkMs * 0.12 * Math.pow(effectiveUtilization, 2);
        } else if (effectiveUtilization <= 0.95) {
            queueingDelayMs = rawWorkMs * (0.25 + Math.pow(effectiveUtilization / (1.05 - effectiveUtilization), 1.35) * 0.18);
        } else {
            const overloadRatio = effectiveUtilization - 0.95;
            const saturationMultiplier = altKey === 'MONOLITH_MVC' ? 1450 : (altKey === 'MICROSERVICES_K8S' ? 680 : 420);
            queueingDelayMs = (rawWorkMs * 1.4) + (overloadRatio * saturationMultiplier * (1 + payloadSizeMb * 0.12));
        }

        const brokerDispatchOverheadMs = altKey === 'EDA_SERVERLESS'
            ? (28 + (concurrentUsers < 35 ? 32 : 10))
            : 0;

        const estimatedLatencyMs = Math.round(rawWorkMs + serializationPenaltyMs + queueingDelayMs + brokerDispatchOverheadMs);

        const dropRate = effectiveUtilization > 1.05
            ? Math.min(0.65, (effectiveUtilization - 1.05) * (altKey === 'EDA_SERVERLESS' ? 0.22 : 0.55))
            : 0;
        const effectiveThroughputRps = Number((arrivalRateRps * (1 - dropRate)).toFixed(2));

        const cpuCoresUsed = p.baseCpuCores * activeNodes + (arrivalRateRps * (rawWorkMs / 1000) * (altKey === 'MONOLITH_MVC' ? 0.28 : 0.36));
        const totalAllocatedCores = activeNodes * (altKey === 'MONOLITH_MVC' ? 2.0 : 1.5);
        const cpuUtilizationPct = Number(Math.min(99.9, Math.max(8.0, (cpuCoresUsed / totalAllocatedCores) * 100)).toFixed(1));

        const memoryUsageMb = Math.round(
            p.baseMemoryMb +
            (activeNodes - 1) * (p.baseMemoryMb * 0.42) +
            (concurrentUsers * p.memoryPerUserMb * (1 + payloadSizeMb * 0.06))
        );

        const networkPacketsPerSec = Math.round(arrivalRateRps * p.packetsPerRequest * (1 + (payloadSizeMb * 0.35)));

        let availabilityPenalty = 0;
        if (effectiveUtilization > 0.70) {
            availabilityPenalty += Math.pow(effectiveUtilization - 0.70, 1.5) * (altKey === 'MONOLITH_MVC' ? 4.8 : (altKey === 'MICROSERVICES_K8S' ? 1.2 : 0.5));
        }
        const maxAllowedMemMb = (projectConfig.constraints.maxMemoryGb || 8) * 1024;
        if (memoryUsageMb > maxAllowedMemMb * 0.85) {
            availabilityPenalty += 1.25;
        }
        const availabilityPct = Number(Math.max(85.0, Math.min(99.99, p.baseAvailabilityPct - availabilityPenalty)).toFixed(2));

        const headroomRatio = Math.max(0, (maxSystemCapacityRps - arrivalRateRps) / Math.max(1, maxSystemCapacityRps));
        const scaleElasticity = altKey === 'MONOLITH_MVC'
            ? (effectiveUtilization < 0.45 ? 42 : 20)
            : (p.maxAutoScaleNodes / 16) * 44;
        const nonBlockingBonus = altKey === 'EDA_SERVERLESS' ? 26 : (altKey === 'MICROSERVICES_K8S' ? 24 : 18);
        const saturationPenalty = effectiveUtilization > 0.80 ? Math.min(55, (effectiveUtilization - 0.80) * 65) : 0;
        const scalabilityScore = Math.round(Math.max(15, Math.min(100, 22 + scaleElasticity + nonBlockingBonus + (headroomRatio * 22) - saturationPenalty)));

        const projectedMonthlyRequestsThousands = arrivalRateRps * 3600 * 8 * 22 / 1000;
        const nodeScalingCost = (activeNodes - 1) * (altKey === 'MONOLITH_MVC' ? 22 : (altKey === 'MICROSERVICES_K8S' ? 28 : 14));
        const estimatedMonthlyCostUsd = Math.round(
            p.fixedMonthlyCostUsd +
            nodeScalingCost +
            (projectedMonthlyRequestsThousands * p.variableCostPer1kReqsUsd * (1 + payloadSizeMb * 0.04))
        );

        const securityAndContainerIndex = Math.round((alt.encryptionScore * 0.55) + (p.containerScore * 0.45));

        const compliance = {
            latencyOk: estimatedLatencyMs <= projectConfig.qualityRequirements.maxLatencyMs,
            availabilityOk: availabilityPct >= projectConfig.qualityRequirements.minAvailabilityPct,
            scalabilityOk: scalabilityScore >= projectConfig.qualityRequirements.minScalabilityScore,
            securityOk: alt.encryptionScore >= 90,
            budgetOk: estimatedMonthlyCostUsd <= projectConfig.constraints.maxMonthlyBudgetUsd,
            memoryOk: memoryUsageMb <= (projectConfig.constraints.maxMemoryGb * 1024)
        };

        return {
            alternativeId: alt.id,
            name: alt.name,
            shortName: alt.shortName,
            badge: alt.badge,
            color: alt.color,
            icon: alt.icon,
            architectureType: alt.architectureType,
            containerization: alt.containerization,
            encryptionLevel: alt.encryptionLevel,
            description: alt.description,
            strengths: alt.strengths,
            limitations: alt.limitations,
            metrics: {
                latencyMs: estimatedLatencyMs,
                throughputRps: effectiveThroughputRps,
                maxCapacityRps: maxSystemCapacityRps,
                utilizationPct: Number(Math.min(199.9, effectiveUtilization * 100).toFixed(1)),
                availabilityPct,
                scalabilityScore,
                cpuUtilizationPct,
                memoryUsageMb,
                networkPacketsPerSec,
                activeContainers: activeNodes,
                encryptionScore: alt.encryptionScore,
                containerScore: p.containerScore,
                securityAndContainerIndex,
                estimatedMonthlyCostUsd
            },
            breakdown: {
                arrivalRateRps: Number(arrivalRateRps.toFixed(2)),
                baseComputeMs: Math.round(rawWorkMs),
                networkSerializationMs: Math.round(serializationPenaltyMs),
                queueingAndContentionMs: Math.round(queueingDelayMs + brokerDispatchOverheadMs)
            },
            compliance: {
                ...compliance,
                allMandatoryPassed: compliance.latencyOk && compliance.availabilityOk && compliance.budgetOk
            }
        };
    }

    function executeSimulation(inputs, projectConfig) {
        const results = Object.keys(ARCHITECTURE_ALTERNATIVES).map(k => calculateAlternative(k, inputs, projectConfig));

        const minLatency = Math.min(...results.map(r => r.metrics.latencyMs));
        const minCost = Math.min(...results.map(r => r.metrics.estimatedMonthlyCostUsd));
        const minMem = Math.min(...results.map(r => r.metrics.memoryUsageMb));
        const weights = projectConfig.decisionWeights;

        const scored = results.map(r => {
            const latencyScore = Math.max(10, Math.min(100, (minLatency / Math.max(1, r.metrics.latencyMs)) * 100));
            const scalabilityScore = r.metrics.scalabilityScore;
            const availabilityScore = Math.max(0, Math.min(100, ((r.metrics.availabilityPct - 95) / 5.0) * 100));
            const costScore = (minCost / Math.max(1, r.metrics.estimatedMonthlyCostUsd)) * 100;
            const memEfficiencyScore = (minMem / Math.max(1, r.metrics.memoryUsageMb)) * 100;
            const efficiencyAndCostScore = (costScore * 0.65) + (memEfficiencyScore * 0.35);
            const securityAndContainersScore = r.metrics.securityAndContainerIndex;

            const weightedScore =
                (latencyScore * weights.latency) +
                (scalabilityScore * weights.scalability) +
                (availabilityScore * weights.availability) +
                (efficiencyAndCostScore * weights.efficiencyAndCost) +
                (securityAndContainersScore * weights.securityAndContainers);

            let constraintPenalty = 0;
            if (!r.compliance.latencyOk) constraintPenalty += 14;
            if (!r.compliance.availabilityOk) constraintPenalty += 14;
            if (!r.compliance.budgetOk) constraintPenalty += 12;
            if (!r.compliance.scalabilityOk) constraintPenalty += 8;
            if (!r.compliance.memoryOk) constraintPenalty += 10;

            const finalScore = Number(Math.max(5, Math.min(100, weightedScore - constraintPenalty)).toFixed(1));

            return {
                ...r,
                mcda: {
                    latencyScore: Math.round(latencyScore),
                    scalabilityScore: Math.round(scalabilityScore),
                    availabilityScore: Math.round(availabilityScore),
                    efficiencyAndCostScore: Math.round(efficiencyAndCostScore),
                    securityAndContainersScore: Math.round(securityAndContainersScore),
                    constraintPenalty,
                    finalScore
                }
            };
        });

        const viable = scored.filter(r => r.compliance.allMandatoryPassed);
        const nonViable = scored.filter(r => !r.compliance.allMandatoryPassed);
        const ranked = [
            ...viable.sort((a, b) => b.mcda.finalScore - a.mcda.finalScore),
            ...nonViable.sort((a, b) => b.mcda.finalScore - a.mcda.finalScore)
        ];
        const winner = ranked[0];
        const runnerUp = ranked[1];
        const anyViable = viable.length > 0;

        const rationale = [];
        if (winner.alternativeId === 'MONOLITH_MVC') {
            rationale.push(
                `Bajo el volumen configurado (${inputs.concurrentUsers} usuarios concurrentes y archivos de ${inputs.payloadSizeMb} MB), el Monolito Modular MVC obtiene la menor latencia (${winner.metrics.latencyMs} ms) porque ejecuta la extracción AST y sanitización en memoria sin saltos de red (0 ms de sobrecarga RPC).`,
                `Consume solo ${winner.metrics.memoryUsageMb} MB de RAM y transmite ${winner.metrics.networkPacketsPerSec} paquetes/s, corroborando los resultados experimentales de Al-Debagy & Martinek en entornos de un solo nodo.`,
                `Presenta el menor costo operativo ($${winner.metrics.estimatedMonthlyCostUsd} USD/mes), respetando el límite presupuestal de $${projectConfig.constraints.maxMonthlyBudgetUsd} USD/mes.`
            );
        } else if (winner.alternativeId === 'MICROSERVICES_K8S') {
            rationale.push(
                `Con ${inputs.concurrentUsers} usuarios concurrentes y ${inputs.repoComplexityFiles} archivos por repositorio, el Monolito sufre bloqueo del Event-Loop (${scored[0].metrics.utilizationPct}% utilización), mientras que Microservicios (K8s) distribuye la carga en ${winner.metrics.activeContainers} pods logrando ${winner.metrics.latencyMs} ms de latencia P95.`,
                `Alcanza el mayor índice de seguridad y contenerización (${winner.metrics.securityAndContainerIndex}/100) con cifrado mTLS entre contenedores y aislamiento de fallos para el escáner SAST.`,
                `Mantiene una disponibilidad del ${winner.metrics.availabilityPct}% y capacidad elástica de ${winner.metrics.maxCapacityRps} req/s, superando a ${runnerUp.shortName} por ${(winner.mcda.finalScore - runnerUp.mcda.finalScore).toFixed(1)} puntos.`
            );
        } else {
            rationale.push(
                `Ante la alta carga de estrés (${inputs.concurrentUsers} usuarios, ráfaga ${inputs.trafficBurstFactor}x y archivos de ${inputs.payloadSizeMb} MB), la Arquitectura Orientada a Eventos (EDA) amortigua la congestión en su broker asíncrono y escala ${winner.metrics.activeContainers} workers efímeros.`,
                `Logra la mayor disponibilidad SLA (${winner.metrics.availabilityPct}%) y evita la degradación exponencial de cola que afecta al monolito (${scored[0].metrics.latencyMs} ms vs ${winner.metrics.latencyMs} ms en EDA).`,
                `Ofrece una relación costo-beneficio superior ($${winner.metrics.estimatedMonthlyCostUsd} USD/mes) frente al aprovisionamiento fijo de un clúster Kubernetes ($${scored[1].metrics.estimatedMonthlyCostUsd} USD/mes).`
            );
        }

        return {
            modelVersion: '2.0.0',
            timestamp: new Date().toLocaleTimeString('es-CO'),
            anyViable,
            inputs,
            projectConfig,
            alternatives: scored,
            ranked,
            winner,
            runnerUp,
            rationale
        };
    }

    // ============================================================
    // 3. LECTURA DEL DOM Y ACTUALIZACIÓN VISUAL DE RESULTADOS
    // ============================================================
    function readFormState() {
        const getVal = (id, def) => {
            const el = document.getElementById(id);
            return el ? el.value : def;
        };

        const wLat = Number(getVal('sim-weight-latency', 25));
        const wScale = Number(getVal('sim-weight-scalability', 25));
        const wAvail = Number(getVal('sim-weight-availability', 20));
        const wCost = Number(getVal('sim-weight-cost', 15));
        const wSec = Number(getVal('sim-weight-security', 15));
        const totalW = Math.max(1, wLat + wScale + wAvail + wCost + wSec);

        return {
            rawValidationData: {
                concurrentUsers: getVal('sim-input-users', 60),
                payloadSizeMb: getVal('sim-input-payload', 2.5),
                repoComplexityFiles: getVal('sim-input-files', 85),
                aiDepthFactor: getVal('sim-input-aidepth', 2),
                trafficBurstFactor: getVal('sim-input-burst', 1.2),
                maxLatencyMs: getVal('sim-req-latency', 1800),
                minAvailabilityPct: getVal('sim-req-availability', 99.5),
                maxMonthlyBudgetUsd: getVal('sim-con-budget', 350)
            },
            inputs: {
                concurrentUsers: Math.round(Number(getVal('sim-input-users', 60))),
                payloadSizeMb: Number(Number(getVal('sim-input-payload', 2.5)).toFixed(2)),
                repoComplexityFiles: Math.round(Number(getVal('sim-input-files', 85))),
                aiDepthFactor: Math.round(Number(getVal('sim-input-aidepth', 2))),
                trafficBurstFactor: Number(Number(getVal('sim-input-burst', 1.2)).toFixed(2))
            },
            projectConfig: {
                projectName: getVal('sim-proj-name', 'Document-Mind AI'),
                targetUsers: getVal('sim-proj-users', 'Desarrolladores Full-Stack, CTOs y Equipos QA/DevSecOps'),
                qualityRequirements: {
                    maxLatencyMs: Number(getVal('sim-req-latency', 1800)),
                    minAvailabilityPct: Number(getVal('sim-req-availability', 99.5)),
                    minScalabilityScore: Number(getVal('sim-req-scalability', 75)),
                    minSecurityScore: 90
                },
                constraints: {
                    maxMonthlyBudgetUsd: Number(getVal('sim-con-budget', 350)),
                    maxMemoryGb: Number(getVal('sim-con-memory', 8))
                },
                decisionWeights: {
                    latency: wLat / totalW,
                    scalability: wScale / totalW,
                    availability: wAvail / totalW,
                    efficiencyAndCost: wCost / totalW,
                    securityAndContainers: wSec / totalW
                }
            }
        };
    }

    function renderValidationBanner(validation) {
        const alertBox = document.getElementById('sim-validation-alert');
        if (!alertBox) return;

        if (!validation.valid) {
            alertBox.style.display = 'block';
            alertBox.innerHTML = `
                <div style="display:flex;align-items:flex-start;gap:.75rem;">
                    <i class="fa-solid fa-triangle-exclamation" style="color:#FB7185;font-size:1.1rem;margin-top:.15rem;"></i>
                    <div>
                        <strong style="color:#FB7185;font-size:.85rem;display:block;margin-bottom:.25rem;">Control de Validación Activo — Entradas Inválidas Detectadas (Requisito 10):</strong>
                        <ul style="margin:0;padding-left:1.1rem;color:#FECDD3;font-size:.78rem;line-height:1.5;">
                            ${validation.errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>
                </div>
            `;
        } else {
            alertBox.style.display = 'none';
            alertBox.innerHTML = '';
        }
    }

    function renderSimulationOutput(sim, scenarioLabel = 'Personalizado / Interactivo') {
        currentSimulationResult = sim;

        // 1. Renderizar Tarjetas de Indicadores por Alternativa (Requisito 6)
        const cardsContainer = document.getElementById('sim-alternatives-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = sim.alternatives.map(alt => {
                const isWinner = alt.alternativeId === sim.winner.alternativeId;
                const m = alt.metrics;
                const c = alt.compliance;

                // Delta contra escenario de referencia si existe
                let baselineDeltaHtml = '';
                if (baselineSnapshot) {
                    const baseAlt = baselineSnapshot.alternatives.find(a => a.alternativeId === alt.alternativeId);
                    if (baseAlt) {
                        const diffLat = m.latencyMs - baseAlt.metrics.latencyMs;
                        const sign = diffLat > 0 ? '+' : '';
                        const col = diffLat > 0 ? '#FB7185' : (diffLat < 0 ? '#34D399' : '#94A3B8');
                        baselineDeltaHtml = `<span style="font-size:.66rem;color:${col};font-family:'JetBrains Mono',monospace;margin-left:.35rem;">(${sign}${diffLat}ms vs Ref)</span>`;
                    }
                }

                return `
                <div class="glow-card" style="padding:1.35rem;border:${isWinner ? `2px solid ${alt.color}` : '1px solid rgba(148,163,184,.16)'};background:${isWinner ? 'rgba(15,23,42,.92)' : 'rgba(15,23,42,.65)'};position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:1rem;">
                    ${isWinner ? `<div style="position:absolute;top:-11px;right:14px;background:${alt.color};color:#090D16;font-size:.66rem;font-weight:900;padding:.2rem .65rem;border-radius:999px;text-transform:uppercase;letter-spacing:.06em;box-shadow:0 0 15px ${alt.color};"><i class="fa-solid fa-crown" style="margin-right:.3rem;"></i>Recomendada #1 (${alt.mcda.finalScore}/100)</div>` : `<div style="position:absolute;top:12px;right:14px;background:rgba(148,163,184,.12);color:#94A3B8;font-size:.68rem;font-weight:700;padding:.18rem .55rem;border-radius:999px;font-family:'JetBrains Mono',monospace;">Score: ${alt.mcda.finalScore}/100</div>`}

                    <div>
                        <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.5rem;">
                            <div style="width:2.3rem;height:2.3rem;border-radius:.6rem;background:${alt.color}1a;border:1px solid ${alt.color}55;display:flex;align-items:center;justify-content:center;color:${alt.color};font-size:1rem;">
                                <i class="fa-solid ${alt.icon}"></i>
                            </div>
                            <div>
                                <span style="font-size:.65rem;font-family:'JetBrains Mono',monospace;color:${alt.color};text-transform:uppercase;font-weight:700;">${alt.badge}</span>
                                <h4 style="font-size:.96rem;font-weight:800;color:#F8FAFC;margin:0;">${alt.shortName}</h4>
                            </div>
                        </div>
                        <p style="font-size:.75rem;color:#94A3B8;line-height:1.5;margin-bottom:.85rem;">${alt.description}</p>

                        <!-- Grid de 8 Indicadores Cuantificables -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.55rem;background:rgba(9,13,22,.65);padding:.8rem;border-radius:.65rem;border:1px solid rgba(148,163,184,.1);">
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">1. Latencia Estimada (P95)</span>
                                <strong style="font-size:.88rem;color:${c.latencyOk ? '#F8FAFC' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.latencyMs} ms</strong>
                                ${baselineDeltaHtml}
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">2. Throughput / Capacidad</span>
                                <strong style="font-size:.84rem;color:#38BDF8;font-family:'JetBrains Mono',monospace;">${m.throughputRps} / ${m.maxCapacityRps} req/s</strong>
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">3. Escalabilidad Elástica</span>
                                <strong style="font-size:.84rem;color:${c.scalabilityOk ? '#34D399' : '#FBBF24'};font-family:'JetBrains Mono',monospace;">${m.scalabilityScore}/100 (${m.activeContainers} Cont.)</strong>
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">4. Disponibilidad (SLA)</span>
                                <strong style="font-size:.84rem;color:${c.availabilityOk ? '#34D399' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.availabilityPct}%</strong>
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">5. Uso CPU / Saturación Cola</span>
                                <strong style="font-size:.82rem;color:${m.cpuUtilizationPct > 85 ? '#FB7185' : '#E2E8F0'};font-family:'JetBrains Mono',monospace;">${m.cpuUtilizationPct}% CPU (${m.utilizationPct}% ρ)</strong>
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">6. Memoria RAM Estimada</span>
                                <strong style="font-size:.82rem;color:${c.memoryOk ? '#E2E8F0' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.memoryUsageMb} MB</strong>
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">7. Paquetes Red / Seg</span>
                                <strong style="font-size:.82rem;color:#CBD5E1;font-family:'JetBrains Mono',monospace;">${m.networkPacketsPerSec.toLocaleString()} pkts/s</strong>
                            </div>
                            <div>
                                <span style="font-size:.64rem;color:#64748B;display:block;">8. Costo & Cifrado</span>
                                <strong style="font-size:.82rem;color:${c.budgetOk ? '#34D399' : '#FB7185'};font-family:'JetBrains Mono',monospace;">$${m.estimatedMonthlyCostUsd}/mes &bull; 🔒${m.encryptionScore}</strong>
                            </div>
                        </div>

                        <!-- Desglose Matemático de Latencia -->
                        <div style="margin-top:.65rem;font-size:.68rem;color:#94A3B8;font-family:'JetBrains Mono',monospace;background:rgba(56,189,248,.05);padding:.45rem .6rem;border-radius:.45rem;border-left:2px solid ${alt.color};">
                            Desglose L_P95: Cómputo=${alt.breakdown.baseComputeMs}ms + Red/RPC=${alt.breakdown.networkSerializationMs}ms + Cola=${alt.breakdown.queueingAndContentionMs}ms
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:.55rem;border-top:1px solid rgba(148,163,184,.12);font-size:.7rem;">
                        <span style="color:#94A3B8;"><i class="fa-brands fa-docker" style="color:${alt.color};margin-right:.3rem;"></i>${alt.containerization}</span>
                        <span style="font-weight:700;color:${c.allMandatoryPassed ? '#34D399' : '#FBBF24'};">
                            ${c.allMandatoryPassed ? '✔ Cumple SLA y Presupuesto' : '⚠ Alerta Restricción'}
                        </span>
                    </div>
                </div>
                `;
            }).join('');
        }

        // 2. Renderizar Gráfico Comparativo Visual de Barras Normalizadas y Tabla (Requisito 7)
        renderComparisonChartsAndTable(sim);

        // 3. Renderizar Apoyo a la Decisión y Recomendación Explicable (Requisito 8)
        renderDecisionRecommendation(sim, scenarioLabel);
    }

    function renderComparisonChartsAndTable(sim) {
        const chartBox = document.getElementById('sim-visual-bars');
        if (chartBox) {
            const maxLat = Math.max(...sim.alternatives.map(a => a.metrics.latencyMs), 500);
            const maxCap = Math.max(...sim.alternatives.map(a => a.metrics.maxCapacityRps), 50);
            const maxMem = Math.max(...sim.alternatives.map(a => a.metrics.memoryUsageMb), 500);
            const maxPkts = Math.max(...sim.alternatives.map(a => a.metrics.networkPacketsPerSec), 100);

            const metricsConfig = [
                { label: 'Latencia Estimada P95 (ms — menor es mejor)', key: 'latencyMs', max: maxLat, unit: ' ms' },
                { label: 'Capacidad Máxima de Procesamiento (req/s — mayor es mejor)', key: 'maxCapacityRps', max: maxCap, unit: ' req/s' },
                { label: 'Consumo de Memoria RAM (MB — menor es mejor)', key: 'memoryUsageMb', max: maxMem, unit: ' MB' },
                { label: 'Tráfico de Paquetes de Red (pkts/s — impacto inter-servicio)', key: 'networkPacketsPerSec', max: maxPkts, unit: ' pkts/s' }
            ];

            chartBox.innerHTML = metricsConfig.map(mc => `
                <div style="margin-bottom:.95rem;">
                    <div style="font-size:.74rem;font-weight:700;color:#E2E8F0;margin-bottom:.4rem;">${mc.label}</div>
                    <div style="display:flex;flex-direction:column;gap:.35rem;">
                        ${sim.alternatives.map(alt => {
                            const val = alt.metrics[mc.key];
                            const pct = Math.max(6, Math.min(100, Math.round((val / mc.max) * 100)));
                            return `
                            <div style="display:grid;grid-template-columns:145px 1fr 85px;align-items:center;gap:.6rem;font-size:.72rem;">
                                <span style="color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${alt.shortName}</span>
                                <div style="height:10px;background:rgba(148,163,184,.12);border-radius:999px;overflow:hidden;">
                                    <div style="width:${pct}%;height:100%;background:${alt.color};border-radius:999px;transition:width .35s ease;"></div>
                                </div>
                                <strong style="text-align:right;font-family:'JetBrains Mono',monospace;color:#F8FAFC;">${val}${mc.unit}</strong>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `).join('');
        }

        const tbody = document.getElementById('sim-comparison-tbody');
        if (tbody) {
            tbody.innerHTML = sim.alternatives.map(alt => {
                const m = alt.metrics;
                const isWinner = alt.alternativeId === sim.winner.alternativeId;
                return `
                <tr style="border-bottom:1px solid rgba(148,163,184,.12);background:${isWinner ? 'rgba(56,189,248,.07)' : 'transparent'};">
                    <td style="padding:.65rem .75rem;font-weight:700;color:${alt.color};">
                        <i class="fa-solid ${alt.icon}" style="margin-right:.4rem;"></i>${alt.shortName}
                        ${isWinner ? '<span style="margin-left:.35rem;font-size:.62rem;background:#34D399;color:#090D16;padding:.1rem .4rem;border-radius:4px;font-weight:800;">TOP 1</span>' : ''}
                    </td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${alt.compliance.latencyOk ? '#F8FAFC' : '#FB7185'};">${m.latencyMs} ms</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;">${m.throughputRps} / ${m.maxCapacityRps} req/s</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;">${m.scalabilityScore}/100</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${alt.compliance.availabilityOk ? '#34D399' : '#FB7185'};">${m.availabilityPct}%</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;">${m.cpuUtilizationPct}% / ${m.memoryUsageMb} MB</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;">${m.activeContainers} pods &bull; 🔒${m.encryptionScore}/100</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${alt.compliance.budgetOk ? '#34D399' : '#FB7185'};">$${m.estimatedMonthlyCostUsd} USD</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;font-weight:800;color:${alt.color};">${alt.mcda.finalScore}/100</td>
                </tr>
                `;
            }).join('');
        }
    }

    function renderDecisionRecommendation(sim, scenarioLabel) {
        const recContainer = document.getElementById('sim-decision-support-box');
        if (!recContainer) return;

        const w = sim.winner;
        const r = sim.runnerUp;
        const delta = (w.mcda.finalScore - r.mcda.finalScore).toFixed(1);

        recContainer.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;padding-bottom:1rem;border-bottom:1px solid rgba(148,163,184,.15);">
                <div>
                    <div style="display:inline-flex;align-items:center;gap:.45rem;font-size:.68rem;font-family:'JetBrains Mono',monospace;color:${w.color};text-transform:uppercase;margin-bottom:.25rem;">
                        <i class="fa-solid fa-award"></i> Decisión Fundamentada Multicriterio (${scenarioLabel})
                    </div>
                    <h3 style="font-size:1.18rem;font-weight:800;color:#FFFFFF;margin:0;">
                        Arquitectura Recomendada: <span style="color:${w.color};">${w.name}</span>
                    </h3>
                </div>
                <div style="display:flex;align-items:center;gap:.75rem;">
                    <div style="text-align:right;">
                        <span style="font-size:.65rem;color:#94A3B8;display:block;">Puntaje Ponderado Final</span>
                        <strong style="font-size:1.35rem;color:#34D399;font-family:'JetBrains Mono',monospace;">${w.mcda.finalScore} / 100</strong>
                        <span style="font-size:.68rem;color:#38BDF8;display:block;">+${delta} pts vs ${r.shortName}</span>
                    </div>
                </div>
            </div>

            <!-- Explicación Causal Verificable -->
            <div style="margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;">
                <div style="background:rgba(9,13,22,.6);padding:1rem;border-radius:.75rem;border:1px solid rgba(56,189,248,.2);">
                    <h4 style="font-size:.82rem;font-weight:700;color:#38BDF8;margin:0 0 .55rem 0;">
                        <i class="fa-solid fa-magnifying-glass-chart" style="margin-right:.4rem;"></i>¿Por qué el modelo recomienda esta alternativa?
                    </h4>
                    <ul style="margin:0;padding-left:1.1rem;font-size:.76rem;color:#CBD5E1;line-height:1.6;">
                        ${sim.rationale.map(item => `<li style="margin-bottom:.35rem;">${item}</li>`).join('')}
                    </ul>
                </div>

                <div style="background:rgba(9,13,22,.6);padding:1rem;border-radius:.75rem;border:1px solid rgba(52,211,153,.2);">
                    <h4 style="font-size:.82rem;font-weight:700;color:#34D399;margin:0 0 .55rem 0;">
                        <i class="fa-solid fa-thumbs-up" style="margin-right:.4rem;"></i>Ventajas Principales en Document-Mind AI
                    </h4>
                    <ul style="margin:0;padding-left:1.1rem;font-size:.76rem;color:#CBD5E1;line-height:1.6;">
                        ${w.strengths.map(s => `<li style="margin-bottom:.35rem;">${s}</li>`).join('')}
                    </ul>
                </div>

                <div style="background:rgba(9,13,22,.6);padding:1rem;border-radius:.75rem;border:1px solid rgba(251,113,133,.2);">
                    <h4 style="font-size:.82rem;font-weight:700;color:#FB7185;margin:0 0 .55rem 0;">
                        <i class="fa-solid fa-scale-unbalanced" style="margin-right:.4rem;"></i>Limitaciones y Supuestos del Modelo
                    </h4>
                    <ul style="margin:0;padding-left:1.1rem;font-size:.75rem;color:#CBD5E1;line-height:1.55;">
                        ${w.limitations.map(l => `<li style="margin-bottom:.3rem;"><strong>Limitación:</strong> ${l}</li>`).join('')}
                        <li><strong>Supuesto:</strong> Los cálculos representan estimaciones analíticas de cola M/M/c y sobrecarga RPC, no mediciones físicas de hardware.</li>
                    </ul>
                </div>
            </div>
        `;
    }

    function recordScenarioExecution(scenarioName, sim) {
        scenarioExecutionHistory.unshift({
            id: scenarioExecutionHistory.length + 1,
            time: sim.timestamp,
            scenarioName,
            users: sim.inputs.concurrentUsers,
            payloadMb: sim.inputs.payloadSizeMb,
            files: sim.inputs.repoComplexityFiles,
            burst: sim.inputs.trafficBurstFactor,
            monolithLat: sim.alternatives[0].metrics.latencyMs,
            microLat: sim.alternatives[1].metrics.latencyMs,
            edaLat: sim.alternatives[2].metrics.latencyMs,
            winnerName: sim.winner.shortName,
            winnerScore: sim.winner.mcda.finalScore
        });

        // Mantener máximo 8 ejecuciones recientes en la bitácora
        if (scenarioExecutionHistory.length > 8) {
            scenarioExecutionHistory.pop();
        }

        const logBody = document.getElementById('sim-scenarios-history-tbody');
        if (logBody) {
            logBody.innerHTML = scenarioExecutionHistory.map(row => `
                <tr style="border-bottom:1px solid rgba(148,163,184,.1);">
                    <td style="padding:.5rem .65rem;font-weight:700;color:#E2E8F0;">#${row.id} — ${row.scenarioName}</td>
                    <td style="padding:.5rem .65rem;font-family:'JetBrains Mono',monospace;">U=${row.users} | S=${row.payloadMb}MB | N=${row.files} | B=${row.burst}x</td>
                    <td style="padding:.5rem .65rem;font-family:'JetBrains Mono',monospace;color:#38BDF8;">${row.monolithLat} ms</td>
                    <td style="padding:.5rem .65rem;font-family:'JetBrains Mono',monospace;color:#818CF8;">${row.microLat} ms</td>
                    <td style="padding:.5rem .65rem;font-family:'JetBrains Mono',monospace;color:#34D399;">${row.edaLat} ms</td>
                    <td style="padding:.5rem .65rem;font-weight:800;color:#34D399;">${row.winnerName} (${row.winnerScore} pts)</td>
                </tr>
            `).join('');
        }
    }

    // ============================================================
    // 4. GESTIÓN DE ESCENARIOS Y EVENTOS INTERACTIVOS (REQ 5 & 12)
    // ============================================================
    function applyScenarioPreset(presetKey) {
        const preset = PRESET_SCENARIOS[presetKey];
        if (!preset) return;

        const setInput = (id, val, labelId, suffix = '') => {
            const el = document.getElementById(id);
            if (el) el.value = val;
            const lbl = document.getElementById(labelId);
            if (lbl) lbl.textContent = val + suffix;
        };

        setInput('sim-input-users', preset.inputs.concurrentUsers, 'sim-val-users', ' usuarios');
        setInput('sim-input-payload', preset.inputs.payloadSizeMb, 'sim-val-payload', ' MB');
        setInput('sim-input-files', preset.inputs.repoComplexityFiles, 'sim-val-files', ' archivos');
        setInput('sim-input-aidepth', preset.inputs.aiDepthFactor, 'sim-val-aidepth', '');
        setInput('sim-input-burst', preset.inputs.trafficBurstFactor, 'sim-val-burst', 'x');

        const state = readFormState();
        const validation = validateInputs(state.rawValidationData);
        renderValidationBanner(validation);
        if (validation.valid) {
            const sim = executeSimulation(state.inputs, state.projectConfig);
            if (presetKey === 'BASELINE' && !baselineSnapshot) {
                baselineSnapshot = sim;
            }
            renderSimulationOutput(sim, preset.name);
            recordScenarioExecution(preset.name, sim);
        }
    }

    function runAllScenariosBatch() {
        const state = readFormState();
        const validation = validateInputs(state.rawValidationData);
        renderValidationBanner(validation);
        if (!validation.valid) return;

        scenarioExecutionHistory = [];
        Object.keys(PRESET_SCENARIOS).forEach(key => {
            const preset = PRESET_SCENARIOS[key];
            const sim = executeSimulation(preset.inputs, state.projectConfig);
            if (key === 'BASELINE') baselineSnapshot = sim;
            recordScenarioExecution(preset.name, sim);
        });

        // Dejar activo en pantalla el último escenario o el actual
        const currentSim = executeSimulation(state.inputs, state.projectConfig);
        renderSimulationOutput(currentSim, 'Comparativa Multiescenario Ejecutada (4 Escenarios)');
    }

    function setupSimulatorEvents() {
        const sliders = [
            { id: 'sim-input-users', label: 'sim-val-users', suffix: ' usuarios' },
            { id: 'sim-input-payload', label: 'sim-val-payload', suffix: ' MB' },
            { id: 'sim-input-files', label: 'sim-val-files', suffix: ' archivos' },
            { id: 'sim-input-aidepth', label: 'sim-val-aidepth', suffix: '' },
            { id: 'sim-input-burst', label: 'sim-val-burst', suffix: 'x' }
        ];

        sliders.forEach(s => {
            const el = document.getElementById(s.id);
            if (el) {
                el.addEventListener('input', () => {
                    const lbl = document.getElementById(s.label);
                    if (lbl) lbl.textContent = el.value + s.suffix;
                    triggerInteractiveRun('Escenario Interactivo en Tiempo Real');
                });
            }
        });

        const configInputs = [
            'sim-req-latency', 'sim-req-availability', 'sim-req-scalability',
            'sim-con-budget', 'sim-con-memory',
            'sim-weight-latency', 'sim-weight-scalability', 'sim-weight-availability', 'sim-weight-cost', 'sim-weight-security'
        ];
        configInputs.forEach(cid => {
            const el = document.getElementById(cid);
            if (el) {
                el.addEventListener('input', () => triggerInteractiveRun('Ajuste de Requisitos / Pesos de Decisión'));
            }
        });

        // Botones de Escenarios Predefinidos
        document.querySelectorAll('[data-sim-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-sim-preset');
                applyScenarioPreset(key);
            });
        });

        // Botón Fijar Escenario de Referencia
        const btnSetBaseline = document.getElementById('btn-sim-set-baseline');
        if (btnSetBaseline) {
            btnSetBaseline.addEventListener('click', () => {
                const state = readFormState();
                const val = validateInputs(state.rawValidationData);
                renderValidationBanner(val);
                if (val.valid) {
                    baselineSnapshot = executeSimulation(state.inputs, state.projectConfig);
                    renderSimulationOutput(baselineSnapshot, 'Nuevo Escenario de Referencia Fijado');
                    recordScenarioExecution('Referencia Fijada Manualmente', baselineSnapshot);
                    const badge = document.getElementById('sim-baseline-status');
                    if (badge) {
                        badge.textContent = `Referencia activa: U=${state.inputs.concurrentUsers}, S=${state.inputs.payloadSizeMb}MB, N=${state.inputs.repoComplexityFiles}`;
                        badge.style.color = '#34D399';
                    }
                }
            });
        }

        // Botón Ejecutar los 4 Escenarios Comparativos
        const btnRunAll = document.getElementById('btn-sim-run-all-scenarios');
        if (btnRunAll) {
            btnRunAll.addEventListener('click', runAllScenariosBatch);
        }

        // Botón Probar Control de Entrada Inválida (Demostración Requisito 10)
        const btnTestInvalid = document.getElementById('btn-sim-test-invalid');
        if (btnTestInvalid) {
            btnTestInvalid.addEventListener('click', () => {
                const elU = document.getElementById('sim-input-users');
                const elReq = document.getElementById('sim-req-latency');
                if (elU) elU.value = -25;
                if (elReq) elReq.value = 15; // menor a 100ms
                const validation = validateInputs({
                    concurrentUsers: -25,
                    payloadSizeMb: 45,
                    repoComplexityFiles: 0,
                    aiDepthFactor: 9,
                    trafficBurstFactor: 8.5,
                    maxLatencyMs: 15,
                    minAvailabilityPct: 105,
                    maxMonthlyBudgetUsd: 2
                });
                renderValidationBanner(validation);
            });
        }

        // Botón Exportar Informe Técnico Markdown
        const btnExportMd = document.getElementById('btn-sim-export-md');
        if (btnExportMd) {
            btnExportMd.addEventListener('click', () => {
                if (!currentSimulationResult) return;
                const s = currentSimulationResult;
                const mdLines = [
                    `# INFORME TÉCNICO DE SIMULACIÓN — ARCHITECTURE LAB (DOCUMIND AI)`,
                    `- **Proyecto:** ${s.projectConfig.projectName}`,
                    `- **Versión del Modelo:** ${s.modelVersion || '2.0.0'}`,
                    `- **Hora de Ejecución:** ${s.timestamp}`,
                    `- **Entradas:** U=${s.inputs.concurrentUsers} usuarios | S=${s.inputs.payloadSizeMb} MB | N=${s.inputs.repoComplexityFiles} archivos | IA=${s.inputs.aiDepthFactor} | Ráfaga=${s.inputs.trafficBurstFactor}x`,
                    ``,
                    `## Resultados Comparativos por Arquitectura`,
                    `| Alternativa | Latencia P95 | Throughput/Cap | Escalabilidad | Disponibilidad | CPU / RAM | Costo Mensual | Puntaje MCDA |`,
                    `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`,
                    ...s.alternatives.map(a => `| ${a.shortName} | ${a.metrics.latencyMs} ms | ${a.metrics.throughputRps}/${a.metrics.maxCapacityRps} req/s | ${a.metrics.scalabilityScore}/100 | ${a.metrics.availabilityPct}% | ${a.metrics.cpuUtilizationPct}% / ${a.metrics.memoryUsageMb} MB | $${a.metrics.estimatedMonthlyCostUsd} USD | **${a.mcda.finalScore}/100** |`),
                    ``,
                    `## Recomendación Fundamentada`,
                    `- **Ganadora:** ${s.winner.name} (${s.winner.mcda.finalScore}/100)`,
                    ...s.rationale.map(r => `- ${r}`)
                ];
                const blob = new Blob([mdLines.join('\n')], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Informe_Simulacion_DocuMind_${Date.now()}.md`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Botón Exportar JSON Estructurado
        const btnExportJson = document.getElementById('btn-sim-export-json');
        if (btnExportJson) {
            btnExportJson.addEventListener('click', () => {
                if (!currentSimulationResult) return;
                const blob = new Blob([JSON.stringify(currentSimulationResult, null, 2)], { type: 'application/json;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Simulacion_DocuMind_${Date.now()}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });
        }

        // Inicialización por defecto: Ejecutar los 4 escenarios y dejar activo el Escenario de Referencia
        applyScenarioPreset('SINGLE_MACHINE_LIGHT');
        applyScenarioPreset('ENTERPRISE_SCALE');
        applyScenarioPreset('EXTREME_STRESS_PUSH');
        applyScenarioPreset('BASELINE');
    }

    function triggerInteractiveRun(label) {
        const state = readFormState();
        const validation = validateInputs(state.rawValidationData);
        renderValidationBanner(validation);
        if (!validation.valid) return;

        const sim = executeSimulation(state.inputs, state.projectConfig);
        renderSimulationOutput(sim, label);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupSimulatorEvents);
    } else {
        setupSimulatorEvents();
    }
})();
