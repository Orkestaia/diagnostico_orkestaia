"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EscenarioOrkestador, FraseOrkestador, Orkestador } from "@/components/compartido/Orkestador";
import { Marca } from "@/components/compartido/Marca";
import { Partitura } from "@/components/compartido/Partitura";
import { movimientosPrevio } from "@/config/previo";
import type { Pregunta, Respuestas, SectorId, ValorRespuesta } from "@/config/tipos";
import { sugerenciasTarea } from "@/lib/calculo";
import { MAX_TEXTO_PREVIO, pasosPrevio, primeraPendiente } from "@/lib/previo";
import { bienvenida, tituloFinal, type ResumenFinal } from "@/lib/resumenPrevio";
import { useAutoguardado, type EstadoGuardado } from "./useAutoguardado";

interface Datos {
  estado: string;
  sector: SectorId;
  empresa: string | null;
  contacto_nombre: string | null;
  fecha_reunion: string | null;
  respuestas_previo: Respuestas;
}

type Fase = "bienvenida" | "preguntas" | "enviando" | "final";

export function Previo({
  token,
  datos,
  avisoFijo,
  resumenInicial,
}: {
  token: string;
  datos: Datos;
  avisoFijo: string | null;
  resumenInicial: ResumenFinal | null;
}) {
  const nombre = datos.contacto_nombre ?? "";
  const [respuestas, setRespuestas] = useState<Respuestas>(datos.respuestas_previo ?? {});
  const [fase, setFase] = useState<Fase>(resumenInicial ? "final" : "bienvenida");
  const [resumen, setResumen] = useState<ResumenFinal | null>(resumenInicial);
  const [actualId, setActualId] = useState<string | null>(null);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const { estado, guardar, vaciar, recuperarLocal } = useAutoguardado(token);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  const movimientos = useMemo(() => movimientosPrevio(datos.sector), [datos.sector]);
  const pasos = useMemo(() => pasosPrevio(datos.sector, respuestas), [datos.sector, respuestas]);
  const indice = Math.max(0, pasos.findIndex((p) => p.pregunta.id === actualId));
  const paso = pasos[indice];

  // Lo que quedó sin enviar en una visita anterior (sin conexión) se recupera y se reenvía.
  useEffect(() => {
    if (resumenInicial) return;
    const locales = recuperarLocal();
    if (Object.keys(locales).length) {
      setRespuestas((r) => ({ ...r, ...locales }));
      void vaciar();
    }
  }, [recuperarLocal, vaciar, resumenInicial]);

  // Al cambiar de pregunta, el foco va al enunciado (teclado y lectores de pantalla).
  useEffect(() => {
    if (fase === "preguntas") tituloRef.current?.focus();
  }, [actualId, fase]);

  const yaEmpezado = Object.keys(respuestas).length > 0;

  function empezar() {
    const i = primeraPendiente(datos.sector, respuestas);
    setActualId(pasos[i === -1 ? pasos.length - 1 : i]?.pregunta.id ?? null);
    setFase("preguntas");
  }

  function responder(id: string, valor: ValorRespuesta, avanzarDespues: boolean) {
    const nuevas = { ...respuestas, [id]: valor };
    setRespuestas(nuevas);
    guardar(id, valor);
    if (avanzarDespues) avanzar(nuevas, id);
  }

  function avanzar(r: Respuestas, desdeId: string) {
    const ps = pasosPrevio(datos.sector, r);
    const i = ps.findIndex((p) => p.pregunta.id === desdeId);
    if (i + 1 < ps.length) setActualId(ps[i + 1].pregunta.id);
    else void completar();
  }

  function atras() {
    if (indice === 0) setFase("bienvenida");
    else setActualId(pasos[indice - 1].pregunta.id);
  }

  async function completar() {
    setFase("enviando");
    setErrorEnvio(null);
    const ok = await vaciar();
    if (!ok) {
      setErrorEnvio("No hay conexión. Tus respuestas están a salvo: vuelve a intentarlo en un momento.");
      return;
    }
    try {
      const r = await fetch(`/api/d/${token}/completar`, { method: "POST" });
      const j = await r.json();
      if (r.status === 422 && typeof j.pendiente === "number") {
        setActualId(pasos[j.pendiente]?.pregunta.id ?? null);
        setFase("preguntas");
        return;
      }
      if (!r.ok) throw new Error();
      setResumen(j.resumen);
      setFase("final");
      window.scrollTo({ top: 0 });
    } catch {
      setErrorEnvio("No hemos podido enviarlo. Tus respuestas están a salvo: vuelve a intentarlo.");
    }
  }

  return (
    <EscenarioOrkestador>
      <Orkestador
        intensidad="fondo"
        className="fixed -right-28 bottom-0 h-[70vh] w-[52vh] md:right-[4%] md:h-[82vh] md:w-[62vh]"
      />
      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col px-4 pb-10 pt-6">
        <header className="mb-8">
          <Marca className="text-small" />
        </header>

        {fase === "bienvenida" ? (
          <section className="flex flex-1 flex-col justify-center gap-8">
            <p className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ork-cyan">
              Diagnóstico · {datos.empresa}
            </p>
            <FraseOrkestador
              texto={bienvenida(nombre, datos.fecha_reunion)}
              className="font-display text-h2 text-ork-text"
            />
            <p>Son unas 12 preguntas, casi todas de un clic. Si lo dejas a medias, este enlace guarda lo que lleves.</p>
            <div>
              <button type="button" onClick={empezar} className={BOTON_PRIMARIO}>
                {yaEmpezado ? "Seguir donde lo dejé" : "Empezar"}
              </button>
            </div>
          </section>
        ) : null}

        {fase === "preguntas" && paso ? (
          <section className="flex flex-1 flex-col">
            <Partitura
              titulo="Tu avance"
              estaciones={movimientos.map((m) => ({ id: m.numero, marca: m.numero, etiqueta: m.titulo }))}
              actual={paso.movimiento}
            />
            <FraseOrkestador
              key={paso.movimiento}
              texto={movimientos[paso.movimiento].frase}
              className="mt-8 text-body text-ork-text-muted"
            />
            <div className="mt-6 flex-1">
              <p className="cifra font-mono text-[0.75rem] uppercase tracking-[0.12em] text-ork-text-faint">
                {indice + 1} de {pasos.length}
              </p>
              <h1 ref={tituloRef} tabIndex={-1} className="mt-2 font-display text-h3 outline-none md:text-h2">
                {paso.pregunta.texto}
              </h1>
              <div className="mt-6">
                <CampoPregunta
                  key={paso.pregunta.id}
                  pregunta={paso.pregunta}
                  valor={respuestas[paso.pregunta.id]}
                  sugerencias={
                    paso.pregunta.id === "prioridad.tarea" ? sugerenciasTarea(respuestas, datos.sector) : []
                  }
                  onResponder={(v, avanzarDespues) => responder(paso.pregunta.id, v, avanzarDespues)}
                  onContinuar={() => avanzar(respuestas, paso.pregunta.id)}
                />
              </div>
            </div>
            <div className="mt-10 flex items-center justify-between gap-4">
              <button type="button" onClick={atras} className={BOTON_DISCRETO}>
                Atrás
              </button>
              <IndicadorGuardado estado={estado} />
            </div>
          </section>
        ) : null}

        {fase === "enviando" ? (
          <section className="flex flex-1 flex-col items-start justify-center gap-6">
            {errorEnvio ? (
              <>
                <p role="alert" className="text-body-lg text-ork-text">
                  {errorEnvio}
                </p>
                <button type="button" onClick={() => void completar()} className={BOTON_PRIMARIO}>
                  Intentarlo de nuevo
                </button>
              </>
            ) : (
              <p aria-live="polite" className="text-body-lg text-ork-text">
                Enviando tus respuestas…
              </p>
            )}
          </section>
        ) : null}

        {fase === "final" && resumen ? (
          <PantallaFinal nombre={nombre} fechaReunion={datos.fecha_reunion} resumen={resumen} />
        ) : null}

        {avisoFijo ? <p className="mt-10 border-t border-ork-border pt-4 text-small text-ork-text-faint">{avisoFijo}</p> : null}
      </div>
    </EscenarioOrkestador>
  );
}

const BOTON_PRIMARIO =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-ork-cyan px-6 py-3 font-medium text-ork-bg transition-colors hover:bg-ork-cyan-hi disabled:opacity-40";
const BOTON_DISCRETO =
  "inline-flex min-h-11 items-center rounded-lg px-3 text-ork-text-muted transition-colors hover:text-ork-text";

function IndicadorGuardado({ estado }: { estado: EstadoGuardado }) {
  const texto = {
    guardado: "Guardado",
    guardando: "Guardando…",
    sin_conexion: "Sin conexión: se guardará al volver",
    error: "Reintentando…",
  }[estado];
  return (
    <p aria-live="polite" className="flex items-center gap-2 text-small text-ork-text-faint">
      <span
        aria-hidden="true"
        className={
          "inline-block h-2 w-2 rounded-full " +
          (estado === "guardado" ? "bg-ork-cyan" : estado === "guardando" ? "bg-ork-text-faint" : "bg-[#e5a54d]")
        }
      />
      {texto}
    </p>
  );
}

function CampoPregunta({
  pregunta,
  valor,
  sugerencias,
  onResponder,
  onContinuar,
}: {
  pregunta: Pregunta;
  valor: ValorRespuesta | undefined;
  sugerencias: string[];
  onResponder: (v: ValorRespuesta, avanzar: boolean) => void;
  onContinuar: () => void;
}) {
  const [texto, setTexto] = useState(typeof valor === "string" ? valor : "");

  // Una opción: un clic responde y avanza.
  if (pregunta.tipo === "chips" || pregunta.tipo === "rango" || pregunta.tipo === "si_no") {
    const opciones = pregunta.tipo === "si_no" ? ["Sí", "No"] : (pregunta.opciones ?? []).map((o) => o.etiqueta);
    return (
      <div role="radiogroup" aria-label={pregunta.texto} className="grid gap-3 sm:grid-cols-2">
        {opciones.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={valor === o}
            onClick={() => onResponder(o, true)}
            className={OPCION + (valor === o ? OPCION_ELEGIDA : "")}
          >
            {o}
          </button>
        ))}
      </div>
    );
  }

  if (pregunta.tipo === "multi") {
    const elegidas = Array.isArray(valor) ? valor : [];
    const max = pregunta.maxSeleccion;
    return (
      <div>
        {max ? <p className="mb-3 text-small">Elige hasta {max}.</p> : <p className="mb-3 text-small">Puedes elegir varias.</p>}
        <div role="group" aria-label={pregunta.texto} className="grid gap-3 sm:grid-cols-2">
          {(pregunta.opciones ?? []).map((o) => {
            const marcada = elegidas.includes(o.etiqueta);
            const lleno = !!max && elegidas.length >= max && !marcada;
            return (
              <button
                key={o.etiqueta}
                type="button"
                role="checkbox"
                aria-checked={marcada}
                disabled={lleno}
                onClick={() =>
                  onResponder(marcada ? elegidas.filter((x) => x !== o.etiqueta) : [...elegidas, o.etiqueta], false)
                }
                className={OPCION + (marcada ? OPCION_ELEGIDA : "") + " disabled:opacity-40"}
              >
                {o.etiqueta}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onContinuar} disabled={elegidas.length === 0} className={BOTON_PRIMARIO + " mt-6"}>
          Continuar
        </button>
      </div>
    );
  }

  // Texto libre (y url)
  const listo = pregunta.opcional || texto.trim().length >= 2;
  return (
    <div>
      {sugerencias.length ? (
        <div className="mb-4">
          <p className="mb-2 text-small">Por ejemplo:</p>
          <div className="flex flex-wrap gap-2">
            {sugerencias.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setTexto(s);
                  onResponder(s, false);
                }}
                className="rounded-full border border-ork-border-hi px-3 py-1.5 text-small text-ork-text hover:border-ork-cyan"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      <label htmlFor="respuesta-texto" className="sr-only">
        {pregunta.texto}
      </label>
      {pregunta.tipo === "url" ? (
        <input
          id="respuesta-texto"
          type="url"
          inputMode="url"
          value={texto}
          maxLength={MAX_TEXTO_PREVIO}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => onResponder(texto.trim(), false)}
          className={CAMPO}
        />
      ) : (
        <textarea
          id="respuesta-texto"
          rows={3}
          value={texto}
          maxLength={MAX_TEXTO_PREVIO}
          onChange={(e) => setTexto(e.target.value)}
          onBlur={() => onResponder(texto.trim(), false)}
          className={CAMPO + " resize-none"}
        />
      )}
      <p className="cifra mt-1 text-right text-small text-ork-text-faint">
        {texto.length}/{MAX_TEXTO_PREVIO}
      </p>
      <button
        type="button"
        disabled={!listo}
        onClick={() => {
          onResponder(texto.trim(), false);
          onContinuar();
        }}
        className={BOTON_PRIMARIO + " mt-4"}
      >
        Continuar
      </button>
    </div>
  );
}

const OPCION =
  "min-h-14 rounded-xl border border-ork-border-hi bg-ork-surface-1/80 px-4 py-3 text-left text-ork-text transition-colors hover:border-ork-cyan";
const OPCION_ELEGIDA = " border-ork-cyan-hi bg-ork-surface-2 ork-estacion--actual";
const CAMPO =
  "w-full rounded-xl border border-ork-border-hi bg-ork-bg px-4 py-3 text-ork-text placeholder:text-ork-text-faint focus:border-ork-cyan focus:outline-none";

/** Pantalla final (spec §3): gracias + lo entendido + temas sin cifras. Sin quick wins ni navegación. */
function PantallaFinal({
  nombre,
  fechaReunion,
  resumen,
}: {
  nombre: string;
  fechaReunion: string | null;
  resumen: ResumenFinal;
}) {
  return (
    <section className="flex flex-1 flex-col gap-10">
      <FraseOrkestador texto={tituloFinal(nombre, fechaReunion)} className="font-display text-h2 text-ork-text" />
      {resumen.entendido.length ? (
        <div>
          <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-ork-cyan">Lo que he entendido</h2>
          <ul className="mt-4 space-y-3">
            {resumen.entendido.map((f) => (
              <li key={f} className="flex gap-3 text-ork-text">
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ork-cyan" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {resumen.temas.length ? (
        <div>
          <h2 className="font-mono text-[0.75rem] uppercase tracking-[0.14em] text-[#b58cf0]">
            Lo que revisaremos juntos
          </h2>
          <ul className="mt-4 space-y-3">
            {resumen.temas.map((t) => (
              <li key={t} className="flex gap-3 text-ork-text">
                <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ork-violet" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
