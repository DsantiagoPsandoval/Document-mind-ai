/**
 * DOCUMIND AI — EDA AUTOMATED TEST SUITE
 * Tests: Event publishing, consumption, idempotency, retries, dead letter queue,
 * crash recovery, multi-stage async flow, metrics calculation, and SSE stream.
 */

const assert = require('assert');
const {
    eventBus,
    eventStore,
    workerManager,
    eventMonitor,
    EVENT_TYPES,
    EVENT_STATUS,
    createEvent,
    validateEvent
} = require('../services/eda');

async function runEdaTests() {
    console.log('\n⚡ INICIANDO SUITE DE PRUEBAS EDA — ARQUITECTURA ORIENTADA A EVENTOS');
    console.log('============================================================');

    let passed = 0;
    let failed = 0;

    async function test(name, fn) {
        try {
            await fn();
            console.log(`  ✔ [PASS] EDA: ${name}`);
            passed++;
        } catch (err) {
            console.error(`  ✖ [FAIL] EDA: ${name}: ${err.message}`);
            failed++;
        }
    }

    // 1. Event Contract & Schema Validation
    await test('Validación de contratos y esquemas estrictos de eventos', async () => {
        const ev = createEvent(EVENT_TYPES.REPOSITORY_REGISTERED, {
            repoUrl: 'https://github.com/expressjs/express',
            branch: 'master'
        }, {
            correlation_id: 'corr_test_1',
            aggregate_id: 'express'
        });

        assert.strictEqual(ev.event_type, EVENT_TYPES.REPOSITORY_REGISTERED);
        assert.strictEqual(ev.status, EVENT_STATUS.PENDING);
        assert.strictEqual(ev.retry_count, 0);
        assert.ok(ev.event_id, 'Debe generar event_id UUID');
        assert.ok(ev.created_at, 'Debe registrar timestamp ISO');
        assert.strictEqual(validateEvent(ev), true, 'Debe validar contrato');

        // Invalid event check
        assert.throws(() => validateEvent({}), /event_type/);
    });

    // 2. Secret Redaction in Payloads
    await test('Sanitización automática de secretos en payloads de eventos', async () => {
        const sensitivePayload = {
            repoUrl: 'https://github.com/test/repo',
            geminiKey: 'AIzaSyTestKey1234567890ABCDEFGHIJKLMN',
            bearerToken: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
            normalData: 'Información pública de arquitectura'
        };

        const ev = createEvent(EVENT_TYPES.ANALYSIS_REQUESTED, sensitivePayload);
        assert.ok(!ev.payload.geminiKey.includes('1234567890'), 'Clave API debe enmascararse');
        assert.ok(!ev.payload.bearerToken.includes('eyJhbGci'), 'Bearer token debe enmascararse');
        assert.strictEqual(ev.payload.normalData, 'Información pública de arquitectura');
    });

    // 3. Publishing and Consumption
    await test('Publicación y consumo desacoplado en Event Bus', async () => {
        const correlationId = `corr_pub_${Date.now()}`;
        let consumedEvent = null;

        const unsubscribe = eventBus.subscribe(EVENT_TYPES.SIMULATION_STARTED, async (event) => {
            consumedEvent = event;
        }, { name: 'TestSimulationConsumer' });

        const published = await eventBus.publish(EVENT_TYPES.SIMULATION_STARTED, {
            input: { concurrency: 60, repoSizeMB: 2.5, astFiles: 85 }
        }, {
            correlation_id: correlationId,
            aggregate_id: 'test_sim_agg'
        });

        // Wait for async dispatch
        await new Promise(r => setTimeout(r, 200));

        assert.ok(consumedEvent, 'El consumidor debió recibir el evento');
        assert.strictEqual(consumedEvent.event_id, published.event_id);
        assert.strictEqual(consumedEvent.correlation_id, correlationId);
        unsubscribe();
    });

    // 4. Idempotency Guard (Deduplication)
    await test('Procesamiento idempotente y descarte de eventos duplicados', async () => {
        const testEventId = `ev_idemp_${Date.now()}`;
        let processCount = 0;

        const ev = createEvent(EVENT_TYPES.USER_SESSION_STARTED, {
            userId: 'user_test_99'
        }, {
            event_id: testEventId,
            correlation_id: `corr_idemp_${Date.now()}`,
            aggregate_id: 'user_test_99'
        });

        await eventStore.saveEvent(ev);

        const unsubscribe = eventBus.subscribe(EVENT_TYPES.USER_SESSION_STARTED, async () => {
            processCount++;
        }, { name: 'IdempotentConsumer' });

        // First trigger
        eventBus.emit(EVENT_TYPES.USER_SESSION_STARTED, ev);
        await new Promise(r => setTimeout(r, 200));

        assert.strictEqual(processCount, 1, 'Debe procesarse la primera vez');
        assert.strictEqual(eventStore.isDuplicate(testEventId), true, 'Debe marcarse como procesado');

        // Second trigger with identical event_id
        eventBus.emit(EVENT_TYPES.USER_SESSION_STARTED, ev);
        await new Promise(r => setTimeout(r, 200));

        assert.strictEqual(processCount, 1, 'No debe procesarse por segunda vez');
        unsubscribe();
    });

    // 5. Automatic Retries with Exponential Backoff
    await test('Reintentos automáticos con incremento exponencial ante fallos transitorios', async () => {
        const testEventId = `ev_retry_${Date.now()}`;
        let attempts = 0;

        const ev = createEvent('test.transient.error', { task: 'flaky_job' }, {
            event_id: testEventId,
            max_retries: 2
        });
        await eventStore.saveEvent(ev);

        const unsubscribe = eventBus.subscribe('test.transient.error', async () => {
            attempts++;
            if (attempts < 2) {
                throw new Error('Fallo transitorio simulado de red');
            }
            return 'OK';
        }, { name: 'RetryConsumer' });

        // Trigger execution
        eventBus.emit('test.transient.error', ev);

        // Wait for handler to fail and schedule backoff
        await new Promise(r => setTimeout(r, 250));

        const stored = eventStore.localEvents.find(e => e.event_id === testEventId);
        assert.strictEqual(stored.status, EVENT_STATUS.FAILED, 'Estado transitorio debe ser FAILED');
        assert.strictEqual(stored.retry_count, 1, 'Contador de reintentos debe ser 1');
        assert.ok(stored.next_retry_at, 'Debe programar next_retry_at');

        unsubscribe();
    });

    // 6. Dead Letter Queue (DLQ)
    await test('Transición a Dead Letter Queue al agotar el número máximo de reintentos', async () => {
        const dlqEventId = `ev_dlq_${Date.now()}`;
        const ev = createEvent('test.fatal.failure', { critical: true }, {
            event_id: dlqEventId,
            retry_count: 2,
            max_retries: 2 // Maximum reached on next fail
        });

        await eventStore.saveEvent(ev);

        const unsubscribe = eventBus.subscribe('test.fatal.failure', async () => {
            throw new Error('Error fatal permanente no recuperable');
        }, { name: 'DlqConsumer' });

        eventBus.emit('test.fatal.failure', ev);
        await new Promise(r => setTimeout(r, 250));

        const stored = eventStore.localEvents.find(e => e.event_id === dlqEventId);
        assert.strictEqual(stored.status, EVENT_STATUS.DEAD_LETTER, 'Estado debe ser DEAD_LETTER');

        const dlqEntry = eventStore.localDLQ.find(d => d.original_event_id === dlqEventId);
        assert.ok(dlqEntry, 'Debe registrarse en la colección Dead Letter');
        assert.ok(dlqEntry.error_stack.includes('Error fatal permanente'), 'Debe conservar la traza del error');

        unsubscribe();
    });

    // 7. Crash Recovery upon Server Restart
    await test('Recuperación ante reinicio del servidor (reanudación de tareas PROCESSING a PENDING)', async () => {
        const orphanEvent = createEvent(EVENT_TYPES.ANALYSIS_REQUESTED, { orphan: true }, {
            event_id: `ev_orphan_${Date.now()}`,
            status: EVENT_STATUS.PROCESSING
        });

        await eventStore.saveEvent(orphanEvent);
        assert.strictEqual(orphanEvent.status, EVENT_STATUS.PROCESSING);

        // Simulate crash recovery
        const recovered = await eventStore.recoverPendingEvents();
        assert.ok(recovered >= 1, 'Debe recuperar al menos 1 tarea huérfana');

        const updated = eventStore.localEvents.find(e => e.event_id === orphanEvent.event_id);
        assert.strictEqual(updated.status, EVENT_STATUS.PENDING, 'Debe restablecerse a PENDING');
    });

    // 8. Real-Time Correlation SSE Stream Listener
    await test('Transmisión de eventos en tiempo real mediante Correlation ID (SSE)', async () => {
        const corrId = `corr_sse_${Date.now()}`;
        const receivedUpdates = [];

        const unsubscribe = eventBus.subscribeToCorrelation(corrId, (event) => {
            receivedUpdates.push(event);
        });

        await eventBus.publish(EVENT_TYPES.REPOSITORY_REGISTERED, { repoUrl: 'https://github.com/demo/repo' }, {
            correlation_id: corrId,
            aggregate_id: 'demo/repo'
        });

        await eventBus.publish(EVENT_TYPES.ANALYSIS_STARTED, { files: 12 }, {
            correlation_id: corrId,
            aggregate_id: 'demo/repo'
        });

        await new Promise(r => setTimeout(r, 200));

        assert.strictEqual(receivedUpdates.length, 2, 'El suscriptor debe recibir ambos eventos');
        assert.strictEqual(receivedUpdates[0].event_type, EVENT_TYPES.REPOSITORY_REGISTERED);
        assert.strictEqual(receivedUpdates[1].event_type, EVENT_TYPES.ANALYSIS_STARTED);

        unsubscribe();
    });

    // 9. Full Multi-Stage Asynchronous Pipeline
    await test('Flujo Asíncrono Completo: Repo Import -> AST Analysis -> Docs -> Security', async () => {
        // Initialize workers
        await workerManager.initialize();

        const corrId = `corr_pipeline_${Date.now()}`;
        const capturedEvents = [];

        eventBus.subscribeToCorrelation(corrId, (ev) => {
            capturedEvents.push(ev.event_type);
        });

        const mockProjectData = {
            repository: {
                name: 'eda-microservice',
                fullName: 'demo/eda-microservice',
                description: 'Microservicio desacoplado para pruebas EDA',
                defaultBranch: 'main',
                primaryLanguage: 'JavaScript'
            },
            stats: { totalFiles: 5, relevantFilesCount: 5 },
            detectedLanguages: ['JavaScript'],
            detectedFrameworks: ['Express.js'],
            detectedDatabases: ['PostgreSQL'],
            detectedInfra: ['Docker'],
            endpoints: [
                { method: 'GET', path: '/api/v1/orders', file: 'orders.js', requiresAuth: false },
                { method: 'POST', path: '/api/v1/orders', file: 'orders.js', requiresAuth: true }
            ],
            dataModels: [
                { name: 'orders', fields: [{ name: 'id', type: 'UUID', isPk: true }, { name: 'total', type: 'DECIMAL' }] }
            ],
            prioritizedFiles: [
                { path: 'server.js', size: 1024, category: 'BACKEND', content: 'app.get("/api/v1/orders", () => {});' }
            ]
        };

        // Publish analysis.completed to drive downstream workers
        await eventBus.publish(EVENT_TYPES.ANALYSIS_COMPLETED, {
            projectData: mockProjectData,
            categories: { product: true, architecture: true, database: true }
        }, {
            correlation_id: corrId,
            aggregate_id: 'eda-microservice'
        });

        // Wait for workers to complete documentation and security scanning
        await new Promise(r => setTimeout(r, 3000));

        assert.ok(capturedEvents.includes(EVENT_TYPES.ANALYSIS_COMPLETED), 'Pipeline debe incluir analysis.completed');
        assert.ok(capturedEvents.includes(EVENT_TYPES.DOCUMENTATION_GENERATED), 'Worker debe generar y emitir documentation.generated');
        assert.ok(capturedEvents.includes(EVENT_TYPES.SECURITY_SCAN_COMPLETED), 'Worker de seguridad debe emitir security.scan.completed');
    });

    // 10. Event Telemetry & Monitoring Metrics Calculation
    await test('Cálculo de métricas reales de telemetría y monitoreo de eventos', async () => {
        const metricsData = eventMonitor.getDashboardMetrics();

        assert.ok(typeof metricsData.metrics.totalEvents === 'number');
        assert.ok(typeof metricsData.metrics.completed === 'number');
        assert.ok(typeof metricsData.metrics.deadLetterQueue === 'number');
        assert.ok(typeof metricsData.metrics.successRatePct === 'number');
        assert.ok(Array.isArray(metricsData.recentEvents));
        assert.ok(metricsData.availableEventTypes.includes(EVENT_TYPES.REPOSITORY_REGISTERED));
    });

    console.log('============================================================');
    console.log(`RESULTADOS EDA: ${passed} exitosas, ${failed} fallidas.\n`);

    if (failed > 0) {
        throw new Error(`Se presentaron ${failed} fallas en la suite EDA.`);
    }
}

if (require.main === module) {
    runEdaTests().then(() => process.exit(0)).catch(() => process.exit(1));
}

module.exports = { runEdaTests };
