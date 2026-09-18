import { notFound } from "next/navigation";
import { Muestra } from "./Muestra";

/** Banco de pruebas de los componentes compartidos. Solo existe en desarrollo. */
export default function PaginaMuestra() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Muestra />;
}
