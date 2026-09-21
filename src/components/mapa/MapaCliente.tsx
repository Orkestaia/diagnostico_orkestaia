import { Marca } from "@/components/compartido/Marca";
import { Orkestador } from "@/components/compartido/Orkestador";
import { FlowDiagram } from "@/components/diagrama/FlowDiagram";
import { AREAS, PERIODOS } from "@/config/consultor/tarjeta";
import { CasillaConsentimiento } from "@/components/compartido/CasillaConsentimiento";
import { costeInaccion, redondearHoras } from "@/lib/calculo";
import { MAX_PRIORIDADES, mejorasElegibles } from "@/lib/interaccionMapa";
import type { DatosMapa, ProcesoMapa } from "@/lib/datosMapa";
import { diagramaDesdePasos } from "@/lib/diagrama";
import type { ItemRuta, Mapa } from "@/lib/mapa";
import {
  Comparador,
  Desplegable,
  ElegirPrioridades,
  EurosConTuCoste,
  Regalo,
  VigiaApertura,
} from "./Interactivos";

/**
 * El mapa que recibe el cliente (spec §6). La misma pieza se usa en su enlace `/m/[token]`, en la
 * vista previa del panel y en la versión para imprimir o guardar en PDF (`imprimir`): ahí no hay
 * animaciones, todo va desplegado y se enseñan los dos diagramas, el de hoy y el nuevo.
 *
 * Se entrega SOLO como enlace web (decisión de Aitor, 21-sep): no hay botón de PDF. La versión
 * `?imprimir=1` existe por si un cliente pide PDF; se avisa de que no queda bien maquetado.
 *
 * Al cliente se le enseñan horas. Euros, solo si él escribe su coste por hora (revisión con
 * JARVIS, 21-sep): se calculan en su navegador y no se guardan.
 *
 * Las secciones de la revisión (hallazgos, lo que ya funciona, preocupaciones, lo que no compensa,
 * plazos por mejora) son opcionales: un mapa guardado sin ellas se pinta como antes.
 *
 * mapa_v1.2 (spec §7): «Lo que no esperabais», regalo, coste de no hacer nada y «Elige tus 3
 * prioridades», también opcionales. Orden de la página: apertura, lo que no esperabais,
 * hallazgos, así funciona hoy, dónde se va el tiempo (+ coste de no hacer nada), así sería, hoja
 * de ruta, regalo, (preocupaciones), con criterio, prioridades, siguiente paso.
 */

/** Lo que solo existe en el enlace del cliente, no en la vista previa del panel. */
export interface EnlaceCliente {
  token: string;
  /** Interruptor del aviso de apertura (apagado hasta TEMIS). */
  aperturaActiva: boolean;
  /** Casilla de consentimiento agregado; `null` con el interruptor apagado. */
  consentimiento: { inicial: boolean | null } | null;
}

const TIPO_REGALO = { checklist: "Checklist", plantilla: "Plantilla", ficha: "Ficha" } as const;

/** Ancho útil de los diagramas dentro de las tarjetas del mapa (max-w-5xl menos márgenes). */
export const ANCHO_DIAGRAMA = 880;

const h = (x: number) => `${String(redondearHoras(x)).replace(".", ",")} h`;
const rango = (min: number, max: number) =>
  Math.round(min) === Math.round(max)
    ? `~${h(max)}`
    : `${String(redondearHoras(min)).replace(".", ",")}–${h(max)}`;

const semanas = (p: NonNullable<ItemRuta["plazo_orientativo"]>) =>
  `${p.min_semanas}–${p.max_semanas} semanas`;

/** Días que faltan para que caduque el enlace, desde hoy. */
function diasHasta(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}
/** A partir de cuántos días antes se avisa en la página de que el enlace va a caducar. */
const AVISO_CADUCIDAD_DIAS = 30;

function fechaLarga(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, d)));
}

function Seccion({
  id,
  numero,
  titulo,
  entrada,
  children,
  imprimir,
  salto = false,
}: {
  id: string;
  numero: string;
  titulo: string;
  entrada?: string;
  children: React.ReactNode;
  imprimir: boolean;
  salto?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-t`}
      className={"space-y-6 " + (imprimir && salto ? "mapa-salto pt-4" : "")}
    >
      <header className="mapa-junto mapa-titulo max-w-3xl">
        <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-ork-cyan">
          {numero}
        </p>
        <h2 id={`${id}-t`} className="mt-2 font-display text-h2 text-ork-text">
          {titulo}
        </h2>
        {entrada ? <p className="mt-3 text-body-lg text-ork-text-muted">{entrada}</p> : null}
      </header>
      {children}
    </section>
  );
}

function Cifra({ valor, texto }: { valor: string; texto: string }) {
  return (
    <div className="mapa-junto rounded-2xl border border-ork-border bg-ork-surface-1/85 px-5 py-4">
      <p className="cifra font-display text-h3 text-ork-cyan-hi">{valor}</p>
      <p className="mt-1 text-small text-ork-text-muted">{texto}</p>
    </div>
  );
}

function volumenTexto(p: ProcesoMapa) {
  if (p.volumen === null) return null;
  const periodo = PERIODOS.find((x) => x.id === p.volumenPeriodo)?.etiqueta ?? p.volumenPeriodo;
  return `${String(p.volumen).replace(".", ",")}${p.volumenUnidad ? ` ${p.volumenUnidad}` : ""} al ${periodo}`;
}

function DetalleProceso({ p, imprimir = false }: { p: ProcesoMapa; imprimir?: boolean }) {
  const hoy = diagramaDesdePasos(p.pasos);
  const datos: [string, string | null][] = [
    ["Volumen", volumenTexto(p)],
    ["Tiempo cada vez", p.minutosPorVez !== null ? `${p.minutosPorVez} min` : null],
    ["Quién", p.quien],
    ["Herramientas", p.herramientas.length ? p.herramientas.join(", ") : null],
  ];
  return (
    <div className="space-y-4">
      <dl className="grid gap-3 sm:grid-cols-2">
        {datos
          .filter(([, v]) => v)
          .map(([k, v]) => (
            <div key={k}>
              <dt className="text-small text-ork-text-faint">{k}</dt>
              <dd className="text-ork-text">{v}</dd>
            </div>
          ))}
      </dl>
      {p.cita ? (
        <blockquote className="border-l-2 border-ork-violet pl-4 text-body-lg italic text-ork-text">
          «{p.cita}»
        </blockquote>
      ) : null}
      {hoy.nodos.length >= 2 ? (
        <div className="rounded-xl border border-ork-border bg-ork-bg/60 p-4">
          <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-text-faint">
            Así es hoy
          </p>
          <FlowDiagram
            nodos={hoy.nodos}
            aristas={hoy.aristas}
            titulo={`${p.nombre}: así es hoy`}
            anchoEscritorio={ANCHO_DIAGRAMA}
            soloHorizontal={imprimir}
          />
        </div>
      ) : null}
    </div>
  );
}

function AsiFuncionaHoy({ procesos, imprimir }: { procesos: ProcesoMapa[]; imprimir: boolean }) {
  const max = Math.max(1, ...procesos.map((p) => p.horasHoy ?? 0));
  const grupos = [...AREAS, null].map((area) => ({
    area: area ?? "Otros",
    procesos: procesos
      .filter((p) => p.area === area)
      .sort((a, b) => (b.horasHoy ?? 0) - (a.horasHoy ?? 0)),
  }));
  let i = 0;
  return (
    <div className="space-y-8">
      {grupos
        .filter((g) => g.procesos.length)
        .map((g) => (
          <div key={g.area} className="space-y-3">
            <p className="mapa-titulo text-small uppercase tracking-[0.12em] text-ork-text-faint">
              {g.area}
            </p>
            <ul className="grid gap-3">
              {g.procesos.map((p) => {
                // Intensidad según las horas que consume hoy (spec §6.2).
                const peso = 0.25 + 0.75 * ((p.horasHoy ?? 0) / max);
                const cabecera = (
                  <div className="flex items-center justify-between gap-4">
                    <span className="min-w-0">
                      <span className="block text-body-lg text-ork-text">{p.nombre}</span>
                      {!imprimir ? (
                        <span className="text-small text-ork-text-faint">
                          Toca para ver el detalle
                        </span>
                      ) : null}
                    </span>
                    <span
                      className="cifra shrink-0 rounded-full px-3 py-1 font-display text-ork-bg"
                      style={{
                        backgroundColor: `color-mix(in srgb, var(--color-ork-cyan-hi) ${Math.round(peso * 100)}%, transparent)`,
                      }}
                    >
                      {p.horasHoy !== null ? `~${h(p.horasHoy)}/mes` : "—"}
                    </span>
                  </div>
                );
                return (
                  <li
                    key={p.id}
                    className="mapa-entra rounded-2xl border border-ork-border bg-ork-surface-1/85 p-5"
                    style={{ ["--i" as string]: i++ }}
                  >
                    {imprimir ? (
                      <div className="space-y-4">
                        {cabecera}
                        <DetalleProceso p={p} imprimir={imprimir} />
                      </div>
                    ) : (
                      <Desplegable cabecera={cabecera}>
                        <DetalleProceso p={p} imprimir={imprimir} />
                      </Desplegable>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
    </div>
  );
}

function DondeSeVaElTiempo({ mapa }: { mapa: Mapa }) {
  const fugas = [...mapa.fugas].sort((a, b) => b.horas_mes_hoy - a.horas_mes_hoy);
  const max = Math.max(1, ...fugas.map((f) => f.horas_mes_hoy));
  return (
    <div className="space-y-5">
      <ul className="space-y-5">
        {fugas.map((f) => (
          <li key={f.proceso_id} className="mapa-junto space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-ork-text">{f.titulo}</span>
              <span className="cifra text-small text-ork-text-muted">
                hoy ~{h(f.horas_mes_hoy)} al mes · se podrían liberar{" "}
                <span className="text-ork-cyan-hi">
                  {rango(f.ahorro_horas_mes.min, f.ahorro_horas_mes.max)}
                </span>
              </span>
            </div>
            <div
              className="relative h-3 overflow-hidden rounded-full bg-ork-surface-2"
              aria-hidden="true"
            >
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-ork-border-hi"
                style={{ width: `${(f.horas_mes_hoy / max) * 100}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-ork-cyan"
                style={{ width: `${(f.ahorro_horas_mes.max / max) * 100}%`, opacity: 0.45 }}
              />
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-ork-cyan-hi"
                style={{ width: `${(f.ahorro_horas_mes.min / max) * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="flex flex-wrap gap-x-5 gap-y-1 text-small text-ork-text-muted">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-ork-border-hi" /> Horas al
          mes hoy
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="h-2.5 w-5 rounded-full bg-ork-cyan" /> Horas que se
          podrían liberar (rango)
        </span>
      </p>
    </div>
  );
}

function AsiSeria({
  items,
  procesos,
  imprimir,
}: {
  items: ItemRuta[];
  procesos: ProcesoMapa[];
  imprimir: boolean;
}) {
  return (
    <div className="space-y-12">
      {items.map((it) => {
        const p = procesos.find((x) => x.id === it.proceso_id);
        const hoy = p ? diagramaDesdePasos(p.pasos) : null;
        const hayHoy = hoy && hoy.nodos.length >= 2 ? hoy : null;
        const d = it.diagrama!;
        return (
          <article
            key={it.titulo}
            className="space-y-5 rounded-3xl border border-ork-border bg-ork-surface-1/70 p-6 sm:p-8"
          >
            <header className="mapa-junto flex flex-wrap items-start justify-between gap-3">
              <h3 className="font-display text-h3 text-ork-text">{it.titulo}</h3>
              <span className="flex flex-wrap gap-2">
                <span className="rounded-full border border-ork-border-hi px-3 py-1 text-small text-ork-text-muted">
                  Esfuerzo: {it.esfuerzo}
                </span>
                {it.plazo_orientativo ? (
                  <span className="rounded-full border border-ork-border-hi px-3 py-1 text-small text-ork-text-muted">
                    Plazo orientativo: {semanas(it.plazo_orientativo)}
                  </span>
                ) : null}
              </span>
            </header>

            {imprimir ? (
              <div className="space-y-5">
                {hayHoy ? (
                  <div className="mapa-junto">
                    <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-text-faint">
                      Hoy
                    </p>
                    <FlowDiagram
                      nodos={hayHoy.nodos}
                      aristas={hayHoy.aristas}
                      titulo={`${it.titulo}: hoy`}
                      anchoEscritorio={ANCHO_DIAGRAMA}
                      soloHorizontal={imprimir}
                    />
                  </div>
                ) : null}
                <div className="mapa-junto">
                  <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
                    Con el sistema
                  </p>
                  <FlowDiagram
                    nodos={d.nodos}
                    aristas={d.aristas}
                    titulo={d.titulo}
                    anchoEscritorio={ANCHO_DIAGRAMA}
                    soloHorizontal={imprimir}
                  />
                </div>
              </div>
            ) : (
              <Comparador
                titulo={it.titulo}
                hoy={hayHoy}
                sistema={{ nodos: d.nodos, aristas: d.aristas }}
              />
            )}
            <p className="font-display text-body-lg text-ork-text">{d.pie}</p>

            <div className="mapa-junto grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-ork-border bg-ork-bg/60 p-5">
                <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-text-faint">
                  Hoy
                </p>
                <p className="text-ork-text">{it.antes}</p>
              </div>
              <div className="rounded-2xl border border-ork-cyan/40 bg-ork-cyan/[0.06] p-5">
                <p className="mb-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
                  Con el sistema
                </p>
                <p className="text-ork-text">{it.despues}</p>
              </div>
            </div>
            {it.depende_de.length ? (
              <div className="mapa-junto">
                <p className="text-small text-ork-text-faint">Para ponerlo en marcha hace falta</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ork-text-muted">
                  {it.depende_de.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function HojaDeRuta({ mapa }: { mapa: Mapa }) {
  return (
    <ol className="grid gap-4 lg:grid-cols-3">
      {mapa.hoja_de_ruta.map((f) => (
        <li
          key={f.fase}
          className="mapa-junto relative rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6"
        >
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-ork-cyan">
            Fase {f.fase}
          </p>
          <p className="mt-2 font-display text-h3 text-ork-text">{f.nombre}</p>
          <p className="mt-1 text-small text-ork-text-muted">Plazo orientativo: {f.plazo}</p>
          <ul className="mt-4 space-y-2">
            {f.items.map((it) => (
              <li key={it.titulo} className="flex gap-2 text-ork-text">
                <span
                  aria-hidden="true"
                  className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ork-cyan"
                />
                <span>
                  {it.titulo}
                  {it.plazo_orientativo ? (
                    <span className="block text-small text-ork-text-faint">
                      {semanas(it.plazo_orientativo)}
                      {it.depende_de.length ? " · tiene requisitos previos" : ""}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

function Lista({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mapa-junto rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6">
      <p className="font-display text-body-lg text-ork-text">{titulo}</p>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ork-text-muted">{children}</ul>
    </div>
  );
}

export function MapaCliente({
  datos,
  imprimir = false,
  cliente = null,
}: {
  datos: DatosMapa;
  imprimir?: boolean;
  /** `null` en la vista previa del panel: nada guarda ni avisa. */
  cliente?: EnlaceCliente | null;
}) {
  const { mapa, procesos } = datos;
  const inesperado = mapa.hallazgos?.find((x) => x.inesperado) ?? null;
  const otrosHallazgos = (mapa.hallazgos ?? []).filter((x) => x !== inesperado);
  // Coste de no hacer nada: horas de hoy × 12 de los procesos de la hoja de ruta (calculo.ts).
  const enRuta = new Set(mapa.hoja_de_ruta.flatMap((f) => f.items.map((it) => it.proceso_id)));
  const inaccion =
    mapa.coste_inaccion?.mostrar && !datos.visitaConAvisos
      ? costeInaccion(procesos.filter((p) => enRuta.has(p.id)).map((p) => p.horasHoy))
      : null;
  // «Elige tus 3 prioridades» no tiene campo propio: sale en los mapas que JARVIS sube como
  // mapa_v1.2. Así los mapas ya guardados (mapa_v1) se siguen pintando igual.
  const mejoras = mapa.version === "mapa_v1.2" ? mejorasElegibles(mapa) : [];
  const horasHoy = mapa.fugas.reduce((s, f) => s + f.horas_mes_hoy, 0);
  const liberarMin = mapa.fugas.reduce((s, f) => s + f.ahorro_horas_mes.min, 0);
  const liberarMax = mapa.fugas.reduce((s, f) => s + f.ahorro_horas_mes.max, 0);
  const conDiagrama = mapa.hoja_de_ruta.flatMap((f) => f.items.filter((it) => it.diagrama));
  const supuestos = mapa.fugas.flatMap((f) => f.supuestos.map((s) => `${f.titulo}: ${s}`));
  // Numeración de las secciones: algunas son opcionales.
  let seccion = 0;
  const num = () => String(++seccion).padStart(2, "0");
  const hayCriterio =
    mapa.no_automatizar.length > 0 || mapa.validar.length > 0 || (mapa.no_rentables?.length ?? 0) > 0;
  const dias = datos.caducaAt ? diasHasta(datos.caducaAt) : null;

  return (
    <div className={"relative min-h-dvh " + (imprimir ? "sin-animacion" : "")}>
      {!imprimir ? (
        <Orkestador
          intensidad="fondo"
          className="pointer-events-none fixed -right-28 bottom-0 h-[60vh] opacity-25 md:right-[3%] md:opacity-50"
        />
      ) : null}

      <div className="relative mx-auto max-w-5xl space-y-20 px-4 py-10 sm:px-8 print:px-12 print:py-12">
        {!imprimir && dias !== null && dias <= AVISO_CADUCIDAD_DIAS ? (
          <p
            role="status"
            className="rounded-2xl border border-ork-violet/60 bg-ork-violet/10 px-5 py-4 text-ork-text"
          >
            Este enlace deja de abrir el {fechaLarga(datos.caducaAt!)}
            {dias > 0 ? ` (en ${dias} ${dias === 1 ? "día" : "días"})` : ""}. Si quieres
            conservarlo, guárdalo en PDF desde el navegador (Imprimir, Guardar como PDF) o pídenos
            una copia.
          </p>
        ) : null}

        {/* ── Portada ── */}
        <header className="mapa-junto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Marca className="text-body-lg" />
          </div>
          <div className="space-y-5 pt-6">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-ork-cyan">
              Mapa de automatización · {fechaLarga(mapa.fecha_diagnostico)}
            </p>
            <h1 className="mapa-entra font-display text-[clamp(2.4rem,6vw,4.4rem)] leading-[1.02] text-ork-text">
              {datos.empresa}
            </h1>
            <p
              className="mapa-entra max-w-3xl font-display text-h3 text-ork-text"
              style={{ ["--i" as string]: 1 }}
            >
              {mapa.frase_apertura}
            </p>
            <p
              className="mapa-entra max-w-3xl text-body-lg text-ork-text-muted"
              style={{ ["--i" as string]: 2 }}
            >
              {mapa.resumen}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Cifra valor={String(procesos.length)} texto="procesos analizados en la visita" />
            <Cifra
              valor={`~${h(horasHoy)}`}
              texto="al mes se van hoy en los procesos que proponemos mejorar"
            />
            <Cifra
              valor={rango(liberarMin, liberarMax)}
              texto="al mes que se podrían liberar con el sistema"
            />
          </div>
        </header>

        {cliente?.aperturaActiva && !imprimir ? <VigiaApertura token={cliente.token} /> : null}

        {inesperado ? (
          <section
            id="inesperado"
            aria-labelledby="inesperado-t"
            className="mapa-junto rounded-3xl border border-ork-violet/60 bg-ork-violet/10 p-8 sm:p-10"
          >
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-ork-violet">
              Lo que no esperabais
            </p>
            <h2 id="inesperado-t" className="mt-3 font-display text-h2 text-ork-text">
              {inesperado.titulo}
            </h2>
            <p className="mt-3 max-w-3xl text-body-lg text-ork-text-muted">
              <span className="text-ork-text-faint">En qué nos basamos: </span>
              {inesperado.evidencia}
            </p>
          </section>
        ) : null}

        {otrosHallazgos.length ? (
          <Seccion
            id="hallazgos"
            numero={num()}
            titulo="Lo que hemos visto"
            entrada="Lo más importante de la visita, y en qué nos basamos."
            imprimir={imprimir}
            salto
          >
            <ol className="grid gap-4 sm:grid-cols-2">
              {otrosHallazgos.map((x, i) => (
                <li
                  key={x.titulo}
                  className="mapa-junto rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6"
                >
                  <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p className="mt-2 font-display text-body-lg text-ork-text">{x.titulo}</p>
                  <p className="mt-2 text-small text-ork-text-muted">
                    <span className="text-ork-text-faint">En qué nos basamos: </span>
                    {x.evidencia}
                  </p>
                </li>
              ))}
            </ol>
          </Seccion>
        ) : null}

        <Seccion
          id="hoy"
          numero={num()}
          titulo={`Así funciona hoy ${datos.empresa}`}
          entrada="Los procesos que vimos juntos, por área. Cuanto más intenso el color, más horas consumen al mes."
          imprimir={imprimir}
          salto
        >
          <AsiFuncionaHoy procesos={procesos} imprimir={imprimir} />
          {mapa.lo_que_ya_funciona?.length ? (
            <div className="mapa-junto rounded-2xl border border-ork-cyan/40 bg-ork-cyan/[0.06] p-6">
              <p className="font-display text-body-lg text-ork-text">Lo que ya funciona bien</p>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-ork-text">
                {mapa.lo_que_ya_funciona.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </Seccion>

        <Seccion
          id="tiempo"
          numero={num()}
          titulo="Dónde se os va el tiempo"
          entrada="Las horas de hoy son las que acordamos en la visita. El rango es lo que se podría liberar: preferimos quedarnos cortos."
          imprimir={imprimir}
          salto
        >
          <DondeSeVaElTiempo mapa={mapa} />
          {!imprimir && mapa.fugas.length ? (
            <EurosConTuCoste
              fugas={mapa.fugas.map((f) => ({ titulo: f.titulo, ...f.ahorro_horas_mes }))}
            />
          ) : null}
          {inaccion ? (
            <div className="mapa-junto rounded-2xl border border-ork-border-hi bg-ork-surface-1/85 p-6">
              <p className="font-display text-body-lg text-ork-text">El coste de no hacer nada</p>
              <p className="mt-2 text-ork-text-muted">
                Según vuestras cifras, si todo sigue igual, en un año se irán{" "}
                <span className="cifra text-ork-text">
                  {rango(inaccion.min, inaccion.max)}
                </span>{" "}
                en los procesos de la hoja de ruta.
              </p>
            </div>
          ) : null}
        </Seccion>

        {conDiagrama.length ? (
          <Seccion
            id="asi-seria"
            numero={num()}
            titulo="Así sería"
            entrada="Cada proceso, con el sistema. En violeta, lo que sigue haciendo o decidiendo una persona."
            imprimir={imprimir}
            salto
          >
            <AsiSeria items={conDiagrama} procesos={procesos} imprimir={imprimir} />
          </Seccion>
        ) : null}

        <Seccion
          id="ruta"
          numero={num()}
          titulo="Vuestra hoja de ruta"
          entrada="Por fases, empezando por lo que antes se nota. Los plazos llevan margen: preferimos entregar antes de lo prometido."
          imprimir={imprimir}
          salto
        >
          <HojaDeRuta mapa={mapa} />
        </Seccion>

        {mapa.regalo ? (
          <Seccion
            id="regalo"
            numero={num()}
            titulo="Un regalo de 10 minutos"
            entrada="Algo que podéis usar ya, sin esperar a nada."
            imprimir={imprimir}
          >
            <div className="mapa-junto space-y-4 rounded-2xl border border-ork-cyan/40 bg-ork-cyan/[0.06] p-6">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
                {TIPO_REGALO[mapa.regalo.tipo]}
              </p>
              <p className="font-display text-h3 text-ork-text">{mapa.regalo.titulo}</p>
              <p className="text-ork-text-muted">{mapa.regalo.descripcion}</p>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-xl border border-ork-border bg-ork-bg/70 p-4 font-sans text-small text-ork-text">
                {mapa.regalo.contenido}
              </pre>
              {!imprimir ? (
                <Regalo titulo={mapa.regalo.titulo} contenido={mapa.regalo.contenido} />
              ) : null}
            </div>
          </Seccion>
        ) : null}

        {mapa.preocupaciones?.length ? (
          <Seccion
            id="preocupaciones"
            numero={num()}
            titulo="Lo que os preocupa"
            entrada="Lo que nos contasteis que os preocupa, y cómo lo tenemos en cuenta."
            imprimir={imprimir}
          >
            <ul className="grid gap-4">
              {mapa.preocupaciones.map((x) => (
                <li
                  key={x.preocupacion}
                  className="mapa-junto grid gap-3 rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6 sm:grid-cols-2"
                >
                  <p className="text-body-lg text-ork-text">«{x.preocupacion}»</p>
                  <p className="text-ork-text-muted">{x.como_lo_abordamos}</p>
                </li>
              ))}
            </ul>
          </Seccion>
        ) : null}

        {hayCriterio ? (
          <Seccion id="criterio" numero={num()} titulo="Con criterio" imprimir={imprimir}>
            <div className="grid gap-4 sm:grid-cols-2">
              {mapa.no_rentables?.length ? (
                <Lista titulo="Lo que no compensa automatizar">
                  {mapa.no_rentables.map((x) => (
                    <li key={x.que}>
                      <span className="text-ork-text">{x.que}</span>: {x.motivo}
                    </li>
                  ))}
                </Lista>
              ) : null}
              {mapa.no_automatizar.length ? (
                <div className="mapa-junto rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6">
                  <p className="font-display text-body-lg text-ork-text">
                    Lo que no automatizaríamos todavía
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-ork-text-muted">
                    {mapa.no_automatizar.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {mapa.validar.length ? (
                <div className="mapa-junto rounded-2xl border border-ork-border bg-ork-surface-1/85 p-6">
                  <p className="font-display text-body-lg text-ork-text">
                    Lo que hay que validar antes
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-ork-text-muted">
                    {mapa.validar.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Seccion>
        ) : null}

        {mejoras.length && !imprimir ? (
          <Seccion
            id="prioridades"
            numero={num()}
            titulo={`Elige tus ${MAX_PRIORIDADES} prioridades`}
            entrada="Marca las mejoras que más os importan. Nos sirve para preparar la propuesta; puedes cambiarlas cuando quieras."
            imprimir={imprimir}
          >
            <ElegirPrioridades
              token={cliente?.token ?? null}
              mejoras={mejoras}
              inicial={(datos.prioridades?.seleccion ?? []).filter((x) => mejoras.includes(x))}
              fechaInicial={datos.prioridades?.fecha ?? null}
              max={MAX_PRIORIDADES}
            />
          </Seccion>
        ) : null}

        {cliente?.consentimiento && !imprimir ? (
          <CasillaConsentimiento
            url={`/api/d/${cliente.token}/consentimiento`}
            inicial={cliente.consentimiento.inicial}
          />
        ) : null}

        <section
          aria-labelledby="siguiente-t"
          className="mapa-junto rounded-3xl border border-ork-cyan/50 bg-ork-cyan/[0.06] p-8 sm:p-10"
        >
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-ork-cyan">
            Siguiente paso
          </p>
          <h2 id="siguiente-t" className="mt-2 font-display text-h2 text-ork-text">
            Lo vemos juntos
          </h2>
          <p className="mt-3 max-w-2xl text-body-lg text-ork-text">{mapa.siguiente_paso.texto}</p>
          <a
            href={mapa.siguiente_paso.cta_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-ork-cyan px-6 font-medium text-ork-bg hover:bg-ork-cyan-hi"
          >
            Reservar la reunión
          </a>
        </section>

        <details className="mapa-junto rounded-2xl border border-ork-border p-6" open={imprimir}>
          <summary className="cursor-pointer font-display text-body-lg text-ork-text">
            Cómo lo hemos calculado
          </summary>
          <div className="mt-4 space-y-3 text-ork-text-muted">
            <p>
              Las horas de hoy salen de lo que acordamos en la visita: cuántas veces pasa cada
              proceso y cuánto se tarda cada vez. Las horas que se podrían liberar son un rango
              prudente: aplicamos a cada proceso solo la parte que se puede automatizar con
              seguridad, nunca todo, y ajustamos el total al tamaño del equipo.
            </p>
            {supuestos.length ? (
              <ul className="list-disc space-y-1 pl-5">
                {supuestos.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-ork-border pt-6 text-small text-ork-text-faint">
          <Marca className="text-small" />
          <span>
            Preparado para {datos.empresa} · {fechaLarga(mapa.fecha_diagnostico)} · Documento
            confidencial
            {datos.caducaAt ? ` · Enlace disponible hasta el ${fechaLarga(datos.caducaAt)}` : ""}
          </span>
        </footer>
      </div>
    </div>
  );
}
