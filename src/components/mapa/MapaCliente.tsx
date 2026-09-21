import { Marca } from "@/components/compartido/Marca";
import { Orkestador } from "@/components/compartido/Orkestador";
import { FlowDiagram } from "@/components/diagrama/FlowDiagram";
import { AREAS, PERIODOS } from "@/config/consultor/tarjeta";
import { redondearHoras } from "@/lib/calculo";
import type { DatosMapa, ProcesoMapa } from "@/lib/datosMapa";
import { diagramaDesdePasos } from "@/lib/diagrama";
import type { ItemRuta, Mapa } from "@/lib/mapa";
import { Comparador, Desplegable } from "./Interactivos";

/**
 * El mapa que recibe el cliente (spec §6). La misma pieza se usa en su enlace `/m/[token]`, en la
 * vista previa del panel y en la versión para imprimir o guardar en PDF (`imprimir`): ahí no hay
 * animaciones, todo va desplegado y se enseñan los dos diagramas, el de hoy y el nuevo.
 *
 * Al cliente solo se le enseñan horas. Los euros se quedan para Aitor (pendiente de decidir con
 * JARVIS si alguna vez aparecen aquí).
 */

/** Ancho útil de los diagramas dentro de las tarjetas del mapa (max-w-5xl menos márgenes). */
export const ANCHO_DIAGRAMA = 880;

const h = (x: number) => `${String(redondearHoras(x)).replace(".", ",")} h`;
const rango = (min: number, max: number) =>
  Math.round(min) === Math.round(max)
    ? `~${h(max)}`
    : `${String(redondearHoras(min)).replace(".", ",")}–${h(max)}`;

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

function DetalleProceso({ p }: { p: ProcesoMapa }) {
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
                        <DetalleProceso p={p} />
                      </div>
                    ) : (
                      <Desplegable cabecera={cabecera}>
                        <DetalleProceso p={p} />
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
              <span className="rounded-full border border-ork-border-hi px-3 py-1 text-small text-ork-text-muted">
                Esfuerzo: {it.esfuerzo}
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
                {it.titulo}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  );
}

export function MapaCliente({ datos, imprimir = false }: { datos: DatosMapa; imprimir?: boolean }) {
  const { mapa, procesos } = datos;
  const horasHoy = mapa.fugas.reduce((s, f) => s + f.horas_mes_hoy, 0);
  const liberarMin = mapa.fugas.reduce((s, f) => s + f.ahorro_horas_mes.min, 0);
  const liberarMax = mapa.fugas.reduce((s, f) => s + f.ahorro_horas_mes.max, 0);
  const conDiagrama = mapa.hoja_de_ruta.flatMap((f) => f.items.filter((it) => it.diagrama));
  const supuestos = mapa.fugas.flatMap((f) => f.supuestos.map((s) => `${f.titulo}: ${s}`));

  return (
    <div className={"relative min-h-dvh " + (imprimir ? "sin-animacion" : "")}>
      {!imprimir ? (
        <Orkestador
          intensidad="fondo"
          className="pointer-events-none fixed -right-28 bottom-0 h-[60vh] opacity-25 md:right-[3%] md:opacity-50"
        />
      ) : null}

      <div className="relative mx-auto max-w-5xl space-y-20 px-4 py-10 sm:px-8 print:px-12 print:py-12">
        {/* ── Portada ── */}
        <header className="mapa-junto space-y-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Marca className="text-body-lg" />
            {!imprimir ? (
              <a
                href="?imprimir=1"
                target="_blank"
                rel="noopener"
                className="solo-pantalla rounded-full border border-ork-border-hi px-4 py-2 text-small text-ork-text-muted hover:text-ork-text"
              >
                Versión para imprimir o PDF
              </a>
            ) : null}
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

        <Seccion
          id="hoy"
          numero="01"
          titulo={`Así funciona hoy ${datos.empresa}`}
          entrada="Los procesos que vimos juntos, por área. Cuanto más intenso el color, más horas consumen al mes."
          imprimir={imprimir}
          salto
        >
          <AsiFuncionaHoy procesos={procesos} imprimir={imprimir} />
        </Seccion>

        <Seccion
          id="tiempo"
          numero="02"
          titulo="Dónde se os va el tiempo"
          entrada="Las horas de hoy son las que acordamos en la visita. El rango es lo que se podría liberar: preferimos quedarnos cortos."
          imprimir={imprimir}
          salto
        >
          <DondeSeVaElTiempo mapa={mapa} />
        </Seccion>

        {conDiagrama.length ? (
          <Seccion
            id="asi-seria"
            numero="03"
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
          numero="04"
          titulo="Vuestra hoja de ruta"
          entrada="Por fases, empezando por lo que antes se nota. Los plazos llevan margen: preferimos entregar antes de lo prometido."
          imprimir={imprimir}
          salto
        >
          <HojaDeRuta mapa={mapa} />
        </Seccion>

        {mapa.no_automatizar.length || mapa.validar.length ? (
          <Seccion id="criterio" numero="05" titulo="Con criterio" imprimir={imprimir}>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </span>
        </footer>
      </div>
    </div>
  );
}
