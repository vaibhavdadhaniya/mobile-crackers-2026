import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '../theme';
import { num } from '../format';
import { IconName } from './ui';
import { Text } from './Text';

// Compact strip showing kits available for the action on this screen.
export function BalanceCard({
  label,
  value,
  icon = 'cube-outline',
  extra,
  amount,
}: {
  label: string;
  value: number | undefined;
  amount?: string;
  icon?: IconName;
  extra?: { label: string; value: string };
}) {
  return (
    <View style={s.card}>
      <View style={s.icon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
        <Text style={s.value}>{amount ?? num(value)}</Text>
      </View>
      {extra ? (
        <View style={s.extra}>
          <Text style={s.extraLabel}>{extra.label}</Text>
          <Text style={s.extraValue}>{extra.value}</Text>
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
    marginBottom: 12,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow(1),
  },
  icon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  value: { fontSize: 18, fontWeight: '700' },
  extra: { alignItems: 'flex-end', paddingLeft: 12, borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border },
  extraLabel: { color: colors.muted, fontSize: 12 },
  extraValue: { fontWeight: '700', fontSize: 15 },
});
