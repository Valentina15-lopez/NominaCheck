-- NóminaCheck · esquema inicial
--
-- Ejecutar una sola vez en el SQL Editor de Supabase. Es idempotente: se puede
-- volver a correr sin perder datos.
--
-- Cada fila cuelga de auth.users mediante user_id y queda aislada por RLS: un
-- contador solo ve y modifica sus propios controles.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- controles
-- Un control es la unidad de trabajo: una empresa y un período. En `result`
-- se guarda el NominaCheckResult completo que devuelve el motor, que es la
-- fuente de verdad para el informe y la trazabilidad.
create table if not exists public.controls (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  company            text not null,
  period             text not null check (period ~ '^20\d{2}-(0[1-9]|1[0-2])$'),
  status             text not null default 'draft'
                       check (status in ('draft', 'ready', 'processing', 'completed', 'error')),
  rounding_tolerance numeric(14, 2) check (rounding_tolerance is null or rounding_tolerance >= 0),
  observations       text not null default '',
  result             jsonb,
  general_status     text,
  processing_error   text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- Permite saber si el control ya tiene informe sin traer el JSON completo.
  has_result         boolean generated always as (result is not null) stored
);

create index if not exists controls_user_created_idx
  on public.controls (user_id, created_at desc);

-- --------------------------------------------------------------- documentos
-- `storage_path` apunta al archivo real en el bucket control-documents.
-- `analysis_document_id` es el id que el motor le asigna al documento
-- (hash del contenido), y permite volver del resultado al archivo original.
create table if not exists public.control_documents (
  id                   uuid primary key default gen_random_uuid(),
  control_id           uuid not null references public.controls (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade,
  name                 text not null,
  kind                 text not null check (kind in ('ls', 'payroll', 'receipt', 'transfer')),
  size                 bigint not null default 0,
  status               text not null default 'uploaded'
                         check (status in ('uploaded', 'processed', 'error')),
  error                text,
  storage_path         text,
  analysis_document_id text,
  created_at           timestamptz not null default now()
);

create index if not exists control_documents_control_idx
  on public.control_documents (control_id, created_at);

-- ------------------------------------------------------------- trabajadores
-- Vista desnormalizada por persona, derivada del resultado del motor. Existe
-- como tabla propia porque el contador edita estas filas (marcar revisado,
-- reasignar transferencias) y esas decisiones tienen que sobrevivir.
create table if not exists public.control_workers (
  id              uuid primary key default gen_random_uuid(),
  control_id      uuid not null references public.controls (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  document_number text not null,
  full_name       text not null,
  role            text not null default '',
  status          text not null
                    check (status in ('correct', 'warning', 'incomplete', 'manual-review')),
  odoo_nominal    numeric(14, 2) not null default 0,
  payroll_nominal numeric(14, 2),
  receipt_nominal numeric(14, 2),
  receipt_liquid  numeric(14, 2),
  observation     text,
  reviewed        boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (control_id, document_number)
);

create index if not exists control_workers_control_idx
  on public.control_workers (control_id, sort_order);

-- ------------------------------------------------- recibos y transferencias
create table if not exists public.control_payments (
  id                 uuid primary key default gen_random_uuid(),
  control_id         uuid not null references public.controls (id) on delete cascade,
  worker_id          uuid not null references public.control_workers (id) on delete cascade,
  user_id            uuid not null references auth.users (id) on delete cascade,
  kind               text not null check (kind in ('receipt', 'transfer')),
  name               text not null,
  amount             numeric(14, 2) not null default 0,
  paid_on            text,
  reference          text,
  shared_with        text[] not null default '{}',
  association_status text check (association_status in ('confirmed', 'suggested', 'unassigned')),
  source_document_id text,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now()
);

create index if not exists control_payments_worker_idx
  on public.control_payments (worker_id, kind, sort_order);

-- ------------------------------------------------------------ preferencias
create table if not exists public.user_settings (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  currency           text not null default 'UYU' check (currency in ('UYU', 'ARS', 'USD')),
  warn_differences   boolean not null default true,
  rounding_tolerance numeric(14, 2) check (rounding_tolerance is null or rounding_tolerance >= 0),
  updated_at         timestamptz not null default now()
);

-- ----------------------------------------------------------------- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists controls_touch_updated_at on public.controls;
create trigger controls_touch_updated_at
  before update on public.controls
  for each row execute function public.touch_updated_at();

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ------------------------------------------------------------------- RLS
alter table public.controls           enable row level security;
alter table public.control_documents  enable row level security;
alter table public.control_workers    enable row level security;
alter table public.control_payments   enable row level security;
alter table public.user_settings      enable row level security;

do $$
declare
  target text;
begin
  foreach target in array array[
    'controls', 'control_documents', 'control_workers', 'control_payments', 'user_settings'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', target || '_owner', target);
    execute format(
      'create policy %I on public.%I for all to authenticated
         using (user_id = auth.uid()) with check (user_id = auth.uid())',
      target || '_owner',
      target
    );
  end loop;
end;
$$;

-- --------------------------------------------------------------- storage
-- Bucket privado. Cada archivo vive en <user_id>/<control_id>/<uuid>-<nombre>,
-- así la primera carpeta identifica al dueño y alcanza para la política.
insert into storage.buckets (id, name, public, file_size_limit)
values ('control-documents', 'control-documents', false, 15728640)
on conflict (id) do update
  set public = false,
      file_size_limit = 15728640;

drop policy if exists control_documents_storage_owner on storage.objects;
create policy control_documents_storage_owner on storage.objects
  for all to authenticated
  using (
    bucket_id = 'control-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'control-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
