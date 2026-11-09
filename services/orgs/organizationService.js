/**
 * services/orgs/organizationService.js
 * Multi-Tenancy, Equipos Corporativos, Control de Acceso RBAC y Aprobaciones Documentales
 */

const crypto = require('crypto');

// Almacenes in-memory para organizaciones, miembros, aprobaciones y auditoría
const organizationsStore = new Map();
const orgMembersStore = new Map(); // key: `${orgId}_${userId}`
const approvalsStore = new Map();
const auditLogsStore = [];

const ROLES = {
    ADMIN: 'admin',
    ARCHITECT: 'architect',
    AUDITOR: 'auditor'
};

const APPROVAL_STATUS = {
    DRAFT: 'draft',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected'
};

class OrganizationService {
    /**
     * Crea una nueva organización empresarial
     */
    static async createOrganization({ name, slug, ownerId }) {
        if (!name || !ownerId) throw new Error('Nombre de organización y dueño requeridos');
        const orgSlug = (slug || name.toLowerCase().replace(/[^a-z0-9]/g, '-')).trim();

        const orgId = `org_${crypto.randomUUID()}`;
        const org = {
            id: orgId,
            name,
            slug: orgSlug,
            ownerId,
            plan: 'enterprise',
            createdAt: new Date().toISOString()
        };

        organizationsStore.set(orgId, org);

        // El creador es automáticamente Administrador
        await this.addMember({
            orgId,
            userId: ownerId,
            role: ROLES.ADMIN
        });

        await this.logAuditEvent({
            orgId,
            userId: ownerId,
            action: 'ORGANIZATION_CREATED',
            entityType: 'organization',
            entityId: orgId,
            details: { name, slug: orgSlug }
        });

        return org;
    }

    /**
     * Agrega un integrante a la organización con un rol específico
     */
    static async addMember({ orgId, userId, role = ROLES.ARCHITECT }) {
        const org = organizationsStore.get(orgId);
        if (!org) throw new Error('Organización no encontrada');

        const validRole = Object.values(ROLES).includes(role) ? role : ROLES.ARCHITECT;
        const key = `${orgId}_${userId}`;

        const member = {
            orgId,
            userId,
            role: validRole,
            joinedAt: new Date().toISOString()
        };

        orgMembersStore.set(key, member);
        return member;
    }

    /**
     * Lista los integrantes de una organización
     */
    static async getMembers(orgId) {
        const members = [];
        for (const [key, val] of orgMembersStore.entries()) {
            if (key.startsWith(`${orgId}_`)) {
                members.push(val);
            }
        }
        return members;
    }

    /**
     * Verifica los permisos de un usuario en la organización
     */
    static async getUserRole(orgId, userId) {
        const key = `${orgId}_${userId}`;
        const member = orgMembersStore.get(key);
        return member ? member.role : null;
    }

    /**
     * Inicia un flujo de aprobación formal para un documento técnico
     */
    static async submitDocumentForReview({ orgId, projectId, docType, requestedBy, version = '1.0.0' }) {
        const approvalId = `appr_${crypto.randomUUID()}`;
        const approval = {
            id: approvalId,
            orgId,
            projectId,
            docType,
            version,
            status: APPROVAL_STATUS.UNDER_REVIEW,
            requestedBy,
            approvedBy: null,
            approvedAt: null,
            comments: null,
            createdAt: new Date().toISOString()
        };

        approvalsStore.set(approvalId, approval);

        await this.logAuditEvent({
            orgId,
            userId: requestedBy,
            action: 'DOCUMENT_SUBMITTED_FOR_REVIEW',
            entityType: 'document',
            entityId: projectId,
            details: { docType, version }
        });

        return approval;
    }

    /**
     * Aprueba o rechaza una versión de documento (Requiere rol Admin o Architect)
     */
    static async processDocumentApproval({ orgId, approvalId, reviewerId, decision, comments }) {
        const approval = approvalsStore.get(approvalId);
        if (!approval) throw new Error('Solicitud de aprobación no encontrada');

        // Validar rol del revisor
        const role = await this.getUserRole(orgId, reviewerId);
        if (!role || (role !== ROLES.ADMIN && role !== ROLES.ARCHITECT)) {
            throw new Error('Solo los Administradores o Arquitectos Senior pueden aprobar documentos técnicos');
        }

        const isApproved = decision === 'approve';
        approval.status = isApproved ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
        approval.approvedBy = reviewerId;
        approval.approvedAt = new Date().toISOString();
        approval.comments = comments || (isApproved ? 'Aprobado formalmente para producción' : 'Requiere revisiones arquitectónicas');

        await this.logAuditEvent({
            orgId,
            userId: reviewerId,
            action: isApproved ? 'DOCUMENT_APPROVED' : 'DOCUMENT_REJECTED',
            entityType: 'document',
            entityId: approval.projectId,
            details: { docType: approval.docType, comments: approval.comments }
        });

        return approval;
    }

    /**
     * Registra un evento inmutable en el log de auditoría
     */
    static async logAuditEvent({ orgId, userId, action, entityType, entityId, details = {}, ip = '127.0.0.1' }) {
        const entry = {
            id: `audit_${crypto.randomUUID()}`,
            orgId,
            userId,
            action,
            entityType,
            entityId,
            details,
            ipAddress: ip,
            timestamp: new Date().toISOString()
        };
        auditLogsStore.unshift(entry);
        return entry;
    }

    /**
     * Consulta los registros de auditoría de una organización
     */
    static async getAuditLogs(orgId) {
        return auditLogsStore.filter(l => l.orgId === orgId);
    }
}

module.exports = {
    ROLES,
    APPROVAL_STATUS,
    OrganizationService
};
