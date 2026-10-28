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
    avatar_url text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

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
