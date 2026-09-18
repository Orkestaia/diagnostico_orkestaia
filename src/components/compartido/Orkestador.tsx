"use client";

import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ORKESTADOR_PATH, ORKESTADOR_VIEWBOX, PUNTA_BATUTA } from "./orkestador-path";

/**
 * El Orkestador (spec §2), en los tres pasos visibles.
 *
 * - De fondo: silueta con degradado cyan → violeta, opacidad 8-12 % y halo suave.
 * - Respira: escala 1 → 1,015 en 6 s. Parallax de 8 px como máximo, solo con ratón.
 * - "Da la entrada": una estela de luz sale de la punta de la batuta hacia la siguiente
 *   estación de la partitura (~1,2 s).
 * - Con prefers-reduced-motion todo queda estático.
 */

export type Intensidad = "fondo" | "tenue" | "protagonista";

const OPACIDAD: Record<Intensidad, number> = {
  fondo: 0.1, // 8-12 %
  tenue: 0.05, // visita: que no distraiga
  protagonista: 0.9, // apertura del mapa
};

const PARALLAX_MAX = 8;
const DURACION_ENTRADA_MS = 1200;

// ── Contexto: el Orkestador registra su batuta y cualquiera puede pedirle la entrada ──

interface ContextoEntrada {
  registrarBatuta: (el: SVGSVGElement | null) => void;
  /** Lanza la estela desde la batuta hasta `destino` (normalmente una estación). */
  darEntrada: (destino: Element | null) => void;
}

const Contexto = createContext<ContextoEntrada>({
  registrarBatuta: () => {},
  darEntrada: () => {},
});

export const useEntrada = () => useContext(Contexto);

interface Estela {
  id: number;
  d: string;
}

export function EscenarioOrkestador({ children }: { children: React.ReactNode }) {
  const batuta = useRef<SVGSVGElement | null>(null);
  const [estelas, setEstelas] = useState<Estela[]>([]);
  const reducido = useReducedMotion();
  const gradId = useId();

  const registrarBatuta = useCallback((el: SVGSVGElement | null) => {
    batuta.current = el;
  }, []);

  const darEntrada = useCallback(
    (destino: Element | null) => {
      const svg = batuta.current;
      if (reducido || !svg || !destino) return;
      const caja = svg.getBoundingClientRect();
      if (caja.width === 0) return;
      // La silueta se dibuja con preserveAspectRatio="xMidYMid meet": se calcula la escala real.
      const escala = Math.min(caja.width / ORKESTADOR_VIEWBOX.ancho, caja.height / ORKESTADOR_VIEWBOX.alto);
      const offX = (caja.width - ORKESTADOR_VIEWBOX.ancho * escala) / 2;
      const offY = (caja.height - ORKESTADOR_VIEWBOX.alto * escala) / 2;
      const x1 = caja.left + offX + PUNTA_BATUTA.x * escala;
      const y1 = caja.top + offY + PUNTA_BATUTA.y * escala;
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
    <Contexto.Provider value={{ registrarBatuta, darEntrada }}>
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

export function Orkestador({
  intensidad = "fondo",
  className = "",
}: {
  intensidad?: Intensidad;
  className?: string;
}) {
  const { registrarBatuta } = useEntrada();
  const reducido = useReducedMotion();
  const gradId = useId();
  const x = useSpring(useMotionValue(0), { stiffness: 40, damping: 20 });
  const y = useSpring(useMotionValue(0), { stiffness: 40, damping: 20 });

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

  return (
    <motion.div
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
      style={{ x, y, opacity: OPACIDAD[intensidad] }}
    >
      <div className="ork-orkestador relative h-full w-full">
        {/* Halo suave detrás de la silueta */}
        <div className="ork-orkestador__halo absolute inset-[8%] rounded-full" />
        <svg
          ref={registrarBatuta}
          viewBox={`0 0 ${ORKESTADOR_VIEWBOX.ancho} ${ORKESTADOR_VIEWBOX.alto}`}
          preserveAspectRatio="xMidYMid meet"
          className="relative h-full w-full"
        >
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#00B4D8" />
              <stop offset="100%" stopColor="#8A2BE2" />
            </linearGradient>
          </defs>
          <path fillRule="evenodd" d={ORKESTADOR_PATH} fill={`url(#${gradId})`} />
        </svg>
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
