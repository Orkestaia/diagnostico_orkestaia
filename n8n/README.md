# Motor de n8n — «Orkesta - Motor de Diagnóstico - v1»

Instancia: n8n personal de Aitor (`acgrowthmarketing.app.n8n.cloud`), workflow `5MQckeZ5yXB1oDqV`.
Spec: `motor-diagnostico-n8n_spec_v1_2026-09-18.md` (JARVIS).

`motor-diagnostico.plantilla.json` es el workflow tal cual está en n8n. **No contiene ningún
secreto** (decisión de JARVIS, 19-sep; la licencia de n8n no tiene variables):

- La app llama al webhook con la cabecera `x-orkesta-token`; el propio Webhook la comprueba con
  la credencial «Diagnóstico · token app ↔ motor» (Header Auth).
- n8n llama a la app (callback y recordatorio) con esa misma credencial.
- En la app, el token es `DIAGNOSTICO_MOTOR_TOKEN` (Vercel). Si se rota, cambiarlo en los dos sitios.

Errores: el motor tiene asignado el flujo «Orkesta - Alertas de error (diagnóstico)», que avisa
por Telegram. Si la app responde 409 al callback (ya tenía redacción), el flujo se para sin
enviar emails; si falla por otra cosa tras 3 reintentos, avisa por Telegram y sigue.

## Qué hace

| Entrada | Qué pasa |
|---|---|
| `diagnostico.previo_completado` (webhook `POST /webhook/diagnostico-motor`, firmado) | IA (gpt-4.1-mini, sin cifras; los programas del cliente se nombran tal cual) redacta lo entendido, temas, hipótesis y preguntas para la visita → se valida (sin números con unidad, sin tecnicismos, temas como tareas) o se usan los textos base → callback firmado a la app → email de confirmación al cliente (si tiene email) · email interno a Aitor con cifras · Telegram · fila en Airtable |
| `diagnostico.visita_cerrada` | Telegram + email a Aitor «listo para JARVIS» + Airtable |
| Cada día a las 10:00 | Pide a la app los previos sin terminar tras 48 h (`POST /api/motor/pendientes`, con token; la app los marca para no repetir) → email de recordatorio al cliente (si tiene email) · Telegram a Aitor con el WhatsApp ya escrito · Airtable |

Credenciales: OpenAi account · Orkesta Gmail · Telegram Hermes (avisos diagnóstico) = bot @Hermes_Agent_Orkesta_bot, solo sendMessage (chat 6674289801) ·
Airtable Personal Access Token account (base `Diagnóstico_orkesta`, tabla `Diagnósticos`).

## Cambiar la URL de la app

Los nodos «Callback a la app» y «Previos sin terminar» apuntan a
`https://diagnostico-orkestaia.vercel.app` (dominio público; el alias `…-orkesta-automation` tiene la protección de Vercel y da 401). Cuando exista el subdominio,
cambiarlos a `https://diagnostico.orkestaia.com`.
