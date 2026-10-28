import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { KitTransfer } from '../api';
import { useApi } from '../hooks';
import { Badge, Card, Empty, IconTile, SectionTitle, Text, tones } from './ui';
import { colors } from '../theme';
import { dateTime, num } from '../format';

const STATUS: Record<KitTransfer['status'], { label: string; tone: keyof typeof tones }> = {
  pending: { label: 'Waiting', tone: 'warning' },
  accepted: { label: 'Accepted', tone: 'success' },
  rejected: { label: 'Declined', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
};

/** Transfer screen: my latest kit transfer entries, sent and received, with their status. */
export function TransferEntries({ refreshKey = 0 }: { refreshKey?: number }) {
  const list = useApi<KitTransfer[]>('/kits/transfers?box=all&limit=30');

  useEffect(() => {
    if (refreshKey) list.reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const rows = list.data ?? [];
  return (
    <Card style={{ paddingBottom: 4 }}>
      <SectionTitle sub="Kits you sent and received">Transfer entries</SectionTitle>
      {list.data && rows.length === 0 ? <Empty icon="swap-horizontal" text="No transfers yet" /> : null}
      {rows.map((t, i) => {
        const out = t.direction === 'out';
        const st = STATUS[t.status];
        const other = out ? t.to_name : t.from_admin ? `${t.from_name} (Admin)` : t.from_name;
        return (
          <View key={t.id} style={[s.row, i > 0 && s.divider]}>
            <IconTile icon={out ? 'arrow-up' : 'arrow-down'} tone={out ? 'info' : 'success'} size={32} />
            <View style={{ flex: 1, paddingHorizontal: 10 }}>
              <Text style={s.name} numberOfLines={1}>
                {out ? 'To' : 'From'} {other}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                {[dateTime(t.created_at), t.note].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Text style={[s.qty, { color: t.status === 'accepted' ? (out ? colors.text : colors.success) : colors.muted }]}>
                {out ? '−' : '+'}
                {num(t.quantity)}
              </Text>
              <Badge text={st.label} tone={st.tone} />
            </View>
          </View>
        );
      })}
    </Card>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { fontSize: 14, fontWeight: '600' },
  meta: { fontSize: 12, color: colors.muted, marginTop: 1 },
  qty: { fontSize: 15, fontWeight: '700' },
});
