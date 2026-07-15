const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');
const trimLeadingSlash = (value = '') => value.replace(/^\/+/, '');
const viteEnv = import.meta.env || {};

export const APP_BASE_URL = viteEnv.BASE_URL || '/';
export const API_BASE_URL = trimTrailingSlash(viteEnv.VITE_API_BASE_URL || '');

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
