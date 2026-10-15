import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { api, KitRequest } from '../../api';
import { useAuth } from '../../auth';
import { usePaged } from '../../hooks';
import { Badge, Button, Card, Field, QuickPicks, SectionTitle, Segmented, Text } from '../../components/ui';
import { PagedList } from '../../components/PagedList';
import { useFeedback } from '../../components/Feedback';
import { statusTone } from '../../components/tabs';
import { colors } from '../../theme';
import { dateTime, digitsOnly, num } from '../../format';

type Mode = 'request' | 'return';

export default function RequestKits() {
  const { me, refreshMe } = useAuth();
  const fb = useFeedback();
  const params = useLocalSearchParams<{ mode?: string }>();
  const [mode, setMode] = useState<Mode>('request');
  const paged = usePaged<KitRequest>('/requests/mine');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  // Kits on hold for pending outgoing transfers cannot be sold or returned.
  const balance = Math.max(0, (me?.balance ?? 0) - (me?.kitsOnHold ?? 0));
  const isReturn = mode === 'return';

  useEffect(() => {
    if (params.mode === 'return' || params.mode === 'request') {
      setMode(params.mode);
      setQty('');
      // Clear it so the next Request/Return shortcut from Home switches the mode again.
      router.setParams({ mode: undefined });
    }
  }, [params.mode]);

  const submit = async () => {
    const n = Number(qty);
    if (!n) return fb.error('Enter kit count');
    if (isReturn && n > balance) return fb.error('Not enough kits', `You hold ${num(balance)} kits.`);
    if (isReturn) {
      const ok = await fb.confirm({
        title: 'Return kits to admin?',
        message: 'Kits move to admin after the admin accepts the return.',
        details: [{ label: 'Kits to return', value: num(n) }],
        confirmText: 'Send return request',
        icon: 'return-down-back',
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/requests', { quantity: qty, note, type: mode });
      fb.success(isReturn ? 'Return requested' : 'Request sent', r.message);
      setQty('');
      setNote('');
      paged.reload();
      refreshMe();
    } catch (e) {
      fb.error('Could not send', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const cancel = async (r: KitRequest) => {
    const ok = await fb.confirm({ title: `Cancel this ${r.type}?`, message: `${num(r.quantity)} kits`, confirmText: 'Cancel it', cancelText: 'Keep', destructive: true });
    if (!ok) return;
    try {
      await api.post(`/requests/${r.id}/cancel`);
      fb.success('Cancelled');
      paged.reload();
    } catch (e) {
      fb.error('Could not cancel', (e as Error).message);
    }
  };

  return (
    <PagedList
      paged={paged}
      emptyText="No requests yet"
      emptyIcon="file-tray-outline"
      header={
        <>
          <Card>
            <Segmented
              options={[
                { key: 'request', label: 'Request kits' },
                { key: 'return', label: 'Return kits' },
              ]}
              value={mode}
              onChange={(m) => {
                setMode(m);
                setQty('');
              }}
            />
            <Text style={s.help}>
              {isReturn ? `Return unsold kits to admin. You hold ${num(balance)} kits.` : 'Ask admin to send you more kits.'}
            </Text>
            <Field
              label={isReturn ? 'Kits to return' : 'Kits needed'}
              icon="cube-outline"
              placeholder="0"
              keyboardType="number-pad"
              maxLength={6}
              value={qty}
              onChangeText={(v) => setQty(digitsOnly(v))}
            />
            <QuickPicks values={isReturn ? [1, 5, 10, balance].filter((v, i, a) => v > 0 && a.indexOf(v) === i) : [10, 25, 50, 100]} max={isReturn ? balance : undefined} value={qty} onPick={setQty} />
            <Field label="Note (optional)" icon="document-text-outline" placeholder={isReturn ? 'Reason for return' : 'Message for admin'} value={note} onChangeText={setNote} />
            <Button title={isReturn ? 'Send return request' : 'Send request'} onPress={submit} loading={busy} disabled={!qty || (isReturn && balance === 0)} />
          </Card>
          <SectionTitle>My requests & returns</SectionTitle>
        </>
      }
      renderItem={({ item: r }) => (
        <Card>
          <View style={s.row}>
            <Badge text={r.type === 'return' ? 'Return' : 'Request'} tone={r.type === 'return' ? 'info' : 'neutral'} />
            <Text style={s.qty}>{num(r.quantity)} kits</Text>
            <Badge text={r.status} tone={statusTone[r.status]} />
          </View>
          {r.status === 'approved' && r.approved_quantity ? (
            <Text style={s.ok}>
              {num(r.approved_quantity)} kits {r.type === 'return' ? 'returned' : 'received'}
            </Text>
          ) : null}
          {r.note ? <Text style={s.note}>{r.note}</Text> : null}
          {r.admin_note ? <Text style={s.note}>Admin: {r.admin_note}</Text> : null}
          <Text style={s.time}>{dateTime(r.created_at)}</Text>
          {r.status === 'pending' && <Button title="Cancel" variant="danger" small style={{ marginTop: 10, alignSelf: 'flex-start' }} onPress={() => cancel(r)} />}
        </Card>
      )}
    />
  );
}

const s = StyleSheet.create({
  help: { color: colors.muted, fontSize: 12.5, marginTop: -4, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qty: { flex: 1, fontSize: 15, fontWeight: '700' },
  ok: { color: colors.success, fontWeight: '500', fontSize: 13, marginTop: 6 },
  note: { color: colors.muted, marginTop: 4, fontSize: 13 },
  time: { color: colors.faint, fontSize: 11, marginTop: 6 },
});
