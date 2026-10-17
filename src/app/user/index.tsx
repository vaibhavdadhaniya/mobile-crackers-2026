import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Notification, Txn } from '../../api';
import { useAuth } from '../../auth';
import { useApi } from '../../hooks';
import { Button, Card, Empty, IconName, IconTile, LinkText, Row, Screen, SectionTitle, Segmented, Stat, tap, Text, tones } from '../../components/ui';
import { SabhaDashboard } from '../../screens/SabhaDashboard';
import { AppHeader } from '../../components/AppHeader';
import { TxnItem } from '../../components/TxnItem';
import { KitTransferRequests } from '../../components/KitTransfers';
import { useFeedback } from '../../components/Feedback';
import { colors, radius } from '../../theme';
import { dateLabel, money, num, roleLabel, rupees, timeAgo } from '../../format';

export default function UserHome() {
  const { me, refreshMe, logout } = useAuth();
  const fb = useFeedback();
  const notes = useApi<Notification[]>('/notifications');
  const history = useApi<Txn[]>('/kits/history?limit=5');
  const [refreshKey, setRefreshKey] = useState(0);
  // Sabha Admins open on their sabha dashboard and can switch to their own kits.
  const isSabhaAdmin = me?.user.role === 'sabha_admin';
  const [view, setView] = useState<'sabha' | 'mine'>('sabha');
  const onHold = me?.kitsOnHold ?? 0;
  const available = Math.max(0, (me?.balance ?? 0) - onHold);
  useFocusEffect(useCallback(() => void refreshMe(), [refreshMe]));

  // Incoming kit transfers have their own Accept / Decline cards below, so skip their notices.
  const unread = (notes.data ?? []).filter((n) => !n.read_at && n.type !== 'kit_transfer_request').slice(0, 3);

  const dismiss = async (id: string) => {
    tap();
    notes.setData((d) => d?.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)) ?? null);
    await api.post(`/notifications/${id}/read`).catch(() => {});
    refreshMe();
  };

  const onLogout = async () => {
    if (await fb.confirm({ title: 'Sign out?', message: 'You will need an OTP to sign in again.', confirmText: 'Sign out', destructive: true, icon: 'log-out-outline' })) {
      logout();
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <AppHeader fireworks title={me?.user.name ?? ''} subtitle={me ? roleLabel(me.user.role) : undefined} />
      <Screen
        refreshing={notes.refreshing}
        onRefresh={() => {
          refreshMe();
          notes.refresh();
          history.reload();
          setRefreshKey((k) => k + 1);
        }}
      >
        <KitTransferRequests box="in" refreshKey={refreshKey} onChanged={() => history.reload()} />

        {isSabhaAdmin && (
          <Segmented
            options={[
              { key: 'sabha', label: 'My Sabha' },
              { key: 'mine', label: 'My kits' },
            ]}
            value={view}
            onChange={setView}
          />
        )}

        {isSabhaAdmin && view === 'sabha' ? (
          <SabhaDashboard refreshKey={refreshKey} />
        ) : (
        <>

        <Card>
          <View style={s.kitsHead}>
            <Text style={s.kitsTitle}>My kits</Text>
            <Text style={s.balMeta}>
              {money(me?.kitPrice)} per kit{me?.sellDeadline ? ` · sell by ${dateLabel(me.sellDeadline)}` : ''}
            </Text>
          </View>
          <View style={s.kitsRow}>
            <KitCount label="Received" value={me?.receivedQty} />
            <View style={s.kitsDivider} />
            <KitCount label="Sold" value={me?.soldQty} color={colors.success} />
            <View style={s.kitsDivider} />
            <KitCount label="Available" value={available} color={colors.primary} big />
          </View>
          <View style={s.kitsFoot}>
            <Text style={s.balMeta}>Sales value {money(me?.soldAmount)}</Text>
            {onHold ? <Text style={s.balMeta}>{num(onHold)} on hold for transfer</Text> : me?.sentQty ? <Text style={s.balMeta}>{num(me.sentQty)} transferred to others</Text> : null}
          </View>
        </Card>

        <Pressable
          onPress={() => {
            tap();
            router.push('/wallet');
          }}
        >
          <Card style={s.wallet}>
            <IconTile icon="wallet-outline" size={38} />
            <View style={{ flex: 1 }}>
              <Text style={s.balLabel}>Wallet</Text>
              <Text style={s.walletValue}>{rupees(me?.walletBalance)}</Text>
            </View>
            {(me?.pendingMoneyIn ?? 0) > 0 ? (
              <View style={s.pill}>
                <Text style={s.pillText}>
                  {me!.pendingMoneyIn} request{me!.pendingMoneyIn > 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Card>
        </Pressable>

        <View style={s.actions}>
          <Action icon="cart-outline" label="Sell" tone="success" onPress={() => router.push('/user/sell')} />
          <Action icon="swap-horizontal" label="Transfer" tone="info" onPress={() => router.push('/user/transfer')} />
          <Action icon="file-tray-full-outline" label="Request" tone="warning" onPress={() => router.push('/user/request')} />
          <Action icon="wallet-outline" label="Wallet" tone="primary" onPress={() => router.push('/wallet')} />
        </View>

        {unread.map((n) => (
          <View key={n.id} style={s.notice}>
            <IconTile icon={n.type.includes('rejected') || n.type.includes('cancelled') ? 'close' : n.type.startsWith('money') ? 'wallet-outline' : n.type === 'kit_received' ? 'download-outline' : 'checkmark'} tone={n.type.includes('rejected') || n.type.includes('cancelled') ? 'danger' : n.type === 'money_request' ? 'warning' : 'success'} size={34} />
            <View style={{ flex: 1 }}>
              <Text style={s.noticeTitle}>{n.title}</Text>
              <Text style={s.noticeBody}>{n.body}</Text>
              <Text style={s.noticeTime}>{timeAgo(n.created_at)}</Text>
              {n.type === 'money_request' ? (
                <Button title="Review" small style={{ alignSelf: 'flex-start', marginTop: 8 }} onPress={() => router.push('/wallet')} />
              ) : null}
            </View>
            <Pressable onPress={() => dismiss(n.id)} hitSlop={12}>
              <Ionicons name="close" size={18} color={colors.faint} />
            </Pressable>
          </View>
        ))}


        {(me?.balance ?? 0) === 0 && !(me?.pendingKitsIn ?? 0) && (
          <Card style={s.emptyKits}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600' }}>No kits in hand</Text>
              <Text style={{ color: colors.muted, fontSize: 12, marginTop: 1 }}>Request kits from admin to start selling.</Text>
            </View>
            <Button title="Request" small onPress={() => router.push('/user/request')} />
          </Card>
        )}

        <Card style={{ paddingBottom: 6 }}>
          <SectionTitle right={<LinkText title="View all" onPress={() => router.push('/user/activity')} />}>Recent activity</SectionTitle>
          {history.data && history.data.length === 0 && <Empty icon="time-outline" text="No activity yet" />}
          {history.data?.map((t) => <TxnItem key={t.id} t={t} perspective="self" />)}
        </Card>
        </>
        )}

        <Button title="Sign out" variant="outline" icon="log-out-outline" onPress={onLogout} />
      </Screen>
    </View>
  );
}

function KitCount({ label, value, color = colors.text, big }: { label: string; value: number | undefined; color?: string; big?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ fontSize: big ? 28 : 20, fontWeight: '700', color }} numberOfLines={1} adjustsFontSizeToFit>
        {num(value)}
      </Text>
      <Text style={s.countLabel}>{label}</Text>
    </View>
  );
}

function Action({ icon, label, onPress, tone }: { icon: IconName; label: string; onPress: () => void; tone: keyof typeof tones }) {
  return (
    <Pressable
      style={({ pressed }) => [s.action, pressed && { opacity: 0.7 }]}
      onPress={() => {
        tap();
        onPress();
      }}
    >
      <IconTile icon={icon} tone={tone} size={40} />
      <Text style={s.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  balLabel: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  balMeta: { color: colors.muted, fontSize: 12 },
  kitsHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 },
  kitsTitle: { fontSize: 15, fontWeight: '700' },
  kitsRow: { flexDirection: 'row', alignItems: 'flex-end' },
  kitsDivider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border, marginHorizontal: 12 },
  kitsFoot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  countLabel: { color: colors.muted, fontSize: 12, fontWeight: '500', marginTop: 2 },
  actions: { flexDirection: 'row', marginBottom: 12, backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
  action: { flex: 1, alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 12, fontWeight: '500' },
  notice: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#CDEBD8',
  },
  noticeTitle: { fontWeight: '600', fontSize: 14 },
  noticeBody: { color: colors.muted, fontSize: 13, marginTop: 1 },
  noticeTime: { color: colors.faint, fontSize: 11, marginTop: 3 },
  wallet: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  walletValue: { fontSize: 18, fontWeight: '700', marginTop: 1 },
  pill: { backgroundColor: colors.warningSoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  pillText: { color: colors.warning, fontSize: 11.5, fontWeight: '600' },
  emptyKits: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
