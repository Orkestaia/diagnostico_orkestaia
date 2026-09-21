import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("./datosExport", () => ({ cargarExport: vi.fn() }));
vi.mock("./supabase", () => ({ supabaseAdmin: vi.fn() }));

const { huella, nombreCarpeta } = await import("./archivos");

describe("archivos para la carpeta del cliente", () => {
  it("nombre de carpeta válido en Windows, con tildes", () => {
    expect(nombreCarpeta("Clínica Colino")).toBe("Clínica Colino");
    expect(nombreCarpeta('Luz y Espacio - Energía/Arquitectura: "SL"')).toBe(
      "Luz y Espacio - Energía Arquitectura SL",
    );
    expect(nombreCarpeta("Acme S.L.")).toBe("Acme S.L");
    expect(nombreCarpeta("  ")).toBe("Sin nombre");
  });

  it("la huella no cambia si solo cambia la fecha de generación", () => {
    const a =
      "# Informe\n\n> Generado por la app de diagnóstico el 2026-09-21. Archivo sugerido: x.\n> Otra línea\n";
    const b = a.replace("2026-09-21", "2026-09-22");
    expect(huella(a)).toBe(huella(b));
    expect(huella(a)).not.toBe(huella(a + "cambio"));
  });
});
