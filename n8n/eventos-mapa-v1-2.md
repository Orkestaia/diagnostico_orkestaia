# Eventos nuevos del mapa (mapa_v1.2) — pendiente de montar en n8n

Llegan al mismo webhook del motor (`N8N_WEBHOOK_URL`, cabecera `x-orkesta-token`) que el resto.
**No montar hasta desplegar la rama `mapa-v1-2`** (después de la visita del jueves 24). Mientras
el motor no los conozca, que los ignore sin error (no deben disparar el flujo de errores).

## `diagnostico.prioridades_elegidas`

Cada vez que el cliente guarda (o cambia) sus prioridades en el mapa.

```json
{
  "evento": "diagnostico.prioridades_elegidas",
  "diagnostico_id": "uuid",
  "empresa": "Clínica Colino",
  "contacto": { "nombre": "…", "email": "…" },
  "prioridades": ["Respuesta al momento a cada consulta nueva", "…"],
  "fecha": "2026-09-25T10:00:00.000Z",
  "cambios": 0,
  "urls": { "mapa": "https://diagnostico.orkestaia.com/m/<token>", "admin": "…/admin/d/<id>/mapa" }
}
```

Qué hacer: **Telegram a Aitor** (Hermes, chat 6674289801, solo sendMessage) y **email a Aitor**
(«Orkesta Gmail», diseño claro). Texto propuesto:

> «<empresa> ha elegido sus prioridades: 1) … 2) … 3) …» (si `cambios > 0`: «ha cambiado sus
> prioridades»). Enlace al mapa en el panel.

Sin datos personales más allá de nombre y email del contacto, que ya tiene el motor.

## `diagnostico.mapa_abierto` (APAGADO)

Solo existe con `MAPA_APERTURA_ACTIVO=1` en Vercel, que no se enciende hasta la luz verde de TEMIS.

```json
{
  "evento": "diagnostico.mapa_abierto",
  "diagnostico_id": "uuid",
  "empresa": "…",
  "aviso": "primera | otro_dispositivo | reapertura",
  "dispositivo": "movil | tableta | escritorio",
  "aperturas": 3,
  "urls": { "admin": "…/admin/d/<id>/mapa" }
}
```

Qué hacer: Telegram a Aitor. «<empresa> ha abierto su mapa» (primera), «…desde otro dispositivo
(móvil)», «…ha vuelto a abrir su mapa (3 veces)». La app ya limita: primera y otro dispositivo al
momento, reaperturas como mucho una al día.
