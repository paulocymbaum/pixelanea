import { clsx, type ClassValue } from "clsx";

/** Merge Tailwind class names; design-system primitive helper. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
