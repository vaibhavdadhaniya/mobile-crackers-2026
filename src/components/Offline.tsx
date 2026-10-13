import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth';
import { Button, Text } from './ui';
import { colors } from '../theme';

// Shown when a saved session exists but the server can't be reached at startup.
export function Offline() {
  const { retry, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [busy, setBusy] = useState(false);

  const tryAgain = async () => {
    setBusy(true);
    await retry();
    setBusy(false);
  };

  return (
    <View style={[s.wrap, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={s.icon}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
      </View>
      <Text style={s.title}>No connection</Text>
      <Text style={s.tip}>We couldn't connect right now. Check your internet connection and try again.</Text>
      <Button title="Try again" icon="refresh" onPress={tryAgain} loading={busy} />
      <Button title="Sign out" variant="outline" onPress={logout} style={{ marginTop: 10 }} />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', paddingHorizontal: 24 },
  icon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  tip: { color: colors.muted, marginTop: 8, marginBottom: 24, fontSize: 14, lineHeight: 20 },
});
