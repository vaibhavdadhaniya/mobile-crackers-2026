import { useState } from 'react';
import { api } from '../api';
import { useAuth } from '../auth';
import { Button, Card, Field, Screen, Segmented, Text } from '../components/ui';
import { BalanceCard } from '../components/BalanceCard';
import { useFeedback } from '../components/Feedback';
import { colors } from '../theme';
import { digitsOnly, num } from '../format';

export default function Stock() {
  const { me, refreshMe } = useAuth();
  const fb = useFeedback();
  const [action, setAction] = useState<'add' | 'remove'>('add');
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const after = (me?.balance ?? 0) + (action === 'add' ? 1 : -1) * Number(qty || 0);

  const submit = async () => {
    const n = Number(qty);
    if (!n) return fb.error('Enter kit count');
    const ok = await fb.confirm({
      title: action === 'add' ? 'Add to stock?' : 'Remove from stock?',
      details: [
        { label: 'Kits', value: num(n) },
        { label: 'Stock after', value: num(after) },
      ],
      confirmText: action === 'add' ? 'Add stock' : 'Remove stock',
      destructive: action === 'remove',
      icon: action === 'add' ? 'add-circle-outline' : 'remove-circle-outline',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/admin/stock', { quantity: qty, action, note });
      fb.success('Stock updated', r.message);
      setQty('');
      setNote('');
      refreshMe();
    } catch (e) {
      fb.error('Stock not updated', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen onRefresh={refreshMe}>
      <BalanceCard label="Central stock" value={me?.balance} icon="archive-outline" />
      <Card>
        <Segmented
          options={[
            { key: 'add', label: 'Add kits' },
            { key: 'remove', label: 'Remove kits' },
          ]}
          value={action}
          onChange={setAction}
        />
        <Field
          label="Kit count"
          icon="cube-outline"
          placeholder="0"
          keyboardType="number-pad"
          maxLength={7}
          value={qty}
          onChangeText={(v) => setQty(digitsOnly(v))}
          hint={qty ? `Stock after this change: ${num(after)}` : undefined}
        />
        <Field label="Note (optional)" icon="document-text-outline" placeholder="e.g. New lot from supplier" value={note} onChangeText={setNote} />
        <Button title={action === 'add' ? 'Add to stock' : 'Remove from stock'} variant={action === 'add' ? 'primary' : 'danger'} onPress={submit} loading={busy} disabled={!qty} />
      </Card>
      <Text style={{ color: colors.muted, fontSize: 12, paddingHorizontal: 4 }}>
        Use Remove only to correct a mistake or for damaged kits. Every change is recorded in Activity.
      </Text>
    </Screen>
  );
}
