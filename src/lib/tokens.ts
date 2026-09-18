import "server-only";
import { nanoid } from "nanoid";

/** Spec §10: tokens nanoid(21). Es lo único que va en las URLs públicas. */
export const nuevoToken = () => nanoid(21);
