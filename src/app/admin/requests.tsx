import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, KitRequest } from '../../api';
import { useAuth } from '../../auth';
import { usePaged } from '../../hooks';
import { Avatar, Badge, Banner, Button, Card, Chips, Field, Segmented, Text } from '../../components/ui';
import { Sheet } from '../../components/Sheet';
import { PagedList } from '../../components/PagedList';
import { useFeedback } from '../../components/Feedback';
import { statusTone } from '../../components/tabs';
import { colors } from '../../theme';
import { dateTime, digitsOnly, num } from '../../format';

type Status = 'pending' | 'approved' | 'rejected' | '';
type Kind = '' | 'request' | 'return';

const STATUS: { key: Status; label: string }[] = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: '', label: 'All' },
];

export default function AdminRequests() {
  const { me, refreshMe } = useAuth();
  const fb = useFeedback();
  const [status, setStatus] = useState<Status>('pending');
  const [kind, setKind] = useState<Kind>('');
  const params = [status && `status=${status}`, kind && `type=${kind}`].filter(Boolean).join('&');
  const paged = usePaged<KitRequest>(`/admin/requests${params ? `?${params}` : ''}`);
  const [active, setActive] = useState<KitRequest | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);

  const [sheetError, setSheetError] = useState('');

  const open = (r: KitRequest) => {
    setSheetError('');
    setActive(r);
    setQty(String(r.quantity));
    setNote('');
  };

  const act = async (action: 'approve' | 'reject') => {
    if (!active) return;
    setSheetError('');
    setBusy(action);
    try {
      const r = await api.post<{ message: string }>(`/admin/requests/${active.id}/${action}`, {
        quantity: action === 'approve' ? qty : undefined,
        note: note || undefined,
      });
      setActive(null);
      fb.success(action === 'approve' ? 'Approved' : 'Rejected', r.message);
      paged.reload();
      refreshMe();
    } catch (e) {
      // A toast would be hidden behind the open sheet, so show the error inside it.
      setSheetError((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const isReturn = active?.type === 'return';

  return (
    <>
      <PagedList
        paged={paged}
        emptyText={status === 'pending' ? 'No pending requests' : 'No requests found'}
        emptyIcon="checkmark-done-outline"
        header={
          <>
            <Segmented
              options={[
                { key: '', label: 'All' },
                { key: 'request', label: 'Kit requests' },
                { key: 'return', label: 'Returns' },
              ]}
              value={kind}
              onChange={setKind}
            />
            <Chips options={STATUS} value={status} onChange={setStatus} />
          </>
        }
        renderItem={({ item: r }) => (
          <Card>
            <View style={s.head}>
              <Avatar name={r.user_name ?? ''} size={36} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{r.user_name}</Text>
                <Text style={s.meta}>
                  {r.user_phone} · holds {num(r.user_balance)}
                </Text>
              </View>
              <Badge text={r.status} tone={statusTone[r.status]} />
            </View>
            <View style={s.body}>
              <Badge text={r.type === 'return' ? 'Return' : 'Request'} tone={r.type === 'return' ? 'info' : 'neutral'} />
              <Text style={s.qty}>
                {num(r.quantity)} kits
                {r.approved_quantity && r.approved_quantity !== r.quantity ? (
                  <Text style={s.sent}> · {num(r.approved_quantity)} {r.type === 'return' ? 'accepted' : 'sent'}</Text>
                ) : null}
              </Text>
            </View>
            {r.note ? <Text style={s.note}>{r.note}</Text> : null}
            <Text style={s.time}>
              {dateTime(r.created_at)}
              {r.handled_by_name ? ` · handled by ${r.handled_by_name}` : ''}
            </Text>
            {r.status === 'pending' && <Button title="Review" small variant="outline" style={{ marginTop: 10 }} onPress={() => open(r)} />}
          </Card>
        )}
      />

      <Sheet
        visible={!!active}
        onClose={() => setActive(null)}
        title={isReturn ? 'Accept kit return' : 'Approve kit request'}
        subtitle={
          isReturn
            ? `${active?.user_name} wants to return ${num(active?.quantity)} kits (holds ${num(active?.user_balance)})`
            : `${active?.user_name} requested ${num(active?.quantity)} kits · Your stock: ${num(me?.balance)}`
        }
      >
        <Field
          label={isReturn ? 'Kits to accept' : 'Kits to send'}
          icon="cube-outline"
          keyboardType="number-pad"
          maxLength={6}
          value={qty}
          onChangeText={(v) => setQty(digitsOnly(v))}
          hint={isReturn ? 'Kits move back to central stock' : 'You can send fewer kits than requested'}
        />
        {sheetError ? <Banner text={sheetError} /> : null}
        <Field label="Note (optional)" icon="document-text-outline" value={note} onChangeText={setNote} placeholder="Message to user" />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Reject" variant="danger" style={{ flex: 1 }} onPress={() => act('reject')} loading={busy === 'reject'} disabled={!!busy} />
          <Button title={isReturn ? 'Accept return' : 'Approve & send'} style={{ flex: 1.4 }} onPress={() => act('approve')} loading={busy === 'approve'} disabled={!qty || !!busy} />
        </View>
      </Sheet>
    </>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontWeight: '600', fontSize: 14.5 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  body: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  qty: { fontSize: 15, fontWeight: '700' },
  sent: { fontWeight: '500', color: colors.success, fontSize: 13 },
  note: { color: colors.muted, marginTop: 6, fontSize: 13 },
  time: { color: colors.faint, fontSize: 11, marginTop: 6 },
});
