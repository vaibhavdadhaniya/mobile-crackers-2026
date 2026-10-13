import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { dateLabel } from '../format';
import { Button, tap } from './ui';
import { Sheet } from './Sheet';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n: number) => String(n).padStart(2, '0');
const toIso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

// Pure JS calendar (no native module). value/onChange use YYYY-MM-DD.
export function DatePicker({ label, value, onChange }: { label: string; value: string | null; onChange: (v: string | null) => void }) {
  const [open, setOpen] = useState(false);
  const init = value ? new Date(value + 'T00:00:00') : new Date();
  const [y, setY] = useState(init.getFullYear());
  const [m, setM] = useState(init.getMonth());

  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const today = new Date();
  const todayIso = toIso(today.getFullYear(), today.getMonth(), today.getDate());

  const shift = (delta: number) => {
    tap();
    const d = new Date(y, m + delta, 1);
    setY(d.getFullYear());
    setM(d.getMonth());
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={s.label}>{label}</Text>
      <Pressable
        style={s.input}
        onPress={() => {
          tap();
          setOpen(true);
        }}
      >
        <Ionicons name="calendar" size={19} color={colors.primary} />
        <Text style={[s.value, !value && { color: colors.faint }]}>{value ? dateLabel(value) : 'Select date'}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.faint} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)}>
        <View style={s.header}>
          <Pressable onPress={() => shift(-1)} hitSlop={10} style={s.nav}>
            <Ionicons name="chevron-back" size={20} color={colors.primaryDark} />
          </Pressable>
          <Text style={s.month}>
            {MONTHS[m]} {y}
          </Text>
          <Pressable onPress={() => shift(1)} hitSlop={10} style={s.nav}>
            <Ionicons name="chevron-forward" size={20} color={colors.primaryDark} />
          </Pressable>
        </View>
        <View style={s.grid}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <Text key={i} style={s.dow}>
              {d}
            </Text>
          ))}
          {cells.map((d, i) => {
            if (!d) return <View key={i} style={s.cell} />;
            const iso = toIso(y, m, d);
            const sel = iso === value;
            const past = iso < todayIso;
            const isToday = iso === todayIso;
            return (
              <Pressable
                key={i}
                style={s.cell}
                onPress={() => {
                  tap();
                  onChange(iso);
                  setOpen(false);
                }}
              >
                <View style={[s.dayWrap, sel && s.daySel, isToday && !sel && s.dayToday]}>
                  <Text style={[s.day, past && { color: '#D6D3D1' }, isToday && { color: colors.primary }, sel && { color: '#fff' }]}>{d}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
          <Button
            title="Clear"
            variant="outline"
            style={{ flex: 1 }}
            onPress={() => {
              onChange(null);
              setOpen(false);
            }}
          />
          <Button title="Done" style={{ flex: 1 }} onPress={() => setOpen(false)} />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 46,
    backgroundColor: '#fff',
  },
  value: { fontSize: 15, color: colors.text, flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  nav: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  month: { fontSize: 16, fontWeight: '700', color: colors.text },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: { width: `${100 / 7}%`, textAlign: 'center', fontSize: 12, color: colors.muted, fontWeight: '700', paddingVertical: 8 },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayWrap: { width: '82%', aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  daySel: { backgroundColor: colors.primary },
  dayToday: { backgroundColor: colors.primarySoft },
  day: { fontSize: 15, color: colors.text, fontWeight: '700' },
});
