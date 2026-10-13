import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Modal, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth';
import { Button, Text } from './ui';
import { colors, radius, shadow } from '../theme';
import { AppSettings, decideUpdate, inMaintenance, parseFirestoreDoc } from '../update';

const FB = (Constants.expoConfig?.extra as { firebase?: { projectId: string; firestoreDb: string; apiKey: string } } | undefined)?.firebase;
const DOC_URL = FB
  ? `https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/${encodeURIComponent(FB.firestoreDb)}/documents/AppConfig/GlobalSettings?key=${FB.apiKey}`
  : null;
const SNOOZE_KEY = 'fk_update_snooze'; // "<build>:<day>": optional update asked once per day
const today = () => new Date().toISOString().slice(0, 10);

// Reads Firestore AppConfig/GlobalSettings: shows maintenance and update prompts.
export function UpdateGate() {
  const insets = useSafeAreaInsets();
  const { user, token } = useAuth();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [snoozed, setSnoozed] = useState(false);
  const [adminBypass, setAdminBypass] = useState(false); // logged-out user tapped "Admin sign in"
  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const current = Number(Application.nativeBuildVersion) || 0;

  const load = useCallback(async () => {
    if (!DOC_URL) return;
    try {
      const res = await fetch(DOC_URL);
      if (!res.ok) return;
      const s = parseFirestoreDoc(await res.json());
      const latest = platform === 'android' ? s.androidBuildNumber : s.iosBuildNumber;
      const snooze = await SecureStore.getItemAsync(SNOOZE_KEY).catch(() => null);
      setSnoozed(snooze === `${latest}:${today()}`);
      setSettings(s);
    } catch {
      // Offline or Firebase unreachable: never block the app because of this check.
    }
  }, [platform]);

  useEffect(() => {
    load();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && load());
    return () => sub.remove();
  }, [load]);

  if (!settings) return null;

  const isAdmin = !!user?.isAdmin;
  // Logged-in members are blocked; a logged-out user may continue to the login screen as admin.
  const maintenance = inMaintenance(settings, isAdmin) && !(adminBypass && !token);
  if (maintenance) {
    return (
      <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
        <View style={[s.full, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
          <View style={[s.icon, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="construct-outline" size={30} color={colors.warning} />
          </View>
          <Text style={s.title}>{settings.maintenance_title || 'Under maintenance'}</Text>
          <Text style={s.message}>{settings.maintenance_message || 'We are improving the app. Please check back soon.'}</Text>
          <Button title="Try again" icon="refresh" variant="outline" onPress={load} style={{ marginTop: 22, alignSelf: 'stretch' }} />
          {!token ? (
            <Button title="Admin sign in" variant="ghost" small onPress={() => setAdminBypass(true)} style={{ marginTop: 10, alignSelf: 'center' }} />
          ) : null}
        </View>
      </Modal>
    );
  }

  const mode = decideUpdate(settings, platform, current);
  if (mode === 'none' || (mode === 'optional' && snoozed)) return null;
  const force = mode === 'force';
  const version = platform === 'android' ? settings.androidVersion : settings.iosVersion;

  const later = async () => {
    const latest = platform === 'android' ? settings.androidBuildNumber : settings.iosBuildNumber;
    await SecureStore.setItemAsync(SNOOZE_KEY, `${latest}:${today()}`).catch(() => {});
    setSnoozed(true);
  };

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={force ? () => {} : later}>
      <View style={[s.backdrop, force && s.backdropForce, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={s.card}>
          <View style={s.icon}>
            <Ionicons name="cloud-download-outline" size={28} color={colors.primary} />
          </View>
          <Text style={s.title}>{force ? 'Update required' : 'Update available'}</Text>
          <Text style={s.version}>
            Version {version || 'new'} is available (you have {Application.nativeApplicationVersion}).
          </Text>
          {settings.UpdateLog ? <Text style={s.message}>{settings.UpdateLog}</Text> : null}
          {force ? <Text style={s.forceNote}>Please update to continue using the app.</Text> : null}
          <Button
            title="Update now"
            icon="download-outline"
            onPress={() => settings.androidDownloadUrl && Linking.openURL(settings.androidDownloadUrl)}
            style={{ marginTop: 18 }}
          />
          {!force ? <Button title="Later" variant="outline" onPress={later} style={{ marginTop: 10 }} /> : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  backdropForce: { backgroundColor: colors.surface },
  full: { flex: 1, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card: { backgroundColor: '#fff', borderRadius: radius.xl, padding: 22, ...shadow(3) },
  icon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  version: { color: colors.muted, marginTop: 6, fontSize: 14 },
  message: { marginTop: 10, fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center' },
  forceNote: { marginTop: 12, color: colors.danger, fontSize: 13, fontWeight: '500' },
});
