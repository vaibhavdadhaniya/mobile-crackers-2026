import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SabhaDashboard as Dash } from '../api';
import { useApi } from '../hooks';
import { Avatar, Banner, Card, Chips, Empty, IconTile, Row, SectionTitle, Stat, Text } from '../components/ui';
import { BarChart, ProgressBar } from '../components/Charts';
import { TxnItem } from '../components/TxnItem';
import { colors } from '../theme';
import { dateLabel, money, num, roleLabel } from '../format';

type MemberSort = 'sold' | 'holding';

/**
 * Sabha Admin dashboard: kits, sales and members of the admin's own sabha only
 * (GET /sabha/dashboard). Rendered inside the user Home screen; bump `refreshKey` to reload.
 */
export function SabhaDashboard({ refreshKey = 0 }: { refreshKey?: number }) {
  const { data: d, error, reload } = useApi<Dash>('/sabha/dashboard');
  const [sort, setSort] = useState<MemberSort>('sold');

  useEffect(() => {
    if (refreshKey) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (error && !d) return <Banner text={error} />;
  if (!d) return <Card><Text style={s.muted}>Loading sabha stats…</Text></Card>;

  const t = d.totals;
  const members = [...d.members].sort((a, b) => (sort === 'sold' ? b.sold - a.sold || b.balance - a.balance : b.balance - a.balance || b.sold - a.sold));
  const maxSold = Math.max(1, ...d.members.map((m) => m.sold));

  return (
    <>
      <Card style={s.hero}>
        <IconTile icon="people-outline" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>My Sabha</Text>
          <Text style={s.title} numberOfLines={1}>
            {d.sabha.name}
          </Text>
          <Text style={s.muted}>
            {[d.sabha.zoneName, `${num(t.members)} members`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>Kits sold by the sabha</Text>
            <Text style={s.big}>
              {num(t.sold)} <Text style={s.bigOf}>/ {num(t.sold + t.withMembers)} kits</Text>
            </Text>
          </View>
          {t.sellThroughPct != null ? <Text style={s.pct}>{t.sellThroughPct}%</Text> : null}
        </View>
        <View style={{ marginTop: 10 }}>
          <ProgressBar pct={t.sellThroughPct ?? 0} color={colors.success} />
        </View>
        <Text style={[s.muted, { marginTop: 8 }]}>
          {num(t.withMembers)} kits still with members
          {d.config.sellDeadline
            ? ` · sell by ${dateLabel(d.config.sellDeadline)}${d.config.daysLeft != null && d.config.daysLeft > 0 ? ` (${d.config.daysLeft} days left)` : ''}`
            : ''}
        </Text>
      </Card>

      <Row style={{ marginBottom: 10 }}>
        <Stat label="Revenue" value={money(t.revenue)} icon="wallet-outline" tone="success" sub={`${num(t.saleCount)} sales · ${money(d.config.kitPrice)}/kit`} />
        <Stat label="Sold today" value={num(t.soldToday)} icon="today-outline" tone="warning" sub={`${num(t.soldLast7)} in last 7 days`} />
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <Stat label="Kits received" value={num(t.received)} icon="download-outline" tone="info" sub="From outside the sabha" />
        <Stat label="Selling members" value={`${num(t.sellers)}/${num(t.members)}`} icon="people-outline" tone="primary" sub={`${num(t.activeHolders)} hold kits now`} />
      </Row>
      <Row style={{ marginBottom: 14 }}>
        <Stat label="Cash with members" value={money(t.cashInWallets)} icon="cash-outline" tone="info" sub="Sale money in wallets" />
        <Stat label="Kit requests" value={num(t.pendingRequests)} icon="file-tray-full-outline" tone="neutral" sub="Pending with admin" />
      </Row>

      <Card>
        <SectionTitle sub="Kits sold per day, last 14 days">Daily sales</SectionTitle>
        <BarChart data={d.dailySales} />
      </Card>

      <Card>
        <SectionTitle sub={`${num(d.members.length)} active members`}>Members</SectionTitle>
        <Chips
          options={[
            { key: 'sold', label: 'Top sellers' },
            { key: 'holding', label: 'Holding kits' },
          ]}
          value={sort}
          onChange={setSort}
        />
        {members.length === 0 && <Empty icon="people-outline" text="No members in this sabha" />}
        {members.map((m, i) => (
          <View key={m.id} style={[s.member, i > 0 && s.divider]}>
            <Avatar name={m.name} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={s.name} numberOfLines={1}>
                {m.name}
              </Text>
              <Text style={s.muted} numberOfLines={1}>
                {roleLabel(m.role)} · holds {num(m.balance)}
              </Text>
              {sort === 'sold' && m.sold > 0 ? (
                <View style={{ marginTop: 6 }}>
                  <ProgressBar pct={(m.sold / maxSold) * 100} color={colors.success} />
                </View>
              ) : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.qty}>{num(sort === 'sold' ? m.sold : m.balance)}</Text>
              <Text style={s.muted}>{sort === 'sold' ? money(m.amount) : 'in hand'}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Card style={{ paddingBottom: 6 }}>
        <SectionTitle>Recent sabha activity</SectionTitle>
        {d.recent.length === 0 && <Empty icon="time-outline" text="No activity yet" />}
        {d.recent.slice(0, 8).map((x) => (
          <TxnItem key={x.id} t={x} />
        ))}
      </Card>
    </>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  title: { fontSize: 17, fontWeight: '700', marginTop: 1 },
  muted: { color: colors.muted, fontSize: 12 },
  big: { fontSize: 26, fontWeight: '700', color: colors.text, marginTop: 2 },
  bigOf: { fontSize: 14, fontWeight: '500', color: colors.muted },
  pct: { fontSize: 18, fontWeight: '700', color: colors.success },
  member: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { fontWeight: '600', fontSize: 14 },
  qty: { fontWeight: '700', fontSize: 15 },
});
