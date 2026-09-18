"use client";

import { useState } from "react";
import { EscenarioOrkestador, FraseOrkestador, Orkestador } from "@/components/compartido/Orkestador";
import { Partitura } from "@/components/compartido/Partitura";
import { FlowDiagram } from "@/components/diagrama/FlowDiagram";
import { movimientosPrevio } from "@/config/previo";
import { BLOQUES } from "@/config/consultor/bloques";
import type { Paso } from "@/config/consultor/tarjeta";
import { diagramaDesdePasos } from "@/lib/diagrama";

const PASOS: Paso[] = [
  { id: "p1", texto: "Llega el email del cliente", quien: "sistema" },
  { id: "p2", texto: "Se lee y se decide qué documentos faltan", quien: "persona" },
  { id: "p3", texto: "Se escribe la lista a mano", quien: "persona" },
  { id: "p4", texto: "Se espera respuesta", quien: "persona" },
  { id: "p5", texto: "Se vuelve a pedir lo que falta", quien: "persona" },
];

export function Muestra() {
  const movimientos = movimientosPrevio("servicios_profesionales");
  const [mov, setMov] = useState(0);
  const [bloque, setBloque] = useState(0);
  const { nodos, aristas } = diagramaDesdePasos(PASOS);

  return (
    <EscenarioOrkestador>
      <Orkestador
        intensidad="fondo"
        className="fixed -right-24 bottom-0 h-[80vh] md:right-0"
      />
      <main className="relative mx-auto max-w-5xl space-y-16 px-4 py-10">
        <section className="space-y-8">
          <h1 className="font-display text-h2">Previo · partitura de 5 movimientos</h1>
          <Partitura
            titulo="Movimientos del previo"
            estaciones={movimientos.map((m) => ({ id: m.numero, marca: m.numero, etiqueta: m.titulo }))}
            actual={mov}
          />
          <FraseOrkestador texto={movimientos[mov].frase} className="font-display text-h3 text-ork-text" />
          <div className="flex gap-3">
            <button
              className="rounded-lg border border-ork-border-hi px-4 py-2 text-ork-text disabled:opacity-40"
              onClick={() => setMov((m) => Math.max(0, m - 1))}
              disabled={mov === 0}
            >
              Anterior
            </button>
            <button
              className="rounded-lg bg-ork-cyan px-4 py-2 font-medium text-ork-bg disabled:opacity-40"
              onClick={() => setMov((m) => Math.min(movimientos.length - 1, m + 1))}
              disabled={mov === movimientos.length - 1}
            >
              Siguiente
            </button>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="font-display text-h3">Visita · bloques A-E (clic para saltar)</h2>
          <Partitura
            titulo="Bloques de la visita"
            estaciones={BLOQUES.map((b) => ({ id: b.id, marca: b.id, etiqueta: b.nombre }))}
            actual={bloque}
            onSeleccionar={setBloque}
          />
          <FraseOrkestador texto={BLOQUES[bloque].frase} className="text-body-lg text-ork-text" />
        </section>

        <section className="space-y-6 rounded-2xl border border-ork-border bg-ork-surface-1 p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="font-display text-h3">Recogida de documentación · Así es hoy</h2>
            <p className="cifra font-display text-h3 text-ork-cyan-hi">Hoy: ~22 h al mes</p>
          </div>
          <FlowDiagram nodos={nodos} aristas={aristas} titulo="Recogida de documentación, así es hoy" />
        </section>
      </main>
    </EscenarioOrkestador>
  );
}
