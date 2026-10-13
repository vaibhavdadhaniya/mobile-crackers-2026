import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';
import { needsRefresh, on401 } from './session';

const TOKEN_KEY = 'fk_token';
const REFRESH_KEY = 'fk_refresh';
const URL_KEY = 'fk_api_url';

const DEFAULT_URL: string =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ?? 'http://192.168.1.10:4000';

let baseUrl = DEFAULT_URL;
let token: string | null = null;
let refreshToken: string | null = null;
let onSessionEnded: (() => void) | null = null;

const read = (k: string) => SecureStore.getItemAsync(k).catch(() => null);
const write = (k: string, v: string | null) =>
  (v ? SecureStore.setItemAsync(k, v) : SecureStore.deleteItemAsync(k)).catch(() => {});

export async function loadStored() {
  const [t, r, u] = await Promise.all([read(TOKEN_KEY), read(REFRESH_KEY), read(URL_KEY)]);
  token = t;
  refreshToken = r;
  if (u) baseUrl = u;
  return { token: t, refreshToken: r, baseUrl };
}

export const getBaseUrl = () => baseUrl;
export const getToken = () => token;

export async function setBaseUrl(url: string) {
  let u = url.trim().replace(/\/+$/, '');
  if (u && !/^https?:\/\//i.test(u)) u = `http://${u}`;
  baseUrl = u;
  await write(URL_KEY, baseUrl);
}

export type SessionTokens = { token: string; refreshToken?: string | null };

// Save the session in memory and in the device keychain (SecureStore).
export async function setSession(s: SessionTokens | null) {
  token = s?.token ?? null;
  if (s?.refreshToken !== undefined) refreshToken = s?.refreshToken ?? null;
  if (!s) refreshToken = null;
  await Promise.all([write(TOKEN_KEY, token), write(REFRESH_KEY, refreshToken)]);
}

// Called only when the server says the session is over (refresh rejected / account disabled).
export function setSessionEndedHandler(fn: () => void) {
  onSessionEnded = fn;
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Raw = { ok: boolean; status: number; data: { error?: string; code?: string } & Record<string, unknown> };

async function send(method: string, path: string, body: unknown, timeoutMs: number, auth: string | null): Promise<Raw> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${baseUrl}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: `Bearer ${auth}` } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch {
    throw new ApiError(0, `Cannot reach server at ${baseUrl}. Check Wi-Fi and server address.`);
  } finally {
    clearTimeout(timer);
  }
}

type RefreshResult = 'ok' | 'ended' | 'offline';
let refreshing: Promise<RefreshResult> | null = null;

async function doRefresh(): Promise<RefreshResult> {
  try {
    if (refreshToken) {
      const r = await send('POST', '/auth/refresh', { refreshToken }, 15000, null);
      if (r.ok) {
        await setSession({ token: String(r.data.token), refreshToken: String(r.data.refreshToken) });
        return 'ok';
      }
      return r.status === 401 ? 'ended' : 'offline';
    }
    // Logged in before refresh tokens existed: upgrade with the (still valid) access token.
    if (token) {
      const r = await send('POST', '/auth/session', {}, 15000, token);
      if (r.ok) {
        await setSession({ token: String(r.data.token), refreshToken: String(r.data.refreshToken) });
        return 'ok';
      }
      return r.status === 401 ? 'ended' : 'offline';
    }
    return 'ended';
  } catch {
    return 'offline'; // network problem: never sign the user out for this
  }
}

// One refresh at a time; concurrent callers share it.
export function refreshSession(): Promise<RefreshResult> {
  if (!refreshing) refreshing = doRefresh().finally(() => (refreshing = null));
  return refreshing;
}

// Renew ahead of time (app start / back to foreground) or obtain a refresh token for old logins.
export async function ensureFreshSession(): Promise<RefreshResult> {
  if (!token) return 'ended';
  if (!refreshToken || needsRefresh(token)) {
    const r = await refreshSession();
    if (r === 'ended') onSessionEnded?.();
    return r;
  }
  return 'ok';
}

async function request<T>(method: string, path: string, body?: unknown, timeoutMs = 20000): Promise<T> {
  let r = await send(method, path, body, timeoutMs, token);
  // Expired/invalid access token: renew once and retry. Only a rejected refresh ends the session.
  if (r.status === 401 && token && !path.startsWith('/auth/')) {
    if (on401(r.data.code) === 'end') {
      onSessionEnded?.();
    } else {
      const res = await refreshSession();
      if (res === 'ok') r = await send(method, path, body, timeoutMs, token);
      else if (res === 'ended') onSessionEnded?.();
      else throw new ApiError(0, `Cannot reach server at ${baseUrl}. Check Wi-Fi and server address.`);
    }
  }
  if (!r.ok) throw new ApiError(r.status, r.data.error || `Request failed (${r.status})`, r.data.code);
  return r.data as T;
}

// Best effort: tell the server this refresh token is no longer valid.
export async function revokeSession() {
  const rt = refreshToken;
  if (rt) await send('POST', '/auth/logout', { refreshToken: rt }, 8000, null).catch(() => {});
}

export const api = {
  get: <T>(p: string, timeoutMs?: number) => request<T>('GET', p, undefined, timeoutMs),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b ?? {}),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b ?? {}),
  del: <T>(p: string) => request<T>('DELETE', p),
};

// ---- Types ----
export type User = { id: string; name: string; phone: string; role: string; isAdmin: boolean };

export type Me = {
  user: User;
  balance: number;
  unreadNotifications: number;
  pendingRequests: number;
  walletBalance: number;
  pendingMoneyIn: number;
  soldQty: number;
  receivedQty: number;
  sentQty: number;
  soldAmount: number;
  kitPrice: number;
  sellDeadline: string | null;
};

export type UserHit = { id: string; name: string; phone: string; role: string; balance: number; isAdmin?: boolean };
export type AdminRow = { id: string; name: string; phone: string; role: string; source: 'primary' | 'granted'; added_at: string | null; added_by_name: string | null };
export type RegistrationHit = { id: string; name: string; phone: string; city: string | null; area: string | null };

export type Txn = {
  id: string;
  type: 'stock_add' | 'stock_remove' | 'transfer' | 'sale';
  quantity: number;
  note: string | null;
  created_at: string;
  from_name: string | null;
  from_phone?: string | null;
  to_name: string | null;
  to_phone?: string | null;
  customer_name: string | null;
  customer_phone?: string | null;
  total_amount?: number | null;
  direction?: 'in' | 'out';
};

export type KitRequest = {
  id: string;
  user_id: string;
  type: 'request' | 'return';
  quantity: number;
  approved_quantity: number | null;
  note: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note: string | null;
  created_at: string;
  handled_at: string | null;
  user_name?: string;
  user_phone?: string;
  user_balance?: number;
  handled_by_name?: string | null;
};

export type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type Settings = {
  kitPrice: number;
  sellTarget: number;
  sellDeadline: string | null;
  otpMode: 'static' | 'msg91' | 'whatsapp';
  staticOtp: string;
  msg91AuthKeyMasked: string | null;
  msg91AuthKeySet: boolean;
  msg91TemplateId: string | null;
  msg91CountryCode: string;
  msg91WaNumber: string | null;
  msg91WaTemplate: string;
  msg91WaLanguage: string;
  msg91WaNamespace: string | null;
};

export type Analytics = {
  totals: {
    stockAdded: number;
    centralStock: number;
    withUsers: number;
    activeHolders: number;
    sold: number;
    revenue: number;
    saleCount: number;
    linkedSales: number;
    soldToday: number;
    soldLast7: number;
    transferred: number;
    pendingRequests: number;
    pendingRequestQty: number;
    cashInWallets: number;
    cashPending: number;
  };
  target: {
    kitPrice: number;
    sellTarget: number;
    sellDeadline: string | null;
    daysLeft: number | null;
    remaining: number;
    progressPct: number | null;
    requiredPerDay: number;
    avgPerDay7: number;
    projected: number;
    onTrack: boolean | null;
    expired: boolean;
    targetRevenue: number;
  };
  dailySales: { day: string; qty: number }[];
  topSellers: { id: string; name: string; phone: string; qty: number; amount: number }[];
  topHolders: { id: string; name: string; phone: string; balance: number }[];
  recent: Txn[];
};

export type Holder = { id: string; name: string; phone: string; role: string; balance: number; sold: number; amount: number; wallet: number };

export type Wallet = {
  balance: number;
  reserved: number;
  available: number;
  fromSales: number;
  zone: { id: string; name: string } | null;
  pendingIncoming: number;
  pendingIncomingAmount: number;
  scope: 'all' | 'zone';
};

export type MoneyTransfer = {
  id: string;
  amount: number;
  note: string | null;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  method: 'cash' | 'upi';
  upi_ref: string | null;
  created_at: string;
  responded_at: string | null;
  from_user_id: string;
  from_name: string;
  from_phone: string;
  to_user_id: string;
  to_name: string;
  to_phone: string;
  direction: 'in' | 'out';
};

export type WalletEntry = { id: string; type: 'sale' | 'transfer_in' | 'transfer_out'; amount: number; note: string | null; created_at: string };
