# Prueba del martes 22-sep — rama `grabacion-pausa`

Qué se prueba: pausa de la grabación, cierre de la visita con avisos de plausibilidad (aviso de
más de 60 min en todas las áreas salvo Operación y Dirección) y el mapa de Colino.
El consentimiento agregado va apagado: no se ve nada.

**Si todo va bien antes de las 20:00 → decir «fusiona» y pasa a producción.**
**Si algo falla → apuntar el paso y lo que se vio; se fusiona después de la visita del jueves 24.**

## Antes de empezar

- SQL de Supabase: **hecho** (comprobado el 22-sep: existen las columnas v5, v6 y v7).
- Se usa el diagnóstico de prueba **«Marta Test»** (servicios profesionales, previo completado por
  Marta, visita sin empezar). No hace falta crear otro.
- Usar el portátil de las visitas, en Chrome o Edge, con micrófono.

## Enlaces

La versión de prueba pide primero la sesión de Vercel (cuenta de Orkesta) y luego la de Clerk
(aitor@orkestaia.com), igual que el panel de siempre.

- Panel: https://diagnostico-orkestaia-git-grabacion-pausa-orkesta-automation.vercel.app/admin
- Mapa de Colino: https://diagnostico-orkestaia-git-grabacion-pausa-orkesta-automation.vercel.app/m/8KDrahMW30hR-AdO5jIlm

Ojo: la versión de prueba usa **la base de datos real**. Lo que se cree queda guardado. No manda
nada a n8n (ni Telegram, ni emails, ni Drive): así la prueba no molesta a nadie.

## Pasos (unos 20 min)

1. **Abrir la visita de Marta.** En el panel, fila «Marta Test» → Visita. Comprueba de paso
   que «Lo que nos contaste» enseña sus respuestas del previo.
2. **Pausa de la grabación.**
   - Pulsar *Grabar* y aceptar el consentimiento. Hablar unos 30 s.
   - Pulsar el botón rojo: debe poner «En pausa 0:30 · Seguir» y el reloj quedarse quieto.
   - Esperar 1 min y pulsar *Seguir*: el reloj sigue desde 0:30, no desde cero.
   - Pulsar *Terminar*. En la vista privada: **1 fragmento** (no 2), y al rato «transcrito».
3. **No deja cerrar grabando.** Grabar otra vez, pausar y pulsar *Terminar la visita* →
   debe pedir que termines la grabación. Pulsar *Terminar* en la grabación.
4. **Tarjetas para los avisos** (y rellenar el coste por hora en la vista privada, bloque C):
   - Área Clientes, 90 min cada vez → debe avisar.
   - Área Operación, 90 min cada vez → no debe avisar.
   - Una con mucho volumen (400 al mes × 45 min) → debe avisar del tope de equipo.
5. **Cerrar con avisos.** *Terminar la visita* → *Cerrar la visita*.
   - Salen los avisos de Clientes y del tope; ninguno de Operación.
   - *Revisar* vuelve atrás sin cerrar. *Cerrar igualmente* cierra.
6. **Export.** En resultados, descargar el export: al final de «4. Cálculo» aparecen los avisos.
7. **Mapa de Colino.** En el panel, la fila «Clínica Colino» tiene ahora un botón **Mapa** (vista
   previa): comprobar que abre. Después, en el enlace del cliente, escribir 25 en «¿Y en euros?» → salen euros por proceso. En
   «Recordatorios que se confirman solos», las flechas llevan «Confirma» y «Pide cambio».
8. **Nada que borrar.** «Marta Test» se queda con la visita cerrada; es de prueba. Una visita
   cerrada no se puede reabrir: para repetir la prueba, crear otro diagnóstico de prueba.

## Resultado

| Paso | Bien / Mal | Qué se vio |
|------|------------|------------|
| 1 | | |
| 2 | | |
| 3 | | |
| 4-5 | | |
| 6 | | |
| 7 | | |
| 8 | | |

## SQL para Supabase (YA EJECUTADO — solo por si hay que repetirlo; no hace daño)

```sql
-- v5: con qué redacción del banco se contestó cada respuesta del previo
alter table diagnosticos add column if not exists respuestas_previo_redaccion jsonb;

-- v6: consentimiento para uso agregado y anónimo (la casilla sigue apagada)
alter table diagnosticos add column if not exists consentimiento_agregado boolean;
alter table diagnosticos add column if not exists consentimiento_agregado_at timestamptz;
alter table diagnosticos add column if not exists consentimiento_agregado_version text;

-- que la API de Supabase vea las columnas nuevas al momento
notify pgrst, 'reload schema';
```
