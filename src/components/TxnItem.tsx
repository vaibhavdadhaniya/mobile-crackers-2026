import { StyleSheet, View } from 'react-native';
import { Txn } from '../api';
import { colors } from '../theme';
import { dateTime, money } from '../format';
import { IconName, IconTile, tones } from './ui';
import { Text } from './Text';

// One ledger row. `perspective` = 'self' shows +/- from the logged in user's view.
export function TxnItem({ t, perspective = 'all' }: { t: Txn; perspective?: 'self' | 'all' }) {
  let icon: IconName = 'swap-horizontal';
  let tone: keyof typeof tones = 'info';
  let title = '';
  let sub = '';
  let sign = '';

  switch (t.type) {
    case 'stock_add':
      icon = 'add';
      tone = 'success';
      title = 'Stock added';
      sub = t.note || 'Central stock';
      sign = '+';
      break;
    case 'stock_remove':
      icon = 'remove';
      tone = 'danger';
      title = 'Stock removed';
      sub = t.note || 'Central stock';
      sign = '−';
      break;
    case 'sale':
      icon = 'cart-outline';
      tone = 'primary';
      title = `Sold to ${t.customer_name ?? 'customer'}`;
      sub = [perspective === 'all' ? `by ${t.from_name}` : t.customer_phone, t.total_amount ? money(t.total_amount) : null].filter(Boolean).join(' · ');
      sign = '−';
      break;
    case 'transfer':
      if (perspective === 'self') {
        const incoming = t.direction === 'in';
        icon = incoming ? 'arrow-down' : 'arrow-up';
        tone = incoming ? 'success' : 'info';
        title = incoming ? `From ${t.from_name}` : `To ${t.to_name}`;
        sub = (incoming ? t.from_phone : t.to_phone) ?? '';
        sign = incoming ? '+' : '−';
      } else {
        icon = 'swap-horizontal';
        title = `${t.from_name} → ${t.to_name}`;
        sub = 'Transfer';
      }
      if (t.note) sub = sub ? `${sub} · ${t.note}` : t.note;
      break;
  }

  const qtyColor = sign === '+' ? colors.success : sign === '−' ? colors.text : colors.info;

  return (
    <View style={s.row}>
      <IconTile icon={icon} tone={tone} size={34} />
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>
          {title}
        </Text>
        {sub ? (
          <Text style={s.sub} numberOfLines={1}>
            {sub}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={[s.qty, { color: qtyColor }]}>
          {perspective === 'self' || t.type !== 'transfer' ? sign : ''}
          {t.quantity}
        </Text>
        <Text style={s.time}>{dateTime(t.created_at)}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 },
  title: { fontSize: 14, fontWeight: '600' },
  sub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  time: { fontSize: 10.5, color: colors.faint, marginTop: 1 },
  qty: { fontSize: 15, fontWeight: '700' },
});
