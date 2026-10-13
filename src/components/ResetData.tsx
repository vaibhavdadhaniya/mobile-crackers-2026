import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuth } from '../auth';
import { Banner, Button, Card, Field, IconTile, Text } from './ui';
import { Sheet } from './Sheet';
import { useFeedback } from './Feedback';
import { colors, radius } from '../theme';
import { num } from '../format';

const LABELS: Record<string, string> = {
  kit_transactions: 'Kit movements (stock, transfers, sales)',
  kit_balances: 'Kit balances of all users',
  kit_sales: 'Customer sales',
  kit_requests: 'Kit requests & returns',
  kit_wallets: 'Wallet balances',
  kit_wallet_ledger: 'Wallet history',
  kit_money_transfers: 'Money transfers',
  kit_notifications: 'Notifications',
};

// Super admin "danger zone": wipe all kit activity before handing the app to users.
export function ResetData() {
  const { refreshMe } = useAuth();
  const fb = useFeedback();
  const [open, setOpen] = useState(false);
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [confirm, setConfirm] = useState('');
  const [resetSettings, setResetSettings] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setOpen(true);
    setConfirm('');
    setError('');
    setCounts(null);
    try {
      setCounts((await api.get<{ counts: Record<string, number> }>('/admin/reset/preview')).counts);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const run = async () => {
    setBusy(true);
    setError('');
    try {
      const r = await api.post<{ message: string; backup: string }>('/admin/reset', { confirm, resetSettings });
      setOpen(false);
      fb.success('Kit data deleted', `Backup saved on server: ${r.backup}`);
      refreshMe();
    } catch (e) {
      // Toasts are hidden behind an open sheet, so show the error inside it.
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const total = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : 0;

  return (
    <>
      <Card style={s.card}>
        <View style={s.head}>
          <IconTile icon="trash-outline" tone="danger" size={34} />
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Delete all kit data</Text>
            <Text style={s.sub}>Start fresh before giving the app to members. Users and registrations are not touched.</Text>
          </View>
        </View>
        <Button title="Delete kit data…" variant="danger" icon="trash-outline" onPress={start} />
      </Card>

      <Sheet visible={open} onClose={() => !busy && setOpen(false)} title="Delete all kit data?" subtitle="This permanently removes all kit activity. A backup file is saved on the server first.">
        <View style={s.list}>
          {counts == null && !error ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 12 }} />
          ) : (
            Object.entries(LABELS).map(([k, label]) => (
              <View key={k} style={s.row}>
                <Text style={s.rowLabel}>{label}</Text>
                <Text style={s.rowValue}>{num(counts?.[k] ?? 0)}</Text>
              </View>
            ))
          )}
        </View>

        <View style={s.keep}>
          <Ionicons name="shield-checkmark-outline" size={15} color={colors.success} />
          <Text style={s.keepText}>Kept: users, registrations, events and all other app data, plus OTP / MSG91 settings.</Text>
        </View>

        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.switchTitle}>Also reset price, target & deadline</Text>
            <Text style={s.sub}>Turn on to clear selling settings too</Text>
          </View>
          <Switch value={resetSettings} onValueChange={setResetSettings} trackColor={{ true: colors.danger, false: '#E7E5E4' }} thumbColor="#fff" />
        </View>

        {error ? <Banner text={error} /> : null}

        <Field
          label='Type "DELETE" to confirm'
          icon="warning-outline"
          value={confirm}
          onChangeText={setConfirm}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="DELETE"
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setOpen(false)} disabled={busy} />
          <Button
            title={total ? `Delete ${num(total)} records` : 'Delete'}
            variant="danger"
            style={{ flex: 1.4 }}
            onPress={run}
            loading={busy}
            disabled={confirm.trim() !== 'DELETE'}
          />
        </View>
      </Sheet>
    </>
  );
}

const s = StyleSheet.create({
  card: { borderColor: '#F5C2C2' },
  head: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  title: { fontWeight: '700', fontSize: 15, color: colors.danger },
  sub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  list: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, gap: 6, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowLabel: { color: colors.text, fontSize: 13, flex: 1 },
  rowValue: { fontWeight: '700', fontSize: 13 },
  keep: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', backgroundColor: colors.successSoft, padding: 10, borderRadius: radius.md, marginBottom: 12 },
  keepText: { color: colors.success, fontSize: 12.5, flex: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  switchTitle: { fontWeight: '600', fontSize: 14 },
});
