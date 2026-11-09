/**
 * middleware/planLimiter.js
 * Middleware de Control de Acceso y Límites por Plan SaaS (Free vs Pro vs Enterprise)
 */

const { PlanService, PLAN_TIERS } = require('../services/plans/planService');

function extractUserId(req) {
    const userEmail = (
        req.headers['x-user-email'] ||
        (req.user && req.user.email) ||
        (req.body && req.body.userEmail) ||
        (req.query && req.query.userEmail) ||
        ''
    ).toLowerCase().trim();

    if (userEmail === 'danisan2326@gmail.com') {
        return 'danisan2326@gmail.com';
    }
    if (req.user && req.user.id) return req.user.id;
    if (req.headers['x-user-id']) return req.headers['x-user-id'];
    if (req.body && req.body.userId) return req.body.userId;
    if (req.query && req.query.userId) return req.query.userId;
    return null;
}

/**
 * Middleware para verificar permisos específicos
 */
function requireFeature(featureName) {
    return async (req, res, next) => {
        try {
            const userId = extractUserId(req);
            const check = await PlanService.checkPermission(userId, featureName);

            if (!check.allowed) {
                return res.status(403).json({
                    success: false,
                    error: check.reason,
                    code: 'PLAN_LIMIT_EXCEEDED',
                    currentPlan: check.currentPlan,
                    requiredPlan: check.suggestedPlan,
                    upgradeUrl: '/#planes'
                });
            }

            // Inyectar en req para uso posterior
            req.userPlanCheck = check;
            next();
        } catch (err) {
            console.error('[PlanLimiter Error]:', err);
            next(); // Modo tolerante si ocurre error de evaluación
        }
    };
}

module.exports = {
    extractUserId,
    requireFeature,
    requireWordPdfExport: requireFeature('export_word_pdf'),
    requirePrivateRepoAnalysis: requireFeature('analyze_private_repo'),
    requirePublicRepoQuota: requireFeature('analyze_public_repo'),
    requireBlastRadius: requireFeature('blast_radius'),
    requirePRWebhooks: requireFeature('pr_webhooks'),
    requireByokAndSecurity: requireFeature('byok'),
    requireOrganizations: requireFeature('organizations')
};
