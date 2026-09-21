-- Diagnóstico Orkesta — DDL v7 (22-sep): lo que hace el cliente en su mapa (mapa_v1.2).
-- Lo ejecuta Aitor en Supabase (proyecto ORKESTA_OPS_2026). Se puede ejecutar dos veces.
-- Solo añade columnas; no toca ninguna fila. Hace falta ANTES de desplegar la rama mapa-v1-2
-- (sin él, la app no se rompe, pero no guarda las prioridades ni las aperturas).

-- { "seleccion": ["<título de mejora>", ...], "fecha": "...", "cambios": 0 }
alter table diagnosticos add column if not exists prioridades_cliente jsonb;

-- { "total": 3, "primera_at": "...", "ultima_at": "...", "ultimo_aviso_at": "...",
--   "dispositivos": [{ "id": "<aleatorio>", "tipo": "movil", "primera_at": "..." }] }
-- Sin IP ni navegador. Solo se rellena con MAPA_APERTURA_ACTIVO=1 (apagado hasta TEMIS).
alter table diagnosticos add column if not exists mapa_aperturas jsonb;

notify pgrst, 'reload schema';
