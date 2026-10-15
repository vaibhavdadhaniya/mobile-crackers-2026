import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, KitTransfer } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { Avatar, Badge, Button, Card, SectionTitle, Text } from './ui';
import { useFeedback } from './Feedback';
import { colors } from '../theme';
import { num, timeAgo } from '../format';

type Action = 'accept' | 'reject' | 'cancel';
const kitsWord = (n: number) => `${num(n)} kit${n === 1 ? '' : 's'}`;

/**
 * Pending direct kit transfers. box="in": someone is sending me kits (Accept / Decline).
 * box="out": kits I sent that wait for the receiver (Cancel); they are on hold until answered.
 * Renders nothing when there are none. Bump `refreshKey` to reload (pull-to-refresh).
 */
export function KitTransferRequests({ box, refreshKey = 0, onChanged }: { box: 'in' | 'out'; refreshKey?: number; onChanged?: () => void }) {
  const { refreshMe } = useAuth();
  const fb = useFeedback();
  const list = useApi<KitTransfer[]>(`/kits/transfers?box=${box}&status=pending&limit=50`);
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (refreshKey) list.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const items = list.data ?? [];
  if (!items.length) return null;

  const respond = async (t: KitTransfer, action: Action) => {
    const from = t.from_admin ? 'Admin' : t.from_name;
    const ok = await fb.confirm(
      action === 'accept'
        ? {
            title: 'Accept these kits?',
            icon: 'download-outline',
            details: [
              { label: 'From', value: from },
              { label: 'Kits', value: num(t.quantity) },
            ],
            confirmText: 'Accept',
          }
        : action === 'reject'
          ? {
              title: 'Decline these kits?',
              message: `${from} will be told and keeps the kits.`,
              details: [{ label: 'Kits', value: num(t.quantity) }],
              confirmText: 'Decline',
              cancelText: 'Keep',
              destructive: true,
            }
          : {
              title: 'Cancel this transfer?',
              message: 'The kits become available to you again.',
              details: [
                { label: 'To', value: t.to_name },
                { label: 'Kits', value: num(t.quantity) },
              ],
              confirmText: 'Cancel transfer',
              cancelText: 'Keep',
              destructive: true,
            }
    );
    if (!ok) return;
    setActing(t.id + action);
    try {
      const r = await api.post<{ message: string }>(`/kits/transfers/${t.id}/${action}`);
      fb.success(action === 'accept' ? 'Kits added' : action === 'reject' ? 'Declined' : 'Transfer cancelled', r.message);
    } catch (e) {
      fb.error('Action failed', (e as Error).message);
    } finally {
      setActing(null);
      list.reload();
      refreshMe();
      onChanged?.();
    }
  };

  return (
    <>
      {box === 'in' ? (
        <SectionTitle sub="Kits are added to your account only after you accept">Kits sent to you</SectionTitle>
      ) : (
        <SectionTitle sub="On hold until the receiver responds">Waiting for acceptance</SectionTitle>
      )}
      {items.map((t) => {
        const other = box === 'in' ? (t.from_admin ? 'Admin' : t.from_name) : t.to_name;
        const phone = box === 'in' ? t.from_phone : t.to_phone;
        return (
          <Card key={t.id}>
            <View style={s.head}>
              <Avatar name={other} size={36} />
              <View style={{ flex: 1 }}>
                <View style={s.nameRow}>
                  <Text style={s.name} numberOfLines={1}>
                    {other}
                  </Text>
                  {box === 'in' && t.from_admin ? <Badge text="Admin" tone="primary" /> : null}
                </View>
                <Text style={s.meta} numberOfLines={1}>
                  {[box === 'in' && t.from_admin ? null : phone, timeAgo(t.created_at)].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Text style={[s.qty, box === 'in' && { color: colors.success }]}>
                {box === 'in' ? '+' : ''}
                {kitsWord(t.quantity)}
              </Text>
            </View>
            {t.note ? <Text style={s.note}>{t.note}</Text> : null}
            <View style={s.actions}>
              {box === 'in' ? (
                <>
                  <Button title="Decline" variant="danger" small style={{ flex: 1 }} onPress={() => respond(t, 'reject')} loading={acting === t.id + 'reject'} disabled={!!acting} />
                  <Button title="Accept" small style={{ flex: 1.4 }} onPress={() => respond(t, 'accept')} loading={acting === t.id + 'accept'} disabled={!!acting} />
                </>
              ) : (
                <Button title="Cancel transfer" variant="outline" small style={{ flex: 1 }} onPress={() => respond(t, 'cancel')} loading={acting === t.id + 'cancel'} disabled={!!acting} />
              )}
            </View>
          </Card>
        );
      })}
    </>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontWeight: '600', fontSize: 14, flexShrink: 1 },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  qty: { fontWeight: '700', fontSize: 15, color: colors.text },
  note: { color: colors.muted, fontSize: 12.5, marginTop: 6 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
});
