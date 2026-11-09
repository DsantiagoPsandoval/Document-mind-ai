/**
 * services/plans/planService.js
 * Sistema Centralizado de Planes, Cuotas y Permisos de DocuMind AI SaaS
 */

const PLAN_TIERS = {
    FREE: 'free',
    PRO: 'pro',
    ENTERPRISE: 'enterprise'
};

const PLAN_DEFINITIONS = {
    [PLAN_TIERS.FREE]: {
        id: 'free',
        name: 'Plan Free — Developer',
        priceMonthlyUSD: 0,
        priceAnnualUSD: 0,
        limits: {
            publicReposPerMonth: 3,
            privateReposPerMonth: 0,
            allowPrivateRepos: false,
            allowWordExport: false,
            allowPdfExport: false,
            allowMarkdownExport: true,
            allowHtmlExport: true,
            allowPullRequestWebhooks: false,
            allowBlastRadius: false,
            allowByok: false,
            allowZeroRetention: false,
            allowWhiteLabel: false,
            allowOrganizations: false,
            maxOrgMembers: 1,
            docModulesIncluded: 4 // Standard: PRD, Architecture, C4, OpenAPI
        }
    },
    [PLAN_TIERS.PRO]: {
        id: 'pro',
        name: 'Plan Pro — Profesional',
        priceMonthlyUSD: 29,
        priceAnnualUSD: 279,
        limits: {
            publicReposPerMonth: Infinity,
            privateReposPerMonth: Infinity,
            allowPrivateRepos: true,
            allowWordExport: true,
            allowPdfExport: true,
            allowMarkdownExport: true,
            allowHtmlExport: true,
            allowPullRequestWebhooks: false,
            allowBlastRadius: true,
            allowByok: false,
            allowZeroRetention: false,
            allowWhiteLabel: false,
            allowOrganizations: false,
            maxOrgMembers: 1,
            docModulesIncluded: 11 // All 11 technical modules
        }
    },
    [PLAN_TIERS.ENTERPRISE]: {
        id: 'enterprise',
        name: 'Plan Enterprise — Corporativo',
        priceMonthlyUSD: 499,
        priceAnnualUSD: 4788,
        limits: {
            publicReposPerMonth: Infinity,
            privateReposPerMonth: Infinity,
            allowPrivateRepos: true,
            allowWordExport: true,
            allowPdfExport: true,
            allowMarkdownExport: true,
            allowHtmlExport: true,
            allowPullRequestWebhooks: true,
            allowBlastRadius: true,
            allowByok: true,
            allowZeroRetention: true,
            allowWhiteLabel: true,
            allowOrganizations: true,
            maxOrgMembers: 50,
            docModulesIncluded: 11
        }
    }
};

// Almacén en memoria de suscripciones y cuotas (sincronizable con Supabase)
const inMemorySubscriptions = new Map();
const inMemoryUsage = new Map();

function getCurrentPeriodYM() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Superusuarios y cuentas Enterprise vitalicias
const SUPERUSER_IDENTIFIERS = new Set([
    'danisan2326@gmail.com'
]);

inMemorySubscriptions.set('danisan2326@gmail.com', {
    userId: 'danisan2326@gmail.com',
    plan: PLAN_TIERS.ENTERPRISE,
    status: 'active',
    billingCycle: 'enterprise_lifetime',
    periodEnd: '2099-12-31T23:59:59.999Z',
    isSuperAdmin: true
});

class PlanService {
    /**
     * Obtiene el plan asignado a un usuario
     */
    static async getUserSubscription(userId) {
        const idLower = String(userId || '').toLowerCase().trim();
        if (idLower === 'danisan2326@gmail.com' || SUPERUSER_IDENTIFIERS.has(idLower)) {
            return {
                userId: 'danisan2326@gmail.com',
                plan: PLAN_TIERS.ENTERPRISE,
                status: 'active',
                billingCycle: 'enterprise_lifetime',
                periodEnd: '2099-12-31T23:59:59.999Z',
                isSuperAdmin: true,
                definition: PLAN_DEFINITIONS[PLAN_TIERS.ENTERPRISE]
            };
        }
        if (!userId) {
            return {
                plan: PLAN_TIERS.FREE,
                status: 'active',
                billingCycle: 'monthly',
                definition: PLAN_DEFINITIONS[PLAN_TIERS.FREE]
            };
        }

        const sub = inMemorySubscriptions.get(userId) || {
            plan: PLAN_TIERS.FREE,
            status: 'active',
            billingCycle: 'monthly',
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        return {
            ...sub,
            definition: PLAN_DEFINITIONS[sub.plan] || PLAN_DEFINITIONS[PLAN_TIERS.FREE]
        };
    }

    /**
     * Asigna o actualiza el plan de un usuario
     */
    static async setUserSubscription(userId, planId, billingCycle = 'monthly') {
        if (!userId) throw new Error('ID de usuario requerido');
        const validPlan = Object.values(PLAN_TIERS).includes(planId) ? planId : PLAN_TIERS.FREE;

        const sub = {
            userId,
            plan: validPlan,
            status: 'active',
            billingCycle,
            updatedAt: new Date().toISOString(),
            periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        inMemorySubscriptions.set(userId, sub);
        return {
            ...sub,
            definition: PLAN_DEFINITIONS[validPlan]
        };
    }

    /**
     * Registra y obtiene el consumo actual del periodo
     */
    static async getUserUsage(userId) {
        const periodYM = getCurrentPeriodYM();
        const key = `${userId || 'guest'}_${periodYM}`;

        if (!inMemoryUsage.has(key)) {
            inMemoryUsage.set(key, {
                userId: userId || 'guest',
                periodYM,
                publicReposAnalyzed: 0,
                privateReposAnalyzed: 0,
                exportDocsCount: 0
            });
        }

        return inMemoryUsage.get(key);
    }

    /**
     * Incrementa el contador de análisis de repositorio
     */
    static async recordRepoAnalysis(userId, isPrivate = false) {
        const usage = await this.getUserUsage(userId);
        if (isPrivate) {
            usage.privateReposAnalyzed++;
        } else {
            usage.publicReposAnalyzed++;
        }
        return usage;
    }

    /**
     * Incrementa el contador de exportación de documentos
     */
    static async recordDocExport(userId) {
        const usage = await this.getUserUsage(userId);
        usage.exportDocsCount++;
        return usage;
    }

    /**
     * Comprueba si el usuario tiene permiso para una funcionalidad
     */
    static async checkPermission(userId, featureName) {
        if (!userId) {
            // Permitir para compatibilidad con llamadas locales/testing sin usuario especificado
            return { allowed: true };
        }

        const sub = await this.getUserSubscription(userId);
        const limits = sub.definition.limits;

        if (featureName === 'analyze_public_repo') {
            const usage = await this.getUserUsage(userId);
            if (limits.publicReposPerMonth === Infinity) return { allowed: true };
            const remaining = Math.max(0, limits.publicReposPerMonth - usage.publicReposAnalyzed);
            if (usage.publicReposAnalyzed >= limits.publicReposPerMonth) {
                return {
                    allowed: false,
                    reason: `Límite mensual de repositorios públicos alcanzado (${limits.publicReposPerMonth}/${limits.publicReposPerMonth}). Actualiza a Plan Pro para análisis ilimitados.`,
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.PRO
                };
            }
            return { allowed: true, remaining };
        }

        if (featureName === 'analyze_private_repo') {
            if (!limits.allowPrivateRepos) {
                return {
                    allowed: false,
                    reason: 'El análisis de repositorios privados requiere Plan Pro o Enterprise.',
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.PRO
                };
            }
            return { allowed: true };
        }

        if (featureName === 'export_word_pdf') {
            if (!limits.allowWordExport || !limits.allowPdfExport) {
                return {
                    allowed: false,
                    reason: 'La exportación editorial en Word (.docx) y PDF A4 está reservada para usuarios Pro y Enterprise.',
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.PRO
                };
            }
            return { allowed: true };
        }

        if (featureName === 'pr_webhooks') {
            if (!limits.allowPullRequestWebhooks) {
                return {
                    allowed: false,
                    reason: 'La sincronización automática mediante Webhooks en Pull Requests está disponible exclusivamente en el Plan Enterprise.',
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.ENTERPRISE
                };
            }
            return { allowed: true };
        }

        if (featureName === 'blast_radius') {
            if (!limits.allowBlastRadius) {
                return {
                    allowed: false,
                    reason: 'El análisis de radio de impacto (Blast Radius) requiere Plan Pro o Enterprise.',
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.PRO
                };
            }
            return { allowed: true };
        }

        if (featureName === 'byok' || featureName === 'zero_retention' || featureName === 'white_label') {
            if (!limits.allowByok) {
                return {
                    allowed: false,
                    reason: 'La configuración de seguridad BYOK, Zero-Retention y Marca Blanca requiere Plan Enterprise.',
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.ENTERPRISE
                };
            }
            return { allowed: true };
        }

        if (featureName === 'organizations') {
            if (!limits.allowOrganizations) {
                return {
                    allowed: false,
                    reason: 'La creación y gestión de organizaciones y equipos multiusuario requiere Plan Enterprise.',
                    currentPlan: sub.plan,
                    suggestedPlan: PLAN_TIERS.ENTERPRISE
                };
            }
            return { allowed: true };
        }

        return { allowed: true };
    }
}

module.exports = {
    PLAN_TIERS,
    PLAN_DEFINITIONS,
    PlanService
};
