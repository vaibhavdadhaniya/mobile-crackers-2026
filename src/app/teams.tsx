import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, TeamMember, TeamRow } from '../api';
import { useApi } from '../hooks';
import { Avatar, Badge, Banner, Card, Chips, Empty, Screen, tap, Text } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { colors, radius } from '../theme';
import { num, roleLabel } from '../format';
import { useAuth } from '../auth';
import { activeRows, groupTeams } from '../teamGroups';

type Filter = 'active' | 'all';

// "With users" drill-down (kit admins): Zone > Sabha > Teams with kits held and sold; tap a
// team for its karyakartas. Zone kit admins only see their zone (server-side), shown from Sabha.
export default function Teams() {
  const teams = useApi<TeamRow[]>('/admin/teams');
  const [filter, setFilter] = useState<Filter>('active');
  const [open, setOpen] = useState<TeamRow | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const { me } = useAuth();

  const all = teams.data ?? [];
  // Teams with kits or sales (+ the Sabha Admin of each shown sabha, even at 0 kits).
  const active = all.filter((t) => t.holding > 0 || t.sold > 0);
  const list = filter === 'active' ? activeRows(all) : all;
  const groups = groupTeams(list);
  // Main Super Admin sees every zone: show the zone level. A zone kit admin has one zone.
  const showZones = !!me?.user.isPrimary || groups.length > 1;
  const holding = all.reduce((a, t) => a + t.holding, 0);
  const sold = all.reduce((a, t) => a + t.sold, 0);

  return (
    <Screen refreshing={teams.refreshing} onRefresh={teams.refresh}>
      {teams.error ? <Banner text={teams.error} /> : null}
      <Card style={s.summary}>
        <Summary label="Kits with users" value={num(holding)} color={colors.primary} />
        <View style={s.vr} />
        <Summary label="Sold" value={num(sold)} color={colors.success} />
        <View style={s.vr} />
        <Summary label="Teams" value={`${num(active.length)}/${num(all.length)}`} color={colors.text} />
      </Card>

      <Chips
        options={[
          { key: 'active', label: `With kits or sales (${active.length})` },
          { key: 'all', label: `All teams (${all.length})` },
        ]}
        value={filter}
        onChange={setFilter}
      />

      {!teams.data ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} /> : null}
      {teams.data && list.length === 0 ? <Empty icon="people-outline" text="No teams with kits yet" /> : null}

      {/* Zone > Sabha > Teams. A zone kit admin only has one zone: start at Sabha level. */}
      {groups.map((z) => {
        const folded = collapsed.has(z.zone);
        const sabhas = showZones && folded ? [] : z.sabhas;
        return (
          <View key={z.zone} style={{ marginBottom: 6 }}>
            {showZones ? (
              <Pressable
                onPress={() => {
                  tap();
                  setCollapsed((c) => {
                    const n = new Set(c);
                    if (n.has(z.zone)) n.delete(z.zone);
                    else n.add(z.zone);
                    return n;
                  });
                }}
                style={({ pressed }) => [s.zoneHead, pressed && { opacity: 0.8 }]}
              >
                <Ionicons name={folded ? 'chevron-forward' : 'chevron-down'} size={18} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={s.zoneName} numberOfLines={1}>
                    {z.zone}
                  </Text>
                  {z.zoneAdmins.length ? (
                    <Text style={s.zoneAdmin} numberOfLines={2}>
                      Zone Admin: {z.zoneAdmins.map((a) => (a.holding ? `${a.name} (${num(a.holding)} kits)` : a.name)).join(', ')}
                    </Text>
                  ) : null}
                  <Text style={s.zoneMeta}>
                    {z.sabhas.length} sabha{z.sabhas.length === 1 ? '' : 's'} · {z.sabhas.reduce((a, x) => a + x.teams.filter((t) => t.kind !== 'admin').length, 0)} teams
                  </Text>
                </View>
                <Totals holding={z.holding} sold={z.sold} light />
              </Pressable>
            ) : z.zoneAdmins.length ? (
              // Zone kit admin (no zone header): show their Zone Admin above the sabhas.
              <Card style={s.zoneAdminCard}>
                <Text style={s.meta}>Zone Admin</Text>
                {z.zoneAdmins.map((a) => (
                  <View key={a.name} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                    <Text style={[s.name, { flex: 1 }]} numberOfLines={1}>
                      {a.name}
                    </Text>
                    <Totals holding={a.holding} sold={a.sold} />
                  </View>
                ))}
              </Card>
            ) : null}

            {sabhas.map((sb) => (
              <Card key={sb.sabha} style={s.sabhaCard}>
                <View style={s.sabhaHead}>
                  <Ionicons name="business-outline" size={16} color={colors.primary} />
                  <Text style={s.sabhaName} numberOfLines={1}>
                    {sb.sabha}
                  </Text>
                  <Totals holding={sb.holding} sold={sb.sold} />
                </View>
                {sb.teams.map((t) =>
                  t.kind === 'admin' ? (
                    // Sabha / Zone Admin: listed first, same row style, just a role tag (their own kits).
                    <Pressable
                      key={t.key}
                      onPress={() => {
                        tap();
                        setOpen(t);
                      }}
                      style={({ pressed }) => [s.row, s.divider, pressed && { opacity: 0.6 }]}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={s.name} numberOfLines={1}>
                          {t.person ?? t.name}
                        </Text>
                        <View style={{ flexDirection: 'row', marginTop: 3 }}>
                          <Badge text={t.adminRole ?? 'Admin'} tone="neutral" />
                        </View>
                      </View>
                      <Text style={[s.val, s.num, { color: colors.primary }]}>{num(t.holding)}</Text>
                      <Text style={[s.val, s.num, { color: colors.success }]}>{num(t.sold)}</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.faint} style={{ width: 18 }} />
                    </Pressable>
                  ) : (
                  <Pressable
                    key={t.key}
                    onPress={() => {
                      tap();
                      setOpen(t);
                    }}
                    style={({ pressed }) => [s.row, s.divider, pressed && { opacity: 0.6 }]}
                  >
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <Text style={[s.name, t.name === 'Without team' && { color: colors.muted }]} numberOfLines={1}>
                        {t.name}
                      </Text>
                      <Text style={s.meta} numberOfLines={1}>
                        Team · {t.members} member{t.members === 1 ? '' : 's'} · {t.holders} holding kits
                      </Text>
                    </View>
                    <Text style={[s.val, s.num, { color: colors.primary }]}>{num(t.holding)}</Text>
                    <Text style={[s.val, s.num, { color: colors.success }]}>{num(t.sold)}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.faint} style={{ width: 18 }} />
                  </Pressable>
                  )
                )}
              </Card>
            ))}
          </View>
        );
      })}

      <MembersSheet team={open} onClose={() => setOpen(null)} />
    </Screen>
  );
}

function MembersSheet({ team, onClose }: { team: TeamRow | null; onClose: () => void }) {
  const [rows, setRows] = useState<TeamMember[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!team) return;
    let live = true;
    setRows(null);
    setError('');
    api
      .get<TeamMember[]>(`/admin/teams/${encodeURIComponent(team.key)}/members`)
      .then((r) => live && setRows(r))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [team]);

  return (
    <Sheet
      visible={!!team}
      onClose={onClose}
      title={team?.name === 'Without team' ? `Without team · ${team.sabha}` : team?.name}
      subtitle={team ? `${[team.sabha, team.zone].filter(Boolean).join(' · ')} · ${num(team.holding)} kits held · ${num(team.sold)} sold` : undefined}
    >
      {error ? <Text style={{ color: colors.danger, marginVertical: 12 }}>{error}</Text> : null}
      {!rows && !error ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} /> : null}
      {rows ? (
        <View style={s.box}>
          <View style={[s.row, s.head]}>
            <Text style={[s.th, { flex: 1 }]}>Karyakarta</Text>
            <Text style={[s.th, s.num]}>Kits</Text>
            <Text style={[s.th, s.num]}>Sold</Text>
          </View>
          {rows.map((m, i) => (
            <View key={m.id} style={[s.row, i > 0 && s.divider]}>
              <Avatar name={m.name} size={32} />
              <View style={{ flex: 1, paddingHorizontal: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[s.name, { flexShrink: 1 }]} numberOfLines={1}>
                    {m.name}
                  </Text>
                  {m.isAdmin ? <Badge text="Kit mgmt" tone="primary" /> : null}
                </View>
                <Text style={s.meta} numberOfLines={1}>
                  {roleLabel(m.role)} · {m.phone}
                </Text>
              </View>
              <Text style={[s.val, s.num, { color: m.holding ? colors.primary : colors.faint }]}>{num(m.holding)}</Text>
              <Text style={[s.val, s.num, { color: m.sold ? colors.success : colors.faint }]}>{num(m.sold)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Sheet>
  );
}

function Totals({ holding, sold, light }: { holding: number; sold: number; light?: boolean }) {
  return (
    <View style={s.totals}>
      <Text style={[s.totVal, { color: light ? '#fff' : colors.primary }]}>{num(holding)}</Text>
      <Text style={[s.totLbl, light && { color: 'rgba(255,255,255,0.8)' }]}>kits</Text>
      <Text style={[s.totVal, { color: light ? '#fff' : colors.success, marginLeft: 10 }]}>{num(sold)}</Text>
      <Text style={[s.totLbl, light && { color: 'rgba(255,255,255,0.8)' }]}>sold</Text>
    </View>
  );
}

function Summary({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center' }}>
      <Text style={[s.sumValue, { color }]}>{value}</Text>
      <Text style={s.meta}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  summary: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  sumValue: { fontSize: 20, fontWeight: '700' },
  vr: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  box: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 10, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11 },
  head: { paddingVertical: 8 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  th: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.3 },
  num: { width: 56, textAlign: 'right' },
  name: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  val: { fontSize: 15, fontWeight: '700' },
  zoneHead: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primary, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8 },
  zoneName: { color: '#fff', fontSize: 15.5, fontWeight: '700' },
  zoneMeta: { color: 'rgba(255,255,255,0.85)', fontSize: 11.5, marginTop: 1 },
  zoneAdmin: { color: '#fff', fontSize: 12.5, fontWeight: '600', marginTop: 2 },
  zoneAdminCard: { paddingVertical: 10 },
  sabhaCard: { paddingTop: 10, paddingBottom: 2 },
  sabhaHead: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingBottom: 8 },
  sabhaName: { flex: 1, fontSize: 14.5, fontWeight: '700' },
  totals: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  totVal: { fontSize: 14, fontWeight: '700' },
  totLbl: { fontSize: 11, color: colors.muted },
});
