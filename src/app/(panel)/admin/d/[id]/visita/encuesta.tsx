"use client";

import { useCallback, useEffect, useState } from "react";
import { MINIMO_RESPUESTAS } from "@/config/consultor/encuesta";
import type { Madurez } from "@/lib/madurez";
import { BOTON, BOTON_PRIMARIO, Seccion } from "./campos";
import { SoloPrivado } from "./privada";

/**
 * Bloque F (batería v2 §6): enlace de la encuesta del equipo y sus resultados.
 * Lo que se enseña al cliente y lo que solo ve Aitor está en la tabla "Qué ve cada uno" del §6:
 * las respuestas individuales no se enseñan nunca, y la comparación con lo que dice dirección
 * es 🔒.
 */

interface Estado {
  enlace: string | null;
  abierta_hasta: string | null;
  areas: string[];
  resultado: Madurez;
}

const fecha = (iso: string) =>
  new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long" }).format(new Date(iso));

export function BloqueEncuesta({ id, campos }: { id: string; campos: Record<string, unknown> }) {
  const [estado, setEstado] = useState<Estado | null>(null);
  const [cargando, setCargando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/diagnosticos/${id}/encuesta`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      setEstado(await r.json());
    } catch {
      setError("No se ha podido cargar la encuesta.");
    }
  }, [id]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const crear = async () => {
    setCargando(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/diagnosticos/${id}/encuesta`, { method: "POST" });
      if (!r.ok) throw new Error();
      await cargar();
    } catch {
      setError("No se ha podido crear el enlace.");
    } finally {
      setCargando(false);
    }
  };

  const areas = estado?.areas ?? [];
  const decision = (campos["ia.encuesta"] ?? {}) as { texto?: string; aqui?: string };
  const resultado = estado?.resultado;

  return (
    <Seccion titulo="Encuesta del equipo">
      <p className="text-small">
        Anónima, unos 5 minutos, desde el móvil. Sirve para saber qué formación hace falta, no para
        evaluar a nadie. Sin {MINIMO_RESPUESTAS} respuestas no se enseña ningún resultado.
      </p>

      {areas.length ? (
        <p className="text-small text-ork-text-faint">Áreas: {areas.join(" · ")}</p>
      ) : (
        <p className="text-small text-[#f5c46b]">Antes, rellena arriba las áreas de la empresa.</p>
      )}

      {estado?.enlace ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <code className="min-w-0 flex-1 truncate rounded-lg border border-ork-border bg-ork-bg/70 px-3 py-2 text-small text-ork-text">
              {estado.enlace}
            </code>
            <button
              type="button"
              className={BOTON}
              onClick={async () => {
                await navigator.clipboard.writeText(estado.enlace!).catch(() => {});
                setCopiado(true);
                setTimeout(() => setCopiado(false), 2000);
              }}
            >
              {copiado ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="text-small text-ork-text-muted">
            {estado.abierta_hasta
              ? `Abierta hasta el ${fecha(estado.abierta_hasta)}.`
              : "Sin fecha de cierre."}
            {decision.texto ? ` La reparte: ${decision.texto}.` : ""}
          </p>
          <button type="button" className={BOTON} onClick={crear} disabled={cargando}>
            Ampliar el plazo otros 7 días
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={BOTON_PRIMARIO}
          onClick={crear}
          disabled={cargando || !areas.length}
        >
          {cargando ? "Creando…" : "Crear el enlace de la encuesta"}
        </button>
      )}

      {error ? (
        <p role="alert" className="text-small text-[#ff8a8e]">
          {error}
        </p>
      ) : null}

      {resultado && resultado.respuestas > 0 ? <Resultados r={resultado} /> : null}
      {resultado && resultado.respuestas > 0 && !resultado.publicable ? (
        <p className="text-small">
          {resultado.respuestas} respuesta{resultado.respuestas === 1 ? "" : "s"} por ahora. Con{" "}
          {MINIMO_RESPUESTAS} se pueden enseñar los resultados sin que nadie sea identificable.
        </p>
      ) : null}
    </Seccion>
  );
}

const pct = (x: number) => Math.round(x);

function Barra({ etiqueta, valor }: { etiqueta: string; valor: number | null }) {
  return (
    <div>
      <p className="mb-1 flex justify-between text-small">
        <span>{etiqueta}</span>
        <span className="cifra text-ork-text">
          {valor === null ? "—" : `${Math.round(valor * 10) / 10} / 4`}
        </span>
      </p>
      <div className="h-2 rounded-full bg-ork-bg">
        <div
          className="h-2 rounded-full bg-ork-cyan"
          style={{ width: `${((valor ?? 0) / 4) * 100}%` }}
        />
      </div>
    </div>
  );
}

function Resultados({ r }: { r: Madurez }) {
  if (!r.publicable || !r.empresa) return null;
  const e = r.empresa;
  return (
    <div className="space-y-6">
      <div>
        <p className="text-small text-ork-text-muted">
          {r.respuestas} respuestas · nivel {e.nivel} de 5
        </p>
        <p className="font-display text-h3 text-ork-text">
          {e.nombreNivel} <span className="cifra text-ork-cyan-hi">{pct(e.indice)}/100</span>
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Barra etiqueta="Uso" valor={e.dimensiones.uso} />
        <Barra etiqueta="Competencia" valor={e.dimensiones.competencia} />
        <Barra etiqueta="Seguridad" valor={e.dimensiones.seguridad} />
        <Barra etiqueta="Actitud" valor={e.dimensiones.actitud} />
      </div>

      {r.areas.length ? (
        <div>
          <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
            Por áreas
          </p>
          <ul className="divide-y divide-ork-border rounded-xl border border-ork-border">
            {r.areas.map((a) => (
              <li key={a.nombre} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-ork-text">
                  {a.nombre}{" "}
                  <span className="text-small text-ork-text-faint">({a.respuestas})</span>
                </span>
                <span className="cifra text-ork-cyan-hi">
                  {a.nombreNivel} · {pct(a.indice)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {r.formacion.length ? (
        <div>
          <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
            Qué quieren aprender
          </p>
          <ul className="space-y-1">
            {r.formacion.slice(0, 5).map((f) => (
              <li key={f.etiqueta} className="flex justify-between gap-4">
                <span>{f.etiqueta}</span>
                <span className="cifra text-ork-text">{f.votos}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {r.alertas.length ? (
        <div>
          <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[#f5c46b]">
            A tener en cuenta
          </p>
          <ul className="list-disc space-y-1 pl-4">
            {r.alertas.map((a) => (
              <li key={a.id + a.texto}>{a.texto}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <SoloPrivado>
        <p className="text-small">
          Dirección frente al equipo: ver el bloque F arriba (normas, formación y actitud) y
          compararlo con estas cifras. Las respuestas de una persona no se enseñan nunca, ni a ti.
        </p>
        {r.tareas.length ? (
          <p className="mt-2 text-small text-ork-text-faint">
            {r.tareas.length} personas han escrito la tarea que se quitarían. Van al export para que
            JARVIS las agrupe en temas; no se enseñan literales.
          </p>
        ) : null}
      </SoloPrivado>
    </div>
  );
}
