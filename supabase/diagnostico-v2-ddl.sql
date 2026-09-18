-- Diagnóstico Orkesta — DDL v2 (18-sep). Lo ejecuta Aitor en el editor SQL de Supabase.
-- Solo añade columnas nuevas, con valor vacío por defecto: nada existente cambia.
-- Se puede ejecutar dos veces sin romper nada.

-- Hora y lugar de la reunión (la pantalla final dice "Nos vemos el lunes 21 a las 10:00 en …"
-- y ofrece "Añadir a mi calendario").
alter table diagnosticos add column if not exists hora_reunion time;
alter table diagnosticos add column if not exists lugar_reunion text;

-- Tipo de negocio concreto elegido en la invitación ("Inmobiliaria", "Veterinaria"…). `sector`
-- sigue siendo el juego de preguntas del banco que se usa.
alter table diagnosticos add column if not exists tipo_negocio text;

-- Recordatorio automático si el previo no se termina en 48 h: se envía una sola vez.
alter table diagnosticos add column if not exists recordatorio_enviado_at timestamptz;
