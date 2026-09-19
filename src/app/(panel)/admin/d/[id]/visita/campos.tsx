"use client";

import { useEffect, useId, useRef, useState } from "react";
import { LIMITES_TARJETA } from "@/config/consultor/tarjeta";

/** Piezas de formulario de la visita. Grandes y táctiles: se usan en tableta delante del cliente. */

export const CAMPO =
  "w-full rounded-xl border border-ork-border-hi bg-ork-bg/80 px-3.5 py-2.5 text-ork-text placeholder:text-ork-text-faint focus:border-ork-cyan focus:outline-none";
export const BOTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ork-border-hi px-4 py-2 text-ork-text transition-colors hover:border-ork-cyan disabled:opacity-40";
export const BOTON_PRIMARIO =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-ork-cyan px-5 py-2 font-medium text-ork-bg transition-colors hover:bg-ork-cyan-hi disabled:opacity-40";

export function Etiqueta({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-small text-ork-text">
      {children}
    </label>
  );
}

// ── Dictado por voz (Web Speech API, es-ES) cuando el navegador lo permite ──

interface Reconocimiento {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

function crearReconocimiento(): Reconocimiento | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Reconocimiento; webkitSpeechRecognition?: new () => Reconocimiento };
  const C = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return C ? new C() : null;
}

function BotonDictado({ onTexto }: { onTexto: (t: string) => void }) {
  const [disponible, setDisponible] = useState(false);
  const [escuchando, setEscuchando] = useState(false);
  const rec = useRef<Reconocimiento | null>(null);
  useEffect(() => setDisponible(crearReconocimiento() !== null), []);
  if (!disponible) return null;
  return (
    <button
      type="button"
      aria-pressed={escuchando}
      aria-label={escuchando ? "Parar el dictado" : "Dictar"}
      title={escuchando ? "Parar el dictado" : "Dictar por voz"}
      onClick={() => {
        if (escuchando) {
          rec.current?.stop();
          return;
        }
        const r = crearReconocimiento();
        if (!r) return;
        r.lang = "es-ES";
        r.interimResults = false;
        r.continuous = false;
        r.onresult = (e) => {
          const t = Array.from(e.results).map((x) => x[0].transcript).join(" ").trim();
          if (t) onTexto(t);
        };
        r.onend = () => setEscuchando(false);
        r.onerror = () => setEscuchando(false);
        rec.current = r;
        setEscuchando(true);
        r.start();
      }}
      className={
        "absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full border " +
        (escuchando ? "border-[#e5484d] text-[#ff8a8e]" : "border-ork-border-hi text-ork-text-muted hover:text-ork-text")
      }
    >
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="9" y="3" width="6" height="11" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
      </svg>
    </button>
  );
}

/** Texto con dictado. Guarda al salir del campo (y al dictar), no en cada tecla. */
export function Texto({
  etiqueta,
  valor,
  onGuardar,
  filas = 3,
  max = LIMITES_TARJETA.textoVisita,
  placeholder,
}: {
  etiqueta: string;
  valor: string;
  onGuardar: (v: string) => void;
  filas?: number;
  max?: number;
  placeholder?: string;
}) {
  const id = useId();
  const [t, setT] = useState(valor);
  useEffect(() => setT(valor), [valor]);
  return (
    <div>
      <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
      <div className="relative">
        {filas > 1 ? (
          <textarea
            id={id}
            rows={filas}
            value={t}
            maxLength={max}
            placeholder={placeholder}
            onChange={(e) => setT(e.target.value)}
            onBlur={() => t !== valor && onGuardar(t)}
            className={CAMPO + " resize-y pr-11"}
          />
        ) : (
          <input
            id={id}
            value={t}
            maxLength={max}
            placeholder={placeholder}
            onChange={(e) => setT(e.target.value)}
            onBlur={() => t !== valor && onGuardar(t)}
            className={CAMPO + " pr-11"}
          />
        )}
        <BotonDictado
          onTexto={(d) => {
            const nuevo = (t ? `${t} ${d}` : d).slice(0, max);
            setT(nuevo);
            onGuardar(nuevo);
          }}
        />
      </div>
    </div>
  );
}

export function Numero({
  etiqueta,
  valor,
  onGuardar,
  placeholder,
  sufijo,
}: {
  etiqueta: string;
  valor: number | null;
  onGuardar: (v: number | null) => void;
  placeholder?: string;
  sufijo?: string;
}) {
  const id = useId();
  const [t, setT] = useState(valor === null ? "" : String(valor).replace(".", ","));
  useEffect(() => setT(valor === null ? "" : String(valor).replace(".", ",")), [valor]);
  const guardar = () => {
    const n = t.trim() === "" ? null : Number(t.replace(",", "."));
    if (n === null || (Number.isFinite(n) && n >= 0)) onGuardar(n);
  };
  return (
    <div>
      <Etiqueta htmlFor={id}>{etiqueta}</Etiqueta>
      <div className="flex items-center gap-2">
        <input
          id={id}
          inputMode="decimal"
          value={t}
          placeholder={placeholder}
          onChange={(e) => setT(e.target.value)}
          onBlur={guardar}
          className={CAMPO + " cifra max-w-40"}
        />
        {sufijo ? <span className="text-small text-ork-text-muted">{sufijo}</span> : null}
      </div>
    </div>
  );
}

export function Chips({
  etiqueta,
  opciones,
  valor,
  onCambio,
  multi = false,
  max,
}: {
  etiqueta?: string;
  opciones: string[];
  valor: string | string[] | null | undefined;
  onCambio: (v: string | string[] | null) => void;
  multi?: boolean;
  max?: number;
}) {
  const elegidos = Array.isArray(valor) ? valor : valor ? [valor] : [];
  return (
    <div>
      {etiqueta ? <p className="mb-1.5 text-small text-ork-text">{etiqueta}</p> : null}
      <div role={multi ? "group" : "radiogroup"} aria-label={etiqueta} className="flex flex-wrap gap-2">
        {opciones.map((o) => {
          const si = elegidos.includes(o);
          const lleno = multi && !!max && elegidos.length >= max && !si;
          return (
            <button
              key={o}
              type="button"
              role={multi ? "checkbox" : "radio"}
              aria-checked={si}
              disabled={lleno}
              onClick={() => {
                if (multi) onCambio(si ? elegidos.filter((x) => x !== o) : [...elegidos, o]);
                else onCambio(si ? null : o);
              }}
              className={
                "min-h-10 rounded-full border px-3.5 py-1.5 text-small transition-colors disabled:opacity-40 " +
                (si ? "border-ork-cyan-hi bg-ork-cyan/15 text-ork-text" : "border-ork-border-hi text-ork-text-muted hover:text-ork-text")
              }
            >
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-ork-border bg-ork-surface-1/85 p-5 backdrop-blur-sm">
      <h2 className="mb-4 font-display text-body-lg text-ork-text">{titulo}</h2>
      <div className="space-y-5">{children}</div>
    </section>
  );
}
