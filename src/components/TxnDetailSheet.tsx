import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api, TxnDetail, TxnPerson } from '../api';
import { Sheet } from './Sheet';
import { Dialog } from './Dialog';
import { Badge, Button, Field, IconName, IconTile, Text, tones } from './ui';
import { useFeedback } from './Feedback';
import { colors, radius } from '../theme';
import { dateTime, digitsOnly, money, num, roleLabel } from '../format';

// Full detail of one activity entry for kit admins (GET /admin/transactions/:id).
// Open it with an id; null closes it. Sales can be edited or deleted while their money is still
// in the seller's wallet (the server decides: sale.editable / sale.lockReason).
export function TxnDetailSheet({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged?: () => void }) {
  const fb = useFeedback();
  const [d, setD] = useState<TxnDetail | null>(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);

  useEffect(() => {
    if (!id) return;
    let live = true;
    setD(null);
    setError('');
    setEditing(false);
    api
      .get<TxnDetail>(`/admin/transactions/${id}`)
      .then((r) => live && setD(r))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [id]);

  const k = d ? kind(d) : null;
  const sale = d?.sale;

  const startEdit = () => {
    if (!d || !sale) return;
    setQty(String(d.quantity));
    setName(sale.customerName);
    setPhone(sale.customerPhone ?? '');
    setEditing(true);
  };

  const save = async () => {
    if (!d || !sale?.id) return;
    const n = Number(qty);
    if (!n) return fb.error('Enter kit count');
    if (!name.trim()) return fb.error('Enter customer name');
    if (phone && phone.length !== 10) return fb.error('Enter a valid 10 digit mobile number');
    const newTotal = Math.round(n * sale.unitPrice * 100) / 100;
    const ok = await fb.confirm({
      title: 'Save changes to this sale?',
      icon: 'create-outline',
      message:
        n !== d.quantity
          ? `${n > d.quantity ? 'Takes' : 'Returns'} ${Math.abs(n - d.quantity)} kit(s) ${n > d.quantity ? 'from' : 'to'} the seller and changes their wallet by ${money(newTotal - sale.totalAmount)}.`
          : undefined,
      details: [
        { label: 'Kits', value: `${num(d.quantity)} → ${num(n)}` },
        { label: 'Amount', value: `${money(sale.totalAmount)} → ${money(newTotal)}` },
        { label: 'Customer', value: name.trim() },
      ],
      confirmText: 'Save',
    });
    if (!ok) return;
    setBusy('save');
    try {
      const r = await api.put<{ message: string }>(`/admin/sales/${sale.id}`, { quantity: qty, customerName: name.trim(), customerPhone: phone });
      fb.success('Sale updated', r.message);
      onChanged?.();
      onClose();
    } catch (e) {
      fb.error('Could not update sale', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!d || !sale?.id) return;
    const ok = await fb.confirm({
      title: 'Delete this sale?',
      message: `${num(d.quantity)} kit(s) go back to ${d.from?.name ?? 'the seller'} and ${money(sale.totalAmount)} is removed from their wallet. This cannot be undone.`,
      details: [
        { label: 'Customer', value: sale.customerName },
        { label: 'Kits', value: num(d.quantity) },
        { label: 'Amount', value: money(sale.totalAmount) },
      ],
      confirmText: 'Delete sale',
      destructive: true,
    });
    if (!ok) return;
    setBusy('delete');
    try {
      const r = await api.del<{ message: string }>(`/admin/sales/${sale.id}`);
      fb.success('Sale deleted', r.message);
      onChanged?.();
      onClose();
    } catch (e) {
      fb.error('Could not delete sale', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  return (
    <>
    <Sheet visible={!!id} onClose={onClose} title={k?.title ?? 'Activity'} subtitle={d ? dateTime(d.created_at) : undefined}>
      {error ? <Text style={s.error}>{error}</Text> : null}
      {!d && !error ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 24 }} /> : null}
      {d && k ? (
        <View style={{ paddingBottom: 6 }}>
          <View style={s.hero}>
            <IconTile icon={k.icon} tone={k.tone} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={s.qty}>
                {num(d.quantity)} kit{d.quantity === 1 ? '' : 's'}
              </Text>
              <Text style={s.muted}>{k.how}</Text>
            </View>
            <Badge text={k.badge} tone={k.tone} />
          </View>

          {d.type === 'sale' ? (
            <>
              <Person label="Sold by" p={d.from} />
              <Section label="Customer">
                <Row label="Name" value={d.sale?.customerName ?? '-'} />
                <Row label="Mobile" value={d.sale?.customerPhone || 'Not given'} />
                <Row label="Registration" value={d.sale?.linkedRegistration ? 'Linked' : 'Not linked'} />
              </Section>
              <Section label="Amount">
                <Row label="Price per kit" value={money(d.sale?.unitPrice)} />
                <Row label="Total" value={money(d.sale?.totalAmount)} strong />
              </Section>

              {sale?.editable ? (
                <View style={[s.actions, { marginTop: 14 }]}>
                  <Button title="Delete sale" icon="trash-outline" variant="danger" style={{ flex: 1 }} onPress={remove} loading={busy === 'delete'} disabled={!!busy} />
                  <Button title="Edit sale" icon="create-outline" style={{ flex: 1 }} onPress={startEdit} disabled={!!busy} />
                </View>
              ) : sale?.lockReason ? (
                <View style={s.lock}>
                  <Text style={s.lockText}>{sale.lockReason}</Text>
                </View>
              ) : null}
            </>
          ) : d.type === 'transfer' ? (
            <>
              <Person label="From" p={d.from} />
              <Person label="To" p={d.to} />
            </>
          ) : (
            <Person label={d.type === 'stock_add' ? 'Added to stock of' : 'Removed from stock of'} p={d.to ?? d.from} />
          )}

          {d.request ? (
            <Section label={d.request.type === 'return' ? 'Return request' : 'Kit request'}>
              <Row label="Asked for" value={`${num(d.request.quantity)} kits`} />
              {d.request.quantity !== d.quantity ? <Row label="Approved" value={`${num(d.quantity)} kits`} /> : null}
              <Row label="Requested on" value={dateTime(d.request.createdAt)} />
              {d.request.handledAt ? <Row label="Approved on" value={dateTime(d.request.handledAt)} /> : null}
              {d.request.note ? <Row label="Request note" value={d.request.note} /> : null}
              {d.request.adminNote ? <Row label="Admin note" value={d.request.adminNote} /> : null}
            </Section>
          ) : null}

          {d.transferRequest ? (
            <Section label="Transfer request">
              <Row label="Sent on" value={dateTime(d.transferRequest.createdAt)} />
              {d.transferRequest.respondedAt ? <Row label="Accepted on" value={dateTime(d.transferRequest.respondedAt)} /> : null}
            </Section>
          ) : null}

          <Section label="Record">
            {d.by ? <Row label="Done by" value={d.by.name} /> : null}
            <Row label="Date & time" value={dateTime(d.created_at)} />
            {d.note ? <Row label="Note" value={d.note} /> : null}
            <Row label="Entry ID" value={d.id.slice(0, 8)} />
          </Section>
        </View>
      ) : null}
    </Sheet>

    {/* Edit sale: centered popup over the detail sheet. */}
    <Dialog
      visible={editing && !!sale?.editable}
      onClose={() => !busy && setEditing(false)}
      title="Edit sale"
      subtitle={sale ? `${money(sale.unitPrice)} per kit · sold by ${d?.from?.name ?? 'seller'}` : undefined}
    >
      <Field label="Kits sold" icon="cube-outline" keyboardType="number-pad" value={qty} onChangeText={(v) => setQty(digitsOnly(v))} maxLength={5} />
      <Text style={s.preview}>New amount: {money(Math.round(Number(qty || 0) * (sale?.unitPrice ?? 0) * 100) / 100)}</Text>
      <Field label="Customer name" icon="person-outline" value={name} onChangeText={setName} />
      <Field label="Customer mobile (optional)" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={(v) => setPhone(digitsOnly(v))} maxLength={10} />
      <View style={[s.actions, { marginTop: 4 }]}>
        <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(false)} disabled={!!busy} />
        <Button title="Save" style={{ flex: 1.4 }} onPress={save} loading={busy === 'save'} disabled={!!busy} />
      </View>
    </Dialog>
    </>
  );
}

function kind(d: TxnDetail): { title: string; how: string; badge: string; icon: IconName; tone: keyof typeof tones } {
  switch (d.type) {
    case 'stock_add':
      return { title: 'Stock added', how: 'Added to central stock', badge: 'Stock in', icon: 'add', tone: 'success' };
    case 'stock_remove':
      return { title: 'Stock removed', how: 'Removed from central stock', badge: 'Stock out', icon: 'remove', tone: 'danger' };
    case 'sale':
      return { title: 'Kit sale', how: `Sold to ${d.sale?.customerName ?? 'customer'}`, badge: 'Sale', icon: 'cart-outline', tone: 'primary' };
    default:
      if (d.request?.type === 'return') return { title: 'Kits returned', how: 'Return request approved', badge: 'Return', icon: 'return-down-back', tone: 'info' };
      if (d.request) return { title: 'Kits sent on request', how: 'Kit request approved', badge: 'Request', icon: 'file-tray-full-outline', tone: 'warning' };
      return { title: 'Kit transfer', how: d.transferRequest ? 'Direct transfer, accepted by receiver' : 'Direct transfer', badge: 'Transfer', icon: 'swap-horizontal', tone: 'info' };
  }
}

function Person({ label, p }: { label: string; p: TxnPerson | null }) {
  return (
    <Section label={label}>
      {p ? (
        <>
          <Row label="Name" value={p.isAdmin ? `${p.name} (Kit management)` : p.name} strong />
          <Row label="Mobile" value={p.phone} />
          <Row label="Role" value={roleLabel(p.role)} />
          {p.sabha ? <Row label="Sabha" value={p.sabha} /> : null}
          {p.zone ? <Row label="Zone" value={p.zone} /> : null}
        </>
      ) : (
        <Row label="Name" value="Deleted user" />
      )}
    </Section>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionLabel}>{label}</Text>
      <View style={s.box}>{children}</View>
    </View>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={[s.rowValue, strong && { fontWeight: '700' }]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, marginBottom: 6 },
  qty: { fontSize: 20, fontWeight: '700' },
  muted: { color: colors.muted, fontSize: 12.5, marginTop: 1 },
  error: { color: colors.danger, marginVertical: 16 },
  section: { marginTop: 12 },
  sectionLabel: { fontSize: 11.5, fontWeight: '600', color: colors.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
  box: { backgroundColor: colors.surface, borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  rowLabel: { color: colors.muted, fontSize: 13 },
  rowValue: { fontSize: 13, fontWeight: '500', flexShrink: 1, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 10 },
  preview: { fontSize: 12.5, color: colors.muted, marginTop: -8, marginBottom: 14 },
  lock: { marginTop: 14, backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, borderLeftWidth: 3, borderLeftColor: colors.warning },
  lockText: { fontSize: 12.5, color: colors.muted, lineHeight: 18 },
});
