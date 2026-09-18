/**
 * Marca: siempre "ORKESTA Automatización & IA" (decisión de Aitor, 18-sep). Úsese este
 * componente en cualquier cabecera o pie para que no aparezcan variantes.
 */
export const NOMBRE_MARCA = "ORKESTA Automatización & IA";

export function Marca({ className = "" }: { className?: string }) {
  return (
    <span className={"inline-flex flex-wrap items-baseline gap-x-2 " + className}>
      <span className="font-display tracking-[0.04em] text-ork-text">ORKESTA</span>
      <span className="text-[0.85em] text-ork-text-muted">Automatización &amp; IA</span>
    </span>
  );
}
