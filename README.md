# Diagnóstico Orkesta

App del diagnóstico de Orkesta: previo del cliente (`/d/[token]`), visita con Aitor
(`/admin/d/[id]/visita`), export para JARVIS y mapa del cliente (`/m/[token]`).

Contexto, reglas y documentos de referencia: ver `CLAUDE.md`.

## Puesta en marcha

1. `npm install`
2. `cp .env.example .env.local` y rellenar (ver comentarios del archivo).
3. Base de datos: ejecutar `supabase/diagnostico-v1-ddl.sql` en el editor SQL de Supabase
   (`ORKESTA_OPS_2026`), y después `diagnostico-v2-ddl.sql`, `diagnostico-v3-ddl.sql`
   (grabación) y `diagnostico-v4-ddl.sql` (encuesta del equipo).
4. `npm run dev` → http://localhost:3000/admin

## Visita (modo consultor)

`/admin/d/[id]/visita` (botón «Visita» del panel). Se enseña al cliente en el portátil o la
tableta.

- Bloques A-H (batería v2) con preguntas de núcleo y de profundizar; temporizador sobre 150 min que avisa para saltar al cierre.
- Candado: mantener pulsado 1 s → vista privada (campos 🔒, preparación del motor, % y notas de
  cada tarjeta). Vuelve sola a la vista cliente tras 20 s sin escribir o si la ventana pierde el
  foco. Lo privado se pide al servidor al entrar y se borra de la página al salir.
- Tarjetas: primero las que traen datos del previo; «tarjeta rápida» = nombre, volumen y minutos.
- Sin conexión: los cambios se guardan en el dispositivo (IndexedDB) y se envían al volver.
- Cerrar exige el coste por hora (real u orientativo). Al cerrar se fijan las horas de hoy de
  cada tarjeta (`hoyRegistro`), se calcula `calculo` y se avisa por n8n («listo para JARVIS»).

## Encuesta de madurez en IA (batería v2 §6)

Se crea desde el bloque F de la visita: enlace anónimo `/e/[token]`, abierto 7 días. El cálculo
del índice, los niveles, las alertas y las reglas de anonimato están en `src/lib/madurez.ts`
(con tests). Sin 3 respuestas no se enseña nada; un área necesita 3 para salir por separado.

## Export para JARVIS

```bash
curl -H "Authorization: Bearer $DIAGNOSTICO_ADMIN_TOKEN" "https://diagnostico-orkestaia.vercel.app/api/admin/diagnosticos/<id>/export?formato=md"
```

`formato=md` (por defecto): documento para guardar como `YYYY-MM-DD_diagnostico-app_raw.md` en
la carpeta del cliente (JARVIS decide cuál). `formato=transcripcion`: la transcripción completa
en su propio archivo (§9). `formato=json`: lo mismo + `calculo` y madurez del equipo.
Incluye las notas privadas; no incluye email ni teléfono.

## Tests

`npm test` · `npx tsc --noEmit` · `npm run lint`

## Despliegue

`git push` a `main` (Vercel, proyecto `diagnostico-orkestaia`).
