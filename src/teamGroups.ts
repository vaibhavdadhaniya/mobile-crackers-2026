// Groups the "Kits with users" team rows into Zone -> Sabha -> Teams with totals (unit tested).
// Dependency-free on purpose (loaded by mobile/test).
//  - Zone Admin rows are not listed: they go to their zone's header (zoneAdmins).
//  - Pradesh / Super Admin rows and "Without team" rows (kind 'none') are not listed.
//  - Zone totals still count every row, so they match the real kits held in the zone.
export type TeamLike = {
  key: string;
  name: string;
  sabha: string;
  zone: string | null;
  holding: number;
  sold: number;
  kind?: string;
  adminRole?: string | null;
  person?: string | null;
};
export type SabhaGroup<T extends TeamLike> = { sabha: string; holding: number; sold: number; teams: T[] };
export type ZoneAdmin = { name: string; holding: number; sold: number };
export type ZoneGroup<T extends TeamLike> = { zone: string; holding: number; sold: number; zoneAdmins: ZoneAdmin[]; sabhas: SabhaGroup<T>[] };

const NO_ZONE = 'No zone';
const adminFirst = (t: { kind?: string }) => (t.kind === 'admin' ? 0 : 1);
const byKits = (a: { holding: number; sold: number }, b: { holding: number; sold: number }) => b.holding - a.holding || b.sold - a.sold;
const isZoneAdmin = (r: TeamLike) => r.kind === 'admin' && r.adminRole === 'Zone Admin';
// Listed inside a sabha: teams and Sabha Admins only.
export const isListed = (r: TeamLike) => r.kind !== 'none' && (r.kind !== 'admin' || r.adminRole === 'Sabha Admin');

export function groupTeams<T extends TeamLike>(rows: T[]): ZoneGroup<T>[] {
  const zones = new Map<string, T[]>();
  for (const r of rows) {
    const z = r.zone || NO_ZONE;
    if (!zones.has(z)) zones.set(z, []);
    zones.get(z)!.push(r);
  }
  const sum = (list: { holding: number; sold: number }[]) =>
    list.reduce((a, x) => ({ holding: a.holding + x.holding, sold: a.sold + x.sold }), { holding: 0, sold: 0 });

  const out: ZoneGroup<T>[] = [];
  for (const [zone, zr] of zones) {
    const bySabha = new Map<string, T[]>();
    for (const r of zr.filter(isListed)) {
      if (!bySabha.has(r.sabha)) bySabha.set(r.sabha, []);
      bySabha.get(r.sabha)!.push(r);
    }
    const sg: SabhaGroup<T>[] = [];
    for (const [sabha, teams] of bySabha) {
      // Sabha Admin first, then teams by kits.
      const sorted = [...teams].sort((a, b) => adminFirst(a) - adminFirst(b) || byKits(a, b) || a.name.localeCompare(b.name));
      sg.push({ sabha, ...sum(sorted), teams: sorted });
    }
    sg.sort((a, b) => byKits(a, b) || a.sabha.localeCompare(b.sabha));
    const zoneAdmins = zr.filter(isZoneAdmin).map((r) => ({ name: r.person ?? r.name, holding: r.holding, sold: r.sold }));
    if (!sg.length && !zoneAdmins.length) continue;
    out.push({ zone, ...sum(zr), zoneAdmins, sabhas: sg });
  }
  // Zones by kits; users without a zone last.
  return out.sort((a, b) => Number(a.zone === NO_ZONE) - Number(b.zone === NO_ZONE) || byKits(a, b) || a.zone.localeCompare(b.zone));
}

// "With kits or sales" filter: rows with kits or sales, plus the Sabha Admin row (kind 'admin') of
// every sabha that is shown, even at 0 kits, so each visible sabha always names its admin.
export function activeRows<T extends TeamLike>(rows: T[]): T[] {
  const sabhaKey = (r: T) => `${r.zone ?? ''}|${r.sabha}`;
  const has = (r: T) => r.holding > 0 || r.sold > 0;
  const shown = new Set(rows.filter((r) => has(r) && isListed(r)).map(sabhaKey));
  return rows.filter((r) => has(r) || (r.kind === 'admin' && shown.has(sabhaKey(r))));
}
