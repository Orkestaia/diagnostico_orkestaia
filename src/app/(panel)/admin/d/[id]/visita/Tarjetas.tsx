"use client";

import { useMemo, useState } from "react";
import { FlowDiagram } from "@/components/diagrama/FlowDiagram";
import { plantillasDeSector, PCT_DEFECTO_OTRO } from "@/config/consultor/plantillas";
import {
  AREAS,
  ERRORES,
  LIMITES_TARJETA,
  PERIODOS,
  QUIEN,
  TARJETAS_VISITA,
  tarjetaNueva,
  type Paso,
  type TarjetaProceso,
} from "@/config/consultor/tarjeta";
import type { SectorId } from "@/config/tipos";
import { hoyHorasMes, redondearHoras } from "@/lib/calculo";
import { diagramaDesdePasos } from "@/lib/diagrama";
import { nuevoIdTarjeta } from "@/lib/visita";
import { BOTON, BOTON_PRIMARIO, CAMPO, Chips, Etiqueta, Numero, Texto } from "./campos";
import { SoloPrivado, usePrivada } from "./privada";

/**
 * Bloque B · Procesos (batería §2-3, JARVIS 19-sep): 5-7 tarjetas, empezando por las que traen
 * datos del previo; "tarjeta rápida" (solo nombre, volumen y minutos) para cuando no hay tiempo.
 * En la visita se enseñan las horas que consume HOY cada proceso; nunca el ahorro.
 */

const formatoHoras = (h: number | null) =>
  h === null ? null : `~${String(redondearHoras(h)).replace(".", ",")} h al mes`;

export function horasHoy(t: TarjetaProceso, sector: SectorId) {
  return hoyHorasMes(t, sector);
}

export function BloqueProcesos({
  sector,
  tarjetas,
  sugeridas,
  onCambio,
}: {
  sector: SectorId;
  tarjetas: TarjetaProceso[];
  sugeridas: TarjetaProceso[];
  onCambio: (t: TarjetaProceso[]) => void;
}) {
  const [abierta, setAbierta] = useState<string | null>(null);
  const plantillas = plantillasDeSector(sector);
  const ordenadas = useMemo(
    () => [...tarjetas].sort((a, b) => (horasHoy(b, sector) ?? -1) - (horasHoy(a, sector) ?? -1)),
    [tarjetas, sector],
  );
  const pendientes = sugeridas.filter((s) => !tarjetas.some((t) => t.id === s.id));
  const usadas = new Set(tarjetas.map((t) => t.plantilla));

  const añadir = (t: TarjetaProceso) => {
    onCambio([...tarjetas, t]);
    setAbierta(t.id);
  };
  const cambiar = (t: TarjetaProceso) => onCambio(tarjetas.map((x) => (x.id === t.id ? t : x)));
  const borrar = (id: string) => {
    onCambio(tarjetas.filter((x) => x.id !== id));
    setAbierta(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small">
          <span className={"cifra " + (tarjetas.length >= TARJETAS_VISITA.min ? "text-ork-cyan" : "text-ork-text")}>
            {tarjetas.length} tarjetas
          </span>{" "}
          · objetivo {TARJETAS_VISITA.min}-{TARJETAS_VISITA.max}, mejor pocas y con cifras
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={BOTON} onClick={() => añadir(tarjetaNueva({ id: nuevoIdTarjeta(), rapida: true }))}>
            Tarjeta rápida
          </button>
          <button type="button" className={BOTON} onClick={() => añadir(tarjetaNueva({ id: nuevoIdTarjeta() }))}>
            Tarjeta en blanco
          </button>
        </div>
      </div>

      {pendientes.length ? (
        <div>
          <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">Con datos del previo</p>
          <div className="flex flex-wrap gap-2">
            {pendientes.map((s) => (
              <button key={s.id} type="button" className={BOTON} onClick={() => añadir(s)}>
                + {s.nombre}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {plantillas.length ? (
        <details className="group">
          <summary className="cursor-pointer text-small text-ork-text-muted hover:text-ork-text">
            Procesos típicos del sector ({plantillas.filter((p) => !usadas.has(p.nombre)).length})
          </summary>
          <div className="mt-3 flex flex-wrap gap-2">
            {plantillas
              .filter((p) => !usadas.has(p.nombre))
              .map((p) => (
                <button
                  key={p.nombre}
                  type="button"
                  className={BOTON}
                  onClick={() => añadir(tarjetaNueva({ id: nuevoIdTarjeta(), nombre: p.nombre.slice(0, 60), plantilla: p.nombre, area: p.area }))}
                >
                  + {p.nombre}
                </button>
              ))}
          </div>
        </details>
      ) : null}

      <ul className="space-y-3">
        {ordenadas.map((t) => (
          <li key={t.id}>
            {abierta === t.id ? (
              <EditorTarjeta
                sector={sector}
                tarjeta={t}
                onCambio={cambiar}
                onBorrar={() => borrar(t.id)}
                onCerrar={() => setAbierta(null)}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAbierta(t.id)}
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-ork-border bg-ork-surface-1/85 px-5 py-4 text-left transition-colors hover:border-ork-cyan"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-ork-text">{t.nombre || "Proceso sin nombre"}</span>
                  <span className="text-small text-ork-text-faint">
                    {[t.area, t.rapida ? "rápida" : null, t.visto ? "visto" : null, t.origenDatos === "previo" ? "datos del previo" : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </span>
                <span className="cifra shrink-0 font-display text-body-lg text-ork-cyan-hi">
                  {formatoHoras(horasHoy(t, sector)) ?? "—"}
                </span>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditorTarjeta({
  sector,
  tarjeta: t,
  onCambio,
  onBorrar,
  onCerrar,
}: {
  sector: SectorId;
  tarjeta: TarjetaProceso;
  onCambio: (t: TarjetaProceso) => void;
  onBorrar: () => void;
  onCerrar: () => void;
}) {
  const privada = usePrivada();
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  const poner = (c: Partial<TarjetaProceso>) => onCambio({ ...t, ...c });
  // Tocar volumen o minutos delante del cliente convierte el dato en "acordado en la visita".
  const ponerCifra = (c: Partial<TarjetaProceso>) => poner({ ...c, origenDatos: "visita" });
  const hoy = horasHoy(t, sector);
  const plantilla = plantillasDeSector(sector).find((p) => p.nombre === t.plantilla);
  const pctDefecto = sector === "otro" ? PCT_DEFECTO_OTRO : typeof plantilla?.pct === "number" ? plantilla.pct : null;

  return (
    <article className="space-y-5 rounded-2xl border border-ork-cyan/60 bg-ork-surface-1/95 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <Texto etiqueta="Proceso" valor={t.nombre} filas={1} max={LIMITES_TARJETA.nombre} onGuardar={(v) => poner({ nombre: v })} />
        </div>
        <div className="text-right">
          <p className="text-small text-ork-text-faint">Hoy</p>
          <p className="cifra font-display text-h3 text-ork-cyan-hi">{formatoHoras(hoy) ?? "—"}</p>
        </div>
      </div>

      <SoloPrivado>
        <div className="space-y-4">
          {plantilla ? (
            <p className="text-small">
              <span className="text-ork-text">Para abrir:</span> {plantilla.pregunta}
              <span className="text-ork-text-faint"> · {plantilla.qw ?? "genérico"}</span>
            </p>
          ) : null}
          <div>
            <Etiqueta>
              % automatizable estimado:{" "}
              <span className="cifra text-ork-text">
                {Math.round(((privada.tarjeta(t.id).pctAutomatizable ?? pctDefecto) ?? 0) * 100)} %
              </span>
              {privada.tarjeta(t.id).pctAutomatizable == null && pctDefecto != null ? " (por defecto)" : ""}
            </Etiqueta>
            <input
              type="range"
              min={0}
              max={70}
              step={5}
              value={Math.round(((privada.tarjeta(t.id).pctAutomatizable ?? pctDefecto) ?? 0) * 100)}
              onChange={(e) => privada.ponerTarjeta(t.id, { pctAutomatizable: Number(e.target.value) / 100 })}
              className="w-full max-w-md accent-[var(--color-ork-violet)]"
            />
          </div>
          <Texto etiqueta="Primera idea" valor={privada.tarjeta(t.id).ideaSolucion ?? ""} filas={2} onGuardar={(v) => privada.ponerTarjeta(t.id, { ideaSolucion: v })} />
          <Texto etiqueta="Dependencias (accesos, programa cerrado, permisos…)" valor={privada.tarjeta(t.id).dependencias ?? ""} filas={2} onGuardar={(v) => privada.ponerTarjeta(t.id, { dependencias: v })} />
          <Texto etiqueta="Nota" valor={privada.tarjeta(t.id).nota ?? ""} filas={2} onGuardar={(v) => privada.ponerTarjeta(t.id, { nota: v })} />
        </div>
      </SoloPrivado>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div className="flex items-end gap-2">
          <Numero etiqueta="Volumen" valor={t.volumen} onGuardar={(v) => ponerCifra({ volumen: v })} />
          <div className="flex-1">
            <Etiqueta>Unidad</Etiqueta>
            <input
              value={t.volumenUnidad}
              maxLength={40}
              placeholder="expedientes, pedidos…"
              onChange={(e) => poner({ volumenUnidad: e.target.value })}
              className={CAMPO}
            />
          </div>
        </div>
        <Chips
          etiqueta="Cada"
          opciones={PERIODOS.map((p) => p.etiqueta)}
          valor={PERIODOS.find((p) => p.id === t.volumenPeriodo)?.etiqueta}
          onCambio={(v) => ponerCifra({ volumenPeriodo: PERIODOS.find((p) => p.etiqueta === v)?.id ?? "mes" })}
        />
        <Numero
          etiqueta="Minutos cada vez"
          valor={t.minutosPorVez}
          placeholder="aprox."
          sufijo="min"
          onGuardar={(v) => ponerCifra({ minutosPorVez: v })}
        />
      </div>

      {t.rapida ? (
        <button type="button" className={BOTON} onClick={() => poner({ rapida: false })}>
          Completar la tarjeta
        </button>
      ) : (
        <>
          <Chips etiqueta="Área" opciones={[...AREAS]} valor={t.area} onCambio={(v) => poner({ area: (v as TarjetaProceso["area"]) ?? null })} />
          <Texto etiqueta="¿Qué lo pone en marcha?" valor={t.disparador} filas={1} onGuardar={(v) => poner({ disparador: v })} />
          <EditorPasos pasos={t.pasos} onCambio={(pasos) => poner({ pasos })} titulo={t.nombre} />
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <Chips etiqueta="¿Quién lo hace?" opciones={QUIEN.map((q) => q.etiqueta)} valor={t.quien} onCambio={(v) => poner({ quien: (v as string) ?? null })} />
            <Numero etiqueta="Personas" valor={t.quienPersonas} onGuardar={(v) => poner({ quienPersonas: v })} />
          </div>
          <Texto etiqueta="Herramientas (separadas por comas)" valor={t.herramientas.join(", ")} filas={1} onGuardar={(v) => poner({ herramientas: v.split(",").map((x) => x.trim()).filter(Boolean) })} />
          <Texto etiqueta="¿Dónde se espera o se atasca?" valor={t.atasco} filas={2} onGuardar={(v) => poner({ atasco: v })} />
          <div className="grid gap-4 sm:grid-cols-[auto_1fr]">
            <Chips etiqueta="Errores" opciones={[...ERRORES]} valor={t.errores} onCambio={(v) => poner({ errores: (v as TarjetaProceso["errores"]) ?? null })} />
            <Texto etiqueta="Ejemplo" valor={t.erroresEjemplo} filas={1} onGuardar={(v) => poner({ erroresEjemplo: v })} />
          </div>
          <Texto
            etiqueta="Frase literal del cliente (saldrá en su mapa)"
            valor={t.cita}
            filas={2}
            max={LIMITES_TARJETA.cita}
            onGuardar={(v) => poner({ cita: v })}
          />
          <label className="flex items-center gap-3 text-ork-text">
            <input type="checkbox" checked={t.visto} onChange={(e) => poner({ visto: e.target.checked })} className="h-5 w-5 accent-[var(--color-ork-cyan)]" />
            Me lo ha enseñado (visto)
          </label>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ork-border pt-4">
        {confirmarBorrado ? (
          <span className="flex items-center gap-2 text-small">
            ¿Quitar este proceso?
            <button type="button" onClick={onBorrar} className="rounded-lg border border-[#e5484d]/60 px-3 py-1.5 text-[#ff8a8e]">
              Sí, quitar
            </button>
            <button type="button" onClick={() => setConfirmarBorrado(false)} className="px-2 py-1.5 text-ork-text-muted">
              No
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirmarBorrado(true)} className="text-small text-ork-text-faint hover:text-[#ff8a8e]">
            Quitar
          </button>
        )}
        <button type="button" className={BOTON_PRIMARIO} onClick={onCerrar}>
          Listo
        </button>
      </div>
    </article>
  );
}

/** Pasos del proceso: se dibujan al momento como "Así es hoy" (spec §4). Por defecto, persona. */
function EditorPasos({ pasos, onCambio, titulo }: { pasos: Paso[]; onCambio: (p: Paso[]) => void; titulo: string }) {
  const [textos, setTextos] = useState<Record<string, string>>({});
  const { nodos, aristas } = diagramaDesdePasos(pasos);
  const maximo = LIMITES_TARJETA.pasosMax;
  const añadir = () =>
    pasos.length < maximo && onCambio([...pasos, { id: `p${Date.now().toString(36)}${pasos.length}`, texto: "", quien: "persona" }]);

  return (
    <div>
      <p className="mb-1.5 text-small text-ork-text">
        Cómo se hace hoy, paso a paso <span className="text-ork-text-faint">({LIMITES_TARJETA.pasosMin}-{maximo} pasos)</span>
      </p>
      <ol className="space-y-2">
        {pasos.map((p, i) => (
          <li key={p.id} className="flex items-center gap-2">
            <span className="cifra w-6 text-right text-small text-ork-text-faint">{i + 1}</span>
            <input
              value={textos[p.id] ?? p.texto}
              maxLength={LIMITES_TARJETA.paso}
              placeholder="Qué se hace"
              aria-label={`Paso ${i + 1}`}
              onChange={(e) => setTextos((t) => ({ ...t, [p.id]: e.target.value }))}
              onBlur={() => onCambio(pasos.map((x) => (x.id === p.id ? { ...x, texto: (textos[p.id] ?? x.texto).trim() } : x)))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  (e.target as HTMLInputElement).blur();
                  añadir();
                }
              }}
              className={CAMPO}
            />
            <button
              type="button"
              aria-label={p.quien === "persona" ? "Lo hace una persona (cambiar a sistema)" : "Lo hace el sistema (cambiar a persona)"}
              onClick={() => onCambio(pasos.map((x) => (x.id === p.id ? { ...x, quien: x.quien === "persona" ? "sistema" : "persona" } : x)))}
              className={
                "shrink-0 rounded-full border px-3 py-2 text-small " +
                (p.quien === "persona" ? "border-ork-violet text-[#b58cf0]" : "border-ork-cyan text-ork-cyan-hi")
              }
            >
              {p.quien === "persona" ? "Persona" : "Sistema"}
            </button>
            <button
              type="button"
              aria-label={`Quitar el paso ${i + 1}`}
              onClick={() => onCambio(pasos.filter((x) => x.id !== p.id))}
              className="shrink-0 px-2 text-ork-text-faint hover:text-ork-text"
            >
              ×
            </button>
          </li>
        ))}
      </ol>
      <button type="button" className={BOTON + " mt-2"} onClick={añadir} disabled={pasos.length >= maximo}>
        + Paso
      </button>
      {nodos.length >= 2 ? (
        <div className="mt-5 rounded-xl border border-ork-border bg-ork-bg/60 p-4">
          <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-text-faint">Así es hoy</p>
          <FlowDiagram nodos={nodos} aristas={aristas} titulo={`${titulo || "Proceso"}: así es hoy`} />
        </div>
      ) : null}
    </div>
  );
}
