const rawEnvBase = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE
  ? String(import.meta.env.VITE_API_BASE)
  : '';

const sanitizedEnvBase = rawEnvBase.trim().replace(/\/+$/, '');
const shouldUseProxy = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const fallbackBase = shouldUseProxy ? '/api' : '';

export const API_BASE = sanitizedEnvBase || fallbackBase || '/api';

/**
 * Builds an absolute API URL while avoiding duplicate slashes.
 * @param {string} path Relative API path or absolute URL.
 */
export const buildApiUrl = (path = '') => {
  const normalizedPath = String(path || '').trim();
  if (!normalizedPath) {
    return API_BASE;
  }
  if (/^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }
  const leadingSlash = normalizedPath.startsWith('/') ? '' : '/';
  return `${API_BASE}${leadingSlash}${normalizedPath.replace(/^\/+/, '')}`;
};
