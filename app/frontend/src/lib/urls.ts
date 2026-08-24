declare global {
  interface Window {
    __env__?: {
      ORDER_URL?: string;
      INVENTORY_URL?: string;
      NOTIFICATION_URL?: string;
    };
  }
}

export const ORDER_URL =
  window.__env__?.ORDER_URL ||
  import.meta.env.VITE_API_ORDER_URL ||
  'http://localhost:3000';

export const INVENTORY_URL =
  window.__env__?.INVENTORY_URL ||
  import.meta.env.VITE_API_INVENTORY_URL ||
  'http://localhost:3001';

export const NOTIFICATION_URL =
  window.__env__?.NOTIFICATION_URL ||
  import.meta.env.VITE_API_NOTIFICATION_URL ||
  'http://localhost:3002';
