-- Diagnóstico Orkesta — DDL v3 (19-sep): grabación de la visita. Lo ejecuta Aitor en el editor
-- SQL de Supabase (ORKESTA_OPS_2026). Solo añade cosas nuevas; se puede ejecutar dos veces.

-- Consentimiento del cliente para grabar (obligatorio antes de subir audio).
alter table diagnosticos add column if not exists grabacion_consentimiento_at timestamptz;

-- Un fragmento = unos 5 min de audio. Se transcribe al llegar y el audio se borra al
-- transcribirse (decisión de Aitor, 19-sep). Solo queda el texto.
create table if not exists diagnostico_grabaciones (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references diagnosticos(id) on delete cascade,
  orden bigint not null,                       -- instante de inicio del fragmento (ms): ordena y evita duplicados
  duracion_s integer,
  audio_path text,                             -- ruta en el bucket; null cuando el audio ya se ha borrado
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'transcrito', 'error')),
  texto text,
  error text,
  intentos integer not null default 0,
  created_at timestamptz not null default now(),
  transcrito_at timestamptz,
  unique (diagnostico_id, orden)
);
create index if not exists diagnostico_grabaciones_diag_idx on diagnostico_grabaciones (diagnostico_id, orden);

-- Igual que `diagnosticos`: RLS activado y sin políticas. Solo entra el service role del servidor.
alter table diagnostico_grabaciones enable row level security;

-- Bucket PRIVADO para el audio mientras se transcribe (máx. 10 MB por fragmento).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('diagnostico-audio', 'diagnostico-audio', false, 10485760, array['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/mpeg'])
on conflict (id) do nothing;
