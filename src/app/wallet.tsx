import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { api, MoneyTransfer, Wallet, WalletEntry } from '../api';
import { useAuth } from '../auth';
import { useApi, usePaged } from '../hooks';
import { Avatar, Badge, Button, Card, IconTile, SectionTitle, Segmented, Text } from '../components/ui';
import { PagedList, groupStyle } from '../components/PagedList';
import { SendMoneyForm } from '../components/SendMoneyForm';
import { useFeedback } from '../components/Feedback';
import { statusTone } from '../components/tabs';
import { colors, radius, shadow } from '../theme';
import { dateTime, rupees } from '../format';

type Tab = 'transfers' | 'ledger';
type Row = MoneyTransfer | WalletEntry;
const isTransfer = (r: Row): r is MoneyTransfer => 'direction' in r;

export default function WalletScreen() {
  const { refreshMe } = useAuth();
  const fb = useFeedback();
  const [tab, setTab] = useState<Tab>('transfers');
  const wallet = useApi<Wallet>('/wallet');
  const incoming = useApi<MoneyTransfer[]>('/wallet/transfers?box=in&status=pending&limit=50');
  const paged = usePaged<Row>(tab === 'transfers' ? '/wallet/transfers' : '/wallet/ledger');
  const [acting, setActing] = useState<string | null>(null);

  const reloadAll = useCallback(() => {
    wallet.reload();
    incoming.reload();
    paged.reload();
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFocusEffect(useCallback(() => void refreshMe(), [refreshMe]));

  const respond = async (t: MoneyTransfer, action: 'accept' | 'reject' | 'cancel') => {
    if (action !== 'accept') {
      const ok = await fb.confirm({
        title: action === 'reject' ? 'Decline this money?' : 'Cancel this request?',
        message: action === 'reject' ? `${t.from_name} will be notified.` : 'The reserved amount returns to your available balance.',
        details: [{ label: 'Amount', value: rupees(t.amount) }],
        confirmText: action === 'reject' ? 'Decline' : 'Cancel request',
        cancelText: 'Keep',
        destructive: true,
      });
      if (!ok) return;
    }
    setActing(t.id + action);
    try {
      const r = await api.post<{ message: string }>(`/wallet/transfers/${t.id}/${action}`);
      fb.success(action === 'accept' ? 'Money received' : action === 'reject' ? 'Declined' : 'Cancelled', r.message);
      reloadAll();
    } catch (e) {
      fb.error('Action failed', (e as Error).message);
    } finally {
      setActing(null);
    }
  };

  const w = wallet.data;

  return (
    <PagedList<Row>
      paged={{ ...paged, refresh: reloadAll }}
      emptyText={tab === 'transfers' ? 'No money transfers yet' : 'No wallet activity yet'}
      emptyIcon="wallet-outline"
      header={
        <>
          <Card style={s.summary}>
            <Text style={s.label}>Wallet balance</Text>
            <Text style={s.balance}>{rupees(w?.balance)}</Text>
            <View style={s.row}>
              <Metric label="Available" value={rupees(w?.available)} />
              <Metric label="Reserved" value={rupees(w?.reserved)} />
              <Metric label="From sales" value={rupees(w?.fromSales)} />
            </View>
          </Card>

          {(incoming.data ?? []).length > 0 && (
            <>
              <SectionTitle sub="Accept to add the money to your wallet">Requests for you</SectionTitle>
              {incoming.data!.map((t) => (
                <Card key={t.id}>
                  <View style={s.reqHead}>
                    <Avatar name={t.from_name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={s.name}>{t.from_name}</Text>
                      <Text style={s.meta}>
                        {t.from_phone} · {dateTime(t.created_at)}
                      </Text>
                    </View>
                    <Text style={s.amountIn}>{rupees(t.amount)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', marginTop: 8 }}>
                    <MethodBadge t={t} withRef />
                  </View>
                  {t.note ? <Text style={s.note}>{t.note}</Text> : null}
                  <View style={s.actions}>
                    <Button title="Decline" variant="danger" small style={{ flex: 1 }} onPress={() => respond(t, 'reject')} loading={acting === t.id + 'reject'} disabled={!!acting} />
                    <Button title="Accept" small style={{ flex: 1.4 }} onPress={() => respond(t, 'accept')} loading={acting === t.id + 'accept'} disabled={!!acting} />
                  </View>
                </Card>
              ))}
            </>
          )}

          <SendMoneyForm wallet={w} onSent={reloadAll} />

          <Segmented
            options={[
              { key: 'transfers', label: 'Transfers' },
              { key: 'ledger', label: 'Wallet history' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </>
      }
      renderItem={({ item, index }) =>
        isTransfer(item) ? (
          <View style={groupStyle(index, paged.items.length)}>
            <TransferRow t={item} onCancel={() => respond(item, 'cancel')} busy={acting === item.id + 'cancel'} />
          </View>
        ) : (
          <View style={groupStyle(index, paged.items.length)}>
            <LedgerRow e={item} />
          </View>
        )
      }
    />
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={s.metricValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={s.metricLabel}>{label}</Text>
    </View>
  );
}

function TransferRow({ t, onCancel, busy }: { t: MoneyTransfer; onCancel: () => void; busy: boolean }) {
  const incoming = t.direction === 'in';
  return (
    <View style={s.item}>
      <IconTile icon={incoming ? 'arrow-down' : 'arrow-up'} tone={incoming ? 'success' : 'info'} size={34} />
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {incoming ? `From ${t.from_name}` : `To ${t.to_name}`}
        </Text>
        <View style={s.itemMeta}>
          <Badge text={t.status} tone={statusTone[t.status]} />
          <MethodBadge t={t} />
          <Text style={s.meta}>{dateTime(t.created_at)}</Text>
        </View>
        {t.note ? <Text style={s.note}>{t.note}</Text> : null}
        {!incoming && t.status === 'pending' ? (
          <Button title="Cancel" variant="danger" small onPress={onCancel} loading={busy} style={{ alignSelf: 'flex-start', marginTop: 8 }} />
        ) : null}
      </View>
      <Text style={[s.amount, { color: t.status === 'accepted' ? (incoming ? colors.success : colors.text) : colors.faint }]}>
        {incoming ? '+' : '−'}
        {rupees(t.amount)}
      </Text>
    </View>
  );
}

function MethodBadge({ t, withRef }: { t: MoneyTransfer; withRef?: boolean }) {
  const upi = t.method === 'upi';
  return <Badge text={upi ? (withRef && t.upi_ref ? `UPI · ${t.upi_ref}` : 'UPI') : 'Cash'} tone={upi ? 'info' : 'neutral'} />;
}

function LedgerRow({ e }: { e: WalletEntry }) {
  const credit = e.amount > 0;
  const adjust = e.type === 'sale_adjust'; // a kit admin edited or deleted a sale
  const icon = e.type === 'sale' ? 'cart-outline' : adjust ? 'create-outline' : credit ? 'arrow-down' : 'arrow-up';
  return (
    <View style={s.item}>
      <IconTile icon={icon} tone={e.type === 'sale' ? 'primary' : adjust ? 'warning' : credit ? 'success' : 'info'} size={34} />
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>
          {e.type === 'sale' ? 'Sale' : adjust ? 'Sale changed by admin' : credit ? 'Money received' : 'Money sent'}
        </Text>
        <Text style={s.meta} numberOfLines={1}>
          {[e.note, dateTime(e.created_at)].filter(Boolean).join(' · ')}
        </Text>
      </View>
      <Text style={[s.amount, { color: credit ? colors.success : colors.text }]}>
        {credit ? '+' : '−'}
        {rupees(Math.abs(e.amount))}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  summary: { paddingVertical: 16 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  balance: { fontSize: 30, fontWeight: '700', color: colors.primary, marginTop: 2 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  metricValue: { fontWeight: '700', fontSize: 14 },
  metricLabel: { color: colors.muted, fontSize: 11, marginTop: 1 },
  reqHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontWeight: '600', fontSize: 14 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  note: { color: colors.muted, fontSize: 12.5, marginTop: 6 },
  amountIn: { fontWeight: '700', fontSize: 16, color: colors.success },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  amount: { fontWeight: '700', fontSize: 14.5 },
  card: { borderRadius: radius.lg, ...shadow(1) },
});
