import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Text } from './Text';
import { ScrollFocusedToTop } from './KeyboardAware';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, radius, shadow } from '../theme';
import { Avatar, Field, tap } from './ui';

type Item = { id: string; name: string; phone: string };

// Debounced search box: type a name or mobile number, tap a result to select it.
export function SearchPicker<T extends Item>({
  endpoint,
  label,
  placeholder,
  selected,
  onSelect,
  renderMeta,
  onQueryChange,
}: {
  endpoint: '/users/search' | '/registrations/search' | '/wallet/recipients';
  label?: string;
  placeholder: string;
  selected: T | null;
  onSelect: (item: T | null) => void;
  renderMeta?: (item: T) => string;
  onQueryChange?: (q: string) => void;
}) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      setError('');
      setLoading(false);
      return;
    }
    const mine = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await api.get<T[]>(`${endpoint}?q=${encodeURIComponent(term)}`);
        if (mine === seq.current) {
          setResults(r);
          setError('');
        }
      } catch (e) {
        if (mine === seq.current) setError((e as Error).message);
      } finally {
        if (mine === seq.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [q, endpoint]);

  if (selected) {
    return (
      <View style={{ marginBottom: 16 }}>
        {label && <Text style={s.label}>{label}</Text>}
        <View style={s.selected}>
          <Avatar name={selected.name} size={36} />
          <View style={{ flex: 1 }}>
            <Text style={s.name}>{selected.name}</Text>
            <Text style={s.meta}>{renderMeta ? renderMeta(selected) : selected.phone}</Text>
          </View>
          <Pressable
            onPress={() => {
              tap();
              onSelect(null);
            }}
            hitSlop={10}
            style={s.clear}
          >
            <Ionicons name="close" size={16} color={colors.primaryDark} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <Field
        label={label}
        icon="search"
        placeholder={placeholder}
        value={q}
        onChangeText={(v) => {
          setQ(v);
          onQueryChange?.(v);
        }}
        autoCorrect={false}
        returnKeyType="search"
        right={loading ? <ActivityIndicator color={colors.primary} /> : null}
      />
      {error ? <Text style={s.error}>{error}</Text> : null}
      {results.length > 0 && (
        <View style={s.list}>
          <ScrollFocusedToTop />
          {results.map((item, i) => (
            <Pressable
              key={item.id}
              onPress={() => {
                tap();
                onSelect(item);
                setQ('');
                setResults([]);
              }}
              style={({ pressed }) => [s.item, i > 0 && s.itemBorder, pressed && { backgroundColor: colors.primarySoft }]}
            >
              <Avatar name={item.name} size={34} />
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{item.name}</Text>
                <Text style={s.meta} numberOfLines={1}>
                  {renderMeta ? renderMeta(item) : item.phone}
                </Text>
              </View>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
            </Pressable>
          ))}
        </View>
      )}
      {!loading && q.trim().length >= 2 && results.length === 0 && !error && <Text style={s.none}>No match found for "{q.trim()}"</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '700', color: colors.text, marginBottom: 8 },
  list: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    marginTop: -8,
    marginBottom: 16,
    overflow: 'hidden',
    ...shadow(2),
  },
  item: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  selected: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primarySoft,
  },
  clear: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12.5, color: colors.muted, marginTop: 2 },
  none: { color: colors.muted, marginTop: -8, marginBottom: 16, fontSize: 13 },
  error: { color: colors.danger, marginTop: -8, marginBottom: 16, fontSize: 13 },
});
