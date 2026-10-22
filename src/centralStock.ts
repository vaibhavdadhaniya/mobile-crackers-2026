// Central stock tile on the admin Dashboard (unit tested, dependency-free).
// Kits on hold in pending transfers and kits asked for in pending requests are shown as a
// minus next to central stock, with what is left after them.
export type CentralStockInput = {
  centralStock: number;
  onHold: number; // kits in pending transfer requests sent by kit admins
  onHoldCount: number;
  requested: number; // kits asked for in pending kit requests
  requestCount: number;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function centralStockTile(t: CentralStockInput): { minus: number; left: number; sub: string } {
  const minus = (t.onHold || 0) + (t.requested || 0);
  const left = Math.max(0, t.centralStock - minus);
  const parts: string[] = [];
  if (t.onHoldCount) parts.push(plural(t.onHoldCount, 'transfer'));
  if (t.requestCount) parts.push(plural(t.requestCount, 'request'));
  const sub = parts.length ? `${left.toLocaleString('en-IN')} left after ${parts.join(' & ')}` : 'Nothing pending';
  return { minus, left, sub };
}
