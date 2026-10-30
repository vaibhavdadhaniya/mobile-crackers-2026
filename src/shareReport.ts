// WhatsApp share text for "Kits with members" (dependency-free, unit tested).
// Team Lead: their team's members. Sabha Admin: every team of the sabha. *x* = WhatsApp bold.

export type ShareMember = { name: string; holding: number; sold: number };
export type ShareTeam = { name: string; kind?: string; adminRole?: string | null; person?: string | null; members: number; holding: number; sold: number };

const n = (v: number) => Math.round(Number(v || 0)).toLocaleString('en-IN');
// holding = kits still with them (stock); assigned = stock + sold.
const kits = (h: number, s: number) => `Assigned ${n(h + s)} · Sold ${n(s)} · Stock ${n(h)}`;
const plural = (v: number, word: string) => `${n(v)} ${word}${v === 1 ? '' : 's'}`;
const total = (holding: number, sold: number) => `*Total:* ${kits(holding, sold)}`;

export function teamShareText(o: { team: string; place?: string | null; date: string; members: ShareMember[] }): string {
  const holding = o.members.reduce((a, m) => a + m.holding, 0);
  const sold = o.members.reduce((a, m) => a + m.sold, 0);
  return [
    `*Kits report: ${o.team}*`,
    [o.place, o.date].filter(Boolean).join(' · '),
    '',
    total(holding, sold),
    '',
    '*Members*',
    ...o.members.map((m, i) => `${i + 1}. ${m.name}: ${kits(m.holding, m.sold)}`),
  ].join('\n');
}

export function sabhaShareText(o: { sabha: string; zone?: string | null; date: string; teams: ShareTeam[] }): string {
  const admins = o.teams.filter((t) => t.kind === 'admin');
  const teams = o.teams.filter((t) => t.kind !== 'admin');
  const holding = o.teams.reduce((a, t) => a + t.holding, 0);
  const sold = o.teams.reduce((a, t) => a + t.sold, 0);
  return [
    `*Kits report: ${o.sabha}*`,
    [o.zone, o.date].filter(Boolean).join(' · '),
    '',
    `${total(holding, sold)} · ${plural(teams.length, 'team')}`,
    ...admins.map((a) => `${a.adminRole ?? 'Admin'}: ${a.person ?? a.name}: ${kits(a.holding, a.sold)}`),
    '',
    '*Teams*',
    ...(teams.length
      ? teams.map((t, i) => `${i + 1}. ${t.name} (${plural(t.members, 'member')}): ${kits(t.holding, t.sold)}`)
      : ['No teams yet']),
  ].join('\n');
}

export const whatsappUrl = (text: string) => `whatsapp://send?text=${encodeURIComponent(text)}`;
export const whatsappWebUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
