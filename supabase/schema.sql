-- ============================================================
-- DOCUMENT-MIND AI — ESQUEMA COMPLETO SUPABASE POSTGRESQL + RLS
-- Migración Versionada v2.0 (Perfiles, Proyectos, Análisis, Simulaciones y Chat)
-- ============================================================

-- 1. Habilitar extensión UUID
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. TABLA: PROFILES (Perfiles de usuario vinculados a auth.users)
-- ============================================================
create table if not exists public.profiles (
    id uuid references auth.users(id) on delete cascade primary key,
    email text not null,
    full_name text,
    role text default 'developer',
    auth_provider text default 'email',
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.profiles add column if not exists auth_provider text default 'email';

alter table public.profiles enable row level security;

drop policy if exists "Los usuarios pueden ver su propio perfil" on public.profiles;
create policy "Los usuarios pueden ver su propio perfil"
    on public.profiles for select
    using (auth.uid() = id);

drop policy if exists "Los usuarios pueden actualizar su propio perfil" on public.profiles;
create policy "Los usuarios pueden actualizar su propio perfil"
    on public.profiles for update
    using (auth.uid() = id);

drop policy if exists "Los usuarios pueden insertar su propio perfil" on public.profiles;
create policy "Los usuarios pueden insertar su propio perfil"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Trigger automático al registrar usuario en Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, email, full_name, role)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        coalesce(new.raw_user_meta_data->>'role', 'developer')
    );
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================
-- 3. TABLA: ANALYSES (Proyectos, Documentos y Repositorios Analizados)
-- ============================================================
create table if not exists public.analyses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null check (type in ('document', 'github', 'project')),
    title text not null,
    meta text,
    data jsonb not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);

alter table public.analyses enable row level security;

drop policy if exists "Los usuarios pueden ver sus propios análisis" on public.analyses;
create policy "Los usuarios pueden ver sus propios análisis"
    on public.analyses for select
    using (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden guardar nuevos análisis" on public.analyses;
create policy "Los usuarios pueden guardar nuevos análisis"
    on public.analyses for insert
    with check (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden actualizar sus propios análisis" on public.analyses;
create policy "Los usuarios pueden actualizar sus propios análisis"
    on public.analyses for update
    using (auth.uid() = user_id);

drop policy if exists "Los usuarios pueden eliminar sus propios análisis" on public.analyses;
create policy "Los usuarios pueden eliminar sus propios análisis"
    on public.analyses for delete
    using (auth.uid() = user_id);

-- ============================================================
-- 4. TABLA: SIMULATION_RUNS (Historial Inmutable de Simulaciones - Architecture Lab)
-- ============================================================
create table if not exists public.simulation_runs (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id text,
    scenario_name text not null,
    model_version text not null default '2.0.0',
    project_config jsonb not null,
    inputs jsonb not null,
    results jsonb not null,
    recommendation jsonb not null,
    created_at timestamptz default now()
);

create index if not exists idx_simulation_runs_user_id on public.simulation_runs(user_id);
create index if not exists idx_simulation_runs_created_at on public.simulation_runs(created_at desc);

alter table public.simulation_runs enable row level security;

drop policy if exists "Los usuarios consultan sus propias simulaciones" on public.simulation_runs;
create policy "Los usuarios consultan sus propias simulaciones"
    on public.simulation_runs for select
    using (auth.uid() = user_id);

drop policy if exists "Los usuarios registran nuevas ejecuciones de simulación" on public.simulation_runs;
create policy "Los usuarios registran nuevas ejecuciones de simulación"
    on public.simulation_runs for insert
    with check (auth.uid() = user_id);

drop policy if exists "Los usuarios eliminan sus propias simulaciones" on public.simulation_runs;
create policy "Los usuarios eliminan sus propias simulaciones"
    on public.simulation_runs for delete
    using (auth.uid() = user_id);

-- ============================================================
-- 5. TABLA: CHAT_CONVERSATIONS (Historial de Conversaciones RAG con Evidencia)
-- ============================================================
create table if not exists public.chat_conversations (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    project_id text not null,
    messages jsonb not null default '[]'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_chat_conversations_user_id on public.chat_conversations(user_id);

alter table public.chat_conversations enable row level security;

drop policy if exists "Aislamiento RLS de conversaciones por usuario" on public.chat_conversations;
create policy "Aislamiento RLS de conversaciones por usuario"
    on public.chat_conversations for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

-- ============================================================
-- 6. SEGURIDAD ADICIONAL DE PERFILES
-- ============================================================

-- El rol siempre será developer al registrarse.
-- Nunca confiar en el rol enviado por el usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
    insert into public.profiles (id, email, full_name, role, auth_provider, avatar_url)
    values (
        new.id,
        new.email,
        coalesce(
            nullif(new.raw_user_meta_data->>'full_name', ''),
            nullif(new.raw_user_meta_data->>'name', ''),
            split_part(new.email, '@', 1)
        ),
        'developer',
        coalesce(
            nullif(new.raw_app_meta_data->>'provider', ''),
            nullif(new.raw_user_meta_data->>'auth_provider', ''),
            'email'
        ),
        coalesce(
            new.raw_user_meta_data->>'avatar_url',
            new.raw_user_meta_data->>'picture',
            null
        )
    )
    on conflict (id) do update
    set
        email = excluded.email,
        full_name = coalesce(nullif(public.profiles.full_name, ''), excluded.full_name),
        avatar_url = coalesce(public.profiles.avatar_url, excluded.avatar_url),
        updated_at = now();
    return new;
end;
$$;

-- Los usuarios no pueden insertar perfiles arbitrarios
-- ni modificar su rol.
revoke insert, update on public.profiles from authenticated;

-- Solo pueden insertar/actualizar sus propios datos personales (protegidos por RLS).
grant insert (id, email, full_name, avatar_url, auth_provider, created_at, updated_at)
on public.profiles to authenticated;

grant update (full_name, avatar_url, auth_provider, updated_at)
on public.profiles to authenticated;


-- ============================================================
-- 7. TABLA: SUBSCRIPTIONS (Suscripciones SaaS: Free, Pro, Enterprise)
-- ============================================================
create table if not exists public.subscriptions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null unique,
    plan text not null check (plan in ('free', 'pro', 'enterprise')) default 'free',
    billing_cycle text not null check (billing_cycle in ('monthly', 'annual')) default 'monthly',
    status text not null check (status in ('active', 'past_due', 'canceled', 'trialing')) default 'active',
    current_period_start timestamptz default now(),
    current_period_end timestamptz default (now() + interval '1 month'),
    cancel_at_period_end boolean default false,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

alter table public.subscriptions enable row level security;

drop policy if exists "Los usuarios consultan su propia suscripción" on public.subscriptions;
create policy "Los usuarios consultan su propia suscripción"
    on public.subscriptions for select
    using (auth.uid() = user_id);

-- ============================================================
-- 8. TABLA: USAGE_RECORDS (Control de Cuotas Mensuales por Plan)
-- ============================================================
create table if not exists public.usage_records (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    period_ym text not null, -- formato 'YYYY-MM'
    public_repos_analyzed int default 0,
    private_repos_analyzed int default 0,
    export_docs_count int default 0,
    updated_at timestamptz default now(),
    unique(user_id, period_ym)
);

create index if not exists idx_usage_records_user_period on public.usage_records(user_id, period_ym);

alter table public.usage_records enable row level security;

drop policy if exists "Los usuarios ven su propio consumo" on public.usage_records;
create policy "Los usuarios ven su propio consumo"
    on public.usage_records for select
    using (auth.uid() = user_id);

-- ============================================================
-- 9. TABLA: PAYMENT_TRANSACTIONS (Registro Inmutable de Pagos Wompi / Mercado Pago)
-- ============================================================
create table if not exists public.payment_transactions (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    provider text not null check (provider in ('wompi', 'mercadopago', 'mock')),
    provider_tx_id text not null unique,
    plan text not null,
    billing_cycle text not null,
    amount numeric(10, 2) not null,
    currency text not null default 'USD',
    status text not null check (status in ('pending', 'approved', 'rejected', 'cancelled', 'refunded')),
    payment_method text,
    signature_hash text,
    terms_accepted boolean default true,
    terms_accepted_at timestamptz default now(),
    metadata jsonb default '{}'::jsonb,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_payment_transactions_user on public.payment_transactions(user_id);
create index if not exists idx_payment_transactions_provider_id on public.payment_transactions(provider_tx_id);

alter table public.payment_transactions enable row level security;

drop policy if exists "Los usuarios consultan sus propias transacciones" on public.payment_transactions;
create policy "Los usuarios consultan sus propias transacciones"
    on public.payment_transactions for select
    using (auth.uid() = user_id);

-- ============================================================
-- 10. TABLA: ORGANIZATIONS (Espacios Multi-Tenant y Equipos B2B)
-- ============================================================
create table if not exists public.organizations (
    id uuid default gen_random_uuid() primary key,
    name text not null,
    slug text not null unique,
    owner_id uuid references auth.users(id) on delete restrict not null,
    plan text not null default 'enterprise',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_organizations_slug on public.organizations(slug);

alter table public.organizations enable row level security;

-- ============================================================
-- 11. TABLA: ORGANIZATION_MEMBERS (Roles y Permisos RBAC)
-- ============================================================
create table if not exists public.organization_members (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    role text not null check (role in ('admin', 'architect', 'auditor')) default 'architect',
    joined_at timestamptz default now(),
    unique(organization_id, user_id)
);

create index if not exists idx_org_members_user on public.organization_members(user_id);
create index if not exists idx_org_members_org on public.organization_members(organization_id);

alter table public.organization_members enable row level security;

drop policy if exists "Miembros ven su organización" on public.organizations;
create policy "Miembros ven su organización"
    on public.organizations for select
    using (
        auth.uid() = owner_id or
        exists (
            select 1 from public.organization_members
            where organization_members.organization_id = organizations.id
            and organization_members.user_id = auth.uid()
        )
    );

drop policy if exists "Miembros ven integrantes de su misma organización" on public.organization_members;
create policy "Miembros ven integrantes de su misma organización"
    on public.organization_members for select
    using (
        exists (
            select 1 from public.organization_members as m
            where m.organization_id = organization_members.organization_id
            and m.user_id = auth.uid()
        )
    );

-- ============================================================
-- 12. TABLA: DOCUMENT_APPROVALS (Gobernanza de Arquitectura y Firmas)
-- ============================================================
create table if not exists public.document_approvals (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade,
    project_id text not null,
    document_type text not null,
    version text not null default '1.0.0',
    status text not null check (status in ('draft', 'under_review', 'approved', 'rejected')) default 'draft',
    requested_by uuid references auth.users(id) on delete set null,
    approved_by uuid references auth.users(id) on delete set null,
    approved_at timestamptz,
    comments text,
    change_summary text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_document_approvals_project on public.document_approvals(project_id);

alter table public.document_approvals enable row level security;

drop policy if exists "Aprobaciones accesibles por miembros autorizados" on public.document_approvals;
create policy "Aprobaciones accesibles por miembros autorizados"
    on public.document_approvals for select
    using (
        auth.uid() = requested_by or
        auth.uid() = approved_by or
        (organization_id is not null and exists (
            select 1 from public.organization_members
            where organization_members.organization_id = document_approvals.organization_id
            and organization_members.user_id = auth.uid()
        ))
    );

-- ============================================================
-- 13. TABLA: ENTERPRISE_CONFIGS (BYOK, Cero Retención y Marca Blanca)
-- ============================================================
create table if not exists public.enterprise_configs (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade unique,
    user_id uuid references auth.users(id) on delete cascade,
    -- BYOK Cifrado
    byok_provider text check (byok_provider in ('gemini', 'azure_openai', 'vertex_ai', 'ollama')),
    encrypted_api_key text,
    api_endpoint text,
    -- Cero Retención
    ephemeral_processing boolean default false,
    -- Marca Blanca / Identidad Corporativa
    company_name text,
    company_logo_url text,
    brand_primary_color text default '#38BDF8',
    brand_secondary_color text default '#818CF8',
    reviewer_title text default 'Arquitecto de Software Principal',
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

alter table public.enterprise_configs enable row level security;

drop policy if exists "Configs accesibles por su dueño o admin de org" on public.enterprise_configs;
create policy "Configs accesibles por su dueño o admin de org"
    on public.enterprise_configs for all
    using (
        auth.uid() = user_id or
        exists (
            select 1 from public.organization_members
            where organization_members.organization_id = enterprise_configs.organization_id
            and organization_members.user_id = auth.uid()
            and organization_members.role = 'admin'
        )
    );

-- ============================================================
-- 14. TABLA: AUDIT_LOGS (Trazabilidad y Cumplimiento Regulatorio)
-- ============================================================
create table if not exists public.audit_logs (
    id uuid default gen_random_uuid() primary key,
    organization_id uuid references public.organizations(id) on delete cascade,
    user_id uuid references auth.users(id) on delete set null,
    action text not null,
    entity_type text not null,
    entity_id text,
    details jsonb default '{}'::jsonb,
    ip_address text,
    created_at timestamptz default now()
);

create index if not exists idx_audit_logs_org_created on public.audit_logs(organization_id, created_at desc);

alter table public.audit_logs enable row level security;

drop policy if exists "Audit logs visibles para administradores y auditores" on public.audit_logs;
create policy "Audit logs visibles para administradores y auditores"
    on public.audit_logs for select
    using (
        auth.uid() = user_id or
        exists (
            select 1 from public.organization_members
            where organization_members.organization_id = audit_logs.organization_id
            and organization_members.user_id = auth.uid()
            and organization_members.role in ('admin', 'auditor')
        )
    );
