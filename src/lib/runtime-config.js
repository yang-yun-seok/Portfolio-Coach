const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const trimLeadingSlash = (value = '') => value.replace(/^\/+/, '');

export const APP_BASE_URL = import.meta.env.BASE_URL || '/';
export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
export const SUPABASE_URL = trimTrailingSlash(
  import.meta.env.VITE_SUPABASE_URL || 'https://pkwbqbxuujpcvndpacsc.supabase.co'
);

export function staticAssetUrl(path) {
  return `${APP_BASE_URL}${trimLeadingSlash(path)}`;
}

export function apiUrl(path) {
  const normalizedPath = `/${trimLeadingSlash(path)}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}

export function eventSourceUrl(path) {
  return apiUrl(path);
}
