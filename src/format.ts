const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Indian digit grouping: 1234567 -> 12,34,567
export function num(n: number | null | undefined): string {
  const v = Math.round(Number(n || 0));
  const neg = v < 0;
  const s = String(Math.abs(v));
  if (s.length <= 3) return (neg ? '-' : '') + s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return (neg ? '-' : '') + rest + ',' + last3;
}

export const money = (n: number | null | undefined) => `₹${num(n)}`;

// Rupees with paise when present: 1250.5 -> ₹1,250.50
export function rupees(n: number | null | undefined): string {
  const v = Number(n || 0);
  const neg = v < 0;
  const abs = Math.abs(v);
  const whole = Math.floor(Math.round(abs * 100) / 100);
  const paise = Math.round((abs - whole) * 100);
  return `${neg ? '-' : ''}₹${num(whole)}${paise ? `.${String(paise).padStart(2, '0')}` : ''}`;
}

// Amount input: digits with at most one dot and 2 decimals.
export function amountInput(s: string): string {
  const cleaned = s.replace(/[^\d.]/g, '');
  const [whole, ...rest] = cleaned.split('.');
  if (!rest.length) return whole;
  return `${whole}.${rest.join('').slice(0, 2)}`;
}

export function dateLabel(iso: string | null | undefined): string {
  if (!iso) return '-';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function dateTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${h % 12 || 12}:${mm} ${ampm}`;
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return dateTime(iso);
}

export const shortDay = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${d}/${m}`;
};

export const digitsOnly = (s: string) => s.replace(/\D/g, '');

export const roleLabel = (r: string) =>
  r === 'super_admin' ? 'Super Admin' : r.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
