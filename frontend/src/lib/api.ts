import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

export default api;

// Helper formatters
export const fmt = {
  currency: (n: number | string | null | undefined) => {
    if (n == null) return '-';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  },
  percent: (n: number | string | null | undefined, decimals = 1) => {
    if (n == null) return '-';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    return `${num.toFixed(decimals)}%`;
  },
  date: (d: string | Date | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  },
  shortDate: (d: string | Date | null | undefined) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
    });
  },
  hours: (n: number | string | null | undefined) => {
    if (n == null) return '-';
    const num = typeof n === 'string' ? parseFloat(n) : n;
    return `${num.toFixed(1)}h`;
  },
};
