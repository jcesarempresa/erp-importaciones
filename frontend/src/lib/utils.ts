import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina clases de Tailwind CSS de manera segura evitando colisiones de selectores.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
