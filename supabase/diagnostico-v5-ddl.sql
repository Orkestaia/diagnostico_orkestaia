-- Diagnóstico Orkesta — DDL v5 (21-sep): con qué redacción del banco se contestó cada respuesta
-- del previo (banco_v1.1). Lo ejecuta Aitor en Supabase. Se puede ejecutar dos veces.
--
-- Solo añade una columna. No toca ninguna fila: las respuestas guardadas antes quedan sin versión
-- propia y la app usa la del diagnóstico (`config_version`).
--
-- La app funciona igual si esto aún no se ha ejecutado: el previo se guarda como siempre y solo
-- deja de apuntarse la versión (sale un aviso en los logs de Vercel).

-- { "<id de pregunta>": "banco_v1.1", ... }
alter table diagnosticos add column if not exists respuestas_previo_redaccion jsonb;
