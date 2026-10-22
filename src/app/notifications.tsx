import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Notification } from '../api';
import { useAuth } from '../auth';
import { usePaged } from '../hooks';
import { PagedList } from '../components/PagedList';
import { Card, IconName, IconTile, tap, Text, tones } from '../components/ui';
import { notificationRoute } from '../notify';
import { colors } from '../theme';
import { timeAgo } from '../format';

const ICONS: Record<string, { icon: IconName; tone: keyof typeof tones }> = {
  kit_received: { icon: 'download-outline', tone: 'success' },
  sale_edited: { icon: 'create-outline', tone: 'warning' },
  sale_deleted: { icon: 'trash-outline', tone: 'danger' },
  kit_transfer_request: { icon: 'download-outline', tone: 'warning' },
  kit_transfer_accepted: { icon: 'checkmark-circle-outline', tone: 'success' },
  kit_transfer_rejected: { icon: 'close-circle-outline', tone: 'danger' },
  kit_transfer_cancelled: { icon: 'close-circle-outline', tone: 'danger' },
  return_accepted: { icon: 'checkmark-circle-outline', tone: 'success' },
  kit_return: { icon: 'return-down-back', tone: 'info' },
  kit_request: { icon: 'file-tray-full-outline', tone: 'warning' },
  request_rejected: { icon: 'close-circle-outline', tone: 'danger' },
  money_request: { icon: 'wallet-outline', tone: 'warning' },
  money_accepted: { icon: 'wallet-outline', tone: 'success' },
  money_rejected: { icon: 'wallet-outline', tone: 'danger' },
};

export default function Notifications() {
  const { me, refreshMe } = useAuth();
  const paged = usePaged<Notification>('/notifications');
  const marked = useRef(false);

  // Opening the list marks everything read (once per visit).
  useEffect(() => {
    if (!marked.current && paged.items.some((n) => !n.read_at)) {
      marked.current = true;
      api.post('/notifications/read-all').then(refreshMe).catch(() => {});
    }
  }, [paged.items, refreshMe]);

  return (
    <PagedList<Notification>
      paged={paged}
      emptyText="You're all caught up"
      emptyIcon="notifications-off-outline"
      renderItem={({ item: n }) => {
        const ic = ICONS[n.type] ?? { icon: 'notifications' as IconName, tone: 'primary' as const };
        const to = notificationRoute(n.type, !!me?.user.isAdmin);
        return (
          <Pressable
            disabled={!to}
            onPress={() => {
              tap();
              if (to) router.push(to as Href);
            }}
          >
            <Card style={[s.item, !n.read_at && s.unread]}>
              <IconTile icon={ic.icon} tone={ic.tone} size={36} />
              <View style={{ flex: 1 }}>
                <View style={s.titleRow}>
                  <Text style={s.title}>{n.title}</Text>
                  {!n.read_at && <View style={s.dot} />}
                </View>
                <Text style={s.body}>{n.body}</Text>
                <Text style={s.time}>{timeAgo(n.created_at)}</Text>
              </View>
              {to ? <Ionicons name="chevron-forward" size={16} color={colors.faint} style={{ alignSelf: 'center' }} /> : null}
            </Card>
          </Pressable>
        );
      }}
    />
  );
}

const s = StyleSheet.create({
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 10 },
  unread: { borderColor: colors.primaryBorder, backgroundColor: '#FFFBF7' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontWeight: '600', fontSize: 14, color: colors.text, flexShrink: 1 },
  body: { color: colors.muted, marginTop: 3, lineHeight: 19 },
  time: { color: colors.faint, fontSize: 11, marginTop: 6 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
});
