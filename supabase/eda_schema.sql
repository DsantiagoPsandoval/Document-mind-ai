-- ============================================================
-- DOCUMENT-MIND AI — ESQUEMA DE ARQUITECTURA ORIENTADA A EVENTOS (EDA)
-- Supabase PostgreSQL + RLS + Supabase Realtime
-- ============================================================

-- 1. Habilitar extensión pgcrypto / uuid si no está habilitada
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- 2. TABLA: EVENTS (Event Store & Transactional Outbox)
-- ============================================================
create table if not exists public.events (
    event_id uuid primary key default gen_random_uuid(),
    event_type varchar(120) not null,
    event_version varchar(20) not null default '1.0.0',
    aggregate_id varchar(150) not null,
    correlation_id varchar(150) not null,
    causation_id varchar(150),
    user_id uuid references auth.users(id) on delete set null,
    payload jsonb not null default '{}'::jsonb,
    status varchar(30) not null default 'PENDING' check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'DEAD_LETTER')),
    retry_count integer not null default 0,
    max_retries integer not null default 3,
    next_retry_at timestamptz default now(),
    error_message text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================
-- 3. TABLA: EVENT_CONSUMERS (Control y Heartbeat de Workers)
-- ============================================================
create table if not exists public.event_consumers (
    consumer_id varchar(100) primary key,
    consumer_name varchar(150) not null,
    last_processed_event_id uuid references public.events(event_id) on delete set null,
    last_heartbeat timestamptz default now(),
    status varchar(30) not null default 'ACTIVE' check (status in ('ACTIVE', 'IDLE', 'PAUSED', 'FAILED')),
    metrics jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- ============================================================
-- 4. TABLA: DEAD_LETTER_EVENTS (Dead Letter Queue - DLQ)
-- ============================================================
create table if not exists public.dead_letter_events (
    dlq_id uuid primary key default gen_random_uuid(),
    original_event_id uuid not null,
    event_type varchar(120) not null,
    aggregate_id varchar(150) not null,
    correlation_id varchar(150) not null,
    payload jsonb not null,
    error_stack text,
    retry_count integer not null,
    failed_at timestamptz default now(),
    resolved boolean default false,
    resolved_at timestamptz,
    resolved_by text
);

-- ============================================================
-- 5. TABLA: EVENT_PROCESSING_LOGS (Trazabilidad y Métricas)
-- ============================================================
create table if not exists public.event_processing_logs (
    log_id uuid primary key default gen_random_uuid(),
    event_id uuid references public.events(event_id) on delete cascade,
    consumer_id varchar(100) not null,
    step varchar(100) not null,
    status varchar(30) not null,
    duration_ms integer not null default 0,
    details jsonb default '{}'::jsonb,
    created_at timestamptz default now()
);

-- ============================================================
-- 6. ÍNDICES DE ALTO RENDIMIENTO
-- ============================================================
create index if not exists idx_events_status_retry on public.events (status, next_retry_at);
create index if not exists idx_events_correlation on public.events (correlation_id);
create index if not exists idx_events_type on public.events (event_type);
create index if not exists idx_events_aggregate on public.events (aggregate_id);
create index if not exists idx_events_created on public.events (created_at desc);
create index if not exists idx_dlq_correlation on public.dead_letter_events (correlation_id);
create index if not exists idx_dlq_event_type on public.dead_letter_events (event_type);
create index if not exists idx_logs_event_id on public.event_processing_logs (event_id);
create index if not exists idx_logs_created on public.event_processing_logs (created_at desc);

-- ============================================================
-- 7. TRIGGER: ACTUALIZACIÓN AUTOMÁTICA DE updated_at
-- ============================================================
create or replace function public.update_eda_timestamp()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_events_updated_at on public.events;
create trigger trigger_events_updated_at
    before update on public.events
    for each row execute function public.update_eda_timestamp();

drop trigger if exists trigger_consumers_updated_at on public.event_consumers;
create trigger trigger_consumers_updated_at
    before update on public.event_consumers
    for each row execute function public.update_eda_timestamp();

-- ============================================================
-- 8. POLÍTICAS RLS (Row Level Security)
-- ============================================================
alter table public.events enable row level security;
alter table public.event_consumers enable row level security;
alter table public.dead_letter_events enable row level security;
alter table public.event_processing_logs enable row level security;

-- Los usuarios autenticados pueden ver eventos de sus propios proyectos
drop policy if exists "Usuarios pueden ver sus propios eventos" on public.events;
create policy "Usuarios pueden ver sus propios eventos"
    on public.events for select
    using (auth.uid() = user_id or user_id is null);

-- Los usuarios pueden insertar solicitudes de eventos
drop policy if exists "Usuarios autenticados pueden publicar eventos" on public.events;
create policy "Usuarios autenticados pueden publicar eventos"
    on public.events for insert
    with check (auth.uid() = user_id or user_id is null);

-- Lectura de logs propios vinculados al evento
drop policy if exists "Lectura de logs por evento autorizado" on public.event_processing_logs;
create policy "Lectura de logs por evento autorizado"
    on public.event_processing_logs for select
    using (
        exists (
            select 1 from public.events e
            where e.event_id = event_processing_logs.event_id
            and (e.user_id = auth.uid() or e.user_id is null)
        )
    );

-- Consumers y DLQ solo accesibles por administradores o servicio backend
drop policy if exists "Lectura de DLQ autorizada" on public.dead_letter_events;
create policy "Lectura de DLQ autorizada"
    on public.dead_letter_events for select
    using (true);

drop policy if exists "Lectura de consumidores" on public.event_consumers;
create policy "Lectura de consumidores"
    on public.event_consumers for select
    using (true);

-- ============================================================
-- 9. HABILITAR SUPABASE REALTIME PARA EVENTOS
-- ============================================================
do $$
begin
    alter publication supabase_realtime add table public.events;
exception when others then
    null;
end;
$$;
