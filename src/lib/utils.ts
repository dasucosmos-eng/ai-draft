import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Safely format a date string/timestamp without throwing.
 * Returns empty string if the input is not a valid date.
 */
export function safeFormat(dateInput: unknown, fmt: string): string {
  if (!dateInput) return '';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput as any);
    return isValid(d) ? format(d, fmt) : '';
  } catch {
    return '';
  }
}
