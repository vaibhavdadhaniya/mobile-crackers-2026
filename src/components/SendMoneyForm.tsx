import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, UserHit, Wallet } from '../api';
import { Button, Card, Field, Segmented, Text } from './ui';
import { SearchPicker } from './SearchPicker';
import { useFeedback } from './Feedback';
import { colors } from '../theme';
import { amountInput, rupees } from '../format';
import { validAmount } from '../money';

// Send money to someone in my zone. The receiver must accept before it moves.
export function SendMoneyForm({ wallet, onSent }: { wallet: Wallet | null; onSent: () => void }) {
  const fb = useFeedback();
  const [to, setTo] = useState<UserHit | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [method, setMethod] = useState<'cash' | 'upi'>('cash');
  const [upiRef, setUpiRef] = useState('');
  const [busy, setBusy] = useState(false);
  const available = wallet?.available ?? 0;

  const submit = async () => {
    const err = validAmount(amount, available);
    if (!to) return fb.error('Select a receiver', 'Search a name or mobile number.');
    if (err) return fb.error('Check the amount', err);
    if (method === 'upi' && upiRef && upiRef.length < 6) return fb.error('Check the UPI ID', 'UPI transaction ID must be at least 6 characters.');
    const ok = await fb.confirm({
      title: 'Send money request?',
      message: `${to.name} must accept before the money moves. Until then it is reserved from your balance.`,
      icon: 'wallet-outline',
      details: [
        { label: 'To', value: to.name },
        { label: 'Mobile', value: to.phone },
        { label: 'Amount', value: rupees(Number(amount)) },
        { label: 'Paid by', value: method === 'upi' ? `UPI${upiRef ? ` · ${upiRef}` : ''}` : 'Cash' },
      ],
      confirmText: 'Send request',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/wallet/transfers', { toUserId: to.id, amount, note, method, upiRef: method === 'upi' ? upiRef : undefined });
      fb.success('Request sent', r.message);
      setTo(null);
      setAmount('');
      setNote('');
      setUpiRef('');
      onSent();
    } catch (e) {
      fb.error('Could not send', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <View style={s.head}>
        <Text style={s.title}>Send money</Text>
        {wallet?.zone ? (
          <View style={s.zone}>
            <Ionicons name="location-outline" size={12} color={colors.primaryDark} />
            <Text style={s.zoneText}>{wallet.zone.name}</Text>
          </View>
        ) : null}
      </View>
      <SearchPicker<UserHit>
        endpoint="/wallet/recipients"
        label={wallet?.scope === 'all' ? 'Receiver' : 'Receiver (your zone or kit management)'}
        placeholder="Search name or mobile number"
        selected={to}
        onSelect={setTo}
        renderMeta={(u) => u.phone}
      />
      <Field
        label="Amount"
        icon="cash-outline"
        placeholder="0"
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={(v) => setAmount(amountInput(v))}
        hint={`Available: ${rupees(available)}`}
      />
      <Text style={s.label}>Paid by</Text>
      <Segmented
        options={[
          { key: 'cash', label: 'Cash' },
          { key: 'upi', label: 'UPI' },
        ]}
        value={method}
        onChange={setMethod}
      />
      {method === 'upi' ? (
        <Field
          label="UPI transaction ID (optional)"
          icon="phone-portrait-outline"
          placeholder="e.g. 4281XXXXXXXX"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={35}
          value={upiRef}
          onChangeText={(v) => setUpiRef(v.replace(/[^A-Za-z0-9]/g, ''))}
          hint="Helps the receiver match the payment in their UPI app"
        />
      ) : null}
      <Field label="Note (optional)" icon="document-text-outline" placeholder="e.g. Sale collection" value={note} onChangeText={setNote} />
      <Button title="Send request" onPress={submit} loading={busy} disabled={!to || !amount} />
    </Card>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  zoneText: { color: colors.primaryDark, fontSize: 11.5, fontWeight: '600' },
});
