/**
 * DOCUMENT-MIND AI — MOTOR INTERACTIVO DEL SIMULADOR DE ARQUITECTURA + LABORATORIO 3D (ACTIVIDAD 9)
 * Universidad Libre — Facultad de Ingeniería — Curso: Ingeniería Aplicada (2026-2)
 * Autores: Daniel Santiago Palencia Sandoval & Nelson Andrés Ayala Álvarez
 *
 * Funciona de manera 100% determinista, reactiva y verificable tanto en cliente (GitHub Pages / Standalone)
 * como sincronizado con los endpoints REST `/api/simulator/run` y `/api/simulator/scenarios`.
 * Incluye Motor Gráfico 3D WebGL (Three.js) + Superficie 3D M/M/c + Prisma Radar 3D Multicriterio.
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
            hex: 0x38BDF8,
            icon: 'fa-cube',
            architectureType: 'Monolítica en una sola instancia (In-Memory Calls)',
            containerization: 'Baja (1-2 Contenedores / Host Único)',
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
            hex: 0x818CF8,
            icon: 'fa-cubes',
            architectureType: 'Microservicios Desacoplados con API Gateway & REST/gRPC',
            containerization: 'Alta (Hasta 10 Pods Auto-escalables con HPA en Kubernetes)',
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
                baseProcessingFactor: 0.62,
                networkHops: 4,
                hopLatencyMs: 6.5,
                baseCapacityPerNodeRps: 42,
                maxAutoScaleNodes: 10,
                baseMemoryMb: 720,
                memoryPerUserMb: 2.35,
                baseCpuCores: 1.15,
                packetsPerRequest: 18,
                baseAvailabilityPct: 99.88,
                fixedMonthlyCostUsd: 115,
                variableCostPer1kReqsUsd: 0.055,
                containerScore: 96
            }
        },
        EDA_SERVERLESS: {
            id: 'EDA_SERVERLESS',
            name: 'Alternativa 3: Arquitectura Orientada a Eventos + Workers Asíncronos (EDA)',
            shortName: 'Orientada a Eventos (EDA)',
            badge: 'Resiliencia ante Picos',
            color: '#34D399',
            hex: 0x34D399,
            icon: 'fa-bolt',
            architectureType: 'Event-Driven Architecture (Broker Pub/Sub + Serverless Workers)',
            containerization: 'Elástica Serverless (Hasta 18+ Contenedores Efímeros + Cola Redis/Kafka)',
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
                maxAutoScaleNodes: 20,
                baseMemoryMb: 380,
                memoryPerUserMb: 1.35,
                baseCpuCores: 0.70,
                packetsPerRequest: 26,
                baseAvailabilityPct: 99.95,
                fixedMonthlyCostUsd: 55,
                variableCostPer1kReqsUsd: 0.042,
                containerScore: 90
            }
        }
    };

    const PRESET_SCENARIOS = {
        BASELINE: {
            id: 'BASELINE',
            name: '0. Referencia Base (60 u)',
            badge: 'Referencia Base',
            description: 'Carga nominal del proyecto en demostraciones académicas y uso diario por equipos de desarrollo pequeños (60 usuarios, archivos de 2.5 MB, 85 archivos por repo). Las 3 arquitecturas cumplen todos los requisitos.',
            inputs: { concurrentUsers: 60, payloadSizeMb: 2.5, repoComplexityFiles: 85, aiDepthFactor: 2, trafficBurstFactor: 1.2 }
        },
        SINGLE_MACHINE_LIGHT: {
            id: 'SINGLE_MACHINE_LIGHT',
            name: '1. Baja Carga / 1 Nodo (18 u)',
            badge: 'Escenario 1 (1 Nodo)',
            description: 'Valida empíricamente la literatura (Al-Debagy & Martinek): en un entorno acotado con carga ligera (18 usuarios, 1 MB), el Monolito MVC gana al evitar saltos de red RPC.',
            inputs: { concurrentUsers: 18, payloadSizeMb: 1.0, repoComplexityFiles: 35, aiDepthFactor: 1, trafficBurstFactor: 1.0 }
        },
        ENTERPRISE_SCALE: {
            id: 'ENTERPRISE_SCALE',
            name: '2. Escala Empresarial B2B (320 u)',
            badge: 'Escenario 2 (320 Usuarios)',
            description: '320 usuarios corporativos analizando repositorios de 240 archivos (6 MB). El Monolito se satura, mientras Microservicios K8s (#1) y EDA Serverless cumplen todas las restricciones.',
            inputs: { concurrentUsers: 320, payloadSizeMb: 6.0, repoComplexityFiles: 240, aiDepthFactor: 2, trafficBurstFactor: 1.6 }
        },
        EXTREME_STRESS_PUSH: {
            id: 'EXTREME_STRESS_PUSH',
            name: '3. Estrés JMeter (650 u / 11MB)',
            badge: 'Escenario 3 (JMeter Stress)',
            description: 'Simulación de estrés severo: 650 usuarios concurrentes, ráfaga de 2.2x y repositorios de 340 archivos. EDA Serverless absorbe el pico en ~747 ms cumpliendo el 100% de las restricciones.',
            inputs: { concurrentUsers: 650, payloadSizeMb: 11.0, repoComplexityFiles: 340, aiDepthFactor: 3, trafficBurstFactor: 2.2 }
        },
        HYPER_CLOUD_SCALE: {
            id: 'HYPER_CLOUD_SCALE',
            name: '4. Hiper-Escala Cloud (850 u / 14MB)',
            badge: 'Escenario 4 (850 Usuarios)',
            description: 'Carga masiva extrema de 850 usuarios concurrentes, 14 MB, 420 archivos y ráfaga de 2.5x: demuestra cómo EDA Serverless (~854 ms) sigue cumpliendo todos los SLAs sin colapsar.',
            inputs: { concurrentUsers: 850, payloadSizeMb: 14.0, repoComplexityFiles: 420, aiDepthFactor: 3, trafficBurstFactor: 2.5 }
        }
    };

    const CONFIG_PRESETS = {
        STANDARD: {
            label: 'Configuración Estándar Cohorte ($350 / 1800ms / 8GB)',
            projName: 'Document-Mind AI — Plataforma Cognitiva AST + LLM + DevSecOps',
            projUsers: 'Desarrolladores, Arquitectos de Software, Tech Leads (CTOs) y Auditores QA',
            maxLatencyMs: 1800,
            minAvailabilityPct: 99.5,
            minScalabilityScore: 75,
            maxMonthlyBudgetUsd: 350,
            maxMemoryGb: 8,
            weights: { latency: 25, scalability: 25, availability: 20, cost: 15, security: 15 }
        },
        BOOTSTRAPPED: {
            label: 'Restricción Startup Bootstrapped ($45 USD/mes / 1GB RAM)',
            projName: 'Document-Mind AI — Despliegue MVP Bootstrapped (Bajo Presupuesto)',
            projUsers: 'Equipos Semilla, Startups Early-Stage y Semilleros de Investigación',
            maxLatencyMs: 2200,
            minAvailabilityPct: 99.0,
            minScalabilityScore: 65,
            maxMonthlyBudgetUsd: 45,
            maxMemoryGb: 1.0,
            weights: { latency: 15, scalability: 15, availability: 15, cost: 45, security: 10 }
        },
        FINTECH_STRICT: {
            label: 'Misión Crítica Bancaria / FinTech (SLA 99.85% / Latencia ≤ 780ms)',
            projName: 'Document-Mind AI — Edición Auditoría Bancaria Zero-Trust',
            projUsers: 'Equipos DevSecOps Financieros, Banca Digital y Oficiales CISO (24/7)',
            maxLatencyMs: 780,
            minAvailabilityPct: 99.85,
            minScalabilityScore: 85,
            maxMonthlyBudgetUsd: 650,
            maxMemoryGb: 16,
            weights: { latency: 35, scalability: 20, availability: 25, cost: 5, security: 15 }
        },
        CLOUD_SCALE: {
            label: 'Alta Elasticidad Cloud-Native (Escalabilidad ≥ 88 / $900 USD)',
            projName: 'Document-Mind AI — Clúster Multi-Tenant SaaS Global',
            projUsers: 'Organizaciones Enterprise con CI/CD Masivo y Múltiples Orgs de GitHub',
            maxLatencyMs: 1650,
            minAvailabilityPct: 99.8,
            minScalabilityScore: 88,
            maxMonthlyBudgetUsd: 900,
            maxMemoryGb: 32,
            weights: { latency: 20, scalability: 40, availability: 20, cost: 5, security: 15 }
        }
    };

    // Estado reactivo de la simulación en el cliente
    let baselineSnapshot = null;
    let currentSimulationResult = null;
    let activePresetKey = 'BASELINE';
    let liveSweepInterval = null;

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
        const minScale = Number(raw.minScalabilityScore ?? 75);
        const maxBudget = Number(raw.maxMonthlyBudgetUsd);
        const maxMemGb = Number(raw.maxMemoryGb ?? 8);

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
        if (!Number.isFinite(minScale) || minScale < 10 || minScale > 100) {
            errors.push('Requisito de Escalabilidad Mínima inválido [10 - 100].');
        }
        if (!Number.isFinite(maxBudget) || maxBudget < 10 || maxBudget > 50000) {
            errors.push('Restricción de Presupuesto Mensual inválida [$10 - $50,000 USD].');
        }
        if (!Number.isFinite(maxMemGb) || maxMemGb < 0.25 || maxMemGb > 512) {
            errors.push('Restricción de Memoria RAM Total inválida [0.25 - 512 GB].');
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
        const reqs = projectConfig.qualityRequirements;
        const cons = projectConfig.constraints;

        const arrivalRateRps = (concurrentUsers / 12.0) * trafficBurstFactor;

        const parallelChunkDivisor = altKey === 'EDA_SERVERLESS'
            ? (concurrentUsers > 100 ? 1.55 : 1.15)
            : (altKey === 'MICROSERVICES_K8S' ? (concurrentUsers > 100 ? 1.52 : 1.15) : 1.0);
        const astComplexityMs = (repoComplexityFiles * 1.45) / parallelChunkDivisor;
        const payloadParsingMs = (payloadSizeMb * 26.0) / parallelChunkDivisor;
        const aiSynthesisMs = (aiDepthFactor === 1 ? 35 : (aiDepthFactor === 2 ? 190 : 410)) / (altKey === 'EDA_SERVERLESS' && concurrentUsers > 400 ? 1.32 : 1.0);
        const rawWorkMs = (45 + astComplexityMs + payloadParsingMs + aiSynthesisMs) * p.baseProcessingFactor;

        const serializationPenaltyMs = p.networkHops > 0
            ? p.networkHops * (p.hopLatencyMs + (payloadSizeMb * (altKey === 'EDA_SERVERLESS' ? 1.8 : 2.5)) + (repoComplexityFiles * 0.03))
            : 0;

        const weightPenaltyDivisor = altKey === 'EDA_SERVERLESS'
            ? 1 + (payloadSizeMb * 0.045) + (repoComplexityFiles / 650) + (aiDepthFactor * 0.10)
            : 1 + (payloadSizeMb * 0.085) + (repoComplexityFiles / 350) + (aiDepthFactor * 0.18);
        const effectiveNodeCapacityRps = Math.max(2.5, p.baseCapacityPerNodeRps / weightPenaltyDivisor);

        // Si el proyecto cuenta con presupuesto e infraestructura Cloud empresarial (>= $600 USD y >= 12 GB RAM), el clúster HPA amplía su techo de réplicas
        const clusterExpansionBonus = (cons.maxMonthlyBudgetUsd >= 600 && (cons.maxMemoryGb || 8) >= 12)
            ? (altKey === 'MICROSERVICES_K8S' ? 12 : (altKey === 'EDA_SERVERLESS' ? 8 : 0))
            : 0;
        const effectiveMaxNodes = p.maxAutoScaleNodes + clusterExpansionBonus;

        const requiredNodes = Math.ceil(arrivalRateRps / (effectiveNodeCapacityRps * 0.72));
        const activeNodes = Math.min(effectiveMaxNodes, Math.max(1, requiredNodes));
        const maxSystemCapacityRps = Number((effectiveNodeCapacityRps * activeNodes).toFixed(2));

        const rawUtilization = arrivalRateRps / maxSystemCapacityRps;
        const effectiveUtilization = altKey === 'EDA_SERVERLESS' ? rawUtilization * 0.78 : rawUtilization;

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
            ? (28 + (concurrentUsers < 35 ? 32 : (trafficBurstFactor < 2.0 ? Math.round(payloadSizeMb * 26) : 10)))
            : 0;

        const maxAllowedMemMb = Math.max(256, (cons.maxMemoryGb || 8) * 1024);
        const memoryUsageMb = Math.round(
            p.baseMemoryMb +
            (activeNodes - 1) * (p.baseMemoryMb * 0.42) +
            (concurrentUsers * p.memoryPerUserMb * (1 + payloadSizeMb * 0.06))
        );

        // Penalización física por contención de RAM / Swap si se aproxima o supera la restricción de RAM de la Sección 1
        const memPressureRatio = memoryUsageMb > (maxAllowedMemMb * 0.65)
            ? (memoryUsageMb - (maxAllowedMemMb * 0.65)) / Math.max(256, maxAllowedMemMb * 0.35)
            : 0;
        const memoryPressureMs = Math.round(memPressureRatio * 185 * (altKey === 'MONOLITH_MVC' ? 1.35 : 1.0));

        const estimatedLatencyMs = Math.round(rawWorkMs + serializationPenaltyMs + queueingDelayMs + brokerDispatchOverheadMs + memoryPressureMs);

        const dropRate = effectiveUtilization > 1.05
            ? Math.min(0.65, (effectiveUtilization - 1.05) * (altKey === 'EDA_SERVERLESS' ? 0.22 : 0.55))
            : 0;
        const effectiveThroughputRps = Number((arrivalRateRps * (1 - dropRate)).toFixed(2));

        const cpuCoresUsed = p.baseCpuCores * activeNodes + (arrivalRateRps * (rawWorkMs / 1000) * (altKey === 'MONOLITH_MVC' ? 0.28 : 0.36));
        const totalAllocatedCores = activeNodes * (altKey === 'MONOLITH_MVC' ? 2.0 : 1.5);
        const cpuUtilizationPct = Number(Math.min(99.9, Math.max(8.0, (cpuCoresUsed / totalAllocatedCores) * 100)).toFixed(1));

        const networkPacketsPerSec = Math.round(arrivalRateRps * p.packetsPerRequest * (1 + (payloadSizeMb * 0.35)));

        let availabilityPenalty = 0;
        if (effectiveUtilization > 0.70) {
            availabilityPenalty += Math.pow(effectiveUtilization - 0.70, 1.5) * (altKey === 'MONOLITH_MVC' ? 4.8 : (altKey === 'MICROSERVICES_K8S' ? 1.2 : 0.5));
        }
        if (memoryUsageMb > maxAllowedMemMb * 0.85) {
            availabilityPenalty += 1.25 * Math.min(3.0, memoryUsageMb / maxAllowedMemMb);
        }
        const availabilityPct = Number(Math.max(85.0, Math.min(99.99, p.baseAvailabilityPct - availabilityPenalty)).toFixed(2));

        const headroomRatio = Math.max(0, (maxSystemCapacityRps - arrivalRateRps) / Math.max(1, maxSystemCapacityRps));
        const scaleElasticity = altKey === 'MONOLITH_MVC'
            ? (effectiveUtilization < 0.45 ? 24 : 12)
            : (altKey === 'MICROSERVICES_K8S'
                ? (trafficBurstFactor < 2.0 ? 44 : (effectiveMaxNodes / 16) * 40)
                : (effectiveMaxNodes / 16) * 44);
        const nonBlockingBonus = altKey === 'EDA_SERVERLESS' ? 26 : (altKey === 'MICROSERVICES_K8S' ? 24 : 18);
        const saturationPenalty = effectiveUtilization > 0.80 ? Math.min(55, (effectiveUtilization - 0.80) * 65) : 0;
        const memScalePenalty = memPressureRatio > 0 ? Math.min(20, Math.round(memPressureRatio * 12)) : 0;
        const scalabilityScore = Math.round(Math.max(15, Math.min(100, 22 + scaleElasticity + nonBlockingBonus + (headroomRatio * 22) - saturationPenalty - memScalePenalty)));

        const projectedMonthlyRequestsThousands = arrivalRateRps * 11.0;
        const nodeScalingCost = (activeNodes - 1) * (altKey === 'MONOLITH_MVC' ? 22 : (altKey === 'MICROSERVICES_K8S' ? 24 : 9));
        const estimatedMonthlyCostUsd = Math.round(
            p.fixedMonthlyCostUsd +
            nodeScalingCost +
            (projectedMonthlyRequestsThousands * p.variableCostPer1kReqsUsd * (1 + payloadSizeMb * 0.04))
        );

        const securityAndContainerIndex = Math.round((alt.encryptionScore * 0.55) + (p.containerScore * 0.45));

        const latencySlaPct = Number(((estimatedLatencyMs / Math.max(100, reqs.maxLatencyMs)) * 100).toFixed(1));
        const budgetUsagePct = Number(((estimatedMonthlyCostUsd / Math.max(10, cons.maxMonthlyBudgetUsd)) * 100).toFixed(1));
        const memoryEnvelopePct = Number(((memoryUsageMb / maxAllowedMemMb) * 100).toFixed(1));

        const compliance = {
            latencyOk: estimatedLatencyMs <= reqs.maxLatencyMs,
            availabilityOk: availabilityPct >= reqs.minAvailabilityPct,
            scalabilityOk: scalabilityScore >= reqs.minScalabilityScore,
            securityOk: alt.encryptionScore >= 90,
            budgetOk: estimatedMonthlyCostUsd <= cons.maxMonthlyBudgetUsd,
            memoryOk: memoryUsageMb <= maxAllowedMemMb
        };
        const passedChecksCount = Object.values(compliance).filter(Boolean).length;

        return {
            alternativeId: alt.id,
            name: alt.name,
            shortName: alt.shortName,
            badge: alt.badge,
            color: alt.color,
            hex: alt.hex,
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
                estimatedMonthlyCostUsd,
                latencySlaPct,
                budgetUsagePct,
                memoryEnvelopePct
            },
            breakdown: {
                arrivalRateRps: Number(arrivalRateRps.toFixed(2)),
                baseComputeMs: Math.round(rawWorkMs),
                networkSerializationMs: Math.round(serializationPenaltyMs),
                queueingAndContentionMs: Math.round(queueingDelayMs + brokerDispatchOverheadMs + memoryPressureMs),
                memoryPressureMs
            },
            compliance: {
                ...compliance,
                passedChecksCount,
                totalChecksCount: 6,
                allMandatoryPassed: compliance.latencyOk && compliance.availabilityOk && compliance.scalabilityOk && compliance.budgetOk && compliance.memoryOk
            }
        };
    }

    function executeSimulation(inputs, projectConfig) {
        const results = Object.keys(ARCHITECTURE_ALTERNATIVES).map(k => calculateAlternative(k, inputs, projectConfig));

        const minLatency = Math.min(...results.map(r => r.metrics.latencyMs));
        const minCost = Math.min(...results.map(r => r.metrics.estimatedMonthlyCostUsd));
        const minMem = Math.min(...results.map(r => r.metrics.memoryUsageMb));
        const weights = projectConfig.decisionWeights;
        const reqs = projectConfig.qualityRequirements;
        const cons = projectConfig.constraints;

        const scored = results.map(r => {
            // 1. Latencia sensible a SLA de Sección 1
            const relLatScore = (minLatency / Math.max(1, r.metrics.latencyMs)) * 100;
            const slaLatHeadroom = Math.max(0, Math.min(100, (1 - (r.metrics.latencyMs / Math.max(100, reqs.maxLatencyMs * 1.55))) * 112));
            const latencyScore = Math.max(8, Math.min(100, (relLatScore * 0.68) + (slaLatHeadroom * 0.32)));

            // 2. Escalabilidad sensible al mínimo de Sección 1
            const scaleTargetDelta = (r.metrics.scalabilityScore - (reqs.minScalabilityScore || 75)) * 0.42;
            const scalabilityScore = Math.max(10, Math.min(100, r.metrics.scalabilityScore + Math.max(-16, Math.min(12, scaleTargetDelta))));

            // 3. Disponibilidad sensible al piso SLA de Sección 1
            const slaFloor = Math.max(80, Math.min(99.85, (reqs.minAvailabilityPct || 99.5) - 1.4));
            const availSpan = Math.max(0.15, 100 - slaFloor);
            const availabilityScore = Math.max(0, Math.min(100, ((r.metrics.availabilityPct - slaFloor) / availSpan) * 100));

            // 4. Costo y Memoria sensibles al Presupuesto y RAM máxima de Sección 1
            const relCostScore = (minCost / Math.max(1, r.metrics.estimatedMonthlyCostUsd)) * 100;
            const budgetHeadroom = Math.max(0, Math.min(100, (1 - (r.metrics.estimatedMonthlyCostUsd / Math.max(15, cons.maxMonthlyBudgetUsd * 1.35))) * 108));
            const costScore = (relCostScore * 0.65) + (budgetHeadroom * 0.35);

            const relMemScore = (minMem / Math.max(1, r.metrics.memoryUsageMb)) * 100;
            const maxMemMb = Math.max(256, (cons.maxMemoryGb || 8) * 1024);
            const memHeadroom = Math.max(0, Math.min(100, (1 - (r.metrics.memoryUsageMb / (maxMemMb * 1.25))) * 106));
            const memEfficiencyScore = (relMemScore * 0.62) + (memHeadroom * 0.38);

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
            if (!r.compliance.scalabilityOk) constraintPenalty += 10;
            if (!r.compliance.memoryOk) constraintPenalty += 12;

            const finalScore = Number(Math.max(5, Math.min(100, weightedScore - constraintPenalty)).toFixed(1));

            return {
                ...r,
                mcda: {
                    latencyScore: Math.round(latencyScore),
                    scalabilityScore: Math.round(scalabilityScore),
                    availabilityScore: Math.round(availabilityScore),
                    efficiencyAndCostScore: Math.round(efficiencyAndCostScore),
                    securityAndContainersScore: Math.round(securityAndContainersScore),
                    weightedRawScore: Number(weightedScore.toFixed(1)),
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
                `Para el sistema "${projectConfig.projectName}" (${inputs.concurrentUsers} usuarios concurrentes y archivos de ${inputs.payloadSizeMb} MB), el Monolito Modular MVC obtiene la menor latencia (${winner.metrics.latencyMs} ms ≤ SLA ${reqs.maxLatencyMs} ms) al ejecutar AST y sanitización en memoria sin saltos RPC (0 ms red interna).`,
                `Utiliza ${winner.metrics.memoryUsageMb} MB de los ${Math.round(cons.maxMemoryGb * 1024)} MB de RAM disponibles (${winner.metrics.memoryEnvelopePct}%) y transmite ${winner.metrics.networkPacketsPerSec} pkts/s, validando a Al-Debagy & Martinek en despliegues de un nodo.`,
                `Presenta el menor costo operativo ($${winner.metrics.estimatedMonthlyCostUsd} USD/mes = ${winner.metrics.budgetUsagePct}% del presupuesto máximo de $${cons.maxMonthlyBudgetUsd} USD/mes).`
            );
        } else if (winner.alternativeId === 'MICROSERVICES_K8S') {
            rationale.push(
                `Bajo las restricciones de "${projectConfig.projectName}" (${inputs.concurrentUsers} usuarios, ${inputs.repoComplexityFiles} archivos AST, SLA Latencia ≤ ${reqs.maxLatencyMs} ms, Escalabilidad ≥ ${reqs.minScalabilityScore}), Microservicios (K8s) escala a ${winner.metrics.activeContainers} pods logrando ${winner.metrics.latencyMs} ms.`,
                `Cumple el SLA de disponibilidad (${winner.metrics.availabilityPct}% ≥ ${reqs.minAvailabilityPct}%) y alcanza el máximo índice de seguridad mTLS y contenedores (${winner.metrics.securityAndContainerIndex}/100).`,
                `Opera dentro del presupuesto de $${cons.maxMonthlyBudgetUsd} USD ($${winner.metrics.estimatedMonthlyCostUsd} USD/mes = ${winner.metrics.budgetUsagePct}%) y supera a ${runnerUp.shortName} por ${(winner.mcda.finalScore - runnerUp.mcda.finalScore).toFixed(1)} pts.`
            );
        } else {
            rationale.push(
                `Ante la carga y restricciones configuradas para "${projectConfig.projectName}" (${inputs.concurrentUsers} usuarios, ráfaga ${inputs.trafficBurstFactor}x, archivos de ${inputs.payloadSizeMb} MB), la Arquitectura Orientada a Eventos (EDA) amortigua la congestión en su broker asíncrono con ${winner.metrics.activeContainers} workers efímeros.`,
                `Garantiza la máxima disponibilidad SLA (${winner.metrics.availabilityPct}% vs mínimo exigido de ${reqs.minAvailabilityPct}%) y mantiene la latencia en ${winner.metrics.latencyMs} ms (límite SLA: ${reqs.maxLatencyMs} ms).`,
                `Optimiza el presupuesto Cloud ($${winner.metrics.estimatedMonthlyCostUsd} / $${cons.maxMonthlyBudgetUsd} USD = ${winner.metrics.budgetUsagePct}%) y consume ${winner.metrics.memoryUsageMb} MB RAM (${winner.metrics.memoryEnvelopePct}% del límite de ${cons.maxMemoryGb} GB).`
            );
        }

        return {
            modelVersion: '3.0.0',
            timestamp: new Date().toLocaleTimeString('es-CO'),
            anyViable,
            viableCount: viable.length,
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
    // 3. LECTURA DEL DOM, SANITIZACIÓN Y VALIDACIÓN REACTIVA
    // ============================================================
    let isInvalidDemoActive = false;

    function resetTestInvalidButtonLabel() {
        const btn = document.getElementById('btn-sim-test-invalid');
        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-shield-virus" style="margin-right:.35rem;color:#FB7185;"></i>Probar Entrada Inválida';
            btn.style.background = '';
        }
    }

    function sanitizeOutOfBoundsDomFields(skipFieldId = null) {
        const clampField = (id, rangeId, min, max, fallback, labelId = null, suffix = '') => {
            if (id === skipFieldId) return;
            const el = document.getElementById(id);
            if (!el) return;
            const val = Number(el.value);
            if (!Number.isFinite(val) || val < min || val > max) {
                el.value = fallback;
                if (rangeId) {
                    const rEl = document.getElementById(rangeId);
                    if (rEl) rEl.value = fallback;
                }
                if (labelId) {
                    const lEl = document.getElementById(labelId);
                    if (lEl) lEl.textContent = fallback + suffix;
                }
            }
        };

        clampField('sim-req-latency', 'sim-range-req-latency', 100, 15000, 1800);
        clampField('sim-req-availability', 'sim-range-req-availability', 80, 99.999, 99.5);
        clampField('sim-req-scalability', 'sim-range-req-scalability', 10, 100, 75);
        clampField('sim-con-budget', 'sim-range-con-budget', 15, 25000, 350);
        clampField('sim-con-memory', 'sim-range-con-memory', 0.5, 128, 8);

        clampField('sim-input-users', null, 1, 5000, 60, 'sim-val-users', ' usuarios');
        clampField('sim-input-payload', null, 0.1, 20, 2.5, 'sim-val-payload', ' MB');
        clampField('sim-input-files', null, 1, 2000, 85, 'sim-val-files', ' archivos');
        clampField('sim-input-aidepth', null, 1, 5, 2, 'sim-val-aidepth', '');
        clampField('sim-input-burst', null, 1.0, 4.0, 1.2, 'sim-val-burst', 'x');
    }

    function clearInvalidDemoState(skipFieldId = null) {
        if (isInvalidDemoActive) {
            isInvalidDemoActive = false;
            resetTestInvalidButtonLabel();
            sanitizeOutOfBoundsDomFields(skipFieldId);
        }
    }

    function readFormState() {
        const getVal = (id, def) => {
            const el = document.getElementById(id);
            return el ? el.value : def;
        };

        const wLat = Math.max(0, Number(getVal('sim-weight-latency', 25)));
        const wScale = Math.max(0, Number(getVal('sim-weight-scalability', 25)));
        const wAvail = Math.max(0, Number(getVal('sim-weight-availability', 20)));
        const wCost = Math.max(0, Number(getVal('sim-weight-cost', 15)));
        const wSec = Math.max(0, Number(getVal('sim-weight-security', 15)));
        const totalW = Math.max(1, wLat + wScale + wAvail + wCost + wSec);

        // Actualizar barra visual de pesos en Sección 1
        const wSumLbl = document.getElementById('sim-weights-sum-label');
        if (wSumLbl) {
            const rawSum = Math.round(wLat + wScale + wAvail + wCost + wSec);
            wSumLbl.textContent = `Suma: ${rawSum}% → Normalizado a 100%`;
            wSumLbl.style.color = rawSum === 100 ? '#34D399' : '#38BDF8';
        }
        const wBar = document.getElementById('sim-weights-visual-bar');
        if (wBar && wBar.children.length === 5) {
            wBar.children[0].style.width = `${((wLat / totalW) * 100).toFixed(1)}%`;
            wBar.children[1].style.width = `${((wScale / totalW) * 100).toFixed(1)}%`;
            wBar.children[2].style.width = `${((wAvail / totalW) * 100).toFixed(1)}%`;
            wBar.children[3].style.width = `${((wCost / totalW) * 100).toFixed(1)}%`;
            wBar.children[4].style.width = `${((wSec / totalW) * 100).toFixed(1)}%`;
        }

        const memGb = Number(getVal('sim-con-memory', 8));
        const memLbl = document.getElementById('sim-lbl-con-memory');
        if (memLbl && Number.isFinite(memGb)) {
            memLbl.textContent = `${Math.round(memGb * 1024).toLocaleString()} MB`;
        }

        return {
            rawValidationData: {
                concurrentUsers: getVal('sim-input-users', 60),
                payloadSizeMb: getVal('sim-input-payload', 2.5),
                repoComplexityFiles: getVal('sim-input-files', 85),
                aiDepthFactor: getVal('sim-input-aidepth', 2),
                trafficBurstFactor: getVal('sim-input-burst', 1.2),
                maxLatencyMs: getVal('sim-req-latency', 1800),
                minAvailabilityPct: getVal('sim-req-availability', 99.5),
                minScalabilityScore: getVal('sim-req-scalability', 75),
                maxMonthlyBudgetUsd: getVal('sim-con-budget', 350),
                maxMemoryGb: getVal('sim-con-memory', 8)
            },
            inputs: {
                concurrentUsers: Math.round(Number(getVal('sim-input-users', 60))),
                payloadSizeMb: Number(Number(getVal('sim-input-payload', 2.5)).toFixed(2)),
                repoComplexityFiles: Math.round(Number(getVal('sim-input-files', 85))),
                aiDepthFactor: Math.round(Number(getVal('sim-input-aidepth', 2))),
                trafficBurstFactor: Number(Number(getVal('sim-input-burst', 1.2)).toFixed(2))
            },
            projectConfig: {
                projectName: (getVal('sim-proj-name', 'Document-Mind AI') || 'Document-Mind AI').trim(),
                targetUsers: (getVal('sim-proj-users', 'Desarrolladores Full-Stack, CTOs y Equipos QA') || 'Desarrolladores y Equipos QA').trim(),
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
        const liveBadge = document.getElementById('sim-config-live-badge');
        if (!alertBox) return;

        if (!validation.valid) {
            alertBox.style.display = 'block';
            alertBox.innerHTML = `
                <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;flex-wrap:wrap;">
                    <div style="display:flex;align-items:flex-start;gap:.75rem;">
                        <i class="fa-solid fa-triangle-exclamation" style="color:#FB7185;font-size:1.1rem;margin-top:.15rem;"></i>
                        <div>
                            <strong style="color:#FB7185;font-size:.85rem;display:block;margin-bottom:.25rem;">Control de Validación Activo — Entradas Inválidas Detectadas (Requisito 10):</strong>
                            <ul style="margin:0;padding-left:1.1rem;color:#FECDD3;font-size:.78rem;line-height:1.5;">
                                ${validation.errors.map(e => `<li>${e}</li>`).join('')}
                            </ul>
                        </div>
                    </div>
                    <button type="button" id="btn-sim-restore-valid" class="btn-cyber" style="padding:.45rem .85rem;font-size:.73rem;flex-shrink:0;">
                        <i class="fa-solid fa-rotate-left" style="margin-right:.35rem;"></i>Restaurar Valores Válidos
                    </button>
                </div>
            `;
            if (liveBadge) {
                liveBadge.textContent = '⚠ Alerta Validación';
                liveBadge.style.color = '#FB7185';
                liveBadge.style.borderColor = 'rgba(251,113,133,.5)';
            }
            const btnRestore = document.getElementById('btn-sim-restore-valid');
            if (btnRestore) {
                btnRestore.addEventListener('click', () => {
                    isInvalidDemoActive = false;
                    resetTestInvalidButtonLabel();
                    sanitizeOutOfBoundsDomFields();
                    applyConfigPreset('STANDARD', true);
                    applyScenarioPreset('BASELINE', true);
                    showSimFeedback('Datos válidos restaurados correctamente. Simulación y gráficas 3D activas.');
                });
            }
        } else {
            alertBox.style.display = 'none';
            alertBox.innerHTML = '';
            isInvalidDemoActive = false;
            resetTestInvalidButtonLabel();
            if (liveBadge) {
                liveBadge.textContent = '● Sincronizado en Vivo';
                liveBadge.style.color = '#34D399';
                liveBadge.style.borderColor = 'rgba(52,211,153,.35)';
            }
        }
    }

    // ============================================================
    // 4. RENDERIZADO REACTIVO DE TARJETAS, BANNER, BARRAS Y TABLAS
    // ============================================================
    function renderActiveConfigBanner(sim) {
        const banner = document.getElementById('sim-active-config-banner');
        if (!banner) return;

        const cfg = sim.projectConfig;
        const reqs = cfg.qualityRequirements;
        const cons = cfg.constraints;
        const w = cfg.decisionWeights;

        const viableColor = sim.viableCount === 3 ? '#34D399' : (sim.viableCount >= 1 ? '#38BDF8' : '#FB7185');
        const viableText = sim.viableCount > 0
            ? `${sim.viableCount} de 3 arquitecturas cumplen todas las restricciones`
            : `0 de 3 cumplen simultáneamente (Modo Penalización Activo)`;

        banner.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:.75rem;padding-bottom:.65rem;border-bottom:1px solid rgba(148,163,184,.14);">
                <div>
                    <div style="font-size:.65rem;font-family:'JetBrains Mono',monospace;color:#38BDF8;text-transform:uppercase;font-weight:700;">
                        <i class="fa-solid fa-satellite-dish" style="margin-right:.35rem;"></i>Proyecto Activo Configurado en Sección 1:
                    </div>
                    <div style="font-size:.9rem;font-weight:800;color:#FFFFFF;">${cfg.projectName}</div>
                    <div style="font-size:.72rem;color:#94A3B8;"><i class="fa-solid fa-users" style="margin-right:.35rem;color:#818CF8;"></i><strong>Usuarios Previstos:</strong> ${cfg.targetUsers}</div>
                </div>
                <div style="text-align:right;">
                    <span style="display:inline-flex;align-items:center;gap:.4rem;padding:.28rem .75rem;border-radius:999px;font-size:.7rem;font-weight:800;background:${viableColor}1f;border:1px solid ${viableColor};color:${viableColor};font-family:'JetBrains Mono',monospace;">
                        <i class="fa-solid ${sim.viableCount > 0 ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i> ${viableText}
                    </span>
                </div>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:.6rem;margin-top:.65rem;font-size:.71rem;font-family:'JetBrains Mono',monospace;">
                <div style="background:rgba(9,13,22,.6);padding:.4rem .6rem;border-radius:.45rem;border-left:2px solid #38BDF8;">
                    <span style="color:#64748B;display:block;font-size:.61rem;">META LATENCIA P95</span>
                    <strong style="color:#38BDF8;">≤ ${reqs.maxLatencyMs} ms</strong> <span style="color:#94A3B8;font-size:.62rem;">(Peso ${(w.latency * 100).toFixed(0)}%)</span>
                </div>
                <div style="background:rgba(9,13,22,.6);padding:.4rem .6rem;border-radius:.45rem;border-left:2px solid #34D399;">
                    <span style="color:#64748B;display:block;font-size:.61rem;">META SLA DISPONIBILIDAD</span>
                    <strong style="color:#34D399;">≥ ${reqs.minAvailabilityPct}%</strong> <span style="color:#94A3B8;font-size:.62rem;">(Peso ${(w.availability * 100).toFixed(0)}%)</span>
                </div>
                <div style="background:rgba(9,13,22,.6);padding:.4rem .6rem;border-radius:.45rem;border-left:2px solid #818CF8;">
                    <span style="color:#64748B;display:block;font-size:.61rem;">META ESCALABILIDAD</span>
                    <strong style="color:#818CF8;">≥ ${reqs.minScalabilityScore}/100</strong> <span style="color:#94A3B8;font-size:.62rem;">(Peso ${(w.scalability * 100).toFixed(0)}%)</span>
                </div>
                <div style="background:rgba(9,13,22,.6);padding:.4rem .6rem;border-radius:.45rem;border-left:2px solid #FBBF24;">
                    <span style="color:#64748B;display:block;font-size:.61rem;">TOPE PRESUPUESTO CLOUD</span>
                    <strong style="color:#FBBF24;">≤ $${cons.maxMonthlyBudgetUsd} USD/mes</strong> <span style="color:#94A3B8;font-size:.62rem;">(Peso ${(w.efficiencyAndCost * 100).toFixed(0)}%)</span>
                </div>
                <div style="background:rgba(9,13,22,.6);padding:.4rem .6rem;border-radius:.45rem;border-left:2px solid #F472B6;">
                    <span style="color:#64748B;display:block;font-size:.61rem;">TOPE RAM ENTORNO</span>
                    <strong style="color:#F472B6;">≤ ${cons.maxMemoryGb} GB (${Math.round(cons.maxMemoryGb * 1024)} MB)</strong>
                </div>
            </div>
        `;
    }

    function renderSimulationOutput(sim, scenarioLabel = 'Personalizado / Interactivo') {
        currentSimulationResult = sim;

        // 0. Renderizar Banner de Configuración y Restricciones Activas (Sección 1)
        renderActiveConfigBanner(sim);

        const reqs = sim.projectConfig.qualityRequirements;
        const cons = sim.projectConfig.constraints;

        // 1. Renderizar Tarjetas de Indicadores por Alternativa (Requisito 6)
        const cardsContainer = document.getElementById('sim-alternatives-cards');
        if (cardsContainer) {
            cardsContainer.innerHTML = sim.alternatives.map(alt => {
                const isWinner = alt.alternativeId === sim.winner.alternativeId;
                const m = alt.metrics;
                const c = alt.compliance;

                let baselineDeltaHtml = '';
                if (baselineSnapshot) {
                    const baseAlt = baselineSnapshot.alternatives.find(a => a.alternativeId === alt.alternativeId);
                    if (baseAlt) {
                        const diffLat = m.latencyMs - baseAlt.metrics.latencyMs;
                        const sign = diffLat > 0 ? '+' : '';
                        const col = diffLat > 0 ? '#FB7185' : (diffLat < 0 ? '#34D399' : '#94A3B8');
                        baselineDeltaHtml = `<span style="font-size:.64rem;color:${col};font-family:'JetBrains Mono',monospace;margin-left:.3rem;">(${sign}${diffLat}ms vs Ref)</span>`;
                    }
                }

                const failedList = [];
                if (!c.latencyOk) failedList.push(`Latencia > ${reqs.maxLatencyMs}ms`);
                if (!c.availabilityOk) failedList.push(`SLA < ${reqs.minAvailabilityPct}%`);
                if (!c.scalabilityOk) failedList.push(`Escala < ${reqs.minScalabilityScore}`);
                if (!c.budgetOk) failedList.push(`Costo > $${cons.maxMonthlyBudgetUsd}`);
                if (!c.memoryOk) failedList.push(`RAM > ${cons.maxMemoryGb}GB`);

                const rankIdx = sim.ranked.findIndex(r => r.alternativeId === alt.alternativeId);
                const rankNumber = rankIdx >= 0 ? rankIdx + 1 : 3;

                return `
                <div class="glow-card" style="padding:1.25rem;border:${isWinner ? `2px solid ${alt.color}` : '1px solid rgba(148,163,184,.18)'};background:${isWinner ? 'linear-gradient(180deg, rgba(15,23,42,.97), rgba(9,13,22,.95))' : 'rgba(15,23,42,.72)'};box-shadow:${isWinner ? `0 8px 28px -6px ${alt.color}38` : 'none'};position:relative;display:flex;flex-direction:column;justify-content:space-between;gap:.85rem;">
                    
                    <div>
                        <!-- Cinta Superior de Ranking y Puntaje (Sin recortes ni superposición) -->
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:.5rem;flex-wrap:wrap;padding:.45rem .75rem;margin-bottom:.85rem;border-radius:.6rem;background:${isWinner ? `${alt.color}22` : 'rgba(9,13,22,.75)'};border:1px solid ${isWinner ? `${alt.color}88` : 'rgba(148,163,184,.16)'};">
                            ${isWinner
                                ? `<span style="display:inline-flex;align-items:center;gap:.38rem;background:${alt.color};color:#090D16;font-size:.67rem;font-weight:900;padding:.2rem .65rem;border-radius:999px;text-transform:uppercase;letter-spacing:.05em;box-shadow:0 0 12px ${alt.color}66;"><i class="fa-solid fa-crown"></i> Opción #1 Recomendada</span>`
                                : `<span style="display:inline-flex;align-items:center;gap:.35rem;color:${c.allMandatoryPassed ? '#CBD5E1' : '#FB7185'};font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.04em;"><i class="fa-solid ${c.allMandatoryPassed ? 'fa-medal' : 'fa-triangle-exclamation'}" style="color:${c.allMandatoryPassed ? alt.color : '#FB7185'};"></i> Puesto #${rankNumber} ${c.allMandatoryPassed ? '• Viable' : '• Penalizada'}</span>`}
                            <span style="font-family:'JetBrains Mono',monospace;font-size:.75rem;font-weight:900;color:${isWinner ? alt.color : '#F8FAFC'};background:rgba(9,13,22,.65);padding:.16rem .55rem;border-radius:999px;border:1px solid ${isWinner ? `${alt.color}55` : 'rgba(148,163,184,.2)'};">
                                Score: ${alt.mcda.finalScore}/100
                            </span>
                        </div>

                        <div style="display:flex;align-items:center;gap:.7rem;margin-bottom:.5rem;">
                            <div style="width:2.4rem;height:2.4rem;flex-shrink:0;border-radius:.65rem;background:${alt.color}1a;border:1px solid ${alt.color}55;display:flex;align-items:center;justify-content:center;color:${alt.color};font-size:1.05rem;">
                                <i class="fa-solid ${alt.icon}"></i>
                            </div>
                            <div style="min-width:0;">
                                <span style="font-size:.63rem;font-family:'JetBrains Mono',monospace;color:${alt.color};text-transform:uppercase;font-weight:700;display:block;">${alt.badge}</span>
                                <h4 style="font-size:.96rem;font-weight:800;color:#F8FAFC;margin:0;line-height:1.25;">${alt.shortName}</h4>
                            </div>
                        </div>
                        <p style="font-size:.73rem;color:#94A3B8;line-height:1.45;margin-bottom:.75rem;">${alt.description}</p>

                        <!-- Grid de 8 Indicadores Cuantificables + Comparación directa contra Restricciones de Sección 1 -->
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.55rem;background:rgba(9,13,22,.68);padding:.8rem;border-radius:.65rem;border:1px solid rgba(148,163,184,.12);">
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">1. Latencia P95 (Máx ${reqs.maxLatencyMs}ms)</span>
                                <strong style="font-size:.86rem;color:${c.latencyOk ? '#F8FAFC' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.latencyMs} ms</strong>
                                ${baselineDeltaHtml}
                                <div style="height:4px;background:rgba(148,163,184,.15);border-radius:99px;margin-top:.2rem;overflow:hidden;">
                                    <div style="width:${Math.min(100, m.latencySlaPct)}%;height:100%;background:${c.latencyOk ? '#38BDF8' : '#FB7185'};"></div>
                                </div>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">2. Throughput / Capacidad</span>
                                <strong style="font-size:.84rem;color:#38BDF8;font-family:'JetBrains Mono',monospace;">${m.throughputRps} / ${m.maxCapacityRps} req/s</strong>
                                <span style="font-size:.6rem;color:#94A3B8;display:block;font-family:'JetBrains Mono',monospace;">Llegada λ: ${alt.breakdown.arrivalRateRps} req/s</span>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">3. Escalabilidad (Mín ${reqs.minScalabilityScore})</span>
                                <strong style="font-size:.84rem;color:${c.scalabilityOk ? '#34D399' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.scalabilityScore}/100 (${m.activeContainers} Cont.)</strong>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">4. Disponibilidad (Mín ${reqs.minAvailabilityPct}%)</span>
                                <strong style="font-size:.84rem;color:${c.availabilityOk ? '#34D399' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.availabilityPct}% ${c.availabilityOk ? '✔' : '✖'}</strong>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">5. Uso CPU / Saturación Cola</span>
                                <strong style="font-size:.82rem;color:${m.cpuUtilizationPct > 85 ? '#FB7185' : '#E2E8F0'};font-family:'JetBrains Mono',monospace;">${m.cpuUtilizationPct}% CPU (${m.utilizationPct}% ρ)</strong>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">6. Memoria RAM (Máx ${cons.maxMemoryGb}GB)</span>
                                <strong style="font-size:.82rem;color:${c.memoryOk ? '#E2E8F0' : '#FB7185'};font-family:'JetBrains Mono',monospace;">${m.memoryUsageMb} MB (${m.memoryEnvelopePct}%)</strong>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">7. Paquetes Red / Seg</span>
                                <strong style="font-size:.82rem;color:#CBD5E1;font-family:'JetBrains Mono',monospace;">${m.networkPacketsPerSec.toLocaleString()} pkts/s</strong>
                            </div>
                            <div>
                                <span style="font-size:.62rem;color:#64748B;display:block;">8. Costo (Máx $${cons.maxMonthlyBudgetUsd}) &bull; Cifrado</span>
                                <strong style="font-size:.82rem;color:${c.budgetOk ? '#34D399' : '#FB7185'};font-family:'JetBrains Mono',monospace;">$${m.estimatedMonthlyCostUsd}/m (${m.budgetUsagePct}%) &bull; 🔒${m.encryptionScore}</strong>
                            </div>
                        </div>

                        <!-- Desglose Matemático de Latencia y Sub-Puntajes MCDA -->
                        <div style="margin-top:.6rem;font-size:.66rem;color:#94A3B8;font-family:'JetBrains Mono',monospace;background:rgba(56,189,248,.05);padding:.45rem .6rem;border-radius:.45rem;border-left:2px solid ${alt.color};">
                            <div>L_P95 = Cómputo(${alt.breakdown.baseComputeMs}ms) + Red(${alt.breakdown.networkSerializationMs}ms) + Cola/RAM(${alt.breakdown.queueingAndContentionMs}ms)</div>
                            <div style="margin-top:.2rem;color:#CBD5E1;">MCDA: Lat=${alt.mcda.latencyScore} | Esc=${alt.mcda.scalabilityScore} | SLA=${alt.mcda.availabilityScore} | Costo=${alt.mcda.efficiencyAndCostScore} | Seg=${alt.mcda.securityAndContainersScore} ${alt.mcda.constraintPenalty > 0 ? `<span style="color:#FB7185;">(-${alt.mcda.constraintPenalty} pen.)</span>` : ''}</div>
                        </div>
                    </div>

                    <div style="display:flex;align-items:center;justify-content:space-between;padding-top:.5rem;border-top:1px solid rgba(148,163,184,.12);font-size:.69rem;flex-wrap:wrap;gap:.3rem;">
                        <span style="color:#94A3B8;"><i class="fa-brands fa-docker" style="color:${alt.color};margin-right:.3rem;"></i>${c.passedChecksCount}/6 Requisitos OK</span>
                        <span style="font-weight:700;color:${c.allMandatoryPassed ? '#34D399' : '#FB7185'};">
                            ${c.allMandatoryPassed ? '✔ Cumple Todo (Sección 1)' : `⚠ Incumple: ${failedList.join(', ')}`}
                        </span>
                    </div>
                </div>
                `;
            }).join('');
        }

        // 2. Renderizar Gráfico Comparativo Visual de Barras con Umbrales de Sección 1 y Tabla (Requisito 7)
        renderComparisonChartsAndTable(sim);

        // 3. Renderizar Apoyo a la Decisión y Recomendación Explicable (Requisito 8)
        renderDecisionRecommendation(sim, scenarioLabel);

        // 4. Actualizar Matriz Multi-Escenario con las restricciones actuales de Sección 1
        refreshMultiScenarioMatrix(sim, scenarioLabel);

        // 5. Actualizar las 3 Visualizaciones 3D (WebGL Three.js + Superficie 3D + Prisma Radar 3D)
        updateAll3DVisualizations(sim);
    }

    function renderComparisonChartsAndTable(sim) {
        const chartBox = document.getElementById('sim-visual-bars');
        const reqs = sim.projectConfig.qualityRequirements;
        const cons = sim.projectConfig.constraints;

        if (chartBox) {
            const maxLat = Math.max(...sim.alternatives.map(a => a.metrics.latencyMs), reqs.maxLatencyMs, 500);
            const maxCost = Math.max(...sim.alternatives.map(a => a.metrics.estimatedMonthlyCostUsd), cons.maxMonthlyBudgetUsd, 150);
            const maxMem = Math.max(...sim.alternatives.map(a => a.metrics.memoryUsageMb), cons.maxMemoryGb * 1024, 500);

            const metricsConfig = [
                {
                    label: `1. Latencia P95 vs Meta SLA (${reqs.maxLatencyMs} ms — menor es mejor)`,
                    key: 'latencyMs',
                    max: maxLat,
                    threshold: reqs.maxLatencyMs,
                    thresholdLabel: `SLA: ${reqs.maxLatencyMs}ms`,
                    unit: ' ms',
                    checkKey: 'latencyOk'
                },
                {
                    label: `2. Costo Mensual vs Presupuesto Cloud ($${cons.maxMonthlyBudgetUsd} USD — menor es mejor)`,
                    key: 'estimatedMonthlyCostUsd',
                    max: maxCost,
                    threshold: cons.maxMonthlyBudgetUsd,
                    thresholdLabel: `Tope: $${cons.maxMonthlyBudgetUsd}`,
                    unit: ' USD',
                    checkKey: 'budgetOk'
                },
                {
                    label: `3. Memoria RAM vs Restricción Entorno (${Math.round(cons.maxMemoryGb * 1024)} MB — menor es mejor)`,
                    key: 'memoryUsageMb',
                    max: maxMem,
                    threshold: cons.maxMemoryGb * 1024,
                    thresholdLabel: `Tope: ${cons.maxMemoryGb}GB`,
                    unit: ' MB',
                    checkKey: 'memoryOk'
                },
                {
                    label: `4. Escalabilidad Elástica vs Meta Mínima (${reqs.minScalabilityScore}/100 — mayor es mejor)`,
                    key: 'scalabilityScore',
                    max: 100,
                    threshold: reqs.minScalabilityScore,
                    thresholdLabel: `Mín: ${reqs.minScalabilityScore}`,
                    unit: '/100',
                    checkKey: 'scalabilityOk'
                },
                {
                    label: `5. Puntaje Ponderado Multicriterio MCDA (Sensible a Pesos de Sección 1)`,
                    key: 'mcdaScore',
                    max: 100,
                    threshold: null,
                    unit: ' pts',
                    checkKey: 'allMandatoryPassed'
                }
            ];

            chartBox.innerHTML = metricsConfig.map(mc => {
                const threshPct = mc.threshold ? Math.max(4, Math.min(98, Math.round((mc.threshold / mc.max) * 100))) : null;
                return `
                <div style="margin-bottom:.9rem;">
                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:.72rem;font-weight:700;color:#E2E8F0;margin-bottom:.35rem;">
                        <span>${mc.label}</span>
                        ${mc.threshold ? `<span style="font-size:.63rem;color:#FBBF24;font-family:'JetBrains Mono',monospace;">▏${mc.thresholdLabel}</span>` : ''}
                    </div>
                    <div style="display:flex;flex-direction:column;gap:.35rem;">
                        ${sim.alternatives.map(alt => {
                            const val = mc.key === 'mcdaScore' ? alt.mcda.finalScore : alt.metrics[mc.key];
                            const isOk = alt.compliance[mc.checkKey];
                            const pct = Math.max(5, Math.min(100, Math.round((val / mc.max) * 100)));
                            const barColor = isOk ? alt.color : '#FB7185';
                            return `
                            <div style="display:grid;grid-template-columns:138px 1fr 92px;align-items:center;gap:.55rem;font-size:.71rem;">
                                <span style="color:#94A3B8;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${alt.shortName}</span>
                                <div style="height:10px;background:rgba(148,163,184,.12);border-radius:999px;overflow:visible;position:relative;">
                                    <div style="width:${pct}%;height:100%;background:${barColor};border-radius:999px;transition:width .25s ease;"></div>
                                    ${threshPct !== null ? `<div style="position:absolute;top:-3px;bottom:-3px;left:${threshPct}%;width:2px;background:#FBBF24;box-shadow:0 0 6px #FBBF24;" title="${mc.thresholdLabel}"></div>` : ''}
                                </div>
                                <strong style="text-align:right;font-family:'JetBrains Mono',monospace;color:${isOk ? '#F8FAFC' : '#FB7185'};">${val}${mc.unit}</strong>
                            </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                `;
            }).join('');
        }

        const tbody = document.getElementById('sim-comparison-tbody');
        if (tbody) {
            tbody.innerHTML = sim.alternatives.map(alt => {
                const m = alt.metrics;
                const c = alt.compliance;
                const isWinner = alt.alternativeId === sim.winner.alternativeId;
                return `
                <tr style="border-bottom:1px solid rgba(148,163,184,.12);background:${isWinner ? 'rgba(56,189,248,.07)' : 'transparent'};">
                    <td style="padding:.65rem .75rem;font-weight:700;color:${alt.color};">
                        <i class="fa-solid ${alt.icon}" style="margin-right:.4rem;"></i>${alt.shortName}
                        ${isWinner ? '<span style="margin-left:.35rem;font-size:.62rem;background:#34D399;color:#090D16;padding:.1rem .4rem;border-radius:4px;font-weight:800;">TOP 1</span>' : ''}
                    </td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${c.latencyOk ? '#F8FAFC' : '#FB7185'};">${m.latencyMs} ms <span style="font-size:.62rem;color:#64748B;">(${m.latencySlaPct}%)</span></td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;">${m.throughputRps} / ${m.maxCapacityRps} req/s</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${c.scalabilityOk ? '#34D399' : '#FB7185'};">${m.scalabilityScore}/100</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${c.availabilityOk ? '#34D399' : '#FB7185'};">${m.availabilityPct}%</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${c.memoryOk ? '#E2E8F0' : '#FB7185'};">${m.cpuUtilizationPct}% / ${m.memoryUsageMb} MB</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;">${m.activeContainers} pods &bull; 🔒${m.encryptionScore}/100</td>
                    <td style="padding:.65rem .75rem;font-family:'JetBrains Mono',monospace;color:${c.budgetOk ? '#34D399' : '#FB7185'};">$${m.estimatedMonthlyCostUsd} USD <span style="font-size:.62rem;color:#64748B;">(${m.budgetUsagePct}%)</span></td>
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
        const third = sim.ranked[2] || sim.alternatives[2];
        const delta = (w.mcda.finalScore - r.mcda.finalScore).toFixed(1);
        const cfg = sim.projectConfig;

        recContainer.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:1rem;padding-bottom:1rem;border-bottom:1px solid rgba(148,163,184,.15);">
                <div style="flex:1;min-width:260px;">
                    <div style="display:inline-flex;align-items:center;gap:.45rem;font-size:.7rem;font-family:'JetBrains Mono',monospace;color:${w.color};background:${w.color}18;border:1px solid ${w.color}55;padding:.24rem .7rem;border-radius:999px;text-transform:uppercase;font-weight:800;margin-bottom:.45rem;">
                        <i class="fa-solid fa-crown"></i> Decisión Fundamentada Multicriterio &bull; ${scenarioLabel}
                    </div>
                    <h3 style="font-size:1.18rem;font-weight:800;color:#FFFFFF;margin:0;line-height:1.3;">
                        Arquitectura Recomendada: <span style="color:${w.color};">${w.name}</span>
                    </h3>
                    <div style="font-size:.74rem;color:#94A3B8;margin-top:.3rem;">
                        Evaluado para <strong>${cfg.projectName}</strong> (${cfg.targetUsers})
                    </div>
                </div>
                <div style="display:flex;align-items:center;gap:.85rem;background:rgba(9,13,22,.78);padding:.65rem 1.05rem;border-radius:.75rem;border:1px solid ${w.color}55;">
                    <div style="text-align:right;">
                        <span style="font-size:.64rem;color:#94A3B8;display:block;text-transform:uppercase;font-family:'JetBrains Mono',monospace;">Puntaje Ponderado Final</span>
                        <strong style="font-size:1.45rem;color:${w.color};font-family:'JetBrains Mono',monospace;">${w.mcda.finalScore} / 100</strong>
                        <span style="font-size:.69rem;color:#34D399;display:block;font-weight:700;">+${delta} pts sobre ${r.shortName}</span>
                    </div>
                </div>
            </div>

            <!-- Podio Comparativo Rápido (#1, #2 y #3) -->
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.75rem;margin-top:1rem;">
                ${[w, r, third].map((item, idx) => `
                    <div style="padding:.65rem .85rem;border-radius:.65rem;background:${idx === 0 ? `${item.color}16` : 'rgba(9,13,22,.55)'};border:1px solid ${idx === 0 ? `${item.color}66` : 'rgba(148,163,184,.14)'};display:flex;justify-content:space-between;align-items:center;gap:.5rem;">
                        <div>
                            <span style="font-size:.62rem;font-weight:900;color:${idx === 0 ? item.color : '#94A3B8'};text-transform:uppercase;font-family:'JetBrains Mono',monospace;display:block;">
                                ${idx === 0 ? '★ #1 Ganadora Recomendada' : (idx === 1 ? '● #2 Segunda Opción' : '○ #3 Tercera Opción')}
                            </span>
                            <strong style="font-size:.83rem;color:#F8FAFC;">${item.shortName}</strong>
                            <span style="font-size:.65rem;color:${item.compliance.allMandatoryPassed ? '#34D399' : '#FB7185'};display:block;font-family:'JetBrains Mono',monospace;">
                                ${item.compliance.allMandatoryPassed ? '✔ Cumple Todo (6/6)' : `⚠ ${item.compliance.passedChecksCount}/6 Requisitos OK`}
                            </span>
                        </div>
                        <div style="text-align:right;font-family:'JetBrains Mono',monospace;">
                            <strong style="font-size:.92rem;color:${item.color};display:block;">${item.mcda.finalScore} pts</strong>
                            <span style="font-size:.64rem;color:#CBD5E1;">${item.metrics.latencyMs}ms | $${item.metrics.estimatedMonthlyCostUsd}</span>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div style="margin-top:1rem;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:1rem;">
                <div style="background:rgba(9,13,22,.6);padding:1rem;border-radius:.75rem;border:1px solid rgba(56,189,248,.2);">
                    <h4 style="font-size:.82rem;font-weight:700;color:#38BDF8;margin:0 0 .55rem 0;">
                        <i class="fa-solid fa-magnifying-glass-chart" style="margin-right:.4rem;"></i>¿Por qué el modelo recomienda esta alternativa?
                    </h4>
                    <ul style="margin:0;padding-left:1.1rem;font-size:.75rem;color:#CBD5E1;line-height:1.6;">
                        ${sim.rationale.map(item => `<li style="margin-bottom:.35rem;">${item}</li>`).join('')}
                    </ul>
                </div>

                <div style="background:rgba(9,13,22,.6);padding:1rem;border-radius:.75rem;border:1px solid rgba(52,211,153,.2);">
                    <h4 style="font-size:.82rem;font-weight:700;color:#34D399;margin:0 0 .55rem 0;">
                        <i class="fa-solid fa-thumbs-up" style="margin-right:.4rem;"></i>Ventajas Principales en Document-Mind AI
                    </h4>
                    <ul style="margin:0;padding-left:1.1rem;font-size:.75rem;color:#CBD5E1;line-height:1.6;">
                        ${w.strengths.map(s => `<li style="margin-bottom:.35rem;">${s}</li>`).join('')}
                    </ul>
                </div>

                <div style="background:rgba(9,13,22,.6);padding:1rem;border-radius:.75rem;border:1px solid rgba(251,113,133,.2);">
                    <h4 style="font-size:.82rem;font-weight:700;color:#FB7185;margin:0 0 .55rem 0;">
                        <i class="fa-solid fa-scale-unbalanced" style="margin-right:.4rem;"></i>Limitaciones y Supuestos del Modelo
                    </h4>
                    <ul style="margin:0;padding-left:1.1rem;font-size:.74rem;color:#CBD5E1;line-height:1.55;">
                        ${w.limitations.map(l => `<li style="margin-bottom:.3rem;"><strong>Limitación:</strong> ${l}</li>`).join('')}
                        <li><strong>Supuesto:</strong> Los cálculos representan estimaciones analíticas de cola M/M/c y sobrecarga RPC bajo las restricciones definidas en la Sección 1.</li>
                    </ul>
                </div>
            </div>
        `;
    }

    function refreshMultiScenarioMatrix(activeSim, activeLabel) {
        const logBody = document.getElementById('sim-scenarios-history-tbody');
        if (!logBody) return;

        const cfg = activeSim.projectConfig;
        const rows = [];

        // Fila 1: Estado Interactivo Actual en Vivo
        rows.push({
            isLive: true,
            name: `★ Activo: ${activeLabel}`,
            inputs: activeSim.inputs,
            sim: activeSim
        });

        // Filas 2..5: Los 4 escenarios oficiales re-evaluados con las restricciones actuales de la Sección 1
        Object.keys(PRESET_SCENARIOS).forEach(key => {
            const preset = PRESET_SCENARIOS[key];
            const simPreset = executeSimulation(preset.inputs, cfg);
            rows.push({
                isLive: false,
                name: preset.name,
                inputs: preset.inputs,
                sim: simPreset
            });
        });

        logBody.innerHTML = rows.map(row => {
            const s = row.sim;
            const mono = s.alternatives[0];
            const micro = s.alternatives[1];
            const eda = s.alternatives[2];
            const win = s.winner;
            return `
                <tr style="border-bottom:1px solid rgba(148,163,184,.12);background:${row.isLive ? 'rgba(56,189,248,.11)' : 'transparent'};">
                    <td style="padding:.5rem .6rem;font-weight:${row.isLive ? '800' : '700'};color:${row.isLive ? '#38BDF8' : '#E2E8F0'};">${row.name}</td>
                    <td style="padding:.5rem .6rem;font-family:'JetBrains Mono',monospace;font-size:.66rem;">U=${row.inputs.concurrentUsers} | S=${row.inputs.payloadSizeMb}MB | N=${row.inputs.repoComplexityFiles} | B=${row.inputs.trafficBurstFactor}x</td>
                    <td style="padding:.5rem .6rem;font-family:'JetBrains Mono',monospace;color:${mono.compliance.allMandatoryPassed ? '#38BDF8' : '#FB7185'};">${mono.metrics.latencyMs}ms (${mono.mcda.finalScore}p)</td>
                    <td style="padding:.5rem .6rem;font-family:'JetBrains Mono',monospace;color:${micro.compliance.allMandatoryPassed ? '#818CF8' : '#FB7185'};">${micro.metrics.latencyMs}ms (${micro.mcda.finalScore}p)</td>
                    <td style="padding:.5rem .6rem;font-family:'JetBrains Mono',monospace;color:${eda.compliance.allMandatoryPassed ? '#34D399' : '#FB7185'};">${eda.metrics.latencyMs}ms (${eda.mcda.finalScore}p)</td>
                    <td style="padding:.5rem .6rem;font-weight:800;color:${win.color};">${win.shortName} (${win.mcda.finalScore} pts)</td>
                </tr>
            `;
        }).join('');
    }

    // ============================================================
    // 5. LABORATORIO DE VISUALIZACIÓN Y GRÁFICAS 3D EN TIEMPO REAL
    // ============================================================
    const Sim3DEngine = {
        initialized: false,
        mode: 'BARS_3D', // 'BARS_3D' | 'TOPOLOGY_3D' | 'SURFACE_3D'
        autoRotate: true,
        scene: null,
        camera: null,
        renderer: null,
        barsGroup: null,
        topologyGroup: null,
        surfaceGroup: null,
        barMeshes: [],
        slaPlaneMesh: null,
        crownMesh: null,
        topologyPods: { MONOLITH_MVC: [], MICROSERVICES_K8S: [], EDA_SERVERLESS: [] },
        packets: [],
        surfaceMeshes: {},
        surfaceMarkers: {},
        surfaceSlaPlane: null,
        camTheta: 0.62,
        camPhi: 0.48,
        camRadius: 19.5,
        isDragging: false,
        prevMouse: { x: 0, y: 0 },
        surfaceCanvasAngle: 0.58,
        radarCanvasAngle: 0.35
    };

    function init3DWebGLArena() {
        if (Sim3DEngine.initialized) return;
        const canvas = document.getElementById('sim-3d-webgl-canvas');
        const wrapper = document.getElementById('sim-3d-webgl-wrapper');
        if (!canvas || !wrapper || typeof THREE === 'undefined') return;

        Sim3DEngine.initialized = true;

        const scene = new THREE.Scene();
        Sim3DEngine.scene = scene;

        const w = wrapper.clientWidth || 540;
        const h = wrapper.clientHeight || 350;
        const camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 120);
        Sim3DEngine.camera = camera;

        const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setSize(w, h, false);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        Sim3DEngine.renderer = renderer;

        // Luces físicas del estudio 3D
        const ambient = new THREE.AmbientLight(0x1E293B, 2.5);
        scene.add(ambient);

        const dirLight1 = new THREE.DirectionalLight(0xFFFFFF, 1.15);
        dirLight1.position.set(12, 20, 14);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x38BDF8, 0.75);
        dirLight2.position.set(-14, 10, -10);
        scene.add(dirLight2);

        // Plataforma Cyber-Grid 3D Base
        const gridHelper = new THREE.GridHelper(18, 18, 0x38BDF8, 0x1E293B);
        gridHelper.position.y = -2.8;
        scene.add(gridHelper);

        const basePlateGeo = new THREE.BoxGeometry(18.2, 0.22, 13.5);
        const basePlateMat = new THREE.MeshStandardMaterial({
            color: 0x090D16,
            roughness: 0.3,
            metalness: 0.8,
            transparent: true,
            opacity: 0.88
        });
        const basePlate = new THREE.Mesh(basePlateGeo, basePlateMat);
        basePlate.position.y = -2.95;
        scene.add(basePlate);

        // Grupos para los 3 modos 3D
        Sim3DEngine.barsGroup = new THREE.Group();
        Sim3DEngine.topologyGroup = new THREE.Group();
        Sim3DEngine.surfaceGroup = new THREE.Group();

        scene.add(Sim3DEngine.barsGroup);
        scene.add(Sim3DEngine.topologyGroup);
        scene.add(Sim3DEngine.surfaceGroup);

        buildBars3DScene();
        buildTopology3DScene();
        buildSurface3DScene();
        set3DMode('BARS_3D');

        // Interacción de Órbita 360° y Zoom en el Canvas WebGL
        wrapper.addEventListener('pointerdown', (e) => {
            Sim3DEngine.isDragging = true;
            Sim3DEngine.autoRotate = false;
            Sim3DEngine.prevMouse = { x: e.clientX, y: e.clientY };
            wrapper.style.cursor = 'grabbing';
        });

        window.addEventListener('pointermove', (e) => {
            if (!Sim3DEngine.isDragging) return;
            const dx = e.clientX - Sim3DEngine.prevMouse.x;
            const dy = e.clientY - Sim3DEngine.prevMouse.y;
            Sim3DEngine.prevMouse = { x: e.clientX, y: e.clientY };
            Sim3DEngine.camTheta -= dx * 0.0085;
            Sim3DEngine.camPhi = Math.max(0.15, Math.min(1.35, Sim3DEngine.camPhi + dy * 0.0075));
        });

        window.addEventListener('pointerup', () => {
            if (Sim3DEngine.isDragging) {
                Sim3DEngine.isDragging = false;
                wrapper.style.cursor = 'grab';
            }
        });

        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            Sim3DEngine.camRadius = Math.max(11, Math.min(29, Sim3DEngine.camRadius + (e.deltaY * 0.012)));
        }, { passive: false });

        if (window.ResizeObserver) {
            const ro = new ResizeObserver(() => {
                const nw = wrapper.clientWidth || 540;
                const nh = wrapper.clientHeight || 350;
                camera.aspect = nw / nh;
                camera.updateProjectionMatrix();
                renderer.setSize(nw, nh, false);
            });
            ro.observe(wrapper);
        }

        // Loop de Animación WebGL
        const clock = new THREE.Clock();
        function animate3D() {
            requestAnimationFrame(animate3D);
            const t = clock.getElapsedTime();

            if (Sim3DEngine.autoRotate && !Sim3DEngine.isDragging) {
                Sim3DEngine.camTheta += 0.0038;
            }

            // Actualizar posición esférica de cámara
            const r = Sim3DEngine.camRadius;
            camera.position.x = r * Math.sin(Sim3DEngine.camTheta) * Math.cos(Sim3DEngine.camPhi);
            camera.position.y = r * Math.sin(Sim3DEngine.camPhi) + 0.5;
            camera.position.z = r * Math.cos(Sim3DEngine.camTheta) * Math.cos(Sim3DEngine.camPhi);
            camera.lookAt(0, 0.3, 0);

            // Animación suave de las torres 3D (Modo 1)
            if (Sim3DEngine.barsGroup.visible) {
                Sim3DEngine.barMeshes.forEach(bm => {
                    bm.currentH += (bm.targetH - bm.currentH) * 0.12;
                    const hVal = Math.max(0.15, bm.currentH);
                    bm.mesh.scale.y = hVal;
                    bm.mesh.position.y = -2.8 + (hVal / 2);
                    bm.cap.position.y = -2.8 + hVal + 0.08;
                    bm.cap.rotation.y = t * 1.4;
                });
                if (Sim3DEngine.slaPlaneMesh) {
                    Sim3DEngine.slaPlaneMesh.position.y += (Sim3DEngine.slaPlaneMesh.userData.targetY - Sim3DEngine.slaPlaneMesh.position.y) * 0.12;
                }
                if (Sim3DEngine.crownMesh) {
                    Sim3DEngine.crownMesh.rotation.z = t * 2.2;
                    Sim3DEngine.crownMesh.position.y = Sim3DEngine.crownMesh.userData.baseY + Math.sin(t * 3.5) * 0.22;
                }
            }

            // Animación de Topología y Paquetes en Tiempo Real (Modo 2)
            if (Sim3DEngine.topologyGroup.visible && currentSimulationResult) {
                const lambda = currentSimulationResult.alternatives[0].breakdown.arrivalRateRps || 5;
                const speedFactor = Math.min(3.8, Math.max(0.5, lambda / 12));

                Sim3DEngine.packets.forEach(pkt => {
                    pkt.progress = (pkt.progress + 0.012 * speedFactor * pkt.speed) % 1.0;
                    const p = pkt.progress;
                    pkt.mesh.position.x = pkt.startX + (pkt.endX - pkt.startX) * p;
                    pkt.mesh.position.y = pkt.startY + Math.sin(p * Math.PI) * 1.65;
                    pkt.mesh.position.z = pkt.startZ + (pkt.endZ - pkt.startZ) * p;
                });

                Object.keys(Sim3DEngine.topologyPods).forEach(altKey => {
                    Sim3DEngine.topologyPods[altKey].forEach((pod, idx) => {
                        if (pod.visible) {
                            pod.rotation.y = t * 1.1 + idx * 0.4;
                            pod.position.y = pod.userData.baseY + Math.sin(t * 2.2 + idx) * 0.12;
                        }
                    });
                });
            }

            // Animación de Superficie 3D (Modo 3)
            if (Sim3DEngine.surfaceGroup.visible) {
                Object.values(Sim3DEngine.surfaceMarkers).forEach((mk, idx) => {
                    mk.scale.setScalar(1 + Math.sin(t * 4 + idx) * 0.18);
                });
            }

            renderer.render(scene, camera);
        }
        animate3D();
    }

    function buildBars3DScene() {
        const g = Sim3DEngine.barsGroup;
        const altKeys = ['MONOLITH_MVC', 'MICROSERVICES_K8S', 'EDA_SERVERLESS'];
        const zPositions = [-3.2, 0, 3.2];
        const xPositions = [-5.6, -2.8, 0, 2.8, 5.6]; // 5 columnas: Latencia, Throughput, Escala, Presupuesto, Score MCDA

        Sim3DEngine.barMeshes = [];
        altKeys.forEach((altKey, rIdx) => {
            const alt = ARCHITECTURE_ALTERNATIVES[altKey];
            const z = zPositions[rIdx];

            xPositions.forEach((x, cIdx) => {
                // Pedestal base
                const pedGeo = new THREE.CylinderGeometry(0.62, 0.72, 0.14, 20);
                const pedMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.8, roughness: 0.3 });
                const ped = new THREE.Mesh(pedGeo, pedMat);
                ped.position.set(x, -2.73, z);
                g.add(ped);

                // Torre 3D
                const barGeo = new THREE.BoxGeometry(0.92, 1.0, 0.92);
                const barMat = new THREE.MeshStandardMaterial({
                    color: alt.hex,
                    emissive: alt.hex,
                    emissiveIntensity: 0.38,
                    metalness: 0.75,
                    roughness: 0.2,
                    transparent: true,
                    opacity: 0.92
                });
                const barMesh = new THREE.Mesh(barGeo, barMat);
                barMesh.position.set(x, -2.3, z);
                g.add(barMesh);

                // Octaedro flotante en la cima de cada torre
                const capGeo = new THREE.OctahedronGeometry(0.24, 0);
                const capMat = new THREE.MeshBasicMaterial({ color: alt.hex, wireframe: true });
                const capMesh = new THREE.Mesh(capGeo, capMat);
                capMesh.position.set(x, -1.7, z);
                g.add(capMesh);

                Sim3DEngine.barMeshes.push({
                    altKey,
                    colIdx: cIdx,
                    mesh: barMesh,
                    cap: capMesh,
                    baseHex: alt.hex,
                    currentH: 1.0,
                    targetH: 2.5
                });
            });
        });

        // Plano Translúcido de Umbral SLA / Presupuesto (Sección 1)
        const planeGeo = new THREE.PlaneGeometry(15.2, 8.8);
        const planeMat = new THREE.MeshBasicMaterial({
            color: 0xFBBF24,
            transparent: true,
            opacity: 0.16,
            side: THREE.DoubleSide
        });
        const slaPlane = new THREE.Mesh(planeGeo, planeMat);
        slaPlane.rotation.x = Math.PI / 2;
        slaPlane.position.y = 1.2;
        slaPlane.userData = { targetY: 1.2 };

        // Borde luminoso del plano SLA
        const edgesGeo = new THREE.EdgesGeometry(planeGeo);
        const edgesMat = new THREE.LineBasicMaterial({ color: 0xFBBF24, transparent: true, opacity: 0.75 });
        const planeEdges = new THREE.LineSegments(edgesGeo, edgesMat);
        slaPlane.add(planeEdges);

        g.add(slaPlane);
        Sim3DEngine.slaPlaneMesh = slaPlane;

        // Corona 3D para la Arquitectura Ganadora #1
        const crownGeo = new THREE.TorusGeometry(0.68, 0.08, 12, 32);
        const crownMat = new THREE.MeshBasicMaterial({ color: 0xFBBF24 });
        const crown = new THREE.Mesh(crownGeo, crownMat);
        crown.rotation.x = Math.PI / 2;
        crown.position.set(5.6, 3.2, -3.2);
        crown.userData = { baseY: 3.2 };
        g.add(crown);
        Sim3DEngine.crownMesh = crown;
    }

    function buildTopology3DScene() {
        const g = Sim3DEngine.topologyGroup;
        const zoneX = { MONOLITH_MVC: -5.4, MICROSERVICES_K8S: 0, EDA_SERVERLESS: 5.4 };
        const colors = { MONOLITH_MVC: 0x38BDF8, MICROSERVICES_K8S: 0x818CF8, EDA_SERVERLESS: 0x34D399 };

        Object.keys(zoneX).forEach(altKey => {
            const cx = zoneX[altKey];
            const col = colors[altKey];

            // Anillo de plataforma por arquitectura
            const ringGeo = new THREE.TorusGeometry(2.15, 0.05, 12, 48);
            const ringMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55 });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.rotation.x = Math.PI / 2;
            ring.position.set(cx, -2.65, 0);
            g.add(ring);

            const maxPods = altKey === 'MONOLITH_MVC' ? 2 : (altKey === 'MICROSERVICES_K8S' ? 10 : 16);
            Sim3DEngine.topologyPods[altKey] = [];

            for (let i = 0; i < maxPods; i++) {
                const angle = (i / maxPods) * Math.PI * 2;
                const rad = maxPods <= 2 ? (i * 0.9 - 0.45) : (i < 8 ? 1.25 : 1.85);
                const px = maxPods <= 2 ? cx + rad : cx + Math.cos(angle) * rad;
                const pz = maxPods <= 2 ? 0 : Math.sin(angle) * rad;
                const py = -1.6 + (i >= 8 ? 1.35 : 0);

                const geo = altKey === 'MONOLITH_MVC'
                    ? new THREE.CylinderGeometry(0.65, 0.65, 1.8, 20)
                    : (altKey === 'MICROSERVICES_K8S'
                        ? new THREE.OctahedronGeometry(0.42, 0)
                        : new THREE.IcosahedronGeometry(0.34, 0));

                const mat = new THREE.MeshStandardMaterial({
                    color: col,
                    emissive: col,
                    emissiveIntensity: 0.5,
                    metalness: 0.85,
                    roughness: 0.2
                });
                const mesh = new THREE.Mesh(geo, mat);
                mesh.position.set(px, py, pz);
                mesh.userData = { baseY: py, baseHex: col };
                g.add(mesh);
                Sim3DEngine.topologyPods[altKey].push(mesh);
            }
        });

        // Paquetes de red 3D viajando hacia los 3 clústeres
        Sim3DEngine.packets = [];
        Object.keys(zoneX).forEach(altKey => {
            const cx = zoneX[altKey];
            const col = colors[altKey];
            for (let p = 0; p < 14; p++) {
                const pktGeo = new THREE.SphereGeometry(0.11, 10, 10);
                const pktMat = new THREE.MeshBasicMaterial({ color: col });
                const pktMesh = new THREE.Mesh(pktGeo, pktMat);
                g.add(pktMesh);

                const angle = (p / 14) * Math.PI * 2;
                Sim3DEngine.packets.push({
                    altKey,
                    mesh: pktMesh,
                    startX: cx + Math.cos(angle) * 2.4,
                    startY: -2.4,
                    startZ: Math.sin(angle) * 2.4,
                    endX: cx,
                    endY: -0.8,
                    endZ: 0,
                    progress: Math.random(),
                    speed: 0.7 + Math.random() * 0.6
                });
            }
        });
    }

    function buildSurface3DScene() {
        const g = Sim3DEngine.surfaceGroup;
        const altKeys = ['MONOLITH_MVC', 'MICROSERVICES_K8S', 'EDA_SERVERLESS'];

        altKeys.forEach(altKey => {
            const alt = ARCHITECTURE_ALTERNATIVES[altKey];
            const geom = new THREE.PlaneGeometry(13, 9, 18, 12);
            geom.rotateX(-Math.PI / 2);

            const mat = new THREE.MeshBasicMaterial({
                color: alt.hex,
                wireframe: true,
                transparent: true,
                opacity: 0.68
            });
            const mesh = new THREE.Mesh(geom, mat);
            g.add(mesh);
            Sim3DEngine.surfaceMeshes[altKey] = mesh;

            // Esfera marcadora del punto de operación actual (U, S_MB)
            const mkGeo = new THREE.SphereGeometry(0.32, 16, 16);
            const mkMat = new THREE.MeshBasicMaterial({ color: alt.hex });
            const mk = new THREE.Mesh(mkGeo, mkMat);
            g.add(mk);
            Sim3DEngine.surfaceMarkers[altKey] = mk;
        });

        // Plano de techo SLA en la vista de superficie 3D
        const slaGeo = new THREE.PlaneGeometry(13.2, 9.2);
        slaGeo.rotateX(-Math.PI / 2);
        const slaMat = new THREE.MeshBasicMaterial({
            color: 0xFB7185,
            transparent: true,
            opacity: 0.18,
            side: THREE.DoubleSide
        });
        const slaMesh = new THREE.Mesh(slaGeo, slaMat);
        g.add(slaMesh);
        Sim3DEngine.surfaceSlaPlane = slaMesh;
    }

    function set3DMode(mode) {
        Sim3DEngine.mode = mode;
        if (Sim3DEngine.barsGroup) Sim3DEngine.barsGroup.visible = (mode === 'BARS_3D');
        if (Sim3DEngine.topologyGroup) Sim3DEngine.topologyGroup.visible = (mode === 'TOPOLOGY_3D');
        if (Sim3DEngine.surfaceGroup) Sim3DEngine.surfaceGroup.visible = (mode === 'SURFACE_3D');

        const titleEl = document.getElementById('sim-3d-hud-title');
        const subEl = document.getElementById('sim-3d-hud-subtitle');
        if (titleEl && subEl) {
            if (mode === 'BARS_3D') {
                titleEl.textContent = 'MODO 1: TORRES VOLUMÉTRICAS 3D + PLANO DE CORTE SLA';
                subEl.textContent = '5 Columnas: [1.Latencia] [2.Throughput] [3.Escalabilidad] [4.Costo] [5.Score MCDA] • Rojo = Viola Sección 1';
            } else if (mode === 'TOPOLOGY_3D') {
                titleEl.textContent = 'MODO 2: TOPOLOGÍA 3D DE CONTENEDORES Y TRÁFICO DE PAQUETES';
                subEl.textContent = 'Izq: Monolito (1-2 nodos) • Centro: K8s (hasta 10 pods) • Der: EDA Serverless (hasta 16 workers)';
            } else {
                titleEl.textContent = 'MODO 3: SUPERFICIE MATEMÁTICA 3D M/M/c (U × S_MB → LATENCIA)';
                subEl.textContent = 'Mallas 3D de Latencia P95 vs Plano de Límite SLA (Sección 1) y Esferas del Punto Actual';
            }
        }

        document.querySelectorAll('.sim-3d-mode-btn').forEach(btn => {
            const active = btn.getAttribute('data-sim-3d-mode') === mode;
            btn.style.background = active ? 'rgba(56, 189, 248, 0.22)' : '';
            btn.style.borderColor = active ? '#38BDF8' : '';
            btn.style.color = active ? '#FFFFFF' : '';
        });

        if (currentSimulationResult) {
            updateAll3DVisualizations(currentSimulationResult);
        }
    }

    function updateAll3DVisualizations(sim) {
        init3DWebGLArena();

        const reqs = sim.projectConfig.qualityRequirements;
        const cons = sim.projectConfig.constraints;

        // Actualizar telemetría en el pie del visor 3D
        const telEl = document.getElementById('sim-3d-live-telemetry');
        if (telEl) {
            telEl.innerHTML = `λ=${sim.alternatives[0].breakdown.arrivalRateRps} req/s &bull; SLA≤${reqs.maxLatencyMs}ms &bull; Top #1: <span style="color:${sim.winner.color};">${sim.winner.shortName} (${sim.winner.mcda.finalScore} pts)</span>`;
        }

        // 1. Actualizar Torres 3D (BARS_3D)
        if (Sim3DEngine.barMeshes.length > 0) {
            const maxLat = Math.max(...sim.alternatives.map(a => a.metrics.latencyMs), reqs.maxLatencyMs, 600);
            const maxCap = Math.max(...sim.alternatives.map(a => a.metrics.maxCapacityRps), 60);
            const maxCost = Math.max(...sim.alternatives.map(a => a.metrics.estimatedMonthlyCostUsd), cons.maxMonthlyBudgetUsd, 150);

            Sim3DEngine.barMeshes.forEach(bm => {
                const alt = sim.alternatives.find(a => a.alternativeId === bm.altKey);
                if (!alt) return;
                const m = alt.metrics;
                const c = alt.compliance;

                let normH = 1.0;
                let ok = true;
                if (bm.colIdx === 0) {
                    normH = (m.latencyMs / maxLat) * 5.2;
                    ok = c.latencyOk;
                } else if (bm.colIdx === 1) {
                    normH = (m.throughputRps / maxCap) * 5.2;
                    ok = true;
                } else if (bm.colIdx === 2) {
                    normH = (m.scalabilityScore / 100) * 5.2;
                    ok = c.scalabilityOk;
                } else if (bm.colIdx === 3) {
                    normH = (m.estimatedMonthlyCostUsd / maxCost) * 5.2;
                    ok = c.budgetOk && c.memoryOk;
                } else {
                    normH = (alt.mcda.finalScore / 100) * 5.5;
                    ok = c.allMandatoryPassed;
                }

                bm.targetH = Math.max(0.25, Math.min(6.0, normH));
                const hexColor = ok ? bm.baseHex : 0xFB7185;
                bm.mesh.material.color.setHex(hexColor);
                bm.mesh.material.emissive.setHex(hexColor);
                bm.cap.material.color.setHex(hexColor);
            });

            // Posicionar el plano de corte SLA según reqs.maxLatencyMs y minScalabilityScore
            if (Sim3DEngine.slaPlaneMesh) {
                const slaRatio = Math.max(0.15, Math.min(0.95, reqs.maxLatencyMs / maxLat));
                Sim3DEngine.slaPlaneMesh.userData.targetY = -2.8 + (slaRatio * 5.2);
            }

            // Posicionar la corona 3D sobre la arquitectura ganadora
            if (Sim3DEngine.crownMesh) {
                const winIdx = ['MONOLITH_MVC', 'MICROSERVICES_K8S', 'EDA_SERVERLESS'].indexOf(sim.winner.alternativeId);
                const zPos = [-3.2, 0, 3.2][Math.max(0, winIdx)];
                const winH = (sim.winner.mcda.finalScore / 100) * 5.5;
                Sim3DEngine.crownMesh.position.x = 5.6;
                Sim3DEngine.crownMesh.position.z = zPos;
                Sim3DEngine.crownMesh.userData.baseY = -2.8 + winH + 0.65;
            }
        }

        // 2. Actualizar Topología 3D de Contenedores (TOPOLOGY_3D)
        Object.keys(Sim3DEngine.topologyPods).forEach(altKey => {
            const alt = sim.alternatives.find(a => a.alternativeId === altKey);
            if (!alt) return;
            const pods = Sim3DEngine.topologyPods[altKey];
            const activeCount = alt.metrics.activeContainers;
            const isOverloaded = !alt.compliance.allMandatoryPassed || alt.metrics.utilizationPct > 90;

            pods.forEach((pod, idx) => {
                pod.visible = idx < activeCount;
                const col = isOverloaded ? 0xFB7185 : pod.userData.baseHex;
                pod.material.color.setHex(col);
                pod.material.emissive.setHex(col);
            });
        });

        // 3. Actualizar Superficie Matemática 3D en Three.js (SURFACE_3D)
        if (Sim3DEngine.surfaceGroup && Object.keys(Sim3DEngine.surfaceMeshes).length > 0) {
            const slaCap = Math.max(600, reqs.maxLatencyMs * 1.6);
            ['MONOLITH_MVC', 'MICROSERVICES_K8S', 'EDA_SERVERLESS'].forEach(altKey => {
                const mesh = Sim3DEngine.surfaceMeshes[altKey];
                if (!mesh) return;
                const posAttr = mesh.geometry.attributes.position;
                for (let i = 0; i < posAttr.count; i++) {
                    const vx = posAttr.getX(i); // [-6.5 .. 6.5] -> U [10 .. 750]
                    const vz = posAttr.getZ(i); // [-4.5 .. 4.5] -> S_MB [0.5 .. 18]
                    const uVal = Math.round(((vx + 6.5) / 13) * 740 + 10);
                    const sVal = Number((((vz + 4.5) / 9) * 17.5 + 0.5).toFixed(1));
                    const pt = calculateAlternative(altKey, {
                        concurrentUsers: uVal,
                        payloadSizeMb: sVal,
                        repoComplexityFiles: sim.inputs.repoComplexityFiles,
                        aiDepthFactor: sim.inputs.aiDepthFactor,
                        trafficBurstFactor: sim.inputs.trafficBurstFactor
                    }, sim.projectConfig);
                    const yVal = -2.6 + Math.min(5.8, (pt.metrics.latencyMs / slaCap) * 4.2);
                    posAttr.setY(i, yVal);
                }
                posAttr.needsUpdate = true;

                // Actualizar esfera del punto de operación actual
                const mk = Sim3DEngine.surfaceMarkers[altKey];
                const curAlt = sim.alternatives.find(a => a.alternativeId === altKey);
                if (mk && curAlt) {
                    const mx = ((Math.min(750, sim.inputs.concurrentUsers) - 10) / 740) * 13 - 6.5;
                    const mz = ((Math.min(18, sim.inputs.payloadSizeMb) - 0.5) / 17.5) * 9 - 4.5;
                    const my = -2.6 + Math.min(5.8, (curAlt.metrics.latencyMs / slaCap) * 4.2);
                    mk.position.set(mx, my, mz);
                }
            });

            if (Sim3DEngine.surfaceSlaPlane) {
                Sim3DEngine.surfaceSlaPlane.position.y = -2.6 + Math.min(5.6, (reqs.maxLatencyMs / slaCap) * 4.2);
            }
        }

        // 4. Dibujar los 2 Canvas 3D Especializados (Superficie de Latencia 3D y Prisma Radar 3D MCDA)
        draw3DSurfaceCanvas(sim);
        draw3DRadarCanvas(sim);
    }

    // Proyección Isométrica 3D en Canvas: Curvas de Saturación M/M/c + Plano de Corte SLA (Sección 1)
    function draw3DSurfaceCanvas(sim) {
        const canvas = document.getElementById('sim-canvas-3d-surface');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const reqs = sim.projectConfig.qualityRequirements;
        const badge = document.getElementById('sim-3d-surf-badge');
        if (badge) {
            badge.textContent = `Plano SLA: ≤ ${reqs.maxLatencyMs} ms | RAM ≤ ${sim.projectConfig.constraints.maxMemoryGb} GB`;
        }

        const angle = Sim3DEngine.surfaceCanvasAngle;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const project3D = (nx, ny, nz) => {
            // nx, ny, nz en [-1 .. 1]
            const rx = nx * cosA - nz * sinA;
            const rz = nx * sinA + nz * cosA;
            const scale = 155 / (3.4 + rz * 0.55);
            return {
                x: (w * 0.5) + rx * scale * 1.35,
                y: (h * 0.76) - ny * scale * 0.82 + rz * scale * 0.24
            };
        };

        // Dibujar grilla de piso 3D
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1;
        for (let i = -1; i <= 1.01; i += 0.5) {
            const p1 = project3D(i, 0, -1);
            const p2 = project3D(i, 0, 1);
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

            const q1 = project3D(-1, 0, i);
            const q2 = project3D(1, 0, i);
            ctx.beginPath(); ctx.moveTo(q1.x, q1.y); ctx.lineTo(q2.x, q2.y); ctx.stroke();
        }

        // Dibujar Plano 3D de Techo SLA (reqs.maxLatencyMs)
        const maxDisplayLat = Math.max(2200, reqs.maxLatencyMs * 1.45, ...sim.alternatives.map(a => a.metrics.latencyMs));
        const slaY = Math.min(1.35, (reqs.maxLatencyMs / maxDisplayLat) * 1.25);
        const c1 = project3D(-1, slaY, -1);
        const c2 = project3D(1, slaY, -1);
        const c3 = project3D(1, slaY, 1);
        const c4 = project3D(-1, slaY, 1);

        ctx.fillStyle = 'rgba(251, 191, 36, 0.13)';
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.75)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(c1.x, c1.y); ctx.lineTo(c2.x, c2.y); ctx.lineTo(c3.x, c3.y); ctx.lineTo(c4.x, c4.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Dibujar las 3 cintas 3D de Latencia vs Usuarios Concurrentes (U = 15..700)
        const altConfigs = [
            { key: 'MONOLITH_MVC', z: -0.65, color: '#38BDF8', label: 'Monolito' },
            { key: 'MICROSERVICES_K8S', z: 0.0, color: '#818CF8', label: 'K8s' },
            { key: 'EDA_SERVERLESS', z: 0.65, color: '#34D399', label: 'EDA' }
        ];

        altConfigs.forEach(ac => {
            ctx.strokeStyle = ac.color;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            const steps = 16;
            for (let s = 0; s <= steps; s++) {
                const u = 15 + (s / steps) * 685;
                const nx = (s / steps) * 2 - 1;
                const ptSim = calculateAlternative(ac.key, {
                    ...sim.inputs,
                    concurrentUsers: u
                }, sim.projectConfig);
                const ny = Math.min(1.42, (ptSim.metrics.latencyMs / maxDisplayLat) * 1.25);
                const pt = project3D(nx, ny, ac.z);
                if (s === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            }
            ctx.stroke();

            // Punto de operación actual con pin 3D vertical
            const curAlt = sim.alternatives.find(a => a.alternativeId === ac.key);
            if (curAlt) {
                const curNx = Math.min(1, Math.max(-1, ((sim.inputs.concurrentUsers - 15) / 685) * 2 - 1));
                const curNy = Math.min(1.42, (curAlt.metrics.latencyMs / maxDisplayLat) * 1.25);
                const basePt = project3D(curNx, 0, ac.z);
                const topPt = project3D(curNx, curNy, ac.z);

                ctx.strokeStyle = curAlt.compliance.latencyOk ? ac.color : '#FB7185';
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.moveTo(basePt.x, basePt.y); ctx.lineTo(topPt.x, topPt.y); ctx.stroke();

                ctx.fillStyle = curAlt.compliance.latencyOk ? ac.color : '#FB7185';
                ctx.beginPath(); ctx.arc(topPt.x, topPt.y, 4.5, 0, Math.PI * 2); ctx.fill();

                ctx.fillStyle = '#F8FAFC';
                ctx.font = '700 10px "JetBrains Mono", monospace';
                ctx.fillText(`${curAlt.metrics.latencyMs}ms`, topPt.x + 6, topPt.y - 4);
            }
        });
    }

    // Prisma / Radar Volumétrico 3D Multicriterio (Sensible a los 5 Pesos de la Sección 1)
    function draw3DRadarCanvas(sim) {
        const canvas = document.getElementById('sim-canvas-3d-radar');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        const badge = document.getElementById('sim-3d-radar-badge');
        if (badge) {
            badge.textContent = `Ganadora: ${sim.winner.shortName} (${sim.winner.mcda.finalScore}/100)`;
            badge.style.color = sim.winner.color;
        }

        const weights = sim.projectConfig.decisionWeights;
        const axes = [
            { label: `Latencia (${Math.round(weights.latency * 100)}%)`, key: 'latencyScore' },
            { label: `Escala (${Math.round(weights.scalability * 100)}%)`, key: 'scalabilityScore' },
            { label: `SLA (${Math.round(weights.availability * 100)}%)`, key: 'availabilityScore' },
            { label: `Costo/RAM (${Math.round(weights.efficiencyAndCost * 100)}%)`, key: 'efficiencyAndCostScore' },
            { label: `Seg/Cont (${Math.round(weights.securityAndContainers * 100)}%)`, key: 'securityAndContainersScore' }
        ];

        const cx = w * 0.5;
        const cy = h * 0.56;
        const radiusX = 112;
        const radiusY = 54; // Perspectiva 3D inclinada
        const rot = Sim3DEngine.radarCanvasAngle;

        // Dibujar anillos concéntricos 3D y ejes
        [0.35, 0.68, 1.0].forEach(level => {
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            axes.forEach((_, idx) => {
                const a = (idx / axes.length) * Math.PI * 2 + rot;
                const px = cx + Math.cos(a) * radiusX * level;
                const py = cy + Math.sin(a) * radiusY * level;
                if (idx === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            });
            ctx.closePath();
            ctx.stroke();
        });

        axes.forEach((ax, idx) => {
            const a = (idx / axes.length) * Math.PI * 2 + rot;
            const px = cx + Math.cos(a) * radiusX;
            const py = cy + Math.sin(a) * radiusY;
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();

            const lx = cx + Math.cos(a) * (radiusX + 34);
            const ly = cy + Math.sin(a) * (radiusY + 18);
            ctx.fillStyle = '#CBD5E1';
            ctx.font = '700 9.5px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(ax.label, lx, ly);
        });

        // Dibujar prismas 3D extruidos para cada alternativa
        sim.alternatives.forEach((alt, altIdx) => {
            const zExtrude = (alt.mcda.finalScore / 100) * 22 + (altIdx * 3);
            const ptsBase = [];
            const ptsTop = [];

            axes.forEach((ax, idx) => {
                const a = (idx / axes.length) * Math.PI * 2 + rot;
                const valRatio = Math.max(0.12, (alt.mcda[ax.key] || 50) / 100);
                const bx = cx + Math.cos(a) * radiusX * valRatio;
                const by = cy + Math.sin(a) * radiusY * valRatio;
                ptsBase.push({ x: bx, y: by });
                ptsTop.push({ x: bx, y: by - zExtrude });
            });

            // Paredes verticales 3D
            ctx.strokeStyle = alt.color + '66';
            ctx.lineWidth = 1;
            for (let i = 0; i < ptsBase.length; i++) {
                ctx.beginPath();
                ctx.moveTo(ptsBase[i].x, ptsBase[i].y);
                ctx.lineTo(ptsTop[i].x, ptsTop[i].y);
                ctx.stroke();
            }

            // Cara superior del prisma 3D
            ctx.fillStyle = alt.color + '28';
            ctx.strokeStyle = alt.color;
            ctx.lineWidth = alt.alternativeId === sim.winner.alternativeId ? 2.4 : 1.4;
            ctx.beginPath();
            ptsTop.forEach((p, idx) => {
                if (idx === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        });
    }

    // ============================================================
    // 6. GESTIÓN DE ESCENARIOS, PERFILES Y EVENTOS INTERACTIVOS
    // ============================================================
    function showSimFeedback(msg, isError = false) {
        const badge = document.getElementById('sim-config-live-badge');
        if (badge) {
            badge.textContent = isError ? '⚠ Alerta Validación' : '● Actualizado en Vivo';
            badge.style.color = isError ? '#FB7185' : '#34D399';
            badge.style.borderColor = isError ? 'rgba(251,113,133,.5)' : 'rgba(52,211,153,.4)';
        }

        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            const toast = document.createElement('div');
            toast.style.cssText = `padding:.75rem 1.1rem;border-radius:.75rem;font-size:.78rem;font-weight:700;display:flex;align-items:center;gap:.55rem;box-shadow:0 10px 25px rgba(0,0,0,.6);margin-bottom:.5rem;border:1px solid ${isError ? '#F43F5E' : '#38BDF8'};background:${isError ? 'rgba(136,19,55,.95)' : 'rgba(15,23,42,.96)'};color:#F8FAFC;z-index:9999;pointer-events:auto;`;
            toast.innerHTML = `<i class="fa-solid ${isError ? 'fa-triangle-exclamation' : 'fa-bolt'}" style="color:${isError ? '#FB7185' : '#34D399'};"></i><span>${msg}</span>`;
            toastContainer.appendChild(toast);
            setTimeout(() => { toast.remove(); }, 3200);
        }
    }

    function highlightActivePresetButton(activeKey) {
        document.querySelectorAll('[data-sim-preset]').forEach(btn => {
            const key = btn.getAttribute('data-sim-preset');
            if (key === activeKey) {
                btn.style.background = 'rgba(56, 189, 248, 0.22)';
                btn.style.borderColor = '#38BDF8';
                btn.style.color = '#FFFFFF';
                btn.style.boxShadow = '0 0 14px rgba(56, 189, 248, 0.35)';
            } else {
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
                btn.style.boxShadow = '';
            }
        });
    }

    function highlightActiveConfigPresetButton(activeKey) {
        document.querySelectorAll('[data-sim-config-preset]').forEach(btn => {
            const key = btn.getAttribute('data-sim-config-preset');
            if (key === activeKey) {
                btn.style.background = 'rgba(52, 211, 153, 0.2)';
                btn.style.borderColor = '#34D399';
                btn.style.color = '#FFFFFF';
            } else {
                btn.style.background = '';
                btn.style.borderColor = '';
                btn.style.color = '';
            }
        });
    }

    function applyConfigPreset(presetKey, silent = false) {
        const cfg = CONFIG_PRESETS[presetKey];
        if (!cfg) return;

        isInvalidDemoActive = false;
        resetTestInvalidButtonLabel();
        highlightActiveConfigPresetButton(presetKey);

        const setField = (id, rangeId, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
            if (rangeId) {
                const rEl = document.getElementById(rangeId);
                if (rEl) rEl.value = val;
            }
        };

        setField('sim-proj-name', null, cfg.projName);
        setField('sim-proj-users', null, cfg.projUsers);
        setField('sim-req-latency', 'sim-range-req-latency', cfg.maxLatencyMs);
        setField('sim-req-availability', 'sim-range-req-availability', cfg.minAvailabilityPct);
        setField('sim-req-scalability', 'sim-range-req-scalability', cfg.minScalabilityScore);
        setField('sim-con-budget', 'sim-range-con-budget', cfg.maxMonthlyBudgetUsd);
        setField('sim-con-memory', 'sim-range-con-memory', cfg.maxMemoryGb);

        setField('sim-weight-latency', null, cfg.weights.latency);
        setField('sim-weight-scalability', null, cfg.weights.scalability);
        setField('sim-weight-availability', null, cfg.weights.availability);
        setField('sim-weight-cost', null, cfg.weights.cost);
        setField('sim-weight-security', null, cfg.weights.security);

        sanitizeOutOfBoundsDomFields();
        const state = readFormState();
        const validation = validateInputs(state.rawValidationData);
        renderValidationBanner(validation);
        if (validation.valid) {
            const sim = executeSimulation(state.inputs, state.projectConfig);
            renderSimulationOutput(sim, cfg.label);
            if (!silent) {
                showSimFeedback(`${cfg.label} aplicado → Ganadora: ${sim.winner.shortName} (${sim.winner.mcda.finalScore} pts)`);
            }
        }
    }

    function applyScenarioPreset(presetKey, silent = false) {
        const preset = PRESET_SCENARIOS[presetKey];
        if (!preset) return;

        isInvalidDemoActive = false;
        resetTestInvalidButtonLabel();
        activePresetKey = presetKey;
        highlightActivePresetButton(presetKey);

        sanitizeOutOfBoundsDomFields();

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
            if (!silent) {
                showSimFeedback(`${preset.badge} ejecutado → Ganadora: ${sim.winner.shortName} (${sim.winner.mcda.finalScore} pts)`);
            }
        }
    }

    function triggerInvalidInputDemo() {
        const btnTestInvalid = document.getElementById('btn-sim-test-invalid');
        isInvalidDemoActive = true;
        const elReq = document.getElementById('sim-req-latency');
        if (elReq) elReq.value = 15;
        if (btnTestInvalid) {
            btnTestInvalid.innerHTML = '<i class="fa-solid fa-rotate-left" style="margin-right:.35rem;color:#34D399;"></i>Restaurar Estado Válido';
            btnTestInvalid.style.background = 'rgba(52, 211, 153, 0.16)';
        }
        const validation = validateInputs({
            concurrentUsers: -25,
            payloadSizeMb: 45,
            repoComplexityFiles: 0,
            aiDepthFactor: 9,
            trafficBurstFactor: 8.5,
            maxLatencyMs: 15,
            minAvailabilityPct: 105,
            minScalabilityScore: 5,
            maxMonthlyBudgetUsd: 2,
            maxMemoryGb: 0.05
        });
        renderValidationBanner(validation);
        const alertEl = document.getElementById('sim-validation-alert');
        if (alertEl) alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        showSimFeedback('Control de validación activado: entradas fuera de rango bloqueadas.', true);
    }

    function executeDocumentedTestCase(testId) {
        if (testId === '1') {
            applyConfigPreset('STANDARD', true);
            applyScenarioPreset('SINGLE_MACHINE_LIGHT', true);
            showSimFeedback('TEST-SIM-01 ejecutado: U=18, S=1MB, N=35 → Monolito gana en latencia (168 ms) y RAM (212 MB).');
        } else if (testId === '2') {
            applyConfigPreset('STANDARD', true);
            applyScenarioPreset('ENTERPRISE_SCALE', true);
            showSimFeedback('TEST-SIM-02 ejecutado: U=320, S=6MB, N=240 → Monolito satura (>100% ρ), Microservicios K8s escala a 6 pods.');
        } else if (testId === '3') {
            applyConfigPreset('STANDARD', true);
            applyScenarioPreset('EXTREME_STRESS_PUSH', true);
            showSimFeedback('TEST-SIM-03 ejecutado: U=650, S=14MB, Ráfaga=2.5x → EDA Serverless absorbe ráfaga con 14 workers (SLA 99.88%).');
        } else if (testId === '4') {
            applyConfigPreset('BOOTSTRAPPED', true);
            applyScenarioPreset('BASELINE', true);
            const bNum = document.getElementById('sim-con-budget');
            const bRng = document.getElementById('sim-range-con-budget');
            if (bNum) bNum.value = 45;
            if (bRng) bRng.value = 45;
            triggerInteractiveRun('Prueba 4 (TEST-SIM-04): Restricción Presupuesto $45 USD/mes');
            showSimFeedback('TEST-SIM-04 ejecutado: Presupuesto = $45 USD/mes → Microservicios K8s penalizado por exceso de costo.');
        } else if (testId === '5') {
            triggerInvalidInputDemo();
        }
    }

    function runLive3DLoadSweep() {
        const btn = document.getElementById('btn-sim-3d-live-sweep');
        if (liveSweepInterval) {
            clearInterval(liveSweepInterval);
            liveSweepInterval = null;
            if (btn) btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:.35rem;"></i>Simular Ráfaga 3D en Vivo';
            return;
        }

        clearInvalidDemoState();
        sanitizeOutOfBoundsDomFields();

        if (btn) {
            btn.innerHTML = '<i class="fa-solid fa-stop" style="margin-right:.35rem;color:#FB7185;"></i>Detener Barrido 3D';
        }
        showSimFeedback('Iniciando barrido dinámico 3D de carga (15 → 700 usuarios concurrentes)...');

        const uSlider = document.getElementById('sim-input-users');
        const uLabel = document.getElementById('sim-val-users');
        let currentU = 15;

        liveSweepInterval = setInterval(() => {
            currentU += 35;
            if (currentU > 715) {
                clearInterval(liveSweepInterval);
                liveSweepInterval = null;
                if (btn) btn.innerHTML = '<i class="fa-solid fa-bolt" style="margin-right:.35rem;"></i>Simular Ráfaga 3D en Vivo';
                showSimFeedback('Barrido de estrés 3D completado.');
                return;
            }
            if (uSlider) uSlider.value = currentU;
            if (uLabel) uLabel.textContent = `${currentU} usuarios`;
            triggerInteractiveRun(`Barrido 3D en Vivo (U=${currentU} usuarios)`);
        }, 180);
    }

    function setupSimulatorEvents() {
        // 1. Sliders de Variables de Entrada (Sección 3)
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
                    clearInvalidDemoState();
                    const lbl = document.getElementById(s.label);
                    if (lbl) lbl.textContent = el.value + s.suffix;
                    highlightActivePresetButton('');
                    triggerInteractiveRun('Ajuste Interactivo de Variables de Carga');
                });
            }
        });

        // 2. Sincronización Bidireccional Número <-> Slider en Sección 1 (Configuración y Restricciones)
        const syncedConfigPairs = [
            { numId: 'sim-req-latency', rangeId: 'sim-range-req-latency', label: 'Cambio de Meta Latencia SLA' },
            { numId: 'sim-req-availability', rangeId: 'sim-range-req-availability', label: 'Cambio de Meta Disponibilidad SLA' },
            { numId: 'sim-req-scalability', rangeId: 'sim-range-req-scalability', label: 'Cambio de Meta Escalabilidad' },
            { numId: 'sim-con-budget', rangeId: 'sim-range-con-budget', label: 'Cambio de Tope de Presupuesto Cloud' },
            { numId: 'sim-con-memory', rangeId: 'sim-range-con-memory', label: 'Cambio de Restricción de Memoria RAM' }
        ];

        syncedConfigPairs.forEach(pair => {
            const numEl = document.getElementById(pair.numId);
            const rangeEl = document.getElementById(pair.rangeId);
            if (numEl) {
                const onNumChange = () => {
                    clearInvalidDemoState(pair.numId);
                    if (rangeEl && Number.isFinite(Number(numEl.value))) {
                        rangeEl.value = numEl.value;
                    }
                    highlightActiveConfigPresetButton('');
                    triggerInteractiveRun(pair.label);
                };
                numEl.addEventListener('input', onNumChange);
                numEl.addEventListener('change', onNumChange);
            }
            if (rangeEl) {
                rangeEl.addEventListener('input', () => {
                    clearInvalidDemoState();
                    if (numEl) numEl.value = rangeEl.value;
                    highlightActiveConfigPresetButton('');
                    triggerInteractiveRun(pair.label);
                });
            }
        });

        // 3. Campos de Texto y Pesos de Decisión en Sección 1
        const extraConfigInputs = [
            'sim-proj-name', 'sim-proj-users',
            'sim-weight-latency', 'sim-weight-scalability', 'sim-weight-availability', 'sim-weight-cost', 'sim-weight-security'
        ];
        extraConfigInputs.forEach(cid => {
            const el = document.getElementById(cid);
            if (el) {
                const handler = () => {
                    clearInvalidDemoState();
                    highlightActiveConfigPresetButton('');
                    triggerInteractiveRun('Actualización de Configuración / Pesos (Sección 1)');
                };
                el.addEventListener('input', handler);
                el.addEventListener('change', handler);
            }
        });

        // Botones de Perfiles Rápidos de Sección 1
        document.querySelectorAll('[data-sim-config-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-sim-config-preset');
                applyConfigPreset(key);
            });
        });

        // Botón explícito Recalcular Todo & 3D en Sección 1
        const btnApplyConfig = document.getElementById('btn-sim-apply-config');
        if (btnApplyConfig) {
            btnApplyConfig.addEventListener('click', () => {
                clearInvalidDemoState();
                sanitizeOutOfBoundsDomFields();
                triggerInteractiveRun('Configuración de Sección 1 Aplicada');
                showSimFeedback('Configuración, restricciones SLA, matriz multiescenario y gráficas 3D actualizadas.');
            });
        }

        // Botones de Escenarios Predefinidos (Sección 5)
        document.querySelectorAll('[data-sim-preset]').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.getAttribute('data-sim-preset');
                applyScenarioPreset(key);
            });
        });

        // Botones de las 5 Pruebas Documentadas Interactivas (Sección 10)
        document.querySelectorAll('[data-sim-test-case]').forEach(btn => {
            btn.addEventListener('click', () => {
                const testId = btn.getAttribute('data-sim-test-case');
                executeDocumentedTestCase(testId);
            });
        });

        // Botones de Modo 3D y Cámara 3D
        document.querySelectorAll('[data-sim-3d-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                set3DMode(btn.getAttribute('data-sim-3d-mode'));
            });
        });

        const btnCamIso = document.getElementById('btn-sim-3d-cam-iso');
        if (btnCamIso) btnCamIso.addEventListener('click', () => { Sim3DEngine.camTheta = 0.62; Sim3DEngine.camPhi = 0.48; Sim3DEngine.camRadius = 19.5; });
        const btnCamFront = document.getElementById('btn-sim-3d-cam-front');
        if (btnCamFront) btnCamFront.addEventListener('click', () => { Sim3DEngine.camTheta = 0.0; Sim3DEngine.camPhi = 0.22; Sim3DEngine.camRadius = 18.5; });
        const btnCamTop = document.getElementById('btn-sim-3d-cam-top');
        if (btnCamTop) btnCamTop.addEventListener('click', () => { Sim3DEngine.camTheta = 0.0; Sim3DEngine.camPhi = 1.28; Sim3DEngine.camRadius = 21.0; });
        const btnAutoRot = document.getElementById('btn-sim-3d-autorotate');
        if (btnAutoRot) {
            btnAutoRot.addEventListener('click', () => {
                Sim3DEngine.autoRotate = !Sim3DEngine.autoRotate;
                btnAutoRot.style.color = Sim3DEngine.autoRotate ? '#34D399' : '#94A3B8';
            });
        }

        const btnLiveSweep = document.getElementById('btn-sim-3d-live-sweep');
        if (btnLiveSweep) {
            btnLiveSweep.addEventListener('click', runLive3DLoadSweep);
        }

        // Rotación interactiva en los 2 Canvas 3D laterales
        const surfCanvas = document.getElementById('sim-canvas-3d-surface');
        if (surfCanvas) {
            let draggingSurf = false;
            let lastX = 0;
            surfCanvas.addEventListener('pointerdown', e => { draggingSurf = true; lastX = e.clientX; });
            window.addEventListener('pointermove', e => {
                if (!draggingSurf) return;
                Sim3DEngine.surfaceCanvasAngle += (e.clientX - lastX) * 0.01;
                lastX = e.clientX;
                if (currentSimulationResult) draw3DSurfaceCanvas(currentSimulationResult);
            });
            window.addEventListener('pointerup', () => { draggingSurf = false; });
        }

        const radarCanvas = document.getElementById('sim-canvas-3d-radar');
        if (radarCanvas) {
            let draggingRadar = false;
            let lastX = 0;
            radarCanvas.addEventListener('pointerdown', e => { draggingRadar = true; lastX = e.clientX; });
            window.addEventListener('pointermove', e => {
                if (!draggingRadar) return;
                Sim3DEngine.radarCanvasAngle += (e.clientX - lastX) * 0.012;
                lastX = e.clientX;
                if (currentSimulationResult) draw3DRadarCanvas(currentSimulationResult);
            });
            window.addEventListener('pointerup', () => { draggingRadar = false; });
        }

        // Botón Fijar Escenario de Referencia
        const btnSetBaseline = document.getElementById('btn-sim-set-baseline');
        if (btnSetBaseline) {
            btnSetBaseline.addEventListener('click', () => {
                clearInvalidDemoState();
                sanitizeOutOfBoundsDomFields();
                const state = readFormState();
                const val = validateInputs(state.rawValidationData);
                renderValidationBanner(val);
                if (val.valid) {
                    baselineSnapshot = executeSimulation(state.inputs, state.projectConfig);
                    renderSimulationOutput(baselineSnapshot, 'Nuevo Escenario de Referencia Fijado');
                    const badge = document.getElementById('sim-baseline-status');
                    if (badge) {
                        badge.textContent = `Ref: U=${state.inputs.concurrentUsers}, S=${state.inputs.payloadSizeMb}MB, N=${state.inputs.repoComplexityFiles}`;
                        badge.style.color = '#34D399';
                    }
                    showSimFeedback(`Referencia fijada: U=${state.inputs.concurrentUsers} u, S=${state.inputs.payloadSizeMb} MB`);
                }
            });
        }

        // Botón Ejecutar los 4 Escenarios Comparativos
        const btnRunAll = document.getElementById('btn-sim-run-all-scenarios');
        if (btnRunAll) {
            btnRunAll.addEventListener('click', () => {
                clearInvalidDemoState();
                sanitizeOutOfBoundsDomFields();
                const state = readFormState();
                const val = validateInputs(state.rawValidationData);
                renderValidationBanner(val);
                if (!val.valid) return;
                const currentSim = executeSimulation(state.inputs, state.projectConfig);
                renderSimulationOutput(currentSim, 'Comparativa Multiescenario Ejecutada (4 Escenarios)');
                showSimFeedback('Lote de 4 escenarios re-evaluado bajo las restricciones actuales de la Sección 1.');
            });
        }

        // Botón Probar Control de Entrada Inválida (Conmutador / Restauración Automática)
        const btnTestInvalid = document.getElementById('btn-sim-test-invalid');
        if (btnTestInvalid) {
            btnTestInvalid.addEventListener('click', () => {
                if (isInvalidDemoActive) {
                    isInvalidDemoActive = false;
                    resetTestInvalidButtonLabel();
                    sanitizeOutOfBoundsDomFields();
                    const state = readFormState();
                    const val = validateInputs(state.rawValidationData);
                    renderValidationBanner(val);
                    if (val.valid) {
                        const sim = executeSimulation(state.inputs, state.projectConfig);
                        renderSimulationOutput(sim, 'Estado Válido Restaurado');
                    }
                    showSimFeedback('Datos restaurados y alerta de validación limpiada correctamente.');
                    return;
                }
                triggerInvalidInputDemo();
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
                    `- **Usuarios Previstos:** ${s.projectConfig.targetUsers}`,
                    `- **Versión del Modelo:** ${s.modelVersion || '3.0.0'}`,
                    `- **Hora de Ejecución:** ${s.timestamp}`,
                    `- **Entradas:** U=${s.inputs.concurrentUsers} usuarios | S=${s.inputs.payloadSizeMb} MB | N=${s.inputs.repoComplexityFiles} archivos | IA=${s.inputs.aiDepthFactor} | Ráfaga=${s.inputs.trafficBurstFactor}x`,
                    `- **Restricciones Activas (Sección 1):** Latencia ≤ ${s.projectConfig.qualityRequirements.maxLatencyMs} ms | SLA ≥ ${s.projectConfig.qualityRequirements.minAvailabilityPct}% | Escalabilidad ≥ ${s.projectConfig.qualityRequirements.minScalabilityScore} | Presupuesto ≤ $${s.projectConfig.constraints.maxMonthlyBudgetUsd} USD | RAM ≤ ${s.projectConfig.constraints.maxMemoryGb} GB`,
                    ``,
                    `## Resultados Comparativos por Arquitectura`,
                    `| Alternativa | Latencia P95 | Throughput/Cap | Escalabilidad | Disponibilidad | CPU / RAM | Costo Mensual | Cumple Todo | Puntaje MCDA |`,
                    `| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |`,
                    ...s.alternatives.map(a => `| ${a.shortName} | ${a.metrics.latencyMs} ms | ${a.metrics.throughputRps}/${a.metrics.maxCapacityRps} req/s | ${a.metrics.scalabilityScore}/100 | ${a.metrics.availabilityPct}% | ${a.metrics.cpuUtilizationPct}% / ${a.metrics.memoryUsageMb} MB | $${a.metrics.estimatedMonthlyCostUsd} USD | ${a.compliance.allMandatoryPassed ? 'SÍ' : 'NO'} | **${a.mcda.finalScore}/100** |`),
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

        // Inicialización por defecto
        highlightActiveConfigPresetButton('STANDARD');
        applyScenarioPreset('BASELINE', true);
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
