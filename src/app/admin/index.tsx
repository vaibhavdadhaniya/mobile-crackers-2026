import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Analytics, Wallet } from '../../api';
import { useAuth } from '../../auth';
import { useApi } from '../../hooks';
import { Banner, Card, Empty, IconName, IconTile, LinkText, Row, Screen, SectionTitle, Stat, tap, Text, tones } from '../../components/ui';
import { AppHeader } from '../../components/AppHeader';
import { BarChart, ProgressBar } from '../../components/Charts';
import { TxnItem } from '../../components/TxnItem';
import { KitTransferRequests } from '../../components/KitTransfers';
import { TxnDetailSheet } from '../../components/TxnDetailSheet';
import { centralStockTile } from '../../centralStock';
import { colors, radius } from '../../theme';
import { dateLabel, money, num, rupees } from '../../format';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function AdminDashboard() {
  const { me, refreshMe } = useAuth();
  const { data: a, error, refreshing, refresh } = useApi<Analytics>('/admin/analytics');
  const wallet = useApi<Wallet>('/wallet');
  const moneyIn = wallet.data?.pendingIncoming ?? me?.pendingMoneyIn ?? 0;
  const [refreshKey, setRefreshKey] = useState(0);
  const [openTxn, setOpenTxn] = useState<string | null>(null);
  const stock = centralStockTile({
    centralStock: a?.totals.centralStock ?? 0,
    onHold: a?.totals.centralOnHold ?? 0,
    onHoldCount: a?.totals.centralOnHoldCount ?? 0,
    requested: a?.totals.pendingRequestQty ?? 0,
    requestCount: a?.totals.pendingRequests ?? 0,
  });
  useFocusEffect(useCallback(() => void refreshMe(), [refreshMe]));

  return (
    <View style={{ flex: 1 }}>
      <AppHeader fireworks title={me?.user.name ?? ''} subtitle={`${greeting()} · ${me?.user.role === 'super_admin' ? 'Super Admin' : 'Kit management'}`} />
      <Screen
        refreshing={refreshing}
        onRefresh={() => {
          refresh();
          refreshMe();
          wallet.reload();
          setRefreshKey((k) => k + 1);
        }}
      >
        {error ? <Banner text={error} /> : null}

        <KitTransferRequests box="in" refreshKey={refreshKey} onChanged={refresh} />

        <View style={s.actions}>
          <Action icon="add" label="Add stock" tone="primary" onPress={() => router.push('/stock')} />
          <Action icon="swap-horizontal" label="Transfer" tone="info" onPress={() => router.push('/admin/transfer')} />
          <Action icon="cart-outline" label="Sell" tone="success" onPress={() => router.push('/sell')} />
          <Action icon="wallet-outline" label="Wallet" tone="warning" badge={moneyIn} onPress={() => router.push('/wallet')} />
          <Action icon="bar-chart-outline" label="Reports" tone="primary" onPress={() => router.push('/reports')} />
        </View>

        {a && (
          <>
            <TargetCard a={a} />

            {moneyIn > 0 && (
              <Pressable
                onPress={() => {
                  tap();
                  router.push('/wallet');
                }}
                style={({ pressed }) => [s.alert, pressed && { opacity: 0.85 }]}
              >
                <IconTile icon="wallet-outline" tone="warning" size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>
                    {moneyIn} money request{moneyIn > 1 ? 's' : ''}
                  </Text>
                  <Text style={s.alertSub}>
                    {wallet.data ? `${rupees(wallet.data.pendingIncomingAmount)} waiting for you to accept` : 'Waiting for you to accept'}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.warning} />
              </Pressable>
            )}

            {a.totals.pendingRequests > 0 && (
              <Pressable
                onPress={() => {
                  tap();
                  router.push('/admin/requests');
                }}
                style={({ pressed }) => [s.alert, pressed && { opacity: 0.85 }]}
              >
                <IconTile icon="file-tray-full-outline" tone="warning" size={34} />
                <View style={{ flex: 1 }}>
                  <Text style={s.alertTitle}>
                    {a.totals.pendingRequests} pending request{a.totals.pendingRequests > 1 ? 's' : ''}
                  </Text>
                  <Text style={s.alertSub}>Requests and returns waiting for review</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.warning} />
              </Pressable>
            )}

            <Row style={{ marginBottom: 10 }}>
              {/* Kits on hold for pending transfers + kits asked for in pending requests: a minus. */}
              <Stat
                label="Central stock"
                value={num(a.totals.centralStock)}
                icon="archive-outline"
                badge={stock.minus ? { text: `−${num(stock.minus)}`, tone: 'danger' } : undefined}
                sub={stock.sub}
                onPress={
                  a.totals.centralOnHoldCount
                    ? () => router.push('/admin/transfer')
                    : a.totals.pendingRequests
                      ? () => router.push('/admin/requests')
                      : undefined
                }
              />
              <Stat
                label="With users"
                value={num(a.totals.withUsers)}
                icon="people-outline"
                tone="info"
                sub={`${a.totals.activeHolders} holders · tap for teams`}
                onPress={() => router.push('/teams')}
              />
            </Row>
            <Row style={{ marginBottom: 10 }}>
              <Stat label="Total sold" value={num(a.totals.sold)} icon="cart-outline" tone="success" sub={`${a.totals.saleCount} sales`} />
              <Stat label="Revenue" value={money(a.totals.revenue)} icon="wallet-outline" tone="success" sub={`${money(a.target.kitPrice)} per kit`} />
            </Row>
            <Row style={{ marginBottom: 14 }}>
              <Stat label="Sold today" value={num(a.totals.soldToday)} icon="today-outline" tone="warning" sub={`${num(a.totals.soldLast7)} in last 7 days`} />
              <Stat label="Stock received" value={num(a.totals.stockAdded)} icon="download-outline" tone="neutral" sub={`${num(a.totals.transferred)} transferred`} />
            </Row>

            <Row style={{ marginBottom: 14 }}>
              <Stat label="Cash with users" value={money(a.totals.cashInWallets)} icon="wallet-outline" tone="info" sub="Sale money in wallets" />
              <Stat label="Transfers pending" value={money(a.totals.cashPending)} icon="hourglass-outline" tone="warning" sub="Awaiting acceptance" />
            </Row>

            <Card>
              <SectionTitle sub={a.target.sellTarget && !a.target.expired ? 'Dashed line shows the daily pace needed' : undefined}>
                Sales, last 14 days
              </SectionTitle>
              <BarChart data={a.dailySales} targetPerDay={a.target.sellTarget && !a.target.expired ? a.target.requiredPerDay : undefined} />
            </Card>

            <Card>
              <SectionTitle right={<LinkText title="View all" onPress={() => router.push('/holders')} />}>Top sellers</SectionTitle>
              {a.topSellers.length === 0 && <Empty icon="trophy-outline" text="No sales yet" />}
              {a.topSellers.map((t, i) => (
                <View key={t.id} style={[s.rankRow, i > 0 && s.divider]}>
                  <Text style={s.rank}>{i + 1}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.rankName}>{t.name}</Text>
                    <Text style={s.rankMeta}>{t.phone}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.rankQty}>{num(t.qty)} kits</Text>
                    <Text style={s.rankMeta}>{money(t.amount)}</Text>
                  </View>
                </View>
              ))}
            </Card>

            <Card>
              <SectionTitle sub="Kits issued but not yet sold">Kits in hand</SectionTitle>
              {a.topHolders.length === 0 && <Empty icon="cube-outline" text="No kits with users" />}
              {a.topHolders.map((h, i) => {
                const max = a.topHolders[0]?.balance || 1;
                return (
                  <View key={h.id} style={[{ paddingVertical: 8 }, i > 0 && s.divider]}>
                    <View style={{ flexDirection: 'row', marginBottom: 6 }}>
                      <Text style={[s.rankName, { flex: 1 }]}>{h.name}</Text>
                      <Text style={s.rankQty}>{num(h.balance)}</Text>
                    </View>
                    <ProgressBar pct={(h.balance / max) * 100} />
                  </View>
                );
              })}
            </Card>

            <Card style={{ paddingBottom: 6 }}>
              <SectionTitle right={<LinkText title="View all" onPress={() => router.push('/admin/activity')} />}>Recent activity</SectionTitle>
              {a.recent.length === 0 && <Empty icon="time-outline" text="No activity yet" />}
              {a.recent.slice(0, 5).map((t) => (
                <Pressable key={t.id} onPress={() => setOpenTxn(t.id)} style={({ pressed }) => pressed && { opacity: 0.6 }}>
                  <TxnItem t={t} />
                </Pressable>
              ))}
            </Card>
          </>
        )}
      </Screen>
      <TxnDetailSheet id={openTxn} onClose={() => setOpenTxn(null)} onChanged={() => { refresh(); refreshMe(); }} />
    </View>
  );
}

function TargetCard({ a }: { a: Analytics }) {
  const t = a.target;
  if (!t.sellTarget) {
    return (
      <Pressable
        onPress={() => {
          tap();
          router.push('/admin/settings');
        }}
      >
        <Card style={s.setTarget}>
          <IconTile icon="flag-outline" size={34} />
          <View style={{ flex: 1 }}>
            <Text style={s.alertTitle}>Set a selling target</Text>
            <Text style={s.alertSub}>Add target kits and the last selling date in Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Card>
      </Pressable>
    );
  }
  const pct = t.progressPct ?? 0;
  const tone: keyof typeof tones = t.expired ? 'danger' : t.remaining === 0 ? 'success' : t.onTrack ? 'success' : 'warning';
  const status = t.expired ? 'Deadline passed' : t.remaining === 0 ? 'Achieved' : t.onTrack ? 'On track' : 'Behind';
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <Text style={s.kicker}>Selling target</Text>
          <Text style={s.big}>
            {num(a.totals.sold)} <Text style={s.bigOf}>/ {num(t.sellTarget)} kits</Text>
          </Text>
        </View>
        <View style={[s.status, { backgroundColor: tones[tone].bg }]}>
          <Text style={[s.statusText, { color: tones[tone].fg }]}>{status}</Text>
        </View>
      </View>
      <View style={{ marginTop: 10 }}>
        <ProgressBar pct={pct} />
      </View>
      <Text style={s.pct}>{pct}% achieved</Text>

      <View style={[s.reminder, { backgroundColor: tones[tone].bg }]}>
        <Ionicons name="alarm-outline" size={16} color={tones[tone].fg} />
        <Text style={[s.reminderText, { color: tones[tone].fg }]}>
          {t.expired
            ? `Deadline ${dateLabel(t.sellDeadline)} passed. ${num(t.remaining)} kits unsold.`
            : t.remaining === 0
              ? 'Target achieved.'
              : t.sellDeadline
                ? `Sell ${num(t.remaining)} more by ${dateLabel(t.sellDeadline)} (${t.daysLeft} day${t.daysLeft === 1 ? '' : 's'} left)`
                : `Sell ${num(t.remaining)} more kits. Set a last date in Settings.`}
        </Text>
      </View>

      {!t.expired && t.remaining > 0 && t.sellDeadline ? (
        <View style={s.paceRow}>
          <Pace label="Needed per day" value={num(t.requiredPerDay)} />
          <Pace label="Current pace" value={`${t.avgPerDay7}/day`} />
          <Pace label="Projected" value={num(t.projected)} />
        </View>
      ) : null}
    </Card>
  );
}

function Pace({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontWeight: '700', fontSize: 15 }}>{value}</Text>
      <Text style={{ color: colors.muted, fontSize: 11, marginTop: 1 }}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, tone, badge }: { icon: IconName; label: string; onPress: () => void; tone: keyof typeof tones; badge?: number }) {
  return (
    <Pressable
      style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]}
      onPress={() => {
        tap();
        onPress();
      }}
    >
      <View>
        <IconTile icon={icon} tone={tone} size={40} />
        {badge ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{badge > 9 ? '9+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  actions: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  badge: { position: 'absolute', top: -5, right: -7, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, borderWidth: 2, borderColor: '#fff' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  actionLabel: { fontSize: 12, fontWeight: '500' },
  kicker: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  big: { fontSize: 22, fontWeight: '700', marginTop: 2 },
  bigOf: { fontSize: 14, fontWeight: '500', color: colors.muted },
  status: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { fontWeight: '600', fontSize: 11.5 },
  pct: { color: colors.muted, fontSize: 12, marginTop: 6 },
  reminder: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, marginTop: 10 },
  reminderText: { flex: 1, fontWeight: '500', fontSize: 13 },
  paceRow: { flexDirection: 'row', marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  setTarget: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F6D9A8',
  },
  alertTitle: { fontWeight: '600', fontSize: 14 },
  alertSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9 },
  rank: { width: 22, textAlign: 'center', color: colors.muted, fontWeight: '600' },
  rankName: { fontWeight: '600', fontSize: 14 },
  rankMeta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  rankQty: { fontWeight: '700', fontSize: 14 },
});
