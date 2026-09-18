"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { preload } from "react-dom";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { BATUTAS, ORKESTADOR_IMAGEN, PUNTA_BATUTA } from "./orkestador-path";

/**
 * El Orkestador (spec §2), en los tres pasos visibles. Imagen de Higgsfield animada en código:
 *
 * - Respira (escala 1 → 1,015 en 6 s) y se balancea como si dirigiera.
 * - Las puntas de las batutas laten, alternándose, y un barrido de luz recorre figura y circuitos.
 * - "Da la entrada": las batutas destellan y una estela sale de la punta de la batuta derecha
 *   hasta la estación siguiente (~1,2 s).
 * - Parallax de 8 px como máximo, solo con ratón.
 * - prefers-reduced-motion: todo quieto (la imagen se ve, sin movimiento).
 */

export type Intensidad = "fondo" | "tenue" | "protagonista";

const OPACIDAD: Record<Intensidad, number> = {
  fondo: 0.2, // detrás de las preguntas: presente, sin competir con el texto
  tenue: 0.08, // visita: que no distraiga
  protagonista: 1, // bienvenida, pantalla final y apertura del mapa
};

const PARALLAX_MAX = 8;
const DURACION_ENTRADA_MS = 1200;

// ── Contexto: el Orkestador registra su batuta y cualquiera puede pedirle la entrada ──

interface ContextoEntrada {
  registrarBatuta: (el: HTMLElement | null) => void;
  /** Lanza la estela desde la batuta hasta `destino` (normalmente una estación). */
  darEntrada: (destino: Element | null) => void;
  /** Cambia en cada entrada: el Orkestador lo usa para el destello de las batutas. */
  destello: number;
}

const Contexto = createContext<ContextoEntrada>({
  registrarBatuta: () => {},
  darEntrada: () => {},
  destello: 0,
});

export const useEntrada = () => useContext(Contexto);

interface Estela {
  id: number;
  d: string;
}

export function EscenarioOrkestador({ children }: { children: React.ReactNode }) {
  const batuta = useRef<HTMLElement | null>(null);
  const [estelas, setEstelas] = useState<Estela[]>([]);
  const [destello, setDestello] = useState(0);
  const reducido = useReducedMotion();
  const gradId = useId();

  const registrarBatuta = useCallback((el: HTMLElement | null) => {
    batuta.current = el;
  }, []);

  const darEntrada = useCallback(
    (destino: Element | null) => {
      setDestello((n) => n + 1);
      const caja = batuta.current?.getBoundingClientRect();
      if (reducido || !caja || !destino || caja.width === 0) return;
      // El contenedor tiene la proporción exacta de la imagen: la punta es un % de su caja.
      const x1 = caja.left + (PUNTA_BATUTA.x / ORKESTADOR_IMAGEN.ancho) * caja.width;
      const y1 = caja.top + (PUNTA_BATUTA.y / ORKESTADOR_IMAGEN.alto) * caja.height;
      const dest = destino.getBoundingClientRect();
      const x2 = dest.left + dest.width / 2;
      const y2 = dest.top + dest.height / 2;
      // Curva suave: el control sube por encima de los dos puntos, como un gesto de batuta.
      const cx = (x1 + x2) / 2;
      const cy = Math.min(y1, y2) - Math.max(40, Math.abs(x2 - x1) * 0.25);
      const id = Date.now() + Math.random();
      setEstelas((e) => [...e, { id, d: `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}` }]);
      window.setTimeout(() => setEstelas((e) => e.filter((x) => x.id !== id)), DURACION_ENTRADA_MS + 400);
    },
    [reducido],
  );

  return (
    <Contexto.Provider value={{ registrarBatuta, darEntrada, destello }}>
      {children}
      <svg aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 h-full w-full">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-ork-cyan-hi)" />
            <stop offset="100%" stopColor="var(--color-ork-violet)" />
          </linearGradient>
        </defs>
        {estelas.map((e) => (
          <path
            key={e.id}
            d={e.d}
            className="ork-entrada"
            stroke={`url(#${gradId})`}
            fill="none"
            pathLength={1}
            style={{ ["--duracion" as string]: `${DURACION_ENTRADA_MS}ms` }}
          />
        ))}
      </svg>
    </Contexto.Provider>
  );
}

const pct = (v: number, total: number) => `${(v / total) * 100}%`;

export function Orkestador({
  intensidad = "fondo",
  className = "",
  prioridad = false,
}: {
  intensidad?: Intensidad;
  /** Tamaño y posición: el componente mantiene la proporción de la imagen (dar alto O ancho). */
  className?: string;
  /** true en pantallas donde es protagonista y se ve al cargar. */
  prioridad?: boolean;
}) {
  const { registrarBatuta, destello } = useEntrada();
  const reducido = useReducedMotion();
  const x = useSpring(useMotionValue(0), { stiffness: 40, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 40, damping: 20 });
  const [destellando, setDestellando] = useState(false);
  // Aparece cuando la imagen ya está: nunca se ven las batutas flotando solas.
  const [cargada, setCargada] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  if (prioridad) preload(ORKESTADOR_IMAGEN.src, { as: "image", fetchPriority: "high" });

  useEffect(() => {
    if (img.current?.complete && img.current.naturalWidth > 0) setCargada(true);
  }, []);

  useEffect(() => {
    if (reducido) return;
    // Parallax solo en escritorio con ratón (spec §2).
    const conRaton = window.matchMedia("(pointer: fine) and (min-width: 768px)");
    if (!conRaton.matches) return;
    const mover = (ev: PointerEvent) => {
      x.set(((ev.clientX / window.innerWidth) * 2 - 1) * PARALLAX_MAX);
      y.set(((ev.clientY / window.innerHeight) * 2 - 1) * PARALLAX_MAX);
    };
    window.addEventListener("pointermove", mover, { passive: true });
    return () => window.removeEventListener("pointermove", mover);
  }, [reducido, x, y]);

  useEffect(() => {
    if (destello === 0) return;
    setDestellando(true);
    const t = setTimeout(() => setDestellando(false), 900);
    return () => clearTimeout(t);
  }, [destello]);

  const { ancho, alto, src } = ORKESTADOR_IMAGEN;

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{
        x,
        y,
        opacity: cargada ? OPACIDAD[intensidad] : 0,
        transition: "opacity 700ms cubic-bezier(0.22, 1, 0.36, 1)",
        aspectRatio: `${ancho} / ${alto}`,
      }}
    >
      <div
        ref={registrarBatuta as React.Ref<HTMLDivElement>}
        className={"ork-orkestador relative h-full w-full" + (destellando ? " ork-orkestador--entrada" : "")}
        style={{ ["--ork-img" as string]: `url(${src})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- imagen decorativa fija, ya optimizada */}
        <img
          ref={img}
          onLoad={() => setCargada(true)}
          src={src}
          width={ancho}
          height={alto}
          alt=""
          decoding="async"
          fetchPriority={prioridad ? "high" : "low"}
          className="h-full w-full select-none"
          draggable={false}
        />
        {/* Barrido de luz: la propia imagen hace de máscara */}
        <div className="ork-orkestador__barrido absolute inset-0" />
        {/* Puntas de las batutas */}
        {(["izquierda", "derecha"] as const).map((lado) => (
          <span
            key={lado}
            className={`ork-batuta ork-batuta--${lado} absolute`}
            style={{ left: pct(BATUTAS[lado].x, ancho), top: pct(BATUTAS[lado].y, alto) }}
          />
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Frase del Orkestador al empezar cada tramo: se escribe en ≤ 0,8 s. Los lectores de pantalla
 * reciben la frase entera una sola vez (aria-live), no letra a letra.
 */
export function FraseOrkestador({ texto, className = "" }: { texto: string; className?: string }) {
  const reducido = useReducedMotion();
  const [visibles, setVisibles] = useState(reducido ? texto.length : 0);

  useEffect(() => {
    if (reducido) {
      setVisibles(texto.length);
      return;
    }
    setVisibles(0);
    const total = texto.length;
    const inicio = performance.now();
    const duracion = Math.min(800, total * 22);
    let raf = 0;
    const paso = (t: number) => {
      const n = Math.min(total, Math.ceil(((t - inicio) / duracion) * total));
      setVisibles(n);
      if (n < total) raf = requestAnimationFrame(paso);
    };
    raf = requestAnimationFrame(paso);
    return () => cancelAnimationFrame(raf);
  }, [texto, reducido]);

  return (
    <p className={className}>
      <span className="sr-only" aria-live="polite">
        {texto}
      </span>
      <span aria-hidden="true">
        {texto.slice(0, visibles)}
        <span className="invisible">{texto.slice(visibles)}</span>
      </span>
    </p>
  );
}
