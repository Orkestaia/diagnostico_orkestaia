/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import colino from "@/lib/__fixtures__/mapa-colino.json";
import { costeInaccion } from "@/lib/calculo";
import type { DatosMapa } from "@/lib/datosMapa";
import { mapaSchema, validarMapa, type Mapa } from "@/lib/mapa";
import { nombreArchivoTxt } from "./Interactivos";
import { MapaCliente } from "./MapaCliente";

/**
 * mapa_v1.2 (spec §7): campos opcionales. Un mapa sin ellos se pinta como antes; con ellos, en el
 * orden de la spec.
 */

const base = mapaSchema.parse(colino);
const procesos: DatosMapa["procesos"] = [
  "previo-captacion-consultas_mes",
  "previo-captacion-presupuestos_mes",
  "previo-dia-citas_semana",
].map((id, i) => ({
  id,
  nombre: `Proceso ${i + 1}`,
  area: "Clientes",
  volumen: 10,
  volumenUnidad: "",
  volumenPeriodo: "mes",
  minutosPorVez: 10,
  quien: null,
  herramientas: [],
  cita: "",
  pasos: [],
  horasHoy: 10,
}));

const datos = (mapa: Mapa, extra: Partial<DatosMapa> = {}): DatosMapa => ({
  id: "986d5763-bbe8-49e1-83c9-239d3ec4c9b4",
  token: "8KDrahMW30hR-AdO5jIlm",
  estado: "mapa_publicado",
  empresa: "Clínica Colino",
  mapa,
  procesos,
  publicadoAt: "2026-09-21T14:08:11Z",
  caducaAt: "2027-09-21T14:08:11Z",
  visitaConAvisos: false,
  prioridades: null,
  ...extra,
});

const v12 = (): Mapa => ({
  ...base,
  version: "mapa_v1.2",
  hallazgos: [
    { titulo: "Hallazgo normal", evidencia: "Lo contó recepción." },
    { titulo: "El 30 % de las consultas llega en fin de semana", evidencia: "Lo vimos en el WhatsApp.", inesperado: true },
    { titulo: "Otro hallazgo", evidencia: "Lo vimos en la agenda." },
  ],
  regalo: {
    titulo: "Checklist de confirmación de citas",
    descripcion: "Para usar mañana mismo.",
    tipo: "checklist",
    contenido: "- Mirar la agenda\n- Llamar",
  },
  coste_inaccion: { mostrar: true },
});

const titulos = () => [...document.querySelectorAll("h2")].map((h) => h.textContent ?? "");

afterEach(cleanup);

describe("mapa_v1.2: campos opcionales", () => {
  it("un mapa sin los campos nuevos se pinta como antes", () => {
    render(<MapaCliente datos={datos(base)} />);
    expect(titulos()).toEqual([
      "Así funciona hoy Clínica Colino",
      "Dónde se os va el tiempo",
      "Así sería",
      "Vuestra hoja de ruta",
      "Con criterio",
      "Lo vemos juntos",
    ]);
    expect(screen.queryByText(/Lo que no esperabais/)).toBeNull();
    expect(screen.queryByText(/coste de no hacer nada/i)).toBeNull();
  });

  it("con ellos, en el orden de la spec", () => {
    render(<MapaCliente datos={datos(v12())} cliente={{ token: "8KDrahMW30hR-AdO5jIlm", aperturaActiva: false, consentimiento: null }} />);
    expect(titulos()).toEqual([
      "El 30 % de las consultas llega en fin de semana",
      "Lo que hemos visto",
      "Así funciona hoy Clínica Colino",
      "Dónde se os va el tiempo",
      "Así sería",
      "Vuestra hoja de ruta",
      "Un regalo de 10 minutos",
      "Con criterio",
      "Elige tus 3 prioridades",
      "Lo vemos juntos",
    ]);
    // El inesperado no se repite entre los hallazgos.
    expect(screen.getAllByText("El 30 % de las consultas llega en fin de semana")).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Copiar" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Descargar (.txt)" })).toBeTruthy();
    expect(screen.getByText(/El coste de no hacer nada/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Guardar mis prioridades" })).toBeTruthy();
  });

  it("sin coste de no hacer nada si la visita se cerró con avisos o JARVIS no lo pide", () => {
    render(<MapaCliente datos={datos(v12(), { visitaConAvisos: true })} />);
    expect(screen.queryByText(/El coste de no hacer nada/)).toBeNull();
    cleanup();
    render(<MapaCliente datos={datos({ ...v12(), coste_inaccion: { mostrar: false } })} />);
    expect(screen.queryByText(/El coste de no hacer nada/)).toBeNull();
  });

  it("en el panel las prioridades solo se ven, no se guardan", () => {
    render(<MapaCliente datos={datos(v12(), { prioridades: { seleccion: ["Una sola ficha por paciente"], fecha: "2026-09-25T10:00:00Z", cambios: 0 } })} />);
    expect(screen.queryByRole("button", { name: /Guardar/ })).toBeNull();
    const marcada = screen.getByRole("checkbox", { name: "Una sola ficha por paciente" }) as HTMLInputElement;
    expect(marcada.checked).toBe(true);
    expect(marcada.disabled).toBe(true);
  });
});

describe("mapa_v1.2: validación y cálculo", () => {
  it("como mucho un hallazgo inesperado", () => {
    const m = v12();
    m.hallazgos![0].inesperado = true;
    // Colino no tiene cálculo aquí: basta con que salga el error de inesperados.
    const r = validarMapa(m, { procesos: [], calculo: null });
    expect(r.ok).toBe(false);
    expect(mapaSchema.safeParse(m).success).toBe(true);
    const errores = validarMapa(m, { procesos: [], calculo: { tarjetas: [] } as never });
    if (!errores.ok) expect(errores.errores.map((e) => e.ruta)).toContain("hallazgos");
  });

  it("regalo: tipo conocido y contenido de hasta 2000 caracteres", () => {
    expect(mapaSchema.safeParse({ ...v12(), regalo: { ...v12().regalo!, tipo: "pdf" } }).success).toBe(false);
    expect(mapaSchema.safeParse({ ...v12(), regalo: { ...v12().regalo!, contenido: "x".repeat(2001) } }).success).toBe(false);
  });

  it("coste de no hacer nada: horas de hoy × 12, con rango ±25 %", () => {
    expect(costeInaccion([10, 5, null])).toEqual({ min: 135, central: 180, max: 225 });
    expect(costeInaccion([null])).toBeNull();
  });

  it("nombre del .txt del regalo sin tildes ni símbolos", () => {
    expect(nombreArchivoTxt("Checklist: confirmación de citas")).toBe("checklist-confirmacion-de-citas");
    expect(nombreArchivoTxt("¿?")).toBe("regalo");
  });
});
