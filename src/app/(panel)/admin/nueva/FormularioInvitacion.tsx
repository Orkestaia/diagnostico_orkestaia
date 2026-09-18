"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ResultadoInvitacion, type DatosInvitacion } from "@/components/panel/ResultadoInvitacion";
import { claseBoton, claseCampo, Etiqueta } from "@/components/panel/ui";

interface ContactoCrm {
  id: string;
  empresa: string;
  persona_contacto: string | null;
  email: string | null;
  telefono: string | null;
  web: string | null;
  sector: string;
  estado: string;
  localidad: string | null;
}

const VACIO = {
  empresa: "",
  contacto_nombre: "",
  contacto_email: "",
  contacto_telefono: "",
  web: "",
  sector: "",
  subsector: "",
  fecha_reunion: "",
  origen: "manual",
};

export function FormularioInvitacion({
  sectores,
  origenes,
}: {
  sectores: { id: string; nombre: string; subsectores: string[] }[];
  origenes: { id: string; nombre: string }[];
}) {
  const [f, setF] = useState(VACIO);
  const [crm, setCrm] = useState<ContactoCrm | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultado, setResultado] = useState<DatosInvitacion | null>(null);

  const sector = sectores.find((s) => s.id === f.sector);
  const poner = (k: keyof typeof VACIO) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((x) => ({ ...x, [k]: e.target.value, ...(k === "sector" ? { subsector: "" } : {}) }));

  function elegirCrm(c: ContactoCrm) {
    setCrm(c);
    setF((x) => ({
      ...x,
      empresa: c.empresa ?? "",
      // Solo el nombre de pila: es como le saluda el mensaje ("Hola Pedro").
      contacto_nombre: (c.persona_contacto ?? "").trim().split(/\s+/)[0] ?? "",
      contacto_email: c.email ?? "",
      contacto_telefono: c.telefono ?? "",
      web: c.web ?? "",
    }));
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    const r = await fetch("/api/admin/invitaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, crm_contacto_id: crm?.id ?? "" }),
    });
    setEnviando(false);
    if (!r.ok) {
      const j = await r.json().catch(() => null);
      const campos = (j?.detalle ?? []).map((d: { path: string[] }) => d.path.join(".")).join(", ");
      setError(campos ? `Revisa: ${campos}.` : "No se ha podido crear la invitación.");
      return;
    }
    setResultado(await r.json());
  }

  if (resultado) {
    return (
      <section className="mt-8 rounded-2xl border border-ork-border bg-ork-surface-1 p-6">
        <h2 className="font-display text-h3">Invitación creada para {f.empresa}</h2>
        <p className="mt-1 mb-6">Envíale el enlace. El previo guarda lo que lleve si se queda a medias.</p>
        <ResultadoInvitacion datos={resultado} />
        <div className="mt-8 flex flex-wrap gap-2 border-t border-ork-border pt-6">
          <button
            type="button"
            className={claseBoton.secundario}
            onClick={() => {
              setF(VACIO);
              setCrm(null);
              setResultado(null);
            }}
          >
            Crear otra
          </button>
          <Link href="/admin" className={claseBoton.discreto}>
            Volver al listado
          </Link>
        </div>
      </section>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-8 space-y-8">
      <BuscadorCrm elegido={crm} onElegir={elegirCrm} onQuitar={() => setCrm(null)} />

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-body-lg text-ork-text">Cliente</legend>
        <div className="sm:col-span-2">
          <Etiqueta htmlFor="empresa">Empresa</Etiqueta>
          <input id="empresa" required maxLength={120} value={f.empresa} onChange={poner("empresa")} className={claseCampo} />
        </div>
        <div>
          <Etiqueta htmlFor="nombre">Nombre (como le saludas)</Etiqueta>
          <input id="nombre" required maxLength={80} value={f.contacto_nombre} onChange={poner("contacto_nombre")} className={claseCampo} />
        </div>
        <div>
          <Etiqueta htmlFor="telefono" opcional>
            Teléfono
          </Etiqueta>
          <input id="telefono" type="tel" maxLength={30} value={f.contacto_telefono} onChange={poner("contacto_telefono")} className={claseCampo} />
        </div>
        <div>
          <Etiqueta htmlFor="email" opcional>
            Email
          </Etiqueta>
          <input id="email" type="email" maxLength={160} value={f.contacto_email} onChange={poner("contacto_email")} className={claseCampo} />
        </div>
        <div>
          <Etiqueta htmlFor="web" opcional>
            Web
          </Etiqueta>
          <input id="web" maxLength={200} value={f.web} onChange={poner("web")} className={claseCampo} />
        </div>
      </fieldset>

      <fieldset className="grid gap-5 sm:grid-cols-2">
        <legend className="mb-4 font-display text-body-lg text-ork-text">Diagnóstico</legend>
        <div>
          <Etiqueta htmlFor="sector">Sector</Etiqueta>
          <select id="sector" required value={f.sector} onChange={poner("sector")} className={claseCampo}>
            <option value="" disabled>
              Elige un sector
            </option>
            {sectores.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Etiqueta htmlFor="subsector" opcional>
            Subsector
          </Etiqueta>
          <select
            id="subsector"
            value={f.subsector}
            onChange={poner("subsector")}
            disabled={!sector || sector.subsectores.length === 0}
            className={claseCampo}
          >
            <option value="">{sector && sector.subsectores.length === 0 ? "No aplica" : "Sin concretar"}</option>
            {sector?.subsectores.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Etiqueta htmlFor="fecha" opcional>
            Fecha de la reunión
          </Etiqueta>
          <input id="fecha" type="date" value={f.fecha_reunion} onChange={poner("fecha_reunion")} className={claseCampo + " [color-scheme:dark]"} />
        </div>
        <div>
          <Etiqueta htmlFor="origen">Origen</Etiqueta>
          <select id="origen" value={f.origen} onChange={poner("origen")} className={claseCampo}>
            {origenes.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </div>
      </fieldset>

      {error ? (
        <p role="alert" className="text-[#ff8a8e]">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={enviando} className={claseBoton.primario}>
        {enviando ? "Creando…" : "Crear invitación"}
      </button>
    </form>
  );
}

/** Buscador de solo lectura en `crm_contactos`: rellena empresa, nombre, email, teléfono y web. */
function BuscadorCrm({
  elegido,
  onElegir,
  onQuitar,
}: {
  elegido: ContactoCrm | null;
  onElegir: (c: ContactoCrm) => void;
  onQuitar: () => void;
}) {
  const id = useId();
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<ContactoCrm[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setLista([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setBuscando(true);
      setError(false);
      try {
        const r = await fetch(`/api/admin/crm/buscar?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (!r.ok) throw new Error();
        setLista((await r.json()).contactos ?? []);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError(true);
      } finally {
        setBuscando(false);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  if (elegido) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ork-cyan/50 bg-ork-surface-1 p-4">
        <div>
          <p className="text-small text-ork-cyan">Vinculado al CRM</p>
          <p className="text-ork-text">
            {elegido.empresa} <span className="text-ork-text-faint">· {elegido.sector} · {elegido.estado}</span>
          </p>
        </div>
        <button type="button" className={claseBoton.discreto} onClick={onQuitar}>
          Quitar vínculo
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-ork-border bg-ork-surface-1 p-4">
      <Etiqueta htmlFor={id} opcional>
        Buscar en el CRM
      </Etiqueta>
      <input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Empresa, persona o email"
        autoComplete="off"
        className={claseCampo}
      />
      <p className="mt-1.5 text-small text-ork-text-faint">
        Solo lectura: rellena los datos y guarda el vínculo. El CRM no se modifica.
      </p>
      {buscando ? <p className="mt-2 text-small">Buscando…</p> : null}
      {error ? <p className="mt-2 text-small text-[#ff8a8e]">No se ha podido buscar en el CRM.</p> : null}
      {lista.length > 0 ? (
        <ul className="mt-3 divide-y divide-ork-border rounded-lg border border-ork-border">
          {lista.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onElegir(c)}
                className="w-full px-3 py-2.5 text-left hover:bg-ork-surface-2 focus-visible:bg-ork-surface-2"
              >
                <span className="text-ork-text">{c.empresa}</span>
                <span className="block text-small text-ork-text-faint">
                  {[c.persona_contacto, c.localidad, c.sector, c.estado].filter(Boolean).join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : q.trim().length >= 2 && !buscando && !error ? (
        <p className="mt-2 text-small">Sin resultados. Rellena los datos a mano.</p>
      ) : null}
    </div>
  );
}
