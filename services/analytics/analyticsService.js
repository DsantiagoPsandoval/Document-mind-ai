/**
 * DOCUMIND AI — REAL SITE ANALYTICS SERVICE
 * Persistent, privacy-respecting analytics for unique visitors and real-time active users.
 * Supports Supabase PostgreSQL with local persistent storage fallback.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

class AnalyticsService {
    constructor() {
        this.storeDir = path.join(__dirname, '..', '..', 'data');
        this.storePath = path.join(this.storeDir, 'analytics_store.json');
        
        // Ensure local persistent directory exists
        if (!fs.existsSync(this.storeDir)) {
            try {
                fs.mkdirSync(this.storeDir, { recursive: true });
            } catch (e) {
                console.error('[Analytics] Error creating data directory:', e.message);
            }
        }

        // Initialize local store
        this.store = this.loadStore();

        // Initialize Supabase client if configured
        this.supabase = null;
        this.initSupabase();

        // Periodically purge stale heartbeats in memory if needed
        this.cleanupInterval = setInterval(() => this.persistStore(), 60000);
        if (this.cleanupInterval.unref) this.cleanupInterval.unref();
    }

    initSupabase() {
        const url = process.env.SUPABASE_URL ? process.env.SUPABASE_URL.trim() : '';
        const key = process.env.SUPABASE_ANON_KEY ? process.env.SUPABASE_ANON_KEY.trim() : '';
        if (url && key && !url.includes('tu-proyecto') && !key.startsWith('tu_')) {
            try {
                this.supabase = createClient(url, key, {
                    auth: { persistSession: false }
                });
                console.log('[Analytics] Supabase client initialized for site analytics.');
            } catch (err) {
                console.warn('[Analytics] Could not initialize Supabase client:', err.message);
            }
        }
    }

    loadStore() {
        try {
            if (fs.existsSync(this.storePath)) {
                const data = JSON.parse(fs.readFileSync(this.storePath, 'utf8'));
                if (data && typeof data === 'object') {
                    return {
                        visitors: data.visitors || {}, // { [visitorId]: { firstSeen, lastSeen, totalVisits, ipHash, userAgent } }
                        dailyVisits: data.dailyVisits || [] // [ { visitorId, date, timestamp } ]
                    };
                }
            }
        } catch (e) {
            console.warn('[Analytics] Failed to load store, initializing fresh:', e.message);
        }
        return { visitors: {}, dailyVisits: [] };
    }

    persistStore() {
        try {
            // Keep dailyVisits trimmed to last 30 days to avoid unbounded growth
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            if (Array.isArray(this.store.dailyVisits)) {
                this.store.dailyVisits = this.store.dailyVisits.filter(v => v.timestamp >= thirtyDaysAgo);
            }
            fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), 'utf8');
        } catch (e) {
            console.error('[Analytics] Failed to persist analytics store:', e.message);
        }
    }

    isBot(userAgent) {
        if (!userAgent || typeof userAgent !== 'string') return false;
        const botRegex = /bot|spider|crawl|slurp|googlebot|bingbot|yandex|baidu|duckduckbot|facebookexternalhit|whatsapp|telegram|twitterbot|pinterest|curl|wget|python-requests|headlesschrome|lighthouse/i;
        return botRegex.test(userAgent);
    }

    hashIp(ip) {
        if (!ip) return 'unknown';
        return crypto.createHash('sha256').update(ip + '-documind-salt-2026').digest('hex').substring(0, 16);
    }

    sanitizeVisitorId(rawId) {
        if (!rawId || typeof rawId !== 'string') return null;
        const cleaned = rawId.trim();
        // Check valid format: 10 to 64 chars, alphanumeric and hyphens/underscores
        if (/^[a-zA-Z0-9_-]{10,64}$/.test(cleaned)) {
            return cleaned;
        }
        return null;
    }

    /**
     * Records or updates a visitor session.
     */
    async recordVisit({ visitorId: rawVisitorId, userAgent, ip, referrer, path: pagePath }) {
        if (this.isBot(userAgent)) {
            return { recorded: false, reason: 'bot_filtered' };
        }

        let visitorId = this.sanitizeVisitorId(rawVisitorId);
        if (!visitorId) {
            visitorId = 'vis_' + crypto.randomBytes(16).toString('hex');
        }

        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        const todayDate = nowIso.split('T')[0];
        const ipHash = this.hashIp(ip);

        let isNewVisitor = false;
        if (!this.store.visitors[visitorId]) {
            isNewVisitor = true;
            this.store.visitors[visitorId] = {
                visitorId,
                firstSeen: now,
                lastSeen: now,
                totalVisits: 1,
                ipHash,
                userAgent: (userAgent || '').substring(0, 200)
            };
        } else {
            this.store.visitors[visitorId].lastSeen = now;
            this.store.visitors[visitorId].totalVisits = (this.store.visitors[visitorId].totalVisits || 1) + 1;
        }

        // Record daily visit entry (avoid multiple duplicates for the same visitor on the same day within 10 minutes)
        const recentVisit = this.store.dailyVisits.find(
            v => v.visitorId === visitorId && (now - v.timestamp) < 600000
        );
        if (!recentVisit) {
            this.store.dailyVisits.push({
                visitorId,
                date: todayDate,
                timestamp: now,
                path: (pagePath || '/').substring(0, 100),
                referrer: (referrer || '').substring(0, 200)
            });
        }

        this.persistStore();

        // Asynchronously sync to Supabase if configured
        if (this.supabase) {
            this.syncVisitToSupabase({ visitorId, nowIso, todayDate, userAgent, ipHash, pagePath, referrer }).catch(err => {
                // Silently log; local persistence guarantees reliability
            });
        }

        const stats = await this.getStats();
        return {
            recorded: true,
            visitorId,
            isNewVisitor,
            stats
        };
    }

    /**
     * Records a heartbeat to keep a visitor marked as active.
     */
    async recordHeartbeat({ visitorId: rawVisitorId, userAgent }) {
        if (this.isBot(userAgent)) {
            return { active: false, reason: 'bot_filtered' };
        }

        const visitorId = this.sanitizeVisitorId(rawVisitorId);
        if (!visitorId) {
            return { active: false, reason: 'invalid_visitor_id' };
        }

        const now = Date.now();
        const nowIso = new Date(now).toISOString();

        if (this.store.visitors[visitorId]) {
            this.store.visitors[visitorId].lastSeen = now;
        } else {
            this.store.visitors[visitorId] = {
                visitorId,
                firstSeen: now,
                lastSeen: now,
                totalVisits: 1,
                userAgent: (userAgent || '').substring(0, 200)
            };
        }

        // Asynchronously update Supabase last_seen_at
        if (this.supabase) {
            this.supabase
                .from('site_visitors')
                .update({ last_seen_at: nowIso })
                .eq('visitor_id', visitorId)
                .then(() => {})
                .catch(() => {});
        }

        const activeNow = this.getActiveCount(now);
        return {
            active: true,
            visitorId,
            activeNow
        };
    }

    /**
     * Syncs visit to Supabase PostgreSQL table
     */
    async syncVisitToSupabase({ visitorId, nowIso, todayDate, userAgent, ipHash, pagePath, referrer }) {
        if (!this.supabase) return;
        try {
            // Upsert to site_visitors
            const { error: visitorErr } = await this.supabase
                .from('site_visitors')
                .upsert({
                    visitor_id: visitorId,
                    last_seen_at: nowIso,
                    ip_hash: ipHash,
                    user_agent: (userAgent || '').substring(0, 250)
                }, { onConflict: 'visitor_id' });

            if (!visitorErr) {
                // Insert into site_visits
                await this.supabase
                    .from('site_visits')
                    .insert({
                        visitor_id: visitorId,
                        visited_at: nowIso,
                        visit_date: todayDate,
                        path: pagePath || '/',
                        referrer: (referrer || '').substring(0, 250)
                    });
            }
        } catch (e) {
            // Table might not exist yet; fallback store is active
        }
    }

    getActiveCount(now = Date.now()) {
        const fiveMinutesAgo = now - (5 * 60 * 1000);
        let active = 0;
        for (const id in this.store.visitors) {
            if (this.store.visitors[id].lastSeen >= fiveMinutesAgo) {
                active++;
            }
        }
        return active;
    }

    /**
     * Computes verified real statistics across all time dimensions.
     */
    async getStats() {
        const now = Date.now();
        const nowIso = new Date(now).toISOString();
        const todayDate = nowIso.split('T')[0];
        const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

        // 1. Total unique visitors
        const totalVisitors = Object.keys(this.store.visitors).length;

        // 2. Active now (last 5 minutes)
        const activeNow = this.getActiveCount(now);

        // 3. Visitors today
        const visitorsTodaySet = new Set();
        for (const visit of this.store.dailyVisits) {
            if (visit.date === todayDate) {
                visitorsTodaySet.add(visit.visitorId);
            }
        }
        // Also check if any visitor's lastSeen is today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        for (const id in this.store.visitors) {
            if (this.store.visitors[id].lastSeen >= startOfToday.getTime()) {
                visitorsTodaySet.add(id);
            }
        }
        const visitorsToday = visitorsTodaySet.size;

        // 4. Visitors in the last 7 days
        const visitorsLast7DaysSet = new Set();
        for (const visit of this.store.dailyVisits) {
            if (visit.timestamp >= sevenDaysAgo) {
                visitorsLast7DaysSet.add(visit.visitorId);
            }
        }
        for (const id in this.store.visitors) {
            if (this.store.visitors[id].lastSeen >= sevenDaysAgo) {
                visitorsLast7DaysSet.add(id);
            }
        }
        const visitorsLast7Days = visitorsLast7DaysSet.size;

        return {
            available: true,
            totalVisitors,
            activeNow,
            visitorsToday,
            visitorsLast7Days,
            updatedAt: nowIso
        };
    }
}

module.exports = new AnalyticsService();
