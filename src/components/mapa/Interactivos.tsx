"use client";

import { useState } from "react";
import { FlowDiagram } from "@/components/diagrama/FlowDiagram";
import { COSTE_CLIENTE, eurosConCosteCliente } from "@/lib/calculo";
import type { Arista, Nodo } from "@/lib/diagrama";

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
        anchoEscritorio={880}
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

const eur = (n: number) => `${n.toLocaleString("es-ES")} €`;

/**
 * «Con vuestro coste por hora» (revisión con JARVIS, 21-sep): el cliente escribe lo que le cuesta
 * una hora de trabajo y ve en euros las horas que se podrían liberar. El dato es suyo: no se envía
 * ni se guarda en ningún sitio. Las cuentas, en `calculo.ts`.
 */
export function EurosConTuCoste({
  fugas,
}: {
  fugas: { titulo: string; min: number; max: number }[];
}) {
  const [valor, setValor] = useState("");
  const coste = Number(valor.replace(",", "."));
  const hay = valor.trim() !== "";
  const filas = fugas.map((f) => ({ ...f, eur: hay ? eurosConCosteCliente(f, coste) : null }));
  const conEur = filas.filter((f) => f.eur);
  const total = conEur.reduce(
    (s, f) => ({ min: s.min + f.eur!.min, max: s.max + f.eur!.max }),
    { min: 0, max: 0 },
  );
  const fueraDeRango = hay && (!Number.isFinite(coste) || coste < COSTE_CLIENTE.min || coste > COSTE_CLIENTE.max);
  return (
    <div className="rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6">
      <label htmlFor="coste-hora" className="font-display text-body-lg text-ork-text">
        ¿Y en euros? Con vuestro coste por hora
      </label>
      <p className="mt-1 text-small text-ork-text-muted">
        Escribe lo que os cuesta una hora de trabajo (sueldo y cargas). Solo se usa en esta pantalla:
        no se envía ni se guarda.
      </p>
      <div className="mt-4 flex items-center gap-2">
        <input
          id="coste-hora"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ej.: 25"
          value={valor}
          onChange={(e) => setValor(e.target.value.replace(/[^\d.,]/g, "").slice(0, 6))}
          className="h-12 w-28 rounded-xl border border-ork-border-hi bg-ork-bg px-3 text-ork-text"
        />
        <span className="text-ork-text-muted">€ / hora</span>
      </div>
      {fueraDeRango ? (
        <p role="status" className="mt-3 text-small text-ork-text-muted">
          Escribe un coste entre {COSTE_CLIENTE.min} y {COSTE_CLIENTE.max} € por hora.
        </p>
      ) : null}
      {hay && !fueraDeRango ? (
        <div role="status" className="mt-5 space-y-3">
          {conEur.length ? (
            <p className="cifra font-display text-h3 text-ork-cyan-hi">
              {eur(total.min)}–{eur(total.max)} al mes
            </p>
          ) : null}
          <ul className="space-y-1 text-small text-ork-text-muted">
            {filas.map((f) => (
              <li key={f.titulo} className="flex flex-wrap justify-between gap-2">
                <span>{f.titulo}</span>
                <span className="cifra">
                  {f.eur ? `${eur(f.eur.min)}–${eur(f.eur.max)}` : "menos de 2 h al mes: sin euros"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
