import { useEffect } from 'react';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SabhaDashboard as Dash } from '../api';
import { useApi } from '../hooks';
import { Banner, Card, Empty, IconTile, Row, SectionTitle, Stat, Text } from '../components/ui';
import { BarChart, ProgressBar } from '../components/Charts';
import { TxnItem } from '../components/TxnItem';
import { colors } from '../theme';
import { dateLabel, money, num } from '../format';

/**
 * Group dashboard: kind 'sabha' = Sabha Admin, their whole sabha (GET /sabha/dashboard);
 * kind 'team' = Team Lead, only their own team (GET /sabha/team/dashboard). Members are on the
 * "Kits with members" page (tap the tile). Rendered inside the user Home screen; bump `refreshKey` to reload.
 */
export function SabhaDashboard({ kind = 'sabha', refreshKey = 0 }: { kind?: 'sabha' | 'team'; refreshKey?: number }) {
  const { data: d, error, reload } = useApi<Dash>(kind === 'team' ? '/sabha/team/dashboard' : '/sabha/dashboard');
  const word = kind === 'team' ? 'team' : 'sabha';

  useEffect(() => {
    if (refreshKey) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (error && !d) return <Banner text={error} />;
  if (!d) return <Card><Text style={s.muted}>Loading {word} stats…</Text></Card>;

  const t = d.totals;

  return (
    <>
      <Card style={s.hero}>
        <IconTile icon="people-outline" size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>{kind === 'team' ? 'My Team' : 'My Sabha'}</Text>
          <Text style={s.title} numberOfLines={1}>
            {d.group.name}
          </Text>
          <Text style={s.muted}>
            {[d.group.sabhaName, d.group.zoneName, `${num(t.members)} members`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </Card>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Text style={s.kicker}>Kits sold by the {word}</Text>
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
        <Stat label="Total sold" value={num(t.sold)} icon="cart-outline" tone="success" />
        <Stat label="Revenue" value={money(t.revenue)} icon="wallet-outline" tone="success" />
      </Row>
      <Row style={{ marginBottom: 10 }}>
        <Stat label="Members" value={num(t.members)} icon="people-outline" tone="primary" sub={`${num(t.activeHolders)} hold kits now`} />
        {/* Tap for the teams and their members (own sabha / own team only). */}
        <Stat
          label="Kits with members"
          value={num(t.withMembers)}
          icon="cube-outline"
          tone="info"
          sub={kind === 'sabha' ? 'Tap for teams' : 'Tap for members'}
          onPress={() => router.push('/teams')}
        />
      </Row>
      <Row style={{ marginBottom: 14 }}>
        <Stat label="Cash with members" value={money(t.cashInWallets)} icon="cash-outline" tone="info" sub="Sale money in wallets" />
        <Stat label="Kit requests" value={num(t.pendingRequests)} icon="file-tray-full-outline" tone="neutral" sub="Pending with admin" />
      </Row>

      <Card>
        <SectionTitle sub="Kits sold per day, last 14 days">Daily sales</SectionTitle>
        <BarChart data={d.dailySales} />
      </Card>

      <Card style={{ paddingBottom: 6 }}>
        <SectionTitle>Recent {word} activity</SectionTitle>
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
});
