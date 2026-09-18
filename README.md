# Diagnóstico Orkesta

App del diagnóstico de Orkesta: previo del cliente (`/d/[token]`), visita con Aitor
(`/admin/d/[id]/visita`), export para JARVIS y mapa del cliente (`/m/[token]`).

Contexto, reglas y documentos de referencia: ver `CLAUDE.md`.

## Puesta en marcha

1. `npm install`
2. `cp .env.example .env.local` y rellenar (ver comentarios del archivo).
3. Base de datos: ejecutar `supabase/diagnostico-v1-ddl.sql` en el editor SQL de Supabase
   (`ORKESTA_OPS_2026`).
4. `npm run dev` → http://localhost:3000/admin

## Tests

`npm test` · `npx tsc --noEmit` · `npm run lint`

## Despliegue

`git push` a `main` (Vercel, proyecto `diagnostico-orkestaia`).
