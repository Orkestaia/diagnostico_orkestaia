/*
 * COPIA del portfolio: ORKESTA - BUILDS/02_INTERNAL_BUILDS/orkesta-web/components/proyecto/FlowDiagram.tsx
 * (spec del diagnóstico §1 y §12). Mismo componente, mismas animaciones (`ork-diagrama__*` en
 * globals.css) y mismo formato de datos. Si se mejora aquí o allí, llevar el cambio al otro repo.
 * Único cambio: la importación de los tipos, que aquí viven en `@/lib/diagrama`.
 */
import type { Arista, Nodo } from "@/lib/diagrama";

/**
 * Mapa del sistema — brief §5.
 *
 * SVG generado a partir de los datos del MDX, no una imagen estática.
 * Conexiones con ángulo recto y esquina redondeada, el lenguaje de las alas
 * del logotipo.
 *
 * 🔴 Los pasos que hace una persona van en violeta: es la demostración
 * visual de que no se automatiza todo, que es el argumento de la marca.
 *
 * En escritorio el flujo va de izquierda a derecha. En móvil se dibuja el
 * mismo grafo transpuesto, de arriba abajo: a 375 px un diagrama horizontal
 * o se sale de la pantalla o deja el texto ilegible.
 *
 * Todo el movimiento es CSS (globals.css): las líneas se dibujan, los nodos
 * entran escalonados y un punto de luz recorre el circuito. Con
 * prefers-reduced-motion no se anima nada.
 */

const RADIO = 14;

/**
 * El tamaño de un nodo NO es fijo: se calcula para que el conjunto ocupe
 * siempre el mismo ancho de lienzo. El SVG se dibuja con `width: 100%`, así
 * que un grafo de siete columnas con nodos de ancho fijo se reducía a la
 * mitad y la letra de dentro acababa en 7 px — el motivo de la queja de
 * Aitor (2026-08-21: "no se ve la letra de dentro").
 *
 * Con el ancho total clavado, la escala de dibujo es ~1 y el texto se ve al
 * tamaño que dice `fuente`, tenga el diagrama cinco columnas o siete.
 */
const LIENZO = {
  // Escritorio: el ancho real que ocupa la diapositiva en un portátil de 1440
  escritorio: { ancho: 1280, sepX: 44, sepY: 34, fuente: 15 },
  // Móvil: el mismo grafo transpuesto. Se dibuja al doble y se reduce a la
  // mitad, así que la letra también acaba en ~13 px reales.
  movil: { ancho: 720, sepX: 40, sepY: 44, fuente: 26 },
};

/**
 * Alto de nodo suficiente para el texto más largo del grafo.
 *
 * Es una estimación: dentro del `foreignObject` quien parte las líneas es el
 * navegador, no este cálculo. Se toma el ancho medio de carácter de Inter
 * (~0,52 em) con un 15% de holgura por los cortes de palabra, y se reserva
 * una línea de más. Quedarse corto rompe la caja; pasarse solo deja aire.
 */
function altoNodo(nodos: Nodo[], anchoNodo: number, fuente: number): number {
  const util = Math.max(1, anchoNodo - 26);
  const lineas = Math.max(
    2,
    ...nodos.map((n) => Math.ceil((n.texto.length * fuente * 0.52 * 1.15) / util)),
  );
  return Math.round((lineas + 1) * fuente * 1.3 + 12);
}

export function FlowDiagram({
  nodos,
  aristas,
  titulo,
  anchoEscritorio,
  soloHorizontal = false,
}: {
  nodos: Nodo[];
  aristas: Arista[];
  titulo: string;
  /**
   * Ancho real (px) que ocupa el diagrama en escritorio, si no es el de la diapositiva del
   * portfolio. Con el lienzo del mismo ancho que el hueco, la letra se ve a su tamaño en vez de
   * encogerse (en el mapa del diagnóstico el hueco mide unos 900 px, no 1280).
   * Añadido en el diagnóstico (21-sep); opcional, así que el portfolio no cambia.
   */
  anchoEscritorio?: number;
  /**
   * Solo la versión horizontal, sin mirar el ancho de pantalla. Para imprimir o guardar en PDF:
   * al imprimir, el navegador puede tomar el ancho de móvil y dibujar el diagrama en vertical y
   * enorme. Añadido en el diagnóstico (21-sep); opcional.
   */
  soloHorizontal?: boolean;
}) {
  const llevaHumano = nodos.some((n) => n.humano);
  const escritorio = anchoEscritorio
    ? { ...LIENZO.escritorio, ancho: anchoEscritorio }
    : LIENZO.escritorio;
  return (
    <figure className="ork-diagrama w-full">
      {/* Escritorio: de izquierda a derecha */}
      <div className={soloHorizontal ? "block" : "hidden md:block"}>
        <Lienzo nodos={nodos} aristas={aristas} titulo={titulo} medidas={escritorio} />
      </div>
      {/* Móvil: el mismo grafo, de arriba abajo */}
      {!soloHorizontal ? (
        <div className="md:hidden">
          <Lienzo
            nodos={nodos.map((n) => ({ ...n, col: n.fila, fila: n.col }))}
            aristas={aristas}
            titulo={titulo}
            medidas={LIENZO.movil}
            vertical
          />
        </div>
      ) : null}

      {llevaHumano ? (
        <figcaption className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-mono-label tracking-[0.12em] uppercase">
          <span className="flex items-center gap-2 text-ork-text-muted">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-[3px] border border-ork-cyan"
            />
            Lo hace el sistema
          </span>
          <span className="flex items-center gap-2 text-ork-text-muted">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-[3px] border border-ork-violet"
            />
            Lo hace una persona
          </span>
        </figcaption>
      ) : null}
    </figure>
  );
}

function Lienzo({
  nodos,
  aristas,
  titulo,
  medidas,
  vertical = false,
}: {
  nodos: Nodo[];
  aristas: Arista[];
  titulo: string;
  medidas: { ancho: number; sepX: number; sepY: number; fuente: number };
  vertical?: boolean;
}) {
  const columnas = Math.max(...nodos.map((n) => n.col)) + 1;
  const filas = Math.max(...nodos.map((n) => n.fila)) + 1;
  const { sepX, sepY, fuente } = medidas;

  // El ancho total es la constante; lo que cede es el ancho de cada nodo.
  const ANCHO_NODO = Math.round((medidas.ancho - (columnas - 1) * sepX) / columnas);
  const ALTO_NODO = altoNodo(nodos, ANCHO_NODO, fuente);

  const ancho = columnas * ANCHO_NODO + (columnas - 1) * sepX;
  const alto = filas * ALTO_NODO + (filas - 1) * sepY;

  const pos = (n: Nodo) => ({
    x: n.col * (ANCHO_NODO + sepX),
    y: n.fila * (ALTO_NODO + sepY),
  });
  const porId = new Map(nodos.map((n) => [n.id, n]));

  /** Conexión en L con esquina redondeada entre dos nodos. */
  function trazado(a: Nodo, b: Nodo): string {
    const pa = pos(a);
    const pb = pos(b);

    if (vertical) {
      // De abajo de A a arriba de B
      const x1 = pa.x + ANCHO_NODO / 2;
      const y1 = pa.y + ALTO_NODO;
      const x2 = pb.x + ANCHO_NODO / 2;
      const y2 = pb.y;
      const my = y1 + (y2 - y1) / 2;
      if (Math.abs(x1 - x2) < 1) return `M ${x1} ${y1} V ${y2}`;
      const dir = x2 > x1 ? 1 : -1;
      const r = Math.min(RADIO, Math.abs(x2 - x1) / 2, Math.abs(my - y1));
      return [
        `M ${x1} ${y1}`,
        `V ${my - r}`,
        `Q ${x1} ${my} ${x1 + r * dir} ${my}`,
        `H ${x2 - r * dir}`,
        `Q ${x2} ${my} ${x2} ${my + r}`,
        `V ${y2}`,
      ].join(" ");
    }

    // De la derecha de A a la izquierda de B
    const x1 = pa.x + ANCHO_NODO;
    const y1 = pa.y + ALTO_NODO / 2;
    const x2 = pb.x;
    const y2 = pb.y + ALTO_NODO / 2;
    const mx = x1 + (x2 - x1) / 2;
    if (Math.abs(y1 - y2) < 1) return `M ${x1} ${y1} H ${x2}`;
    const dir = y2 > y1 ? 1 : -1;
    const r = Math.min(RADIO, Math.abs(y2 - y1) / 2, Math.abs(mx - x1));
    return [
      `M ${x1} ${y1}`,
      `H ${mx - r}`,
      `Q ${mx} ${y1} ${mx} ${y1 + r * dir}`,
      `V ${y2 - r * dir}`,
      `Q ${mx} ${y2} ${mx + r} ${y2}`,
      `H ${x2}`,
    ].join(" ");
  }

  const trazados = aristas
    .map((a) => {
      const de = porId.get(a.de);
      const hacia = porId.get(a.a);
      if (!de || !hacia) return null;
      return { d: trazado(de, hacia), key: `${a.de}-${a.a}` };
    })
    .filter((t): t is { d: string; key: string } => t !== null);

  return (
    <svg
      viewBox={`-4 -4 ${ancho + 8} ${alto + 8}`}
      className="h-auto w-full"
      role="img"
      aria-label={titulo}
    >
      <title>{titulo}</title>

      <g fill="none" strokeWidth={fuente / 10}>
        {trazados.map((t, i) => (
          <path
            key={t.key}
            d={t.d}
            className="ork-diagrama__linea"
            stroke="var(--color-ork-border-hi)"
            pathLength={1}
            style={{ ["--i" as string]: i }}
          />
        ))}
        {trazados.map((t, i) => (
          <path
            key={`luz-${t.key}`}
            d={t.d}
            className="ork-diagrama__luz"
            stroke="var(--color-ork-cyan-hi)"
            pathLength={1}
            style={{ ["--i" as string]: i }}
          />
        ))}
      </g>

      {nodos.map((n, i) => {
        const p = pos(n);
        return (
          <g
            key={n.id}
            className="ork-diagrama__nodo"
            style={{ ["--i" as string]: i }}
            transform={`translate(${p.x} ${p.y})`}
          >
            <rect
              width={ANCHO_NODO}
              height={ALTO_NODO}
              rx={Math.round(fuente * 0.8)}
              fill="var(--color-ork-surface-2)"
              stroke={n.humano ? "var(--color-ork-violet)" : "var(--color-ork-cyan)"}
              strokeWidth={fuente / 10}
            />
            <foreignObject width={ANCHO_NODO} height={ALTO_NODO}>
              <div className="flex h-full items-center justify-center text-center">
                <span
                  // El tamaño va en unidades del viewBox, no en rem: con el
                  // ancho de lienzo fijo, una unidad ≈ un píxel en pantalla.
                  style={{ fontSize: fuente, padding: `0 ${Math.round(fuente * 0.8)}px` }}
                  className={"leading-snug " + (n.humano ? "text-ork-violet" : "text-ork-text")}
                >
                  {n.texto}
                </span>
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}
