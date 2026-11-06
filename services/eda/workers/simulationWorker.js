/**
 * DOCUMIND AI — EDA SIMULATION WORKER
 * Consumes: simulation.started
 * Produces: simulation.completed, simulation.failed
 */

const { EVENT_TYPES } = require('../eventContract');
const { runArchitectureSimulation } = require('../../simulator/architectureSimulator');

function initSimulationWorker(eventBus) {
    eventBus.subscribe(EVENT_TYPES.SIMULATION_STARTED, async (event) => {
        const { input, scenarioName = 'Simulación' } = event.payload;
        if (!input) {
            throw new Error('Parámetros de entrada de simulación ausentes.');
        }

        console.log(`[Worker:Simulation] Ejecutando simulación arquitectónica M/M/c (${scenarioName}) [Corr: ${event.correlation_id}]`);

        const result = runArchitectureSimulation(input);

        await eventBus.publish(EVENT_TYPES.SIMULATION_COMPLETED, {
            scenarioName,
            bestAlternative: result.bestAlternative,
            scores: result.results?.map(r => ({
                id: r.id,
                name: r.name,
                score: r.score,
                latencyP95: r.latencyP95,
                costMonthlyUSD: r.costMonthlyUSD,
                slaAvailability: r.slaAvailability
            })),
            timestamp: new Date().toISOString()
        }, {
            correlation_id: event.correlation_id,
            causation_id: event.event_id,
            aggregate_id: event.aggregate_id,
            user_id: event.user_id
        });

        console.log(`[Worker:Simulation] Simulación completada. Alternativa recomendada: ${result.bestAlternative?.name} (${result.bestAlternative?.score} pts)`);
        return result;
    }, {
        name: 'SimulationWorker',
        timeoutMs: 15000
    });
}

module.exports = { initSimulationWorker };
