import { createContext, ReactNode, useContext, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleProp,
  StyleSheet,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow, TAB_BAR_HEIGHT } from '../theme';
import { Text, TextInput } from './Text';
import { KeyboardAwareScrollView, useScrollToFocused } from './KeyboardAware';

export { Text, TextInput };
export type IconName = keyof typeof Ionicons.glyphMap;

// True for screens rendered inside the floating tab bar layout.
export const InTabsContext = createContext(false);

export function useBottomSpace() {
  const insets = useSafeAreaInsets();
  const inTabs = useContext(InTabsContext);
  return inTabs ? TAB_BAR_HEIGHT + Math.max(insets.bottom, 10) + 20 : insets.bottom + 20;
}

export function useSidePadding() {
  const insets = useSafeAreaInsets();
  return { paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right };
}

export const tap = () => {
  Haptics.selectionAsync().catch(() => {});
};

export function Screen({
  children,
  refreshing,
  onRefresh,
  contentStyle,
}: {
  children: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const bottom = useBottomSpace();
  const side = useSidePadding();
  return (
    <View style={styles.screen}>
      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, side, { paddingBottom: bottom }, contentStyle]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
          ) : undefined
        }
      >
        {children}
      </KeyboardAwareScrollView>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right, sub }: { children: ReactNode; right?: ReactNode; sub?: string }) {
  return (
    <View style={styles.sectionRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>{children}</Text>
        {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function LinkText({ title, onPress }: { title: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={styles.linkRow}>
      <Text style={styles.linkText}>{title}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.primary} />
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  loading,
  disabled,
  variant = 'primary',
  icon,
  style,
  small,
}: {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  small?: boolean;
}) {
  const v = buttonVariants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        { height: small ? 38 : 48, backgroundColor: v.bg, borderColor: v.border },
        small && { paddingHorizontal: 12, borderRadius: radius.sm },
        pressed && { opacity: 0.85 },
        off && { opacity: 0.45 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <View style={styles.buttonInner}>
          {icon && <Ionicons name={icon} size={small ? 15 : 18} color={v.fg} />}
          <Text style={[styles.buttonText, small && { fontSize: 13 }, { color: v.fg }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const buttonVariants = {
  primary: { bg: colors.primary, border: colors.primary, fg: '#fff' },
  outline: { bg: '#fff', border: colors.border, fg: colors.text },
  ghost: { bg: colors.primarySoft, border: colors.primarySoft, fg: colors.primaryDark },
  danger: { bg: '#fff', border: '#F5C2C2', fg: colors.danger },
  success: { bg: colors.success, border: colors.success, fg: '#fff' },
};

export function Field({
  label,
  hint,
  icon,
  right,
  style,
  onFocus,
  onBlur,
  ...props
}: TextInputProps & { label?: string; hint?: string; icon?: IconName; right?: ReactNode }) {
  const [focused, setFocused] = useState(false);
  const scrollToFocused = useScrollToFocused();
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputWrap, focused && styles.inputFocused]}>
        {icon && <Ionicons name={icon} size={17} color={focused ? colors.primary : colors.faint} style={{ marginRight: 8 }} />}
        <TextInput
          placeholderTextColor={colors.faint}
          style={[styles.input, style]}
          selectionColor={colors.primary}
          onFocus={(e) => {
            setFocused(true);
            scrollToFocused();
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...props}
        />
        {right}
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

export const tones = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: colors.successSoft, fg: colors.success },
  info: { bg: colors.infoSoft, fg: colors.info },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  neutral: { bg: '#F1EFEC', fg: colors.muted },
};

// Dashboard number tile. Optional: a small coloured badge next to the value (e.g. '−100'),
// and onPress (shows a chevron) to open a drill-down.
export function Stat({
  label,
  value,
  icon,
  tone = 'primary',
  sub,
  badge,
  onPress,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone?: keyof typeof tones;
  sub?: string;
  badge?: { text: string; tone: keyof typeof tones };
  onPress?: () => void;
}) {
  const t = tones[tone];
  const body = (
    <>
      <View style={styles.statHead}>
        <Text style={styles.statLabel} numberOfLines={1}>
          {label}
        </Text>
        <View style={[styles.statIcon, { backgroundColor: t.bg }]}>
          <Ionicons name={onPress ? 'chevron-forward' : icon} size={14} color={t.fg} />
        </View>
      </View>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, { flexShrink: 1 }]} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        {badge ? (
          <View style={[styles.statBadge, { backgroundColor: tones[badge.tone].bg }]}>
            <Text style={[styles.statBadgeText, { color: tones[badge.tone].fg }]}>{badge.text}</Text>
          </View>
        ) : null}
      </View>
      {sub ? (
        <Text style={styles.statSub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </>
  );
  if (!onPress) return <View style={styles.stat}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [styles.stat, pressed && { opacity: 0.7 }]}
    >
      {body}
    </Pressable>
  );
}

export function IconTile({ icon, tone = 'primary', size = 36 }: { icon: IconName; tone?: keyof typeof tones; size?: number }) {
  const t = tones[tone];
  return (
    <View style={[styles.iconTile, { width: size, height: size, borderRadius: size * 0.3, backgroundColor: t.bg }]}>
      <Ionicons name={icon} size={size * 0.5} color={t.fg} />
    </View>
  );
}

export function Badge({ text, tone = 'primary' }: { text: string; tone?: keyof typeof tones }) {
  const t = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.badgeText, { color: t.fg }]}>{text}</Text>
    </View>
  );
}

export function Empty({ icon = 'file-tray-outline', text }: { icon?: IconName; text: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={30} color={colors.faint} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', gap: 10 }, style]}>{children}</View>;
}

export function Banner({ text, tone = 'danger' }: { text: string; tone?: keyof typeof tones }) {
  const t = tones[tone];
  return (
    <View style={[styles.banner, { backgroundColor: t.bg }]}>
      <Ionicons name="alert-circle-outline" size={17} color={t.fg} />
      <Text style={{ color: t.fg, fontWeight: '500', flex: 1, fontSize: 13 }}>{text}</Text>
    </View>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipText, on && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            style={[styles.segItem, on && styles.segOn]}
            onPress={() => {
              tap();
              onChange(o.key);
            }}
          >
            <Text style={[styles.segText, on && { color: colors.text, fontWeight: '600' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Avatar({ name, size = 38 }: { name: string; size?: number }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.primaryDark, fontWeight: '700', fontSize: size * 0.36 }}>{initials || '?'}</Text>
    </View>
  );
}

export function QuickPicks({ values, value, max, onPick }: { values: number[]; value: string; max?: number; onPick: (v: string) => void }) {
  const list = max == null ? values : values.filter((v) => v <= max);
  if (!list.length) return null;
  return (
    <View style={styles.quick}>
      {list.map((q) => {
        const on = value === String(q);
        return (
          <Pressable
            key={q}
            onPress={() => {
              tap();
              onPick(String(q));
            }}
            style={[styles.quickChip, on && styles.quickOn]}
          >
            <Text style={[styles.quickText, on && { color: '#fff' }]}>{q}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}

export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { paddingTop: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow(1),
  },
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  sectionSub: { fontSize: 12, color: colors.muted, marginTop: 1 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  button: { borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1 },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  buttonText: { fontSize: 15, fontWeight: '600' },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  hint: { fontSize: 12, color: colors.muted, marginTop: 5 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    minHeight: 46,
  },
  inputFocused: { borderColor: colors.primary },
  input: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: Platform.OS === 'ios' ? 12 : 8 },
  stat: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: radius.lg,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow(1),
  },
  statHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 6 },
  statIcon: { width: 26, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  statBadgeText: { fontSize: 11.5, fontWeight: '700' },
  statLabel: { fontSize: 12, color: colors.muted, fontWeight: '500', flexShrink: 1 },
  statSub: { fontSize: 11, color: colors.faint, marginTop: 2 },
  iconTile: { alignItems: 'center', justifyContent: 'center' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  empty: { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.md, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { fontWeight: '500', color: colors.muted, fontSize: 13 },
  seg: { flexDirection: 'row', backgroundColor: '#EFECE8', borderRadius: radius.md, padding: 3, marginBottom: 14 },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segOn: { backgroundColor: '#fff', ...shadow(1) },
  segText: { fontWeight: '500', color: colors.muted, fontSize: 13.5 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, backgroundColor: '#fff', height: 50, overflow: 'hidden' },
  stepBtn: { width: 56, height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  stepInput: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: colors.text, paddingVertical: 0 },
  quick: { flexDirection: 'row', gap: 6, marginTop: -6, marginBottom: 14 },
  quickChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  quickOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  quickText: { fontWeight: '600', color: colors.muted, fontSize: 12.5 },
});

// "−  12  +" quantity control. Typing is digits only and clamps to [min, max].
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max,
  hint,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  hint?: string;
}) {
  const clamp = (n: number) => Math.max(min, max != null ? Math.min(max, n) : n);
  const atMin = value <= min;
  const atMax = max != null && value >= max;
  const step = (d: number) => {
    tap();
    onChange(clamp(value + d));
  };
  return (
    <View style={{ marginBottom: 14 }}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.stepper}>
        <Pressable onPress={() => step(-1)} disabled={atMin} style={[styles.stepBtn, atMin && { opacity: 0.35 }]} hitSlop={6} accessibilityLabel="Decrease">
          <Ionicons name="remove" size={22} color={colors.primaryDark} />
        </Pressable>
        <TextInput
          style={styles.stepInput}
          keyboardType="number-pad"
          value={String(value)}
          maxLength={6}
          selectTextOnFocus
          onChangeText={(t) => {
            const n = Number(t.replace(/[^0-9]/g, ''));
            onChange(t.trim() === '' ? min : clamp(n));
          }}
        />
        <Pressable onPress={() => step(1)} disabled={atMax} style={[styles.stepBtn, atMax && { opacity: 0.35 }]} hitSlop={6} accessibilityLabel="Increase">
          <Ionicons name="add" size={22} color={colors.primaryDark} />
        </Pressable>
      </View>
      {hint && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}
