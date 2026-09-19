"use client";

import { useMemo, useState } from "react";
import { Marca } from "@/components/compartido/Marca";
import { Orkestador } from "@/components/compartido/Orkestador";
import {
  AREA_SIN_DECIR,
  AVISO_ENCUESTA,
  MAX_TEXTO_ENCUESTA,
  PREGUNTAS_ENCUESTA,
  type PreguntaEncuesta,
} from "@/config/consultor/encuesta";

/**
 * Encuesta del equipo (batería v2 §6): móvil, una pregunta por pantalla, unos 5 minutos.
 * Anónima y voluntaria: se puede saltar cualquier pregunta y no se pide ningún dato personal.
 */

type Valor = string | string[] | null;

const BOTON =
  "inline-flex min-h-12 items-center justify-center rounded-xl border border-ork-border-hi px-5 text-ork-text transition-colors hover:border-ork-cyan disabled:opacity-40";
const PRINCIPAL =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-ork-cyan px-6 font-medium text-ork-bg transition-colors hover:bg-ork-cyan-hi disabled:opacity-40";

export function Encuesta({
  token,
  empresa,
  areas,
  cerrada,
  yaContestada,
}: {
  token: string;
  empresa: string;
  areas: string[];
  cerrada: boolean;
  yaContestada: boolean;
}) {
  const preguntas = useMemo(
    () => PREGUNTAS_ENCUESTA.filter((p) => p.id !== "s.area" || areas.length > 0),
    [areas.length],
  );
  const [paso, setPaso] = useState(-1); // -1 = portada
  const [respuestas, setRespuestas] = useState<Record<string, Valor>>({});
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (cerrada || yaContestada || enviada) {
    return (
      <Marco empresa={empresa}>
        <h1 className="font-display text-h2 text-ork-text">
          {enviada ? "Gracias" : yaContestada ? "Ya has contestado" : "La encuesta está cerrada"}
        </h1>
        <p>
          {enviada
            ? "Tu respuesta es anónima y ya está contada. Con lo que conteste el equipo prepararemos la formación que más os venga bien."
            : yaContestada
              ? "Desde este dispositivo ya se ha enviado una respuesta."
              : "El plazo para contestar ha terminado. Si crees que es un error, díselo a quien te pasó el enlace."}
        </p>
      </Marco>
    );
  }

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch(`/api/e/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(respuestas),
      });
      if (!r.ok) throw new Error(String(r.status));
      setEnviada(true);
    } catch {
      setError("No se ha podido enviar. Revisa la conexión y vuelve a intentarlo.");
    } finally {
      setEnviando(false);
    }
  };

  if (paso < 0) {
    return (
      <Marco empresa={empresa}>
        <h1 className="font-display text-h2 text-ork-text">La IA en vuestro día a día</h1>
        <p>{AVISO_ENCUESTA}</p>
        <p className="text-small">Son unos 5 minutos. Puedes saltarte cualquier pregunta.</p>
        <button type="button" className={PRINCIPAL} onClick={() => setPaso(0)}>
          Empezar
        </button>
      </Marco>
    );
  }

  const p = preguntas[paso];
  const ultima = paso === preguntas.length - 1;
  const valor = respuestas[p.id] ?? null;
  const poner = (v: Valor) => setRespuestas((r) => ({ ...r, [p.id]: v }));

  return (
    <Marco empresa={empresa}>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
        {paso + 1} de {preguntas.length}
      </p>
      <h1 className="font-display text-h3 text-ork-text">{p.texto}</h1>
      {p.nota ? <p className="text-small text-ork-text-faint">{p.nota}</p> : null}

      <Opciones p={p} areas={areas} valor={valor} poner={poner} />

      {error ? (
        <p role="alert" className="text-small text-[#ff8a8e]">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-3 pt-2">
        {paso > 0 ? (
          <button type="button" className={BOTON} onClick={() => setPaso(paso - 1)}>
            Atrás
          </button>
        ) : null}
        {ultima ? (
          <button type="button" className={PRINCIPAL} onClick={enviar} disabled={enviando}>
            {enviando ? "Enviando…" : "Enviar"}
          </button>
        ) : (
          <button type="button" className={PRINCIPAL} onClick={() => setPaso(paso + 1)}>
            Siguiente
          </button>
        )}
      </div>
    </Marco>
  );
}

function Opciones({
  p,
  areas,
  valor,
  poner,
}: {
  p: PreguntaEncuesta;
  areas: string[];
  valor: Valor;
  poner: (v: Valor) => void;
}) {
  if (p.tipo === "texto") {
    return (
      <textarea
        rows={3}
        maxLength={MAX_TEXTO_ENCUESTA}
        value={typeof valor === "string" ? valor : ""}
        onChange={(e) => poner(e.target.value)}
        placeholder="Opcional"
        className="w-full rounded-xl border border-ork-border-hi bg-ork-bg/80 px-4 py-3 text-ork-text placeholder:text-ork-text-faint focus:border-ork-cyan focus:outline-none"
      />
    );
  }

  const opciones =
    p.tipo === "area" ? [...areas, AREA_SIN_DECIR] : (p.opciones ?? []).map((o) => o.etiqueta);
  const multi = p.tipo === "multi";
  const elegidas = Array.isArray(valor) ? valor : valor ? [valor] : [];
  const lleno = multi && !!p.max && elegidas.length >= p.max;

  return (
    <div role={multi ? "group" : "radiogroup"} aria-label={p.texto} className="flex flex-col gap-2">
      {opciones.map((o) => {
        const si = elegidas.includes(o);
        return (
          <button
            key={o}
            type="button"
            role={multi ? "checkbox" : "radio"}
            aria-checked={si}
            disabled={lleno && !si}
            onClick={() => {
              if (multi) poner(si ? elegidas.filter((x) => x !== o) : [...elegidas, o]);
              else poner(si ? null : o);
            }}
            className={
              "min-h-12 rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-40 " +
              (si
                ? "border-ork-cyan-hi bg-ork-cyan/15 text-ork-text"
                : "border-ork-border-hi text-ork-text-muted hover:text-ork-text")
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Marco({ empresa, children }: { empresa: string; children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      <Orkestador
        intensidad="fondo"
        className="pointer-events-none fixed -right-24 bottom-0 h-[45vh] opacity-40"
      />
      <main className="relative mx-auto flex min-h-dvh max-w-xl flex-col gap-5 px-4 py-10">
        <div>
          <Marca className="text-body-lg" />
          <p className="text-small text-ork-text-muted">{empresa}</p>
        </div>
        {children}
        <p className="mt-auto pt-8 text-small text-ork-text-faint">
          Anónima: no se guarda tu nombre, ni tu email, ni desde dónde contestas.
        </p>
      </main>
    </div>
  );
}
