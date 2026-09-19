-- Diagnóstico Orkesta — DDL v4 (20-sep): encuesta de madurez en IA del equipo (batería v2 §6)
-- y temas de la transcripción (§9). Lo ejecuta Aitor en Supabase. Se puede ejecutar dos veces.

-- Enlace de la encuesta: uno por empresa, abierto unos días.
alter table diagnosticos add column if not exists encuesta_token text unique;
alter table diagnosticos add column if not exists encuesta_abierta_hasta timestamptz;

-- Resumen de 5 líneas de la transcripción ("Temas de la conversación", §9).
alter table diagnosticos add column if not exists transcripcion_temas jsonb;

-- Respuestas de la encuesta. ANÓNIMAS: ni nombre, ni email, ni IP, ni user agent, ni nada que
-- permita saber quién contestó. El área va dentro de `respuestas` y solo se usa agrupada.
create table if not exists diagnostico_encuesta_respuestas (
  id uuid primary key default gen_random_uuid(),
  diagnostico_id uuid not null references diagnosticos(id) on delete cascade,
  respuestas jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists diagnostico_encuesta_diag_idx on diagnostico_encuesta_respuestas (diagnostico_id);

-- Igual que el resto: RLS activado y sin políticas; solo entra el service role del servidor.
alter table diagnostico_encuesta_respuestas enable row level security;
