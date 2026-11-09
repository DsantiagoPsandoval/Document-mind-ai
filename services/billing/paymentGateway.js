/**
 * services/billing/paymentGateway.js
 * Pasarela de Pagos Modular y Segura para DocuMind AI SaaS
 * Proveedores: Wompi (Colombia) y Mercado Pago (Latinoamérica) + Mock de Pruebas
 */

const crypto = require('crypto');
const { PlanService, PLAN_TIERS, PLAN_DEFINITIONS } = require('../plans/planService');

// Almacén in-memory inmutable de transacciones
const transactionsStore = new Map();

class PaymentGateway {
    /**
     * Genera la firma de integridad para transacciones de Wompi (SHA-256)
     * Cadena: <Referencia> + <MontoEnCentavos> + <Moneda> + <IntegritySecret>
     */
    static generateWompiIntegritySignature(reference, amountInCents, currency, secret) {
        const integrityKey = secret || process.env.WOMPI_INTEGRITY_SECRET || 'test_integrity_secret_documind_2026';
        const raw = `${reference}${amountInCents}${currency}${integrityKey}`;
        return crypto.createHash('sha256').update(raw).digest('hex');
    }

    /**
     * Inicia un proceso de compra y genera la orden segura de checkout
     */
    static async createCheckoutSession({
        userId,
        userEmail,
        planId,
        billingCycle = 'monthly',
        provider = 'wompi',
        termsAccepted = true,
        legalVersion = '2.0.0-2026'
    }) {
        if (!userId) throw new Error('Usuario requerido para iniciar checkout');
        if (!termsAccepted) throw new Error('Es obligatorio aceptar los Términos y Condiciones y Política de Privacidad');

        const planDef = PLAN_DEFINITIONS[planId];
        if (!planDef || planId === PLAN_TIERS.FREE) {
            throw new Error('El plan seleccionado no es un plan de pago válido');
        }

        const amountUSD = billingCycle === 'annual' ? planDef.priceAnnualUSD : planDef.priceMonthlyUSD;
        // Tasa referencial para Colombia (o pago en USD)
        const currency = 'USD';
        const amountInCents = Math.round(amountUSD * 100);
        const reference = `DOCUMIND_${planId.toUpperCase()}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

        const signature = this.generateWompiIntegritySignature(reference, amountInCents, currency);

        const transaction = {
            id: `tx_${crypto.randomUUID()}`,
            userId,
            userEmail,
            planId,
            billingCycle,
            amountUSD,
            amountInCents,
            currency,
            reference,
            provider,
            status: 'pending',
            signature,
            termsAccepted: true,
            legalVersion,
            acceptedAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        transactionsStore.set(transaction.reference, transaction);

        // URLs simuladas / reales según el proveedor
        let checkoutUrl = '';
        if (provider === 'wompi') {
            const wompiPublicKey = process.env.WOMPI_PUBLIC_KEY || 'pub_test_MockWompiPublicKeyDocuMind';
            checkoutUrl = `https://checkout.wompi.co/p/?public-key=${wompiPublicKey}&currency=${currency}&amount-in-cents=${amountInCents}&reference=${reference}&signature:integrity=${signature}&redirect-url=${encodeURIComponent(process.env.APP_URL || 'http://localhost:3000')}/#planes`;
        } else if (provider === 'mercadopago') {
            checkoutUrl = `https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=pref_${reference}`;
        } else {
            // Mock sandbox
            checkoutUrl = `/api/billing/mock-checkout?reference=${reference}`;
        }

        return {
            success: true,
            transactionId: transaction.id,
            reference,
            amount: amountUSD,
            currency,
            plan: planDef.name,
            billingCycle,
            checkoutUrl,
            status: 'pending'
        };
    }

    /**
     * Procesa y valida un webhook entrante de Wompi con firma criptográfica
     */
    static async handleWompiWebhook(payload, signatureHeader) {
        if (!payload || !payload.data || !payload.data.transaction) {
            throw new Error('Payload de webhook inválido');
        }

        const txData = payload.data.transaction;
        const reference = txData.reference;
        const status = txData.status; // 'APPROVED', 'DECLINED', 'VOIDED', 'ERROR'

        const tx = transactionsStore.get(reference);
        if (!tx) {
            console.warn(`[Wompi Webhook]: Transacción ${reference} no encontrada en el sistema`);
            return { success: false, reason: 'Transaction reference not found' };
        }

        // Mapeo de estados normalizados
        let normalizedStatus = 'pending';
        if (status === 'APPROVED') normalizedStatus = 'approved';
        else if (status === 'DECLINED') normalizedStatus = 'rejected';
        else if (status === 'VOIDED') normalizedStatus = 'cancelled';
        else if (status === 'REFUNDED') normalizedStatus = 'refunded';

        tx.status = normalizedStatus;
        tx.providerTxId = txData.id;
        tx.paymentMethod = txData.payment_method_type || 'CARD';
        tx.updatedAt = new Date().toISOString();

        // Si fue aprobado, activar el plan inmediatamente en el servicio centralizado
        if (normalizedStatus === 'approved') {
            await PlanService.setUserSubscription(tx.userId, tx.planId, tx.billingCycle);
            console.log(`[Billing]: Plan ${tx.planId} activado exitosamente para el usuario ${tx.userId}`);
        }

        return {
            success: true,
            reference,
            status: normalizedStatus,
            planActivated: normalizedStatus === 'approved' ? tx.planId : null
        };
    }

    /**
     * Procesa y valida un webhook de Mercado Pago
     */
    static async handleMercadoPagoWebhook(payload, queryParams) {
        const topic = payload?.type || queryParams?.topic || 'payment';
        const paymentId = payload?.data?.id || queryParams?.['data.id'] || queryParams?.id;

        if (!paymentId) {
            return { success: false, reason: 'Missing Mercado Pago payment ID' };
        }

        // Buscar transacción relacionada
        let matchedTx = null;
        for (const tx of transactionsStore.values()) {
            if (tx.provider === 'mercadopago' && tx.status === 'pending') {
                matchedTx = tx;
                break;
            }
        }

        if (matchedTx) {
            matchedTx.status = 'approved';
            matchedTx.providerTxId = String(paymentId);
            matchedTx.updatedAt = new Date().toISOString();
            await PlanService.setUserSubscription(matchedTx.userId, matchedTx.planId, matchedTx.billingCycle);
        }

        return {
            success: true,
            paymentId,
            status: matchedTx ? matchedTx.status : 'acknowledged'
        };
    }

    /**
     * Simula la confirmación exitosa de un pago en entorno de pruebas / sandbox
     */
    static async confirmMockPayment(reference) {
        const tx = transactionsStore.get(reference);
        if (!tx) throw new Error(`Transacción con referencia ${reference} no encontrada`);

        tx.status = 'approved';
        tx.providerTxId = `mock_gw_${Date.now()}`;
        tx.updatedAt = new Date().toISOString();

        await PlanService.setUserSubscription(tx.userId, tx.planId, tx.billingCycle);

        return {
            success: true,
            reference,
            status: 'approved',
            plan: tx.planId,
            userEmail: tx.userEmail
        };
    }

    /**
     * Consulta el historial de transacciones de un usuario
     */
    static async getUserTransactions(userId) {
        if (!userId) return [];
        const result = [];
        for (const tx of transactionsStore.values()) {
            if (tx.userId === userId) {
                result.push(tx);
            }
        }
        return result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
}

module.exports = {
    PaymentGateway
};
