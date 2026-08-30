const raw = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';
export const API_BASE = raw.replace(/\/$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE}${path.startsWith('/') ? path : `/${path}`}`;
}
