/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BLOQUES } from "@/config/consultor/bloques";
import { tarjetaNueva } from "@/config/consultor/tarjeta";
import { Visita, type DatosVisita } from "./Visita";

/**
 * La visita se abre delante del cliente: si un bloque revienta al pintarse, la reunión se para.
 * Esta prueba recorre los ocho bloques con datos como los de una visita de verdad.
 */

const datos: DatosVisita = {
  id: "986d5763-bbe8-49e1-83c9-239d3ec4c9b4",
  estado: "visita_en_curso",
  sector: "salud",
  tipoNegocio: "Clínica dental",
  empresa: "Clínica Prueba",
  contacto: "Aitor",
  fechaReunion: "2026-09-24",
  visitaCerradaAt: null,
  respuestasVisita: {
    inicio_at: "2026-09-20T08:00:00Z",
    campos: {
      "a.historia": "Hace 7 años",
      "a.equipo": [{ rol: "Admin", numero: 2 }],
      "a.decisor": { aqui: "Sí", texto: "El gerente" },
      "ia.areas": [],
      "datos.mapa": [{ tipo: "Clientes", donde: "CRM", formato: "Excel", mantiene: "Admin", confianza: 4 }],
      "ia.creencia": { valor: 4 },
      "cumpl.ia_personas": ["Decidir créditos o precios por persona"],
    },
  },
  procesos: [
    tarjetaNueva({ id: "p1", nombre: "Primera respuesta a una consulta nueva", volumen: 20, minutosPorVez: 200, origenDatos: "previo" }),
    tarjetaNueva({ id: "p2", nombre: "Seguimiento de presupuestos", volumen: 3, minutosPorVez: 90 }),
  ],
  sugeridas: [],
  entendido: ["Atendéis unas 20 consultas nuevas al mes"],
  contado: [
    {
      id: "captacion.consultas_mes",
      texto: "¿Cuántas consultas nuevas recibís al mes?",
      tipo: "rango",
      valor: "10-30",
      opciones: ["Menos de 10", "10-30", "30-100"],
      max: null,
      cual: {},
    },
  ],
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async () =>
    Response.json({ consentimiento_at: null, fragmentos: [], privado: {}, resultado: { respuestas: 0 } }),
  );
  window.scrollTo = vi.fn();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("Pantalla de la visita", () => {
  it("pinta los ocho bloques sin romperse", async () => {
    const usuario = userEvent.setup();
    render(<Visita datos={datos} />);

    for (const b of BLOQUES) {
      await usuario.click(screen.getByRole("button", { name: new RegExp(`${b.id} ${b.nombre}`) }));
      expect(screen.getByText(b.frase), `bloque ${b.id}`).toBeDefined();
    }
  });

  it("el cierre deja elegir las tres prioridades y ofrece terminar", async () => {
    const usuario = userEvent.setup();
    render(<Visita datos={datos} />);
    await usuario.click(screen.getByRole("button", { name: /H Cierre/ }));

    expect(screen.getByText("De todo lo que hemos visto, ¿qué tres cosas resolverías primero?")).toBeDefined();
    await usuario.click(screen.getByRole("button", { name: /Primera respuesta a una consulta nueva/ }));
    expect(screen.getByRole("button", { name: /Terminar la visita/ })).toBeDefined();
  });

  it("en la vista cliente no hay ni rastro de los campos privados", async () => {
    const usuario = userEvent.setup();
    const { container } = render(<Visita datos={datos} />);
    for (const b of BLOQUES) {
      await usuario.click(screen.getByRole("button", { name: new RegExp(`${b.id} ${b.nombre}`) }));
    }
    const html = container.innerHTML;
    for (const texto of ["Coste por hora", "Rango de inversión", "riesgo de cumplimiento", "Privado · no lo ve el cliente"]) {
      expect(html.includes(texto), texto).toBe(false);
    }
  });
});
