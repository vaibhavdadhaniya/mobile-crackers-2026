import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuth } from '../auth';
import { colors } from '../theme';
import { tap } from './ui';
import { Text } from './Text';

export function HeaderBell() {
  const { me } = useAuth();
  const n = me?.unreadNotifications ?? 0;
  return (
    <Pressable
      onPress={() => {
        tap();
        router.push('/notifications');
      }}
      hitSlop={8}
      style={s.btn}
    >
      <Ionicons name="notifications-outline" size={20} color="#fff" />
      {n > 0 && (
        <View style={s.badge}>
          <Text style={s.text}>{n > 9 ? '9+' : n}</Text>
        </View>
      )}
    </Pressable>
  );
}

const s = StyleSheet.create({
  btn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  text: { color: colors.primaryDark, fontSize: 9, fontWeight: '700' },
});
