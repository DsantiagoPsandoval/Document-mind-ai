/**
 * services/enterprise/securityConfigService.js
 * Módulo de Seguridad Enterprise: BYOK, Modo Efímero Zero-Retention y Personalización de Marca Blanca
 */

const crypto = require('crypto');

// Clave de cifrado simétrico del servidor para BYOK
const ENCRYPTION_SECRET = process.env.BYOK_MASTER_KEY || 'documind_master_encryption_key_2026_enterprise';
const ALGORITHM = 'aes-256-gcm';

// Almacén in-memory de configuraciones por organización / usuario
const enterpriseConfigs = new Map();

function getDerivedKey() {
    return crypto.createHash('sha256').update(ENCRYPTION_SECRET).digest();
}

class SecurityConfigService {
    /**
     * Cifra una API Key de proveedor externo antes de persistirla
     */
    static encryptKey(plainKey) {
        if (!plainKey) return null;
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv(ALGORITHM, getDerivedKey(), iv);
        let encrypted = cipher.update(plainKey, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    }

    /**
     * Descifra una API Key para utilizarla en la llamada de inferencia
     */
    static decryptKey(encryptedString) {
        if (!encryptedString) return null;
        try {
            const parts = encryptedString.split(':');
            if (parts.length !== 3) return null;
            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encryptedText = parts[2];

            const decipher = crypto.createDecipheriv(ALGORITHM, getDerivedKey(), iv);
            decipher.setAuthTag(authTag);
            let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return decrypted;
        } catch (e) {
            console.error('[BYOK Decrypt Error]:', e.message);
            return null;
        }
    }

    /**
     * Guarda o actualiza la configuración Enterprise para una organización
     */
    static async saveConfig(orgId, {
        byokProvider,
        apiKey,
        apiEndpoint,
        ephemeralProcessing = false,
        companyName,
        companyLogoUrl,
        brandPrimaryColor = '#38BDF8',
        brandSecondaryColor = '#818CF8',
        reviewerTitle = 'Arquitecto de Software Principal'
    }) {
        if (!orgId) throw new Error('ID de organización requerido');

        const existing = enterpriseConfigs.get(orgId) || {};
        const encryptedKey = apiKey ? this.encryptKey(apiKey) : existing.encryptedApiKey;

        const config = {
            orgId,
            byokProvider: byokProvider || existing.byokProvider || 'gemini',
            encryptedApiKey: encryptedKey,
            hasCustomKey: !!encryptedKey,
            apiEndpoint: apiEndpoint || existing.apiEndpoint,
            ephemeralProcessing: Boolean(ephemeralProcessing),
            companyName: companyName || existing.companyName || 'DocuMind Enterprise Client',
            companyLogoUrl: companyLogoUrl || existing.companyLogoUrl || null,
            brandPrimaryColor: brandPrimaryColor || existing.brandPrimaryColor || '#38BDF8',
            brandSecondaryColor: brandSecondaryColor || existing.brandSecondaryColor || '#818CF8',
            reviewerTitle: reviewerTitle || existing.reviewerTitle || 'Arquitecto de Software Principal',
            updatedAt: new Date().toISOString()
        };

        enterpriseConfigs.set(orgId, config);

        // Devolver sin exponer la clave real
        const safeConfig = { ...config };
        delete safeConfig.encryptedApiKey;
        return safeConfig;
    }

    /**
     * Obtiene la configuración pública/segura para el cliente y los exportadores
     */
    static async getConfig(orgId) {
        const config = enterpriseConfigs.get(orgId);
        if (!config) {
            return {
                orgId,
                byokProvider: 'gemini',
                hasCustomKey: false,
                ephemeralProcessing: false,
                companyName: 'DocuMind AI',
                brandPrimaryColor: '#38BDF8',
                brandSecondaryColor: '#818CF8',
                reviewerTitle: 'Arquitecto de Software'
            };
        }

        const safe = { ...config };
        delete safe.encryptedApiKey;
        return safe;
    }

    /**
     * Obtiene la clave descifrada únicamente en el servidor para realizar inferencias
     */
    static async getDecryptedKey(orgId) {
        const config = enterpriseConfigs.get(orgId);
        if (!config || !config.encryptedApiKey) return null;
        return this.decryptKey(config.encryptedApiKey);
    }
}

module.exports = {
    SecurityConfigService
};
