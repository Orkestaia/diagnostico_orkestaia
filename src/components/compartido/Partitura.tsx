"use client";

import { useEffect, useRef } from "react";
import { useEntrada } from "./Orkestador";

/**
 * Partitura (spec §2): la línea de estaciones que dice dónde se está. En el previo, los 5
 * movimientos; en la visita, los bloques A-E; en el mapa, las fases de la hoja de ruta.
 *
 * Cinco líneas de pentagrama de fondo y una estación por tramo. La actual brilla en cyan,
 * las hechas quedan rellenas y las que faltan, en contorno. Al cambiar de estación, el
 * Orkestador "da la entrada" a la nueva.
 */

export interface Estacion {
  id: string;
  /** Marca corta: "I", "A", "1"… */
  marca: string;
  etiqueta: string;
}

export function Partitura({
  estaciones,
  actual,
  onSeleccionar,
  titulo = "Progreso",
  className = "",
}: {
  estaciones: Estacion[];
  actual: number;
  /** Si se pasa, las estaciones son botones (visita: saltar de bloque). */
  onSeleccionar?: (indice: number) => void;
  titulo?: string;
  className?: string;
}) {
  const { darEntrada } = useEntrada();
  const lista = useRef<HTMLOListElement>(null);
  const anterior = useRef<number | null>(null);

  useEffect(() => {
    // Sin entrada en el primer pintado: solo cuando se avanza o se salta.
    if (anterior.current !== null && anterior.current !== actual) {
      darEntrada(lista.current?.querySelector(`[data-estacion="${actual}"]`) ?? null);
    }
    anterior.current = actual;
  }, [actual, darEntrada]);

  const pct = estaciones.length > 1 ? (actual / (estaciones.length - 1)) * 100 : 0;

  return (
    <nav aria-label={titulo} className={"md:pb-8 " + className}>
      <div className="relative">
        {/* Pentagrama de fondo */}
        <div aria-hidden="true" className="absolute inset-x-0 top-1/2 -translate-y-1/2">
          {[0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-px bg-ork-border"
              style={{ marginTop: i === 0 ? 0 : 3, opacity: i === 2 ? 1 : 0.45 }}
            />
          ))}
        </div>
        {/* Tramo recorrido */}
        <div
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-px -translate-y-1/2 bg-ork-cyan transition-[width] duration-700 ease-[var(--ease-ork)]"
          style={{ width: `${pct}%` }}
        />
        <ol ref={lista} className="relative flex items-center justify-between">
          {estaciones.map((e, i) => {
            const estado = i < actual ? "hecha" : i === actual ? "actual" : "pendiente";
            const punto = (
              <span
                data-estacion={i}
                className={
                  "flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[0.75rem] transition-colors duration-500 " +
                  (estado === "actual"
                    ? "ork-estacion--actual border-ork-cyan-hi bg-ork-surface-2 text-ork-text"
                    : estado === "hecha"
                      ? "border-ork-cyan bg-ork-cyan text-ork-bg"
                      : "border-ork-border-hi bg-ork-bg text-ork-text-faint")
                }
              >
                {e.marca}
              </span>
            );
            const alineacion =
              i === 0 ? "left-0" : i === estaciones.length - 1 ? "right-0" : "left-1/2 -translate-x-1/2";
            return (
              <li key={e.id} className="relative flex flex-col items-center">
                {onSeleccionar ? (
                  <button
                    type="button"
                    onClick={() => onSeleccionar(i)}
                    aria-current={estado === "actual" ? "step" : undefined}
                    aria-label={`${e.marca} · ${e.etiqueta}`}
                    className="rounded-full"
                  >
                    {punto}
                  </button>
                ) : (
                  <span aria-current={estado === "actual" ? "step" : undefined}>
                    <span className="sr-only">
                      {e.marca} · {e.etiqueta}
                      {estado === "hecha" ? " (hecho)" : ""}
                    </span>
                    <span aria-hidden="true">{punto}</span>
                  </span>
                )}
                {/* Etiqueta bajo la estación: solo en escritorio (en móvil, solo la actual, abajo) */}
                <span
                  aria-hidden="true"
                  className={
                    "absolute top-full mt-3 hidden whitespace-nowrap font-mono text-[0.75rem] uppercase tracking-[0.12em] md:block " +
                    alineacion +
                    (estado === "actual" ? " text-ork-text" : " text-ork-text-faint")
                  }
                >
                  {e.etiqueta}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <p aria-hidden="true" className="mt-3 text-center font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ork-text md:hidden">
        {estaciones[actual]?.marca} · {estaciones[actual]?.etiqueta}
      </p>
    </nav>
  );
}
