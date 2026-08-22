/**
 * Resolves the base URL for a backend service.
 * In the new architecture, URLs are dynamically injected by Infisical
 * via environment variables. We no longer parse query parameters or 
 * manually construct Cloud Run URLs.
 */

export const ORDER_URL = import.meta.env.VITE_API_ORDER_URL || 'http://localhost:3000';
export const INVENTORY_URL = import.meta.env.VITE_API_INVENTORY_URL || 'http://localhost:3001';
export const NOTIFICATION_URL = import.meta.env.VITE_API_NOTIFICATION_URL || 'http://localhost:3002';
