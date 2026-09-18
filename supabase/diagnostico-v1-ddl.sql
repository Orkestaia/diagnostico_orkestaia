-- Diagnóstico Orkesta — DDL v1
-- Proyecto Supabase: ORKESTA_OPS_2026 (ddruuldwacxvvhvhjomm), el mismo del CRM.
-- Fuente: spec de producto v2 §8 y §10 (ORKESTA - JARVIS/01_ORKESTA_CORE/sales-system/diagnostico-app/).
--
-- Lo ejecuta Aitor en el editor SQL de Supabase. Todo es nuevo: no toca ninguna tabla existente
-- (solo referencia crm_contactos por clave foránea). Se puede ejecutar dos veces sin romper nada.
--
-- Tres piezas:
--   1. Tabla `diagnosticos` (la de la spec + `mapa_caduca_at`, §10).
--   2. Trigger que mantiene `updated_at`.
--   3. Límite de 60 escrituras por minuto y token en las rutas públicas (§10), sin Redis.


-- ── 1. Tabla ─────────────────────────────────────────────────────────────────

create table if not exists diagnosticos (
  id uuid primary key default gen_random_uuid(),
  token text unique not null,                         -- nanoid(21), lo único que va en URLs. Revocar = generar otro
  tipo text not null default 'diagnostico'
    check (tipo in ('diagnostico','lead_magnet','cold_email')),
  origen text,                                        -- 'bni' | 'web' | 'chatbot' | 'cold_email' | 'referido' | 'manual'
  sector text not null,
  subsector text,
  estado text not null default 'invitado' check (estado in (
    'invitado','previo_en_curso','previo_completado','visita_en_curso','visita_cerrada',
    'mapa_borrador','mapa_publicado',                 -- tipo 'diagnostico'
    'en_curso','componiendo','informe_listo',         -- tipo 'lead_magnet' (sprint 4)
    'error')),
  fase_actual int not null default 1,
  empresa text,
  contacto_nombre text,
  contacto_email text,
  contacto_telefono text,
  web text,
  fecha_reunion date,
  datos_previos jsonb,
  respuestas_previo jsonb not null default '{}',
  respuestas_visita jsonb not null default '{}',
  procesos jsonb not null default '[]',               -- tarjetas de proceso (sin campos 🔒)
  privado jsonb not null default '{}',                -- TODOS los campos 🔒: nunca sale por rutas públicas
  boceto jsonb,                                       -- escena de Excalidraw (sprint 3)
  calculo jsonb,
  interno jsonb,                                      -- hipótesis del previo (n8n): solo Aitor
  informe jsonb,                                      -- textos visibles del motor (previo: lo entendido y temas) · lead_magnet (sprint 4)
  mapa jsonb,                                         -- mapa_v1
  mapa_pdf_path text,                                 -- Supabase Storage, bucket privado 'mapas-pdf'
  mapa_caduca_at timestamptz,                         -- publicado + 12 meses; Aitor lo renueva desde el panel (§10)
  config_version text not null,
  crm_contacto_id uuid references crm_contactos(id),
  consentimiento_at timestamptz,
  utm jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  previo_completado_at timestamptz,
  visita_cerrada_at timestamptz,
  mapa_publicado_at timestamptz
);

create index if not exists diagnosticos_estado_idx on diagnosticos (estado);
create index if not exists diagnosticos_contacto_email_idx on diagnosticos (contacto_email);

-- Sin políticas: ni anon ni authenticated leen nada. Solo el servidor, con la service role.
alter table diagnosticos enable row level security;


-- ── 2. updated_at ───────────────────────────────────────────────────────────

create or replace function diagnosticos_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists diagnosticos_updated_at on diagnosticos;
create trigger diagnosticos_updated_at
  before update on diagnosticos
  for each row execute function diagnosticos_set_updated_at();


-- ── 3. Límite de escrituras por token ───────────────────────────────────────
-- Una fila por token y minuto. La función suma y responde en una sola sentencia
-- (insert … on conflict), así dos peticiones simultáneas no pueden colarse las dos.

create table if not exists diagnostico_escrituras (
  token text not null,
  ventana timestamptz not null,                       -- inicio del minuto
  n int not null default 0,
  primary key (token, ventana)
);

alter table diagnostico_escrituras enable row level security;

-- Devuelve true si la escritura entra en el límite, false si hay que responder 429.
create or replace function diagnostico_registrar_escritura(p_token text, p_limite int default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ventana timestamptz := date_trunc('minute', now());
  v_n int;
begin
  insert into diagnostico_escrituras (token, ventana, n)
  values (p_token, v_ventana, 1)
  on conflict (token, ventana) do update set n = diagnostico_escrituras.n + 1
  returning n into v_n;

  -- Limpieza: las ventanas de más de una hora ya no sirven para nada.
  delete from diagnostico_escrituras
  where token = p_token and ventana < now() - interval '1 hour';

  return v_n <= p_limite;
end;
$$;

-- Solo la llama el servidor (service role). Nadie más puede ejecutarla.
revoke execute on function diagnostico_registrar_escritura(text, int) from public, anon, authenticated;
grant execute on function diagnostico_registrar_escritura(text, int) to service_role;


-- ── Comprobación (opcional, después de ejecutar lo anterior) ─────────────────
-- select column_name, data_type from information_schema.columns
--   where table_name = 'diagnosticos' order by ordinal_position;
-- select diagnostico_registrar_escritura('prueba', 60);   -- debe devolver true
-- delete from diagnostico_escrituras where token = 'prueba';
