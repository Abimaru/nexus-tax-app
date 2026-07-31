import clsx, { type ClassValue } from 'clsx';

/** Une clases condicionalmente. Envoltura fina sobre clsx. */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
