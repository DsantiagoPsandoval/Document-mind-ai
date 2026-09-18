-- ============================================================
-- DOCUMENT-MIND AI — ESQUEMA DE BASE DE DATOS SUPABASE
-- PostgreSQL + Row Level Security (RLS) + Triggers
-- ============================================================

-- 1. Habilitar extensión UUID si no está activa
create extension if not exists "uuid-ossp";

-- ============================================================
-- 2. TABLA: PROFILES (Perfiles de usuario)
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

-- Habilitar RLS en profiles
alter table public.profiles enable row level security;

-- Políticas de seguridad para profiles
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

-- ============================================================
-- 3. TRIGGER AUTOMÁTICO: Crear perfil al registrarse en auth.users
-- ============================================================
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

-- Trigger asociado
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ============================================================
-- 4. TABLA: ANALYSES (Análisis de Documentos y Repositorios)
-- ============================================================
create table if not exists public.analyses (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    type text not null check (type in ('document', 'github')),
    title text not null,
    meta text,
    data jsonb not null,
    created_at timestamptz default now()
);

-- Índices para optimizar consultas de usuario y orden temporal
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);

-- Habilitar RLS en analyses
alter table public.analyses enable row level security;

-- Políticas de seguridad para analyses
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
