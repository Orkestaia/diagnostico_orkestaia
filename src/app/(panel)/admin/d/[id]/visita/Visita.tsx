"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Marca } from "@/components/compartido/Marca";
import { Orkestador } from "@/components/compartido/Orkestador";
import {
  BLOQUES,
  CAMPOS_VISITA,
  MINUTOS_VISITA,
  REGLAS_VISITA,
  type BloqueId,
  type CampoVisita,
} from "@/config/consultor/bloques";
import { EXTRAS_BLOQUE_A } from "@/config/consultor/plantillas";
import type { TarjetaProceso } from "@/config/consultor/tarjeta";
import type { Respuestas, SectorId, TipoPregunta, ValorRespuesta } from "@/config/tipos";
import { redondearHoras } from "@/lib/calculo";
import {
  claveExtra,
  ID_NOTAS,
  sumarDiasHabiles,
  type ParcheVisita,
  type RespuestasVisita,
} from "@/lib/visita";
import { BOTON, BOTON_PRIMARIO, CAMPO, Chips, Etiqueta, Numero, Seccion, Texto } from "./campos";
import { BotonCandado, SoloPrivado, usePrivada, VistaPrivada } from "./privada";
import { BotonGrabar, EstadoTranscripcion, Grabacion, useGrabacion } from "./grabacion";
import { BloqueProcesos, horasHoy } from "./Tarjetas";
import { useGuardado, type EstadoGuardado } from "./useGuardado";

export interface Contado {
  id: string;
  texto: string;
  tipo: TipoPregunta;
  valor: ValorRespuesta;
  opciones: string[];
  max: number | null;
  cual: Record<string, string>;
}

export interface DatosVisita {
  id: string;
  estado: string;
  sector: SectorId;
  empresa: string;
  contacto: string | null;
  fechaReunion: string | null;
  visitaCerradaAt: string | null;
  respuestasVisita: RespuestasVisita;
  procesos: TarjetaProceso[];
  sugeridas: TarjetaProceso[];
  entendido: string[];
  contado: Contado[];
}

const EDITABLE = ["invitado", "previo_en_curso", "previo_completado", "visita_en_curso"];
const hoyISO = () => new Date().toISOString().slice(0, 10);

function fechaLarga(iso: string) {
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(a, m - 1, d)));
}

export function Visita({ datos }: { datos: DatosVisita }) {
  const [campos, setCampos] = useState<Record<string, unknown>>(
    datos.respuestasVisita.campos ?? {},
  );
  const [correcciones, setCorrecciones] = useState<Respuestas>(
    datos.respuestasVisita.correcciones_previo ?? {},
  );
  const [procesos, setProcesos] = useState<TarjetaProceso[]>(datos.procesos);
  const [inicio, setInicio] = useState<string | null>(datos.respuestasVisita.inicio_at ?? null);
  const [cerrada, setCerrada] = useState(!EDITABLE.includes(datos.estado));

  // Lo que quedó en la cola de este dispositivo manda sobre lo que trae el servidor.
  const recuperar = useCallback((p: ParcheVisita) => {
    if (p.campos) setCampos((c) => ({ ...c, ...p.campos }));
    if (p.correcciones_previo) setCorrecciones((c) => ({ ...c, ...p.correcciones_previo }));
    if (p.procesos) setProcesos(p.procesos);
  }, []);
  const { estado, encolar, vaciar } = useGuardado(datos.id, recuperar);

  // La visita empieza al abrir esta pantalla por primera vez (base del temporizador).
  useEffect(() => {
    if (inicio || cerrada) return;
    const ahora = new Date().toISOString();
    setInicio(ahora);
    encolar({ inicio_at: ahora });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ponerCampo = (id: string, v: unknown) => {
    setCampos((c) => ({ ...c, [id]: v }));
    encolar({ campos: { [id]: v } });
  };
  const ponerCorreccion = (id: string, v: ValorRespuesta) => {
    setCorrecciones((c) => ({ ...c, [id]: v }));
    encolar({ correcciones_previo: { [id]: v } });
  };
  const ponerProcesos = (t: TarjetaProceso[]) => {
    setProcesos(t);
    encolar({ procesos: t });
  };

  const entrega = (campos["e.entrega"] as string | undefined) || sumarDiasHabiles(hoyISO());

  if (cerrada) {
    return (
      <Grabacion id={datos.id}>
        <Cierre datos={datos} procesos={procesos} entrega={entrega} />
      </Grabacion>
    );
  }

  return (
    <Grabacion id={datos.id}>
      <VistaPrivada id={datos.id} encolar={encolar}>
        <Pantalla
          datos={datos}
          estado={estado}
          inicio={inicio}
          campos={campos}
          ponerCampo={ponerCampo}
          correcciones={correcciones}
          ponerCorreccion={ponerCorreccion}
          procesos={procesos}
          ponerProcesos={ponerProcesos}
          entrega={entrega}
          vaciar={vaciar}
          onCerrada={(p) => {
            setProcesos(p);
            setCerrada(true);
          }}
        />
      </VistaPrivada>
    </Grabacion>
  );
}

function Pantalla({
  datos,
  estado,
  inicio,
  campos,
  ponerCampo,
  correcciones,
  ponerCorreccion,
  procesos,
  ponerProcesos,
  entrega,
  vaciar,
  onCerrada,
}: {
  datos: DatosVisita;
  estado: EstadoGuardado;
  inicio: string | null;
  campos: Record<string, unknown>;
  ponerCampo: (id: string, v: unknown) => void;
  correcciones: Respuestas;
  ponerCorreccion: (id: string, v: ValorRespuesta) => void;
  procesos: TarjetaProceso[];
  ponerProcesos: (t: TarjetaProceso[]) => void;
  entrega: string;
  vaciar: () => Promise<boolean>;
  onCerrada: (p: TarjetaProceso[]) => void;
}) {
  const [bloque, setBloque] = useState<BloqueId>("A");
  const [notas, setNotas] = useState(false);
  const actual = BLOQUES.find((b) => b.id === bloque)!;
  const ir = (b: BloqueId) => {
    setBloque(b);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="relative min-h-dvh">
      <Orkestador
        intensidad="tenue"
        className="pointer-events-none fixed -right-28 bottom-0 h-[55vh] opacity-60 md:right-[2%]"
      />
      <header className="sticky top-0 z-40 border-b border-ork-border bg-ork-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 flex-col leading-tight">
            <Marca className="text-body-lg" />
            <span className="truncate text-small text-ork-text-muted">{datos.empresa}</span>
          </div>
          <div className="flex items-center gap-3">
            <Temporizador inicio={inicio} onCierre={() => ir("E")} />
            <IndicadorGuardado estado={estado} />
            <BotonGrabar />
            <button
              type="button"
              aria-expanded={notas}
              onClick={() => setNotas((n) => !n)}
              className={
                "flex h-10 items-center rounded-full border px-3 text-small transition-colors " +
                (notas
                  ? "border-ork-violet text-ork-text"
                  : "border-ork-border-hi text-ork-text-muted hover:text-ork-text")
              }
            >
              Notas
            </button>
            <BotonCandado />
          </div>
        </div>
        <nav
          aria-label="Bloques de la visita"
          className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 pb-2"
        >
          {BLOQUES.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-current={b.id === bloque ? "step" : undefined}
              onClick={() => ir(b.id)}
              className={
                "shrink-0 rounded-full px-4 py-2 text-small transition-colors " +
                (b.id === bloque
                  ? "bg-ork-cyan/15 text-ork-text ring-1 ring-ork-cyan"
                  : "text-ork-text-muted hover:text-ork-text")
              }
            >
              <span className="font-mono text-ork-cyan">{b.id}</span> {b.nombre}
            </button>
          ))}
        </nav>
      </header>

      <main className="relative mx-auto max-w-5xl space-y-6 px-4 pb-24 pt-8">
        <div>
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
            Bloque {actual.id} · {actual.nombre}
          </p>
          <p className="mt-2 max-w-3xl font-display text-h3 text-ork-text">{actual.frase}</p>
        </div>

        {notas ? <PanelNotas onCerrar={() => setNotas(false)} /> : null}

        <SoloPrivado>
          <EstadoTranscripcion />
          <p className="mt-2 text-small text-ork-text-muted">
            Unos {actual.minutos} min. Recuerda: {REGLAS_VISITA.join(" · ").replace(/`/g, "")}.
          </p>
          <Preparacion />
        </SoloPrivado>

        {bloque === "A" ? (
          <>
            <LoQueNosContaste
              datos={datos}
              correcciones={correcciones}
              ponerCorreccion={ponerCorreccion}
            />
            <Seccion titulo="Contexto">
              <CamposBloque
                bloque="A"
                sector={datos.sector}
                campos={campos}
                ponerCampo={ponerCampo}
                procesos={procesos}
                ponerProcesos={ponerProcesos}
              />
            </Seccion>
          </>
        ) : null}
        {bloque === "B" ? (
          <BloqueProcesos
            sector={datos.sector}
            tarjetas={procesos}
            sugeridas={datos.sugeridas}
            onCambio={ponerProcesos}
          />
        ) : null}
        {bloque === "C" || bloque === "D" ? (
          <Seccion titulo={actual.nombre}>
            <CamposBloque
              bloque={bloque}
              sector={datos.sector}
              campos={campos}
              ponerCampo={ponerCampo}
              procesos={procesos}
              ponerProcesos={ponerProcesos}
            />
          </Seccion>
        ) : null}
        {bloque === "E" ? (
          <>
            <Seccion titulo="Cierre">
              <CamposBloque
                bloque="E"
                sector={datos.sector}
                campos={campos}
                ponerCampo={ponerCampo}
                procesos={procesos}
                ponerProcesos={ponerProcesos}
                entrega={entrega}
              />
            </Seccion>
            <CerrarVisita
              id={datos.id}
              vaciar={vaciar}
              onCerrada={onCerrada}
              irACostes={() => ir("C")}
            />
          </>
        ) : null}

        <div className="flex justify-between gap-3 pt-2">
          {actual.id !== "A" ? (
            <button
              type="button"
              className={BOTON}
              onClick={() => ir(BLOQUES[BLOQUES.indexOf(actual) - 1].id)}
            >
              Anterior
            </button>
          ) : (
            <Link href="/admin" className={BOTON}>
              Panel
            </Link>
          )}
          {actual.id !== "E" ? (
            <button
              type="button"
              className={BOTON_PRIMARIO}
              onClick={() => ir(BLOQUES[BLOQUES.indexOf(actual) + 1].id)}
            >
              Siguiente: {BLOQUES[BLOQUES.indexOf(actual) + 1].nombre}
            </button>
          ) : null}
        </div>
      </main>
    </div>
  );
}

// ── Cabecera ──

function Temporizador({ inicio, onCierre }: { inicio: string | null; onCierre: () => void }) {
  const [ahora, setAhora] = useState(() => Date.now());
  const [descartado, setDescartado] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);
  if (!inicio) return null;
  const min = Math.max(0, Math.floor((ahora - Date.parse(inicio)) / 60000));
  const pasado = min >= MINUTOS_VISITA;
  return (
    <>
      <span
        title={`Tiempo de visita (sobre ${MINUTOS_VISITA} min)`}
        className={
          "cifra rounded-full border px-3 py-1.5 text-small " +
          (pasado ? "border-[#f5a623] text-[#f5c46b]" : "border-ork-border text-ork-text-muted")
        }
      >
        {Math.floor(min / 60)}:{String(min % 60).padStart(2, "0")} /{" "}
        {Math.floor(MINUTOS_VISITA / 60)}:{String(MINUTOS_VISITA % 60).padStart(2, "0")}
      </span>
      {pasado && !descartado ? (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#f5a623]/70 bg-ork-surface-1 px-5 py-4 shadow-xl"
        >
          <p className="text-ork-text">Llevamos {min} minutos. Toca cerrar.</p>
          <div className="flex gap-2">
            <button type="button" className={BOTON} onClick={() => setDescartado(true)}>
              Seguir
            </button>
            <button
              type="button"
              className={BOTON_PRIMARIO}
              onClick={() => {
                setDescartado(true);
                onCierre();
              }}
            >
              Ir al cierre
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

const ESTADO_TEXTO: Record<EstadoGuardado, { texto: string; color: string }> = {
  guardado: { texto: "Guardado", color: "bg-ork-cyan" },
  guardando: { texto: "Guardando", color: "bg-ork-text-muted animate-pulse" },
  sin_conexion: { texto: "Sin conexión · guardado aquí", color: "bg-[#f5a623]" },
  error: { texto: "Reintentando", color: "bg-[#e5484d]" },
};

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  const e = ESTADO_TEXTO[estado];
  return (
    <span role="status" className="flex items-center gap-2 text-small text-ork-text-muted">
      <span aria-hidden="true" className={"h-2 w-2 rounded-full " + e.color} />
      <span className="hidden sm:inline">{e.texto}</span>
    </span>
  );
}

/** Preparación del motor (hipótesis, preguntas, alertas): solo en la vista privada. */
function Preparacion() {
  const { interno } = usePrivada();
  if (!interno) return null;
  const bloques: [string, string[]][] = [
    ["Hipótesis", (interno.hipotesis ?? []).map((h) => h.hipotesis)],
    ["Preguntas para hoy", interno.preguntas_visita ?? []],
    ["Alertas", interno.alertas ?? []],
  ];
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-small text-ork-text">Preparación del motor</summary>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        {bloques.map(([t, xs]) =>
          xs.length ? (
            <div key={t}>
              <p className="mb-1 text-small text-ork-text">{t}</p>
              <ul className="list-disc space-y-1 pl-4 text-small">
                {xs.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </div>
    </details>
  );
}

/**
 * Notas libres de Aitor (🔒). El panel se abre siempre, pero solo se puede leer y escribir con
 * la vista privada activa: en la vista cliente las notas no están en la página.
 */
function PanelNotas({ onCerrar }: { onCerrar: () => void }) {
  const privada = usePrivada();
  return (
    <section
      aria-label="Notas"
      className="rounded-2xl border border-ork-violet/60 bg-ork-surface-1/95 p-5"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-body-lg text-ork-text">Notas de la reunión</h2>
        <button
          type="button"
          onClick={onCerrar}
          className="text-small text-ork-text-muted hover:text-ork-text"
        >
          Cerrar
        </button>
      </div>
      {privada.activa ? (
        <Texto
          etiqueta="Solo para ti. Van al export de JARVIS."
          valor={String(privada.campo(ID_NOTAS) ?? "")}
          filas={10}
          max={20000}
          onGuardar={(v) => privada.ponerCampo(ID_NOTAS, v)}
        />
      ) : (
        <p className="text-small">
          Mantén pulsado el candado 1 segundo para ver y escribir tus notas.
        </p>
      )}
    </section>
  );
}

// ── Bloque A · Lo que nos contaste ──

function LoQueNosContaste({
  datos,
  correcciones,
  ponerCorreccion,
}: {
  datos: DatosVisita;
  correcciones: Respuestas;
  ponerCorreccion: (id: string, v: ValorRespuesta) => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  if (!datos.contado.length) {
    return (
      <Seccion titulo="Lo que nos contaste">
        <p>No llegó a rellenar el previo. Empezamos desde cero.</p>
      </Seccion>
    );
  }
  const mostrar = (c: Contado) => {
    const v = c.id in correcciones ? correcciones[c.id] : c.valor;
    const base = Array.isArray(v) ? v.join(", ") : String(v ?? "");
    const cuales = Object.entries(c.cual).filter(([, x]) => x);
    return cuales.length ? `${base} (${cuales.map(([e, x]) => `${e}: ${x}`).join("; ")})` : base;
  };
  return (
    <Seccion titulo="Lo que nos contaste">
      {datos.entendido.length ? (
        <ul className="space-y-1.5 text-ork-text">
          {datos.entendido.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      ) : null}
      <details>
        <summary className="cursor-pointer text-small text-ork-text-muted hover:text-ork-text">
          Respuesta a respuesta ({datos.contado.length})
        </summary>
        <ul className="mt-3 divide-y divide-ork-border">
          {datos.contado.map((c) => (
            <li key={c.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-small">{c.texto}</p>
                  <p className="text-ork-text">
                    {mostrar(c)}
                    {c.id in correcciones ? (
                      <span className="ml-2 text-small text-ork-cyan">corregido</span>
                    ) : null}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-small text-ork-text-muted hover:text-ork-text"
                  onClick={() => setEditando(editando === c.id ? null : c.id)}
                >
                  {editando === c.id ? "Listo" : "Corregir"}
                </button>
              </div>
              {editando === c.id ? (
                <div className="mt-3">
                  {c.tipo === "texto" || c.tipo === "url" || !c.opciones.length ? (
                    <Texto
                      etiqueta="Corrección"
                      valor={String(correcciones[c.id] ?? c.valor ?? "")}
                      filas={1}
                      onGuardar={(v) => ponerCorreccion(c.id, v)}
                    />
                  ) : (
                    <Chips
                      opciones={c.opciones}
                      multi={c.tipo === "multi"}
                      max={c.max ?? undefined}
                      valor={
                        (c.id in correcciones ? correcciones[c.id] : c.valor) as string | string[]
                      }
                      onCambio={(v) => ponerCorreccion(c.id, v)}
                    />
                  )}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </details>
    </Seccion>
  );
}

// ── Campos de la batería por bloque ──

function CamposBloque({
  bloque,
  sector,
  campos,
  ponerCampo,
  procesos,
  ponerProcesos,
  entrega,
}: {
  bloque: BloqueId;
  sector: SectorId;
  campos: Record<string, unknown>;
  ponerCampo: (id: string, v: unknown) => void;
  procesos: TarjetaProceso[];
  ponerProcesos: (t: TarjetaProceso[]) => void;
  entrega?: string;
}) {
  const privada = usePrivada();
  const extras = bloque === "A" ? EXTRAS_BLOQUE_A[sector] : [];
  return (
    <>
      {CAMPOS_VISITA.filter((c) => c.bloque === bloque).map((c) =>
        c.privado ? (
          <SoloPrivado key={c.id}>
            <Campo
              c={c}
              valor={privada.campo(c.id)}
              poner={(v) => privada.ponerCampo(c.id, v)}
              procesos={procesos}
              ponerProcesos={ponerProcesos}
            />
          </SoloPrivado>
        ) : (
          <Campo
            key={c.id}
            c={c}
            valor={c.id === "e.entrega" ? (campos[c.id] ?? entrega) : campos[c.id]}
            poner={(v) => ponerCampo(c.id, v)}
            procesos={procesos}
            ponerProcesos={ponerProcesos}
          />
        ),
      )}
      {extras.map((e) =>
        e.privado ? (
          <SoloPrivado key={e.texto}>
            <Texto
              etiqueta={e.texto}
              valor={String(privada.campo(claveExtra(e.texto)) ?? "")}
              filas={2}
              onGuardar={(v) => privada.ponerCampo(claveExtra(e.texto), v)}
            />
          </SoloPrivado>
        ) : (
          <Texto
            key={e.texto}
            etiqueta={e.texto}
            valor={String(campos[claveExtra(e.texto)] ?? "")}
            filas={2}
            onGuardar={(v) => ponerCampo(claveExtra(e.texto), v)}
          />
        ),
      )}
    </>
  );
}

type Fila = Record<string, string | number | null>;

function Campo({
  c,
  valor,
  poner,
  procesos,
  ponerProcesos,
}: {
  c: CampoVisita;
  valor: unknown;
  poner: (v: unknown) => void;
  procesos: TarjetaProceso[];
  ponerProcesos: (t: TarjetaProceso[]) => void;
}) {
  const etiqueta = c.texto + (c.opcional ? " (opcional)" : "");
  switch (c.tipo) {
    case "texto":
      return <Texto etiqueta={etiqueta} valor={String(valor ?? "")} onGuardar={poner} />;
    case "numero":
      return (
        <Numero
          etiqueta={etiqueta}
          valor={typeof valor === "number" ? valor : null}
          placeholder="aprox."
          onGuardar={poner}
        />
      );
    case "chips":
    case "multi":
      return (
        <Chips
          etiqueta={etiqueta}
          opciones={c.opciones ?? []}
          multi={c.tipo === "multi"}
          valor={valor as string | string[]}
          onCambio={poner}
        />
      );
    case "si_no":
    case "si_no_nose":
      return (
        <Chips
          etiqueta={etiqueta}
          opciones={c.tipo === "si_no" ? ["Sí", "No"] : ["Sí", "No", "No lo sé"]}
          valor={valor as string}
          onCambio={poner}
        />
      );
    case "fecha":
      return (
        <div>
          <Etiqueta htmlFor={c.id}>{etiqueta}</Etiqueta>
          <input
            id={c.id}
            type="date"
            value={String(valor ?? "")}
            onChange={(e) => e.target.value && poner(e.target.value)}
            className={CAMPO + " max-w-56"}
          />
          {typeof valor === "string" && valor ? (
            <p className="mt-1 text-small">{fechaLarga(valor)}</p>
          ) : null}
        </div>
      );
    case "texto_si_no": {
      const v = (valor ?? {}) as { texto?: string; aqui?: string };
      return (
        <div className="space-y-3">
          <Texto
            etiqueta={etiqueta}
            valor={v.texto ?? ""}
            filas={1}
            onGuardar={(t) => poner({ ...v, texto: t })}
          />
          <Chips
            etiqueta="¿Está hoy aquí?"
            opciones={["Sí", "No"]}
            valor={v.aqui}
            onCambio={(x) => poner({ ...v, aqui: x })}
          />
        </div>
      );
    }
    case "lista_equipo":
      return (
        <ListaFilas
          etiqueta={etiqueta}
          filas={(valor as Fila[]) ?? []}
          nueva={{ rol: "", numero: null }}
          columnas={[
            { id: "rol", nombre: "Rol", tipo: "texto" },
            { id: "numero", nombre: "Personas", tipo: "numero" },
          ]}
          poner={poner}
        />
      );
    case "lista_herramientas":
      return (
        <ListaFilas
          etiqueta="Inventario de herramientas"
          ayuda={c.texto}
          filas={(valor as Fila[]) ?? []}
          nueva={{ nombre: "", para: "", quien: "", conecta: null, coste: null, claves: "" }}
          columnas={[
            { id: "nombre", nombre: "Herramienta", tipo: "texto" },
            { id: "para", nombre: "Para qué", tipo: "texto" },
            { id: "quien", nombre: "Quién la usa", tipo: "texto" },
            {
              id: "conecta",
              nombre: "¿Se conecta?",
              tipo: "opciones",
              opciones: ["Sí", "No", "No sé"],
            },
            { id: "coste", nombre: "€/mes aprox.", tipo: "numero" },
            { id: "claves", nombre: "Quién tiene las claves", tipo: "texto" },
          ]}
          poner={poner}
        />
      );
    case "costes_perfil":
      return <CostesPerfil valor={valor} poner={poner} />;
    case "elegir_tarjetas":
      return (
        <ElegirPrioridades
          etiqueta={etiqueta}
          procesos={procesos}
          ponerProcesos={ponerProcesos}
          poner={poner}
          max={c.max ?? 3}
        />
      );
    case "senales": {
      const v = (valor ?? {}) as {
        decisor?: string;
        urgencia?: string;
        encaje?: string;
        riesgo?: string;
      };
      const escala = ["1", "2", "3", "4", "5"];
      return (
        <div className="space-y-4">
          <p className="text-small text-ork-text">Señales</p>
          <Chips
            etiqueta="Decisor presente"
            opciones={["Sí", "No"]}
            valor={v.decisor}
            onCambio={(x) => poner({ ...v, decisor: x })}
          />
          <Chips
            etiqueta="Urgencia real"
            opciones={escala}
            valor={v.urgencia}
            onCambio={(x) => poner({ ...v, urgencia: x })}
          />
          <Chips
            etiqueta="Encaje"
            opciones={escala}
            valor={v.encaje}
            onCambio={(x) => poner({ ...v, encaje: x })}
          />
          <Texto
            etiqueta="Riesgo principal"
            valor={v.riesgo ?? ""}
            filas={1}
            onGuardar={(x) => poner({ ...v, riesgo: x })}
          />
        </div>
      );
    }
  }
}

interface Columna {
  id: string;
  nombre: string;
  tipo: "texto" | "numero" | "opciones";
  opciones?: string[];
}

/** Lista editable (equipo, inventario). Se guarda al salir de la lista o al quitar/añadir filas. */
function ListaFilas({
  etiqueta,
  ayuda,
  filas: iniciales,
  nueva,
  columnas,
  poner,
}: {
  etiqueta: string;
  ayuda?: string;
  filas: Fila[];
  nueva: Fila;
  columnas: Columna[];
  poner: (v: Fila[]) => void;
}) {
  const [filas, setFilas] = useState<Fila[]>(iniciales);
  const cambiar = (i: number, k: string, v: string | number | null) =>
    setFilas((f) => f.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const guardar = (f = filas) => poner(f);
  return (
    <div
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) guardar();
      }}
    >
      <p className="mb-1 text-small text-ork-text">{etiqueta}</p>
      {ayuda ? <p className="mb-2 text-small text-ork-text-faint">{ayuda}</p> : null}
      <div className="space-y-3">
        {filas.map((f, i) => (
          <div
            key={i}
            className="grid gap-2 rounded-xl border border-ork-border p-3 sm:grid-cols-[repeat(auto-fit,minmax(9rem,1fr))_auto]"
          >
            {columnas.map((col) =>
              col.tipo === "opciones" ? (
                <select
                  key={col.id}
                  aria-label={col.nombre}
                  value={String(f[col.id] ?? "")}
                  onChange={(e) => cambiar(i, col.id, e.target.value || null)}
                  className={CAMPO}
                >
                  <option value="">{col.nombre}</option>
                  {col.opciones!.map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input
                  key={col.id}
                  aria-label={col.nombre}
                  placeholder={col.nombre}
                  inputMode={col.tipo === "numero" ? "decimal" : undefined}
                  maxLength={200}
                  value={
                    f[col.id] === null || f[col.id] === undefined
                      ? ""
                      : String(f[col.id]).replace(".", col.tipo === "numero" ? "," : ".")
                  }
                  onChange={(e) => {
                    const t = e.target.value;
                    if (col.tipo !== "numero") return cambiar(i, col.id, t);
                    const n = Number(t.replace(",", "."));
                    cambiar(
                      i,
                      col.id,
                      t.trim() === ""
                        ? null
                        : Number.isFinite(n) && n >= 0
                          ? n
                          : (f[col.id] as number | null),
                    );
                  }}
                  className={CAMPO + (col.tipo === "numero" ? " cifra" : "")}
                />
              ),
            )}
            <button
              type="button"
              aria-label="Quitar fila"
              onClick={() => {
                const f2 = filas.filter((_, j) => j !== i);
                setFilas(f2);
                guardar(f2);
              }}
              className="px-2 text-ork-text-faint hover:text-ork-text"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={BOTON + " mt-2"}
        onClick={() => {
          const f2 = [...filas, { ...nueva }];
          setFilas(f2);
          guardar(f2);
        }}
      >
        + Añadir
      </button>
    </div>
  );
}

/** Bloque C 🔒: coste por hora (JARVIS: se pregunta siempre y se guarda su origen). */
function CostesPerfil({ valor, poner }: { valor: unknown; poner: (v: unknown) => void }) {
  const v = (valor ?? {}) as {
    operativo?: number;
    tactico?: number;
    directivo?: number;
    origen?: "cliente" | "orientativo";
  };
  const perfiles = [
    ["operativo", "Operativo", 14],
    ["tactico", "Mando intermedio", 25],
    ["directivo", "Dirección", 40],
  ] as const;
  return (
    <div className="space-y-4">
      <p className="text-small text-ork-text">Coste por hora de cada perfil. Pregúntalo siempre.</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={v.origen === "cliente"}
          className={BOTON + (v.origen === "cliente" ? " border-ork-cyan text-ork-text" : "")}
          onClick={() => poner({ ...v, origen: "cliente" })}
        >
          Me da su coste real
        </button>
        <button
          type="button"
          aria-pressed={v.origen === "orientativo"}
          className={BOTON + (v.origen === "orientativo" ? " border-ork-cyan text-ork-text" : "")}
          onClick={() =>
            poner({ operativo: 14, tactico: 25, directivo: 40, origen: "orientativo" })
          }
        >
          No lo sabe: orientativo 14 / 25 / 40 €
        </button>
      </div>
      {v.origen ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {perfiles.map(([k, nombre, defecto]) => (
            <Numero
              key={k}
              etiqueta={nombre}
              sufijo="€/h"
              placeholder={String(defecto)}
              valor={v[k] ?? null}
              onGuardar={(n) =>
                poner({
                  ...v,
                  [k]: n,
                  origen: v.origen === "orientativo" && n !== defecto ? "cliente" : v.origen,
                })
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-small text-[#f5c46b]">Sin esto no se puede cerrar la visita.</p>
      )}
    </div>
  );
}

/** Bloque E: el cliente elige sus 3 prioridades entre las tarjetas (queda en la tarjeta y en el campo). */
function ElegirPrioridades({
  etiqueta,
  procesos,
  ponerProcesos,
  poner,
  max,
}: {
  etiqueta: string;
  procesos: TarjetaProceso[];
  ponerProcesos: (t: TarjetaProceso[]) => void;
  poner: (v: unknown) => void;
  max: number;
}) {
  const orden = procesos
    .filter((t) => t.prioridadCliente)
    .sort((a, b) => a.prioridadCliente! - b.prioridadCliente!);
  const alternar = (id: string) => {
    let ids = orden.map((t) => t.id);
    ids = ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < max ? [...ids, id] : ids;
    const nuevas = procesos.map((t) => ({
      ...t,
      prioridadCliente: ids.includes(t.id) ? ((ids.indexOf(t.id) + 1) as 1 | 2 | 3) : null,
    }));
    ponerProcesos(nuevas);
    poner(ids);
  };
  if (!procesos.length)
    return <p className="text-small">{etiqueta} Primero hacen falta tarjetas (bloque B).</p>;
  return (
    <div>
      <p className="mb-2 text-small text-ork-text">{etiqueta}</p>
      <ul className="space-y-2">
        {procesos.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              aria-pressed={!!t.prioridadCliente}
              onClick={() => alternar(t.id)}
              className={
                "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors " +
                (t.prioridadCliente
                  ? "border-ork-cyan bg-ork-cyan/10 text-ork-text"
                  : "border-ork-border text-ork-text-muted hover:text-ork-text")
              }
            >
              <span className="cifra flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-current font-display">
                {t.prioridadCliente ?? ""}
              </span>
              {t.nombre || "Proceso sin nombre"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Cierre ──

function CerrarVisita({
  id,
  vaciar,
  onCerrada,
  irACostes,
}: {
  id: string;
  vaciar: () => Promise<boolean>;
  onCerrada: (p: TarjetaProceso[]) => void;
  irACostes: () => void;
}) {
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<"coste" | "red" | "grabando" | null>(null);
  const grabacion = useGrabacion();
  const cerrar = async () => {
    if (grabacion.estado === "grabando") return setError("grabando");
    setEnviando(true);
    setError(null);
    try {
      if (!(await vaciar())) throw new Error();
      const r = await fetch(`/api/admin/diagnosticos/${id}/cerrar-visita`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (r.status === 422 && j.falta === "coste") return setError("coste");
      if (!r.ok && r.status !== 409) throw new Error();
      onCerrada(j.procesos ?? []);
      window.scrollTo({ top: 0 });
    } catch {
      setError("red");
    } finally {
      setEnviando(false);
      setConfirmar(false);
    }
  };
  return (
    <section className="rounded-2xl border border-ork-border bg-ork-surface-1/85 p-5">
      {confirmar ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-ork-text">
            Al cerrar ya no se puede editar y se avisa para preparar el mapa.
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              className={BOTON}
              onClick={() => setConfirmar(false)}
              disabled={enviando}
            >
              Volver
            </button>
            <button type="button" className={BOTON_PRIMARIO} onClick={cerrar} disabled={enviando}>
              {enviando ? "Cerrando…" : "Cerrar la visita"}
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className={BOTON_PRIMARIO} onClick={() => setConfirmar(true)}>
          Terminar la visita
        </button>
      )}
      {error === "coste" ? (
        <p role="alert" className="mt-3 text-small text-[#f5c46b]">
          Falta el coste por hora (vista privada, bloque C).{" "}
          <button type="button" className="underline" onClick={irACostes}>
            Ir al bloque C
          </button>
        </p>
      ) : null}
      {error === "grabando" ? (
        <p role="alert" className="mt-3 text-small text-[#f5c46b]">
          Para la grabación antes de cerrar (botón «Grabando» de arriba).
        </p>
      ) : null}
      {error === "red" ? (
        <p role="alert" className="mt-3 text-small text-[#ff8a8e]">
          No se ha podido cerrar: hay cambios sin enviar o no hay conexión. Lo tienes todo guardado
          en este dispositivo; vuelve a intentarlo.
        </p>
      ) : null}
    </section>
  );
}

/** Pantalla final delante del cliente (spec §4): solo horas de hoy, nunca ahorros ni euros. */
function Cierre({
  datos,
  procesos,
  entrega,
}: {
  datos: DatosVisita;
  procesos: TarjetaProceso[];
  entrega: string;
}) {
  const conHoras = useMemo(
    () =>
      procesos
        .map((t) => ({ t, h: t.hoyRegistro?.horasMes ?? horasHoy(t, datos.sector) }))
        .sort((a, b) => (b.h ?? -1) - (a.h ?? -1)),
    [procesos, datos.sector],
  );
  const prioridades = procesos
    .filter((t) => t.prioridadCliente)
    .sort((a, b) => a.prioridadCliente! - b.prioridadCliente!);
  return (
    <div className="relative min-h-dvh">
      <Orkestador
        intensidad="tenue"
        className="pointer-events-none fixed -right-28 bottom-0 h-[60vh] opacity-70 md:right-[4%]"
      />
      <main className="relative mx-auto max-w-3xl space-y-10 px-4 py-12">
        <div>
          <Marca className="text-body-lg" />
          <p className="mt-1 text-small text-ork-text-muted">{datos.empresa}</p>
        </div>
        <h1 className="font-display text-h2 text-ork-text">Esto es lo que nos llevamos</h1>

        <section>
          <h2 className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
            Lo que os ocupa hoy
          </h2>
          <ul className="divide-y divide-ork-border rounded-2xl border border-ork-border bg-ork-surface-1/85">
            {conHoras.map(({ t, h }) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <span className="text-ork-text">{t.nombre || "Proceso sin nombre"}</span>
                <span className="cifra shrink-0 font-display text-body-lg text-ork-cyan-hi">
                  {h === null ? "—" : `~${String(redondearHoras(h)).replace(".", ",")} h al mes`}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {prioridades.length ? (
          <section>
            <h2 className="mb-3 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-ork-cyan">
              Lo primero que quieres resolver
            </h2>
            <ol className="space-y-2">
              {prioridades.map((t) => (
                <li key={t.id} className="flex items-center gap-3 text-body-lg text-ork-text">
                  <span className="cifra flex h-8 w-8 items-center justify-center rounded-full border border-ork-cyan font-display text-ork-cyan">
                    {t.prioridadCliente}
                  </span>
                  {t.nombre}
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <p className="font-display text-h3 text-ork-text">
          Tu mapa llegará el <span className="text-ork-cyan-hi">{fechaLarga(entrega)}</span>.
        </p>

        <Link
          href="/admin"
          className="inline-block text-small text-ork-text-faint hover:text-ork-text"
        >
          Volver al panel
        </Link>
      </main>
    </div>
  );
}
