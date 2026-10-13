import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AdminRow, api, UserHit } from '../api';
import { useAuth } from '../auth';
import { useApi } from '../hooks';
import { Avatar, Badge, Banner, Button, Text } from './ui';
import { SearchPicker } from './SearchPicker';
import { useFeedback } from './Feedback';
import { colors } from '../theme';
import { dateLabel, roleLabel } from '../format';

// List, add and remove super admins. Members come from the existing users list.
export function AdminsManager() {
  const { me } = useAuth();
  const fb = useFeedback();
  const { data, error, reload } = useApi<AdminRow[]>('/admin/admins');
  const [pick, setPick] = useState<UserHit | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const add = async () => {
    if (!pick) return;
    const ok = await fb.confirm({
      title: 'Give kit management access?',
      message: `${pick.name} will get full app access: stock, transfers, requests, settings and data. Their role stays the same.`,
      details: [
        { label: 'Name', value: pick.name },
        { label: 'Mobile', value: pick.phone },
      ],
      confirmText: 'Give access',
      icon: 'shield-checkmark-outline',
    });
    if (!ok) return;
    setBusy('add');
    try {
      const r = await api.post<{ message: string }>('/admin/admins', { userId: pick.id });
      fb.success('Access given', r.message);
      setPick(null);
      reload();
    } catch (e) {
      fb.error('Could not add', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (a: AdminRow) => {
    const ok = await fb.confirm({
      title: 'Remove kit management access?',
      message: `${a.name} goes back to normal member access. Any kits they hold stay with them.`,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    setBusy(a.id);
    try {
      const r = await api.del<{ message: string }>(`/admin/admins/${a.id}`);
      fb.success('Removed', r.message);
      reload();
    } catch (e) {
      fb.error('Could not remove', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <View>
      {error ? <Banner text={error} /> : null}
      {data?.map((a, i) => (
        <View key={a.id} style={[s.row, i > 0 && s.border]}>
          <Avatar name={a.name} size={34} />
          <View style={{ flex: 1 }}>
            <Text style={s.name} numberOfLines={1}>
              {a.name}
              {a.id === me?.user.id ? <Text style={s.you}> (you)</Text> : null}
            </Text>
            <Text style={s.meta} numberOfLines={1}>
              {a.phone} · {roleLabel(a.role)}
              {a.source === 'granted' && a.added_by_name ? ` · added by ${a.added_by_name}${a.added_at ? ` on ${dateLabel(a.added_at)}` : ''}` : ''}
            </Text>
          </View>
          {a.source === 'primary' ? (
            <Badge text="Main" tone="primary" />
          ) : a.id !== me?.user.id ? (
            <Button title="Remove" variant="danger" small onPress={() => remove(a)} loading={busy === a.id} disabled={!!busy} />
          ) : null}
        </View>
      ))}

      <View style={s.addBox}>
        <SearchPicker<UserHit>
          endpoint="/users/search"
          label="Give access to a member"
          placeholder="Search member by name or mobile"
          selected={pick}
          onSelect={setPick}
          renderMeta={(u) => u.phone}
        />
        <Button title="Give access" icon="shield-checkmark-outline" onPress={add} loading={busy === 'add'} disabled={!pick || !!busy} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  border: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  name: { fontWeight: '600', fontSize: 14 },
  you: { color: colors.muted, fontWeight: '400' },
  meta: { color: colors.muted, fontSize: 12, marginTop: 1 },
  addBox: { marginTop: 12, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
