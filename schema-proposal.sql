-- Proposed FUTURE database model for Instagram Analytics.
-- REFERENCE ONLY: DO NOT execute in the working LD LATTE Supabase project.
-- It has not been applied or RLS-reviewed for production deployment.

create table public.instagram_connections (
    id uuid primary key default gen_random_uuid(),
    owner_id uuid not null references auth.users(id),
    ig_user_id text not null unique,
    username text not null,
    auth_flow text not null check (auth_flow in ('instagram_login','facebook_login')),
    status text not null check (status in ('active','reconnect_required','disabled')),
    token_secret_ref text not null, -- REFERENCE ONLY; no plain token
    token_expires_at timestamptz,
    last_sync_at timestamptz,
    created_at timestamptz not null default now()
);

create table public.instagram_account_metrics (
    connection_id uuid not null references public.instagram_connections(id) on delete cascade,
    metric text not null,
    period text not null,
    period_start timestamptz not null,
    period_end timestamptz not null,
    value numeric,
    unavailable_reason text,
    collected_at timestamptz not null default now(),
    source_api_version text,
    primary key(connection_id, metric, period, period_start, period_end),
    check ((value is null) = (unavailable_reason is not null))
);

create table public.instagram_media (
    connection_id uuid not null references public.instagram_connections(id) on delete cascade,
    ig_media_id text not null,
    media_type text not null,
    published_at timestamptz not null,
    permalink text,
    caption_excerpt text,
    primary key(connection_id, ig_media_id)
);

create table public.instagram_media_metrics (
    connection_id uuid not null,
    ig_media_id text not null,
    metric text not null,
    snapshot_at date not null,
    value numeric,
    unavailable_reason text,
    collected_at timestamptz not null default now(),
    primary key(connection_id, ig_media_id, metric, snapshot_at),
    foreign key(connection_id, ig_media_id) references public.instagram_media(connection_id, ig_media_id)
);

create table public.instagram_sync_runs (
    id uuid primary key default gen_random_uuid(),
    connection_id uuid not null references public.instagram_connections(id) on delete cascade,
    started_at timestamptz not null default now(),
    finished_at timestamptz,
    status text not null,
    error_code text,
    error_summary text,
    retry_count integer not null default 0
);

-- Before real deployment: enable RLS on EVERY table, define tenant ownership
-- and server-only write permissions, verify grants, indexes and API semantics.
