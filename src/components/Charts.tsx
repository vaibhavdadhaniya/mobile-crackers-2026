import { StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { colors } from '../theme';
import { shortDay } from '../format';

export function ProgressBar({ pct, color = colors.primary }: { pct: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

// Simple bar chart for daily sales; the target pace is drawn as a dashed line.
export function BarChart({ data, targetPerDay }: { data: { day: string; qty: number }[]; targetPerDay?: number }) {
  const max = Math.max(1, targetPerDay || 0, ...data.map((d) => d.qty));
  const H = 120;
  return (
    <View>
      <View style={[s.chart, { height: H }]}>
        {targetPerDay ? (
          <View style={[s.targetLine, { bottom: (targetPerDay / max) * H }]}>
            <Text style={s.targetText}>need {targetPerDay}/day</Text>
          </View>
        ) : null}
        {data.map((d) => (
          <View key={d.day} style={s.col}>
            {d.qty > 0 && <Text style={s.val}>{d.qty}</Text>}
            <View
              style={[
                s.bar,
                {
                  height: Math.max(3, (d.qty / max) * (H - 16)),
                  backgroundColor: targetPerDay && d.qty >= targetPerDay ? colors.success : colors.primary,
                  opacity: d.qty ? 1 : 0.25,
                },
              ]}
            />
          </View>
        ))}
      </View>
      <View style={s.labels}>
        {data.map((d, i) => (
          <Text key={d.day} style={s.label}>
            {i % 2 === data.length % 2 ? '' : shortDay(d.day)}
          </Text>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  track: { height: 10, borderRadius: 5, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  val: { fontSize: 9, color: colors.muted, marginBottom: 2 },
  labels: { flexDirection: 'row', gap: 4, marginTop: 6 },
  label: { flex: 1, fontSize: 9, color: colors.muted, textAlign: 'center' },
  targetLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.danger,
    zIndex: 1,
  },
  targetText: { position: 'absolute', right: 0, top: -14, fontSize: 9, color: colors.danger, fontWeight: '700' },
});
