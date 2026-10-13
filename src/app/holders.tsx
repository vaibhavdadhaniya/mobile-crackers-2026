import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Holder } from '../api';
import { useApi, useDebounced } from '../hooks';
import { Avatar, Banner, Card, Empty, Field, Screen, Text } from '../components/ui';
import { colors, radius } from '../theme';
import { money, num, roleLabel, rupees } from '../format';

export default function Holders() {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim());
  const { data, error, refreshing, refresh } = useApi<Holder[]>(`/admin/holders?q=${encodeURIComponent(term)}`);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <Field icon="search" placeholder="Search name or mobile" value={q} onChangeText={setQ} autoCorrect={false} />
      {error ? <Banner text={error} /> : null}
      {data && data.length === 0 && (
        <Card>
          <Empty icon="people-outline" text="No one holds or has sold kits yet" />
        </Card>
      )}
      {data?.map((h) => (
        <Card key={h.id} style={s.card}>
          <Avatar name={h.name} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>
              {h.name}
            </Text>
            <Text style={s.meta}>
              {h.phone} · {roleLabel(h.role)}
              {h.wallet ? ` · Wallet ${rupees(h.wallet)}` : ''}
            </Text>
          </View>
          <View style={s.cols}>
            <View style={[s.col, { backgroundColor: colors.primarySoft }]}>
              <Text style={[s.val, { color: colors.primaryDark }]}>{num(h.balance)}</Text>
              <Text style={s.lbl}>holding</Text>
            </View>
            <View style={[s.col, { backgroundColor: colors.successSoft }]}>
              <Text style={[s.val, { color: colors.success }]}>{num(h.sold)}</Text>
              <Text style={s.lbl}>{money(h.amount)}</Text>
            </View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const s = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10, padding: 12 },
  name: { fontWeight: '600', fontSize: 14, color: colors.text },
  meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  cols: { flexDirection: 'row', gap: 6 },
  col: { alignItems: 'center', minWidth: 58, paddingVertical: 6, paddingHorizontal: 6, borderRadius: radius.sm },
  val: { fontWeight: '700', fontSize: 15 },
  lbl: { fontSize: 10, color: colors.muted, fontWeight: '600' },
});
