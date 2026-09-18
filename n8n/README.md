# Motor de n8n — «Orkesta - Motor de Diagnóstico - v1»

Instancia: n8n personal de Aitor (`acgrowthmarketing.app.n8n.cloud`), workflow `5MQckeZ5yXB1oDqV`.
Spec: `motor-diagnostico-n8n_spec_v1_2026-09-18.md` (JARVIS).

`motor-diagnostico.plantilla.json` es el workflow tal cual está en n8n, con el secreto HMAC
sustituido por `{{DIAGNOSTICO_HMAC_SECRET}}`. El secreto real está en los nodos Code
«Verificar firma», «Firmar callback» y «Firmar petición», y en `DIAGNOSTICO_HMAC_SECRET` de la
app (Vercel). Si se cambia en un sitio, hay que cambiarlo en los dos.

## Qué hace

| Entrada | Qué pasa |
|---|---|
| `diagnostico.previo_completado` (webhook `POST /webhook/diagnostico-motor`, firmado) | IA (gpt-4.1-mini, sin cifras) redacta lo entendido, temas, hipótesis y preguntas para la visita → se valida (sin números con unidad, sin tecnicismos, temas como tareas) o se usan los textos base → callback firmado a la app → email de confirmación al cliente (si tiene email) · email interno a Aitor con cifras · Telegram · fila en Airtable |
| `diagnostico.visita_cerrada` | Telegram + email a Aitor «listo para JARVIS» + Airtable |
| Cada día a las 10:00 | Pide a la app los previos sin terminar tras 48 h (`POST /api/motor/pendientes`, firmado; la app los marca para no repetir) → email de recordatorio al cliente (si tiene email) · Telegram a Aitor con el WhatsApp ya escrito · Airtable |

Credenciales: OpenAi account · Orkesta Gmail · Telegram Hermes (avisos diagnóstico) = bot @Hermes_Agent_Orkesta_bot, solo sendMessage (chat 6674289801) ·
Airtable Personal Access Token account (base `Diagnóstico_orkesta`, tabla `Diagnósticos`).

## Cambiar la URL de la app

Los nodos «Callback a la app» y «Previos sin terminar» apuntan a
`https://diagnostico-orkestaia-orkesta-automation.vercel.app`. Cuando exista el subdominio,
cambiarlos a `https://diagnostico.orkestaia.com`.
