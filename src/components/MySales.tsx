import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, MySale, PaymentMethod } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { Badge, Button, Card, Empty, Field, SectionTitle, Segmented, tap, Text } from './ui';
import { Dialog } from './Dialog';
import { useFeedback } from './Feedback';
import { colors } from '../theme';
import { dateTime, digitsOnly, money, num } from '../format';

// Labels live in ../payment (unit tested); re-exported for the screens.
export { PAYMENT_OPTIONS, paymentLabel } from '../payment';
import { PAYMENT_OPTIONS, paymentLabel } from '../payment';

/**
 * "My sales" on the Sell screen: my latest sales with payment method. A sale I can still change
 * (money untouched in my wallet) has Edit, which opens a centered popup; otherwise the lock
 * reason shows on tap. Bump `refreshKey` after a new sale.
 */
export function MySales({ refreshKey = 0 }: { refreshKey?: number }) {
  const { refreshMe } = useAuth();
  const fb = useFeedback();
  const list = useApi<MySale[]>('/sales/mine?limit=30');
  const [editing, setEditing] = useState<MySale | null>(null);
  const [qty, setQty] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (refreshKey) list.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const open = (s: MySale) => {
    tap();
    if (!s.editable) return fb.info('This sale cannot be edited', s.lock_reason ?? undefined);
    setQty(String(s.quantity));
    setName(s.customer_name);
    setPhone(s.customer_phone ?? '');
    setMethod(s.payment_method);
    setEditing(s);
  };

  const save = async () => {
    const s = editing;
    if (!s) return;
    const n = Number(qty);
    if (!n) return fb.error('Enter kit count');
    if (!name.trim()) return fb.error('Enter customer name');
    if (phone && phone.length !== 10) return fb.error('Enter a valid 10 digit mobile number');
    const newTotal = Math.round(n * s.unit_price * 100) / 100;
    const ok = await fb.confirm({
      title: 'Save changes to this sale?',
      icon: 'create-outline',
      details: [
        { label: 'Kits', value: `${num(s.quantity)} → ${num(n)}` },
        { label: 'Amount', value: `${money(s.total_amount)} → ${money(newTotal)}` },
        { label: 'Payment', value: paymentLabel(method) },
        { label: 'Customer', value: name.trim() },
      ],
      confirmText: 'Save',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api.put<{ message: string }>(`/sales/${s.id}`, {
        quantity: qty,
        customerName: name.trim(),
        customerPhone: phone,
        paymentMethod: method,
      });
      fb.success('Sale updated', r.message);
      setEditing(null);
      list.reload();
      refreshMe();
    } catch (e) {
      fb.error('Could not update sale', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rows = list.data ?? [];
  return (
    <>
      <Card style={{ paddingBottom: 4 }}>
        <SectionTitle sub="Tap a sale to edit it while its money is still in your wallet">My sales</SectionTitle>
        {list.data && rows.length === 0 ? <Empty icon="cart-outline" text="No sales yet" /> : null}
        {rows.map((s, i) => (
          <Pressable key={s.id} onPress={() => open(s)} style={({ pressed }) => [s0.row, i > 0 && s0.divider, pressed && { opacity: 0.6 }]}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s0.name} numberOfLines={1}>
                {s.customer_name}
              </Text>
              <Text style={s0.meta} numberOfLines={1}>
                {[s.customer_phone, dateTime(s.created_at)].filter(Boolean).join(' · ')}
              </Text>
              <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                <Badge text={paymentLabel(s.payment_method)} tone={s.payment_method === 'upi' ? 'info' : s.payment_method === 'pending' ? 'warning' : 'neutral'} />
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s0.qty}>
                {num(s.quantity)} kit{s.quantity === 1 ? '' : 's'}
              </Text>
              <Text style={s0.meta}>{money(s.total_amount)}</Text>
            </View>
            <Ionicons
              name={s.editable ? 'create-outline' : 'lock-closed-outline'}
              size={17}
              color={s.editable ? colors.primary : colors.faint}
              style={{ marginLeft: 10 }}
            />
          </Pressable>
        ))}
      </Card>

      <Dialog
        visible={!!editing}
        onClose={() => !busy && setEditing(null)}
        title="Edit sale"
        subtitle={editing ? `${money(editing.unit_price)} per kit · ${dateTime(editing.created_at)}` : undefined}
      >
        <Field label="Kits sold" icon="cube-outline" keyboardType="number-pad" value={qty} onChangeText={(v) => setQty(digitsOnly(v))} maxLength={5} />
        <Text style={s0.preview}>New amount: {money(Math.round(Number(qty || 0) * (editing?.unit_price ?? 0) * 100) / 100)}</Text>
        <Field label="Customer name" icon="person-outline" value={name} onChangeText={setName} />
        <Field label="Customer mobile (optional)" icon="call-outline" keyboardType="phone-pad" value={phone} onChangeText={(v) => setPhone(digitsOnly(v))} maxLength={10} />
        <Text style={s0.label}>Payment</Text>
        <Segmented options={PAYMENT_OPTIONS} value={method} onChange={setMethod} />
        <View style={s0.actions}>
          <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setEditing(null)} disabled={busy} />
          <Button title="Save" style={{ flex: 1.4 }} onPress={save} loading={busy} disabled={busy} />
        </View>
      </Dialog>
    </>
  );
}

const s0 = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  qty: { fontSize: 14.5, fontWeight: '700' },
  preview: { fontSize: 12.5, color: colors.muted, marginTop: -8, marginBottom: 14 },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
});
