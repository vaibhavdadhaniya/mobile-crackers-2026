import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { useAuth } from '../auth';
import { Button, Card, Field, Screen, Stepper, tap, Text } from '../components/ui';
import { BalanceCard } from '../components/BalanceCard';
import { useFeedback } from '../components/Feedback';
import { colors, radius, shadow } from '../theme';
import { digitsOnly, money, num } from '../format';
import { ScrollFocusedToTop } from '../components/KeyboardAware';
import { applyRegistration, exactPhoneMatch, onPhoneChange, Reg, searchTerm } from '../customer';

type FieldName = 'phone' | 'name';

export default function SellScreen() {
  const { me, refreshMe } = useAuth();
  const fb = useFeedback();
  const [form, setForm] = useState<{ phone: string; name: string; regId: string | null }>({ phone: '', name: '', regId: null });
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<FieldName | null>(null);
  const [results, setResults] = useState<Reg[]>([]);
  const [searching, setSearching] = useState(false);
  const seq = useRef(0);
  // Kits on hold for pending outgoing transfers cannot be sold or returned.
  const balance = Math.max(0, (me?.balance ?? 0) - (me?.kitsOnHold ?? 0));
  const price = me?.kitPrice ?? 0;
  const amount = qty * price;

  // Debounced registration search for the field being typed in.
  const term = active ? searchTerm(active, active === 'phone' ? form.phone : form.name) : null;
  useEffect(() => {
    if (!term || form.regId) {
      setResults([]);
      setSearching(false);
      return;
    }
    const mine = ++seq.current;
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const rows = await api.get<Reg[]>(`/registrations/search?q=${encodeURIComponent(term)}`);
        if (mine !== seq.current) return;
        // A full number that matches a registration links it and fills the name.
        const exact = active === 'phone' ? exactPhoneMatch(rows, form.phone) : null;
        if (exact) {
          setForm(applyRegistration(exact));
          setResults([]);
        } else {
          setResults(rows);
        }
      } catch {
        if (mine === seq.current) setResults([]);
      } finally {
        if (mine === seq.current) setSearching(false);
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, form.regId]);

  const pick = (r: Reg) => {
    tap();
    setForm(applyRegistration(r));
    setResults([]);
  };

  const reset = () => {
    setForm({ phone: '', name: '', regId: null });
    setQty(1);
    setResults([]);
  };

  const submit = async () => {
    const n = qty;
    const name = form.name.trim();
    if (!name) return fb.error('Customer name required');
    // Mobile is optional; a partly typed number is still an error.
    if (form.phone && !/^\d{10}$/.test(form.phone)) return fb.error('Invalid mobile number', 'Enter a 10 digit number or leave it empty.');
    if (!n) return fb.error('Enter kit count');
    if (n > balance) return fb.error('Not enough kits', `You have ${num(balance)} kits available.`);
    const ok = await fb.confirm({
      title: 'Confirm sale',
      icon: 'cart-outline',
      details: [
        { label: 'Customer', value: name },
        { label: 'Mobile', value: form.phone || 'Not given' },
        { label: 'Kits', value: num(n) },
        ...(price ? [{ label: 'Amount', value: money(n * price) }] : []),
      ],
      confirmText: 'Save sale',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api.post<{ message: string }>('/kits/sell', {
        quantity: String(qty),
        customerName: name,
        customerPhone: form.phone || null,
        registrationId: form.regId,
      });
      fb.success('Sale recorded', r.message);
      reset();
      refreshMe();
    } catch (e) {
      fb.error('Sale failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const dropdown = (field: FieldName) =>
    active === field && !form.regId && (searching || results.length > 0) ? (
      <View style={s.list}>
        <ScrollFocusedToTop />
        {searching && results.length === 0 ? (
          <ActivityIndicator color={colors.primary} style={{ paddingVertical: 12 }} />
        ) : (
          results.slice(0, 6).map((r, i) => (
            <Pressable key={r.id} onPress={() => pick(r)} style={({ pressed }) => [s.item, i > 0 && s.itemBorder, pressed && { backgroundColor: colors.primarySoft }]}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{r.name}</Text>
                <Text style={s.itemMeta} numberOfLines={1}>
                  {[r.phone, r.area, r.city].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={16} color={colors.faint} />
            </Pressable>
          ))
        )}
      </View>
    ) : null;

  return (
    <Screen onRefresh={refreshMe}>
      <BalanceCard label="Kits available" value={balance} extra={{ label: 'Price per kit', value: money(price) }} />
      <Card>
        <View style={{ zIndex: 2 }}>
          <Field
            label="Customer mobile (optional)"
            icon="call-outline"
            placeholder="10 digit number"
            keyboardType="number-pad"
            maxLength={16}
            value={form.phone}
            onFocus={() => setActive('phone')}
            onBlur={() => setTimeout(() => setActive((a) => (a === 'phone' ? null : a)), 150)}
            onChangeText={(v) => setForm((f) => onPhoneChange(f, v))}
            right={searching && active === 'phone' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          />
          {dropdown('phone')}
        </View>
        <View style={{ zIndex: 1 }}>
          <Field
            label="Customer name"
            icon="person-outline"
            placeholder="Full name"
            value={form.name}
            autoCapitalize="words"
            onFocus={() => setActive('name')}
            onBlur={() => setTimeout(() => setActive((a) => (a === 'name' ? null : a)), 150)}
            onChangeText={(v) => setForm((f) => ({ ...f, name: v }))}
            right={searching && active === 'name' ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          />
          {dropdown('name')}
        </View>

        <Stepper label="Number of kits" value={qty} onChange={setQty} min={1} max={Math.max(1, balance)} hint={`${num(balance)} available`} />

        {price > 0 && (
          <View style={s.total}>
            <Text style={s.totalLabel}>Total amount</Text>
            <Text style={s.totalValue}>{money(amount)}</Text>
          </View>
        )}

        <Button title="Save sale" onPress={submit} loading={busy} disabled={balance === 0 || !form.name.trim()} />
      </Card>
    </Screen>
  );
}

const s = StyleSheet.create({
  list: {
    marginTop: -8,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: '#fff',
    overflow: 'hidden',
    ...shadow(2),
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  itemName: { fontWeight: '600', fontSize: 14 },
  itemMeta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  total: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginBottom: 14,
  },
  totalLabel: { color: colors.muted, fontSize: 13 },
  totalValue: { fontWeight: '700', fontSize: 16 },
});
