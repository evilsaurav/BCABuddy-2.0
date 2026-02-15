/**
 * Token Manager - Handles JWT token lifecycle
 * - Storage: localStorage (token is public, not sensitive)
 * - Expiration: 24 hours from login
 * - Auto-logout: 15 minutes before expiry + immediately on 401
 * - Warning: At 5 minutes remaining
 */

const TOKEN_KEY = 'token';
const TOKEN_TIMESTAMP_KEY = 'token_timestamp';
const TOKEN_EXPIRY_BUFFER_MINUTES = 15; // Auto-logout 15 min before actual expiry
const TOKEN_WARNING_MINUTES = 5; // Warn at 5 min remaining

/**
 * Parse JWT token to get expiration time
 */
export const getTokenExpiry = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  try {
    // JWT format: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    const expTime = payload.exp ? payload.exp * 1000 : null; // Convert to milliseconds
    return expTime;
  } catch (error) {
    console.error('Failed to parse token:', error);
    return null;
  }
};

/**
 * Check if token is expired
 */
export const isTokenExpired = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return true;
  return Date.now() >= expiry;
};

/**
 * Check if token is about to expire (with buffer)
 */
export const isTokenExpiringSoon = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return true;

  const bufferMs = TOKEN_EXPIRY_BUFFER_MINUTES * 60 * 1000;
  return Date.now() >= expiry - bufferMs;
};

/**
 * Check if token needs warning (5 min remaining)
 */
export const shouldWarnTokenExpiry = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return false;

  const warningMs = TOKEN_WARNING_MINUTES * 60 * 1000;
  const bufferMs = TOKEN_EXPIRY_BUFFER_MINUTES * 60 * 1000;

  // Warn between 5 min and 15 min remaining
  return Date.now() >= expiry - warningMs && Date.now() < expiry - bufferMs;
};

/**
 * Get remaining time in minutes
 */
export const getTokenRemainingMinutes = () => {
  const expiry = getTokenExpiry();
  if (!expiry) return 0;

  const remaining = Math.max(0, expiry - Date.now());
  return Math.floor(remaining / 60000);
};

/**
 * Store token securely
 */
export const setToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TIMESTAMP_KEY, Date.now().toString());
};

/**
 * Get token from storage
 */
export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * Clear token (logout)
 */
export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_TIMESTAMP_KEY);
};

/**
 * Validate token before using it
 * Returns true if token is still valid and not expiring soon
 */
export const isTokenValid = () => {
  if (!getToken()) return false;
  if (isTokenExpired()) return false;
  if (isTokenExpiringSoon()) return false;
  return true;
};

/**
 * Get authorization header
 */
export const getAuthHeader = () => {
  const token = getToken();
  return token ? `Bearer ${token}` : null;
};

/**
 * Check if should force logout
 */
export const shouldForceLogout = () => {
  if (!getToken()) return true;
  if (isTokenExpired()) return true;
  if (isTokenExpiringSoon()) return true;
  return false;
};
