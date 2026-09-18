import { describe, expect, it } from "vitest";
import { enlaceGoogle, horaCorta, ics, lineaCita } from "./calendario";

describe("Cita y calendario", () => {
  it("línea de la cita", () => {
    expect(lineaCita("2026-09-21", "10:00:00", "vuestra oficina")).toBe(
      "Nos vemos el lunes 21 de septiembre a las 10:00 en vuestra oficina.",
    );
    expect(lineaCita("2026-09-21", null, null)).toBe("Nos vemos el lunes 21 de septiembre.");
    expect(lineaCita(null, "10:00", "x")).toBeNull();
  });
  it("hora corta", () => {
    expect(horaCorta("9:05")).toBe("09:05");
    expect(horaCorta("25:00")).toBeNull();
  });
  it(".ics de 3 horas en hora de Madrid, sin cruzar mal la medianoche", () => {
    const t = ics({ fecha: "2026-09-21", hora: "22:30", lugar: "Calle Mayor, 1", empresa: "X" }, "abc");
    expect(t).toContain("DTSTART;TZID=Europe/Madrid:20260921T223000");
    expect(t).toContain("DTEND;TZID=Europe/Madrid:20260922T013000");
    expect(t).toContain("LOCATION:Calle Mayor\\, 1");
  });
  it("enlace de Google Calendar", () => {
    const u = new URL(enlaceGoogle({ fecha: "2026-09-21", hora: "10:00", lugar: null, empresa: "X" }));
    expect(u.searchParams.get("dates")).toBe("20260921T100000/20260921T130000");
    expect(u.searchParams.get("ctz")).toBe("Europe/Madrid");
  });
});
