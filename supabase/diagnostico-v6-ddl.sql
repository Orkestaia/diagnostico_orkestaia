-- Diagnóstico Orkesta — DDL v6 (22-sep): consentimiento para uso agregado y anónimo.
-- Lo ejecuta Aitor en Supabase (proyecto ORKESTA_OPS_2026). Se puede ejecutar dos veces.
-- Solo añade columnas; no toca ninguna fila (quedan en NULL = «sin respuesta»).
-- La casilla está apagada (CONSENTIMIENTO_AGREGADO_ACTIVO) hasta que llegue el texto revisado.

alter table diagnosticos add column if not exists consentimiento_agregado boolean;
alter table diagnosticos add column if not exists consentimiento_agregado_at timestamptz;
alter table diagnosticos add column if not exists consentimiento_agregado_version text;

-- Para que la API de Supabase vea las columnas nuevas sin esperar.
notify pgrst, 'reload schema';
