"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { TarjetaPrivada } from "@/config/consultor/tarjeta";
import type { ParcheVisita, PrivadoVisita } from "@/lib/visita";

/**
 * Vista privada (JARVIS, 19-sep):
 * - Se entra manteniendo pulsado el candado 1 s (ratón, dedo o Intro/Espacio mantenido).
 * - Vuelve SOLA a la vista cliente tras 20 s sin escribir, o si la ventana pierde el foco.
 * - Los datos 🔒 se piden al servidor al entrar y se olvidan al salir: con la vista cliente no
 *   están ni en el HTML ni en la memoria de la página (spec §4).
 */

export const MS_MANTENER = 1000;
export const MS_INACTIVIDAD = 20000;

interface Ctx {
  activa: boolean;
  datos: PrivadoVisita | null;
  interno: {
    hipotesis?: { hipotesis: string; basada_en?: string }[];
    preguntas_visita?: string[];
    alertas?: string[];
  } | null;
  entrar: () => Promise<void>;
  salir: () => void;
  campo: (id: string) => unknown;
  ponerCampo: (id: string, v: unknown) => void;
  tarjeta: (id: string) => Partial<TarjetaPrivada>;
  ponerTarjeta: (id: string, v: Partial<TarjetaPrivada>) => void;
}

const Contexto = createContext<Ctx | null>(null);

export function usePrivada() {
  const c = useContext(Contexto);
  if (!c) throw new Error("usePrivada fuera de VistaPrivada");
  return c;
}

export function VistaPrivada({
  id,
  encolar,
  children,
}: {
  id: string;
  encolar: (p: ParcheVisita) => void;
  children: React.ReactNode;
}) {
  const [activa, setActiva] = useState(false);
  const [datos, setDatos] = useState<PrivadoVisita | null>(null);
  const [interno, setInterno] = useState<Ctx["interno"]>(null);
  const reloj = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Los campos guardan al desmontarse (al salir): eso va a la cola, no de vuelta a la memoria.
  const activaRef = useRef(false);

  const salir = useCallback(() => {
    activaRef.current = false;
    setActiva(false);
    setDatos(null);
    setInterno(null);
    if (reloj.current) clearTimeout(reloj.current);
  }, []);

  const rearmar = useCallback(() => {
    if (reloj.current) clearTimeout(reloj.current);
    reloj.current = setTimeout(salir, MS_INACTIVIDAD);
  }, [salir]);

  const entrar = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/diagnosticos/${id}/privado`, { cache: "no-store" });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setDatos(j.privado ?? {});
      setInterno(j.interno ?? null);
    } catch {
      // Sin conexión: se entra con lo vacío; lo que se escriba se guarda en la cola igualmente.
      setDatos({});
    }
    activaRef.current = true;
    setActiva(true);
    rearmar();
  }, [id, rearmar]);

  useEffect(() => {
    if (!activa) return;
    const actividad = () => rearmar();
    const fuera = () => salir();
    const oculta = () => document.visibilityState === "hidden" && salir();
    window.addEventListener("keydown", actividad);
    window.addEventListener("input", actividad, true);
    window.addEventListener("pointerdown", actividad, true);
    window.addEventListener("blur", fuera);
    document.addEventListener("visibilitychange", oculta);
    return () => {
      window.removeEventListener("keydown", actividad);
      window.removeEventListener("input", actividad, true);
      window.removeEventListener("pointerdown", actividad, true);
      window.removeEventListener("blur", fuera);
      document.removeEventListener("visibilitychange", oculta);
    };
  }, [activa, rearmar, salir]);

  const campo = useCallback((cid: string) => datos?.campos?.[cid], [datos]);
  const ponerCampo = useCallback(
    (cid: string, v: unknown) => {
      if (activaRef.current) setDatos((d) => ({ ...d, campos: { ...d?.campos, [cid]: v } }));
      encolar({ privado_campos: { [cid]: v } });
    },
    [encolar],
  );
  const tarjeta = useCallback((tid: string) => datos?.procesos?.[tid] ?? {}, [datos]);
  const ponerTarjeta = useCallback(
    (tid: string, v: Partial<TarjetaPrivada>) => {
      if (activaRef.current)
        setDatos((d) => ({
          ...d,
          procesos: { ...d?.procesos, [tid]: { ...d?.procesos?.[tid], ...v } },
        }));
      encolar({ privado_procesos: { [tid]: v } });
    },
    [encolar],
  );

  return (
    <Contexto.Provider
      value={{ activa, datos, interno, entrar, salir, campo, ponerCampo, tarjeta, ponerTarjeta }}
    >
      {children}
    </Contexto.Provider>
  );
}

/** Solo pinta sus hijos con la vista privada activa (no basta con ocultar por CSS: spec §4). */
export function SoloPrivado({ children }: { children: React.ReactNode }) {
  const { activa } = usePrivada();
  if (!activa) return null;
  return (
    <div className="rounded-xl border border-dashed border-ork-violet/70 bg-ork-violet/[0.06] p-4">
      <p className="mb-3 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-[#b58cf0]">
        Privado · no lo ve el cliente
      </p>
      {children}
    </div>
  );
}

/** Candado: mantener pulsado 1 s para entrar; un toque para salir. */
export function BotonCandado() {
  const { activa, entrar, salir } = usePrivada();
  const [cargando, setCargando] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const inicio = useRef<number | null>(null);
  const raf = useRef(0);
  // Al soltar tras mantener, el navegador lanza un clic: no debe cerrar lo que se acaba de abrir.
  const abiertoEn = useRef(0);

  const parar = () => {
    inicio.current = null;
    cancelAnimationFrame(raf.current);
    setProgreso(0);
  };
  const empezar = () => {
    if (activa || cargando) return;
    inicio.current = performance.now();
    const paso = (t: number) => {
      if (inicio.current === null) return;
      const p = Math.min(1, (t - inicio.current) / MS_MANTENER);
      setProgreso(p);
      if (p >= 1) {
        parar();
        abiertoEn.current = Date.now();
        setCargando(true);
        void entrar().finally(() => setCargando(false));
      } else raf.current = requestAnimationFrame(paso);
    };
    raf.current = requestAnimationFrame(paso);
  };

  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <button
      type="button"
      aria-pressed={activa}
      aria-label={activa ? "Volver a la vista cliente" : "Vista privada: mantén pulsado un segundo"}
      title={activa ? "Volver a la vista cliente" : "Mantén pulsado 1 s para la vista privada"}
      onPointerDown={empezar}
      onPointerUp={parar}
      onPointerLeave={parar}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) {
          e.preventDefault();
          empezar();
        }
      }}
      onKeyUp={parar}
      onClick={() => activa && Date.now() - abiertoEn.current > 800 && salir()}
      className={
        "relative flex h-10 items-center gap-2 rounded-full border px-3 text-small transition-colors select-none " +
        (activa
          ? "border-ork-violet bg-ork-violet/15 text-ork-text"
          : "border-ork-border-hi text-ork-text-muted hover:text-ork-text")
      }
    >
      <svg aria-hidden="true" width="34" height="34" viewBox="0 0 34 34" className="-ml-2">
        <circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          stroke="var(--color-ork-border-hi)"
          strokeWidth="2"
        />
        <circle
          cx="17"
          cy="17"
          r={r}
          fill="none"
          stroke="var(--color-ork-violet)"
          strokeWidth="2"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - (activa ? 1 : progreso))}
          transform="rotate(-90 17 17)"
        />
        <path
          d={activa ? "M12 16v-2a5 5 0 0 1 9.6-2" : "M12 16v-2a5 5 0 0 1 10 0v2"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect x="10" y="16" width="14" height="10" rx="2.5" fill="currentColor" />
      </svg>
      <span>{cargando ? "Abriendo…" : activa ? "Vista privada" : "Vista cliente"}</span>
    </button>
  );
}
