"use client";

import { useEffect, useState } from "react";
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

/** Regalo de 10 minutos (spec §7, mapa_v1.2): se copia o se descarga como .txt. Sin PDF. */
export function Regalo({ titulo, contenido }: { titulo: string; contenido: string }) {
  const [copiado, setCopiado] = useState<"si" | "error" | null>(null);
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(contenido);
      setCopiado("si");
    } catch {
      setCopiado("error");
    }
  };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([contenido], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreArchivoTxt(titulo)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => void copiar()}
        className="inline-flex min-h-11 items-center rounded-xl bg-ork-cyan px-5 font-medium text-ork-bg hover:bg-ork-cyan-hi"
      >
        Copiar
      </button>
      <button
        type="button"
        onClick={descargar}
        className="inline-flex min-h-11 items-center rounded-xl border border-ork-border-hi px-5 text-ork-text hover:border-ork-cyan"
      >
        Descargar (.txt)
      </button>
      <span role="status" className="text-small text-ork-text-muted">
        {copiado === "si" ? "Copiado" : copiado === "error" ? "No se ha podido copiar: usa Descargar" : ""}
      </span>
    </div>
  );
}

/** Nombre de archivo sin tildes ni símbolos: «Checklist de facturas» → «checklist-de-facturas». */
export function nombreArchivoTxt(titulo: string): string {
  return (
    titulo
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "regalo"
  );
}

/**
 * «Elige tus 3 prioridades» (spec §7, mapa_v1.2). Guarda al pulsar el botón; se puede cambiar
 * después. Sin `token` (vista previa del panel) solo enseña lo elegido.
 */
export function ElegirPrioridades({
  token,
  mejoras,
  inicial,
  fechaInicial,
  max = 3,
}: {
  token: string | null;
  mejoras: string[];
  inicial: string[];
  fechaInicial: string | null;
  max?: number;
}) {
  const [sel, setSel] = useState<string[]>(inicial);
  const [guardadas, setGuardadas] = useState<string[]>(inicial);
  const [fecha, setFecha] = useState<string | null>(fechaInicial);
  const [estado, setEstado] = useState<"quieto" | "guardando" | "error">("quieto");
  const cambiado = sel.join("|") !== guardadas.join("|");
  const alternar = (m: string) =>
    setSel((s) => (s.includes(m) ? s.filter((x) => x !== m) : s.length < max ? [...s, m] : s));
  const guardar = async () => {
    if (!token) return;
    setEstado("guardando");
    try {
      const r = await fetch(`/api/m/${token}/prioridades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seleccion: sel }),
      });
      if (!r.ok) throw new Error();
      const j = await r.json();
      setGuardadas(sel);
      setFecha(j.prioridades?.fecha ?? new Date().toISOString());
      setEstado("quieto");
    } catch {
      setEstado("error");
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-small text-ork-text-muted">
        Marcadas: {sel.length} de {max}
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {mejoras.map((m) => {
          const marcada = sel.includes(m);
          const bloqueada = !token || (!marcada && sel.length >= max);
          return (
            <li key={m}>
              <label
                className={
                  "flex min-h-12 items-center gap-3 rounded-xl border px-4 py-3 " +
                  (marcada
                    ? "border-ork-cyan bg-ork-cyan/[0.08] text-ork-text"
                    : "border-ork-border text-ork-text-muted") +
                  (bloqueada ? " cursor-not-allowed opacity-60" : " cursor-pointer")
                }
              >
                <input
                  type="checkbox"
                  className="h-5 w-5 shrink-0 accent-[var(--color-ork-cyan)]"
                  checked={marcada}
                  disabled={bloqueada || estado === "guardando"}
                  onChange={() => alternar(m)}
                />
                <span>{m}</span>
              </label>
            </li>
          );
        })}
      </ul>
      {token ? (
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void guardar()}
            disabled={!cambiado || estado === "guardando"}
            className="inline-flex min-h-11 items-center rounded-xl bg-ork-cyan px-5 font-medium text-ork-bg hover:bg-ork-cyan-hi disabled:opacity-50"
          >
            {estado === "guardando"
              ? "Guardando…"
              : guardadas.length
                ? "Guardar cambios"
                : "Guardar mis prioridades"}
          </button>
          <span role="status" className="text-small text-ork-text-muted">
            {estado === "error"
              ? "No se ha podido guardar. Vuelve a intentarlo."
              : fecha && !cambiado && guardadas.length
                ? `Guardadas el ${new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}. Puedes cambiarlas cuando quieras.`
                : ""}
          </span>
        </div>
      ) : (
        <p className="text-small text-ork-text-faint">
          Vista previa: el cliente las elige en su enlace.
        </p>
      )}
    </div>
  );
}

const CLAVE_DISPOSITIVO = "ork-mapa-dispositivo";
/** El panel marca este navegador: lo que Aitor abra desde aquí no cuenta como apertura. */
export const CLAVE_PANEL = "ork-panel-aitor";

/**
 * Aviso de apertura (spec §7), solo si el interruptor está encendido. Cuenta únicamente con
 * interacción real: 10 s con la página visible o un scroll. No cuenta en navegadores del panel.
 */
export function VigiaApertura({ token }: { token: string }) {
  useEffect(() => {
    let hecho = false;
    let visible = 0;
    let marca = document.visibilityState === "visible" ? Date.now() : 0;
    const reloj = setInterval(() => {
      if (marca) {
        visible += Date.now() - marca;
        marca = Date.now();
      }
      if (visible >= 10_000) enviar();
    }, 1000);
    const cambioVisibilidad = () => {
      if (document.visibilityState === "visible") marca = Date.now();
      else {
        if (marca) visible += Date.now() - marca;
        marca = 0;
      }
    };
    const alScroll = () => {
      if (window.scrollY > 200) enviar();
    };
    function limpiar() {
      clearInterval(reloj);
      document.removeEventListener("visibilitychange", cambioVisibilidad);
      window.removeEventListener("scroll", alScroll);
    }
    function enviar() {
      if (hecho) return;
      hecho = true;
      limpiar();
      try {
        if (localStorage.getItem(CLAVE_PANEL)) return;
        let id = localStorage.getItem(CLAVE_DISPOSITIVO);
        if (!id) {
          id = crypto.randomUUID().replace(/-/g, "");
          localStorage.setItem(CLAVE_DISPOSITIVO, id);
        }
        void fetch(`/api/m/${token}/apertura`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dispositivo: id }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Sin almacenamiento (modo privado estricto): no se cuenta.
      }
    }
    document.addEventListener("visibilitychange", cambioVisibilidad);
    window.addEventListener("scroll", alScroll, { passive: true });
    return limpiar;
  }, [token]);
  return null;
}

/** Lo pone la vista previa del panel: marca el navegador de Aitor para no contar sus aperturas. */
export function MarcaPanel() {
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_PANEL, "1");
    } catch {
      // Sin almacenamiento: nada que marcar.
    }
  }, []);
  return null;
}
