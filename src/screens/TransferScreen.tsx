import { useState } from 'react';
import { router } from 'expo-router';
import { api, UserHit, Wallet } from '../api';
import { useApi } from '../hooks';
import { SendMoneyForm } from '../components/SendMoneyForm';
import { useAuth } from '../auth';
import { Button, Card, Field, LinkText, QuickPicks, Screen, Segmented } from '../components/ui';
import { SearchPicker } from '../components/SearchPicker';
import { BalanceCard } from '../components/BalanceCard';
import { KitTransferRequests } from '../components/KitTransfers';
import { useFeedback } from '../components/Feedback';
import { digitsOnly, num, rupees } from '../format';

export default function TransferScreen() {
  const { me, refreshMe } = useAuth();
  const fb = useFeedback();
  const [to, setTo] = useState<UserHit | null>(null);
  const [qty, setQty] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'kits' | 'money'>('kits');
  const [refreshKey, setRefreshKey] = useState(0);
  const wallet = useApi<Wallet>('/wallet');
  const onHold = me?.kitsOnHold ?? 0;
  // Kits in my pending outgoing requests stay in the balance but cannot be sent again.
  const balance = Math.max(0, (me?.balance ?? 0) - onHold);
  const isAdmin = !!me?.user.isAdmin;

  const submit = async () => {
    const n = Number(qty);
    if (!to) return fb.error('Select a receiver', 'Search and select who should receive the kits.');
    if (!n) return fb.error('Enter kit count');
    if (n > balance) return fb.error('Not enough kits', `You have ${num(balance)} kits available.`);
    const ok = await fb.confirm({
      title: 'Send transfer request?',
      message: 'The kits move only after the receiver accepts. Until then they are on hold.',
      icon: 'swap-horizontal',
      details: [
        { label: 'To', value: to.name },
        { label: 'Mobile', value: to.phone },
        { label: 'Kits', value: num(n) },
      ],
      confirmText: 'Send request',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/kits/transfer', { toUserId: to.id, quantity: qty, note });
      fb.success('Request sent', r.message);
      setTo(null);
      setQty('');
      setNote('');
      refreshMe();
      setRefreshKey((k) => k + 1);
    } catch (e) {
      fb.error('Transfer failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      onRefresh={() => {
        refreshMe();
        wallet.reload();
        setRefreshKey((k) => k + 1);
      }}
    >
      <Segmented
        options={[
          { key: 'kits', label: 'Kits' },
          { key: 'money', label: 'Money' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'money' ? (
        <>
          <BalanceCard label="Wallet available" value={undefined} icon="wallet-outline" amount={rupees(wallet.data?.available)} />
          <SendMoneyForm wallet={wallet.data} onSent={() => wallet.reload()} />
          <LinkText title="Open wallet & requests" onPress={() => router.push('/wallet')} />
        </>
      ) : (
      <>
      <KitTransferRequests box="in" refreshKey={refreshKey} />
      <BalanceCard
        label={isAdmin ? 'Central stock available' : 'Kits available'}
        value={balance}
        extra={onHold ? { label: 'On hold', value: num(onHold) } : undefined}
      />
      <Card>
        <SearchPicker<UserHit>
          endpoint="/users/search"
          label="Receiver"
          placeholder="Search by name or mobile number"
          selected={to}
          onSelect={setTo}
          renderMeta={(u) => `${u.phone} · holds ${num(u.balance)} kits`}
        />
        <Field label="Number of kits" icon="cube-outline" placeholder="0" keyboardType="number-pad" value={qty} onChangeText={(v) => setQty(digitsOnly(v))} maxLength={6} />
        <QuickPicks values={[5, 10, 25, 50]} max={balance} value={qty} onPick={setQty} />
        <Field label="Note (optional)" icon="document-text-outline" placeholder="Add a note" value={note} onChangeText={setNote} />
        <Button title="Send transfer request" onPress={submit} loading={busy} disabled={!to || !qty} />
      </Card>
      <KitTransferRequests box="out" refreshKey={refreshKey} />
      </>
      )}
    </Screen>
  );
}
