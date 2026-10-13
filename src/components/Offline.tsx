import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getBaseUrl, setBaseUrl } from '../api';
import { useAuth } from '../auth';
import { Button, Field, Text } from './ui';
import { KeyboardAwareScrollView } from './KeyboardAware';
import { colors } from '../theme';

// Shown when a saved session exists but the server can't be reached at startup.
export function Offline() {
  const { bootError, retry, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [server, setServer] = useState(getBaseUrl());
  const [busy, setBusy] = useState(false);

  const tryAgain = async () => {
    setBusy(true);
    if (server.trim() && server.trim() !== getBaseUrl()) await setBaseUrl(server);
    await retry();
    setBusy(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <KeyboardAwareScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
      >
        <View style={s.icon}>
          <Ionicons name="cloud-offline-outline" size={30} color={colors.primary} />
        </View>
        <Text style={s.title}>Can't reach the server</Text>
        <Text style={s.msg}>{bootError}</Text>
        <Text style={s.tip}>Make sure the backend is running and your phone is on the same Wi-Fi as the server.</Text>
        <Field label="Server address" icon="link-outline" value={server} onChangeText={setServer} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        <Button title="Try again" icon="refresh" onPress={tryAgain} loading={busy} />
        <Button title="Sign out" variant="outline" onPress={logout} style={{ marginTop: 10 }} />
      </KeyboardAwareScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  icon: { width: 60, height: 60, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  msg: { color: colors.danger, marginTop: 6, fontSize: 13 },
  tip: { color: colors.muted, marginTop: 8, marginBottom: 20, fontSize: 13, lineHeight: 19 },
});
