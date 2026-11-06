-- ============================================================
-- DOCUMIND AI — REAL SITE ANALYTICS & VISITORS SCHEMA (SUPABASE)
-- ============================================================
-- Instrucciones:
-- 1. Abre el panel de tu proyecto en Supabase (https://supabase.com).
-- 2. Dirígete a "SQL Editor" en el menú lateral.
-- 3. Pega y ejecuta el siguiente script DDL para habilitar el almacenamiento
--    permanente de analítica de visitantes con Row Level Security (RLS).
-- ============================================================

-- 1. Tabla de visitantes únicos persistentes
CREATE TABLE IF NOT EXISTS public.site_visitors (
    visitor_id TEXT PRIMARY KEY,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    total_visits INT NOT NULL DEFAULT 1,
    user_agent TEXT,
    ip_hash TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tabla de registros de visitas por fecha para métricas de hoy y 7 días
CREATE TABLE IF NOT EXISTS public.site_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visitor_id TEXT NOT NULL REFERENCES public.site_visitors(visitor_id) ON DELETE CASCADE,
    visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
    path TEXT DEFAULT '/',
    referrer TEXT
);

-- Índices para optimizar consultas de tiempo real y rangos de fecha
CREATE INDEX IF NOT EXISTS idx_site_visitors_last_seen ON public.site_visitors(last_seen_at);
CREATE INDEX IF NOT EXISTS idx_site_visits_date ON public.site_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_site_visits_visitor ON public.site_visits(visitor_id, visit_date);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.site_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;

-- 4. Políticas RLS seguras para lectura y escritura desde la aplicación
DROP POLICY IF EXISTS "Permitir lectura de visitantes" ON public.site_visitors;
CREATE POLICY "Permitir lectura de visitantes" 
    ON public.site_visitors FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion de visitantes" ON public.site_visitors;
CREATE POLICY "Permitir insercion y actualizacion de visitantes" 
    ON public.site_visitors FOR ALL 
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura de visitas" ON public.site_visits;
CREATE POLICY "Permitir lectura de visitas" 
    ON public.site_visits FOR SELECT 
    USING (true);

DROP POLICY IF EXISTS "Permitir insercion de visitas" ON public.site_visits;
CREATE POLICY "Permitir insercion de visitas" 
    ON public.site_visits FOR INSERT 
    WITH CHECK (true);
