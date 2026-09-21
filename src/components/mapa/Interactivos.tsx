"use client";

import { useState } from "react";
import { FlowDiagram } from "@/components/diagrama/FlowDiagram";
import type { Arista, Nodo } from "@/lib/diagrama";

/** Leyenda de los diagramas: el mismo lenguaje que los casos del portfolio. */
export function Leyenda() {
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ork-text-muted">
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-sm border border-ork-cyan bg-ork-cyan/20"
        />
        Lo hace el sistema
      </span>
      <span className="inline-flex items-center gap-2">
        <span
          aria-hidden="true"
          className="h-3 w-3 rounded-sm border border-ork-violet bg-ork-violet/25"
        />
        Lo hace una persona
      </span>
    </p>
  );
}

interface Grafo {
  nodos: Nodo[];
  aristas: Arista[];
}

/**
 * «Hoy / Con el sistema» (spec §6.4): el cliente compara su proceso tal como lo dibujamos en la
 * visita con cómo quedaría. Si no hay diagrama de hoy, se enseña solo el nuevo.
 */
export function Comparador({
  titulo,
  hoy,
  sistema,
}: {
  titulo: string;
  hoy: Grafo | null;
  sistema: Grafo;
}) {
  const [vista, setVista] = useState<"hoy" | "sistema">("sistema");
  const grafo = vista === "hoy" && hoy ? hoy : sistema;
  return (
    <div className="space-y-3">
      {hoy ? (
        <div
          role="tablist"
          aria-label={`Comparar ${titulo}`}
          className="inline-flex rounded-full border border-ork-border-hi p-1"
        >
          {(
            [
              ["hoy", "Hoy"],
              ["sistema", "Con el sistema"],
            ] as const
          ).map(([id, etiqueta]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={vista === id}
              onClick={() => setVista(id)}
              className={
                "rounded-full px-4 py-1.5 text-small transition-colors " +
                (vista === id
                  ? "bg-ork-cyan text-ork-bg"
                  : "text-ork-text-muted hover:text-ork-text")
              }
            >
              {etiqueta}
            </button>
          ))}
        </div>
      ) : null}
      {/* La key reinicia la animación del diagrama al cambiar de vista. */}
      <FlowDiagram
        key={vista}
        nodos={grafo.nodos}
        aristas={grafo.aristas}
        titulo={`${titulo}: ${vista === "hoy" ? "hoy" : "con el sistema"}`}
      />
    </div>
  );
}

/** Tarjeta de «Así funciona hoy»: se abre para ver el detalle y su diagrama de la visita. */
export function Desplegable({
  cabecera,
  children,
  abierto: inicial = false,
}: {
  cabecera: React.ReactNode;
  children: React.ReactNode;
  abierto?: boolean;
}) {
  const [abierto, setAbierto] = useState(inicial);
  return (
    <div>
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto(!abierto)}
        className="w-full text-left"
      >
        {cabecera}
      </button>
      {abierto ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
