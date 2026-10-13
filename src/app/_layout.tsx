import { useCallback, useState } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { Inter_800ExtraBold } from '@expo-google-fonts/inter/800ExtraBold';
import { AuthProvider, useAuth } from '../auth';
import { AppHeader } from '../components/AppHeader';
import { FeedbackProvider } from '../components/Feedback';
import { Loading } from '../components/ui';
import { Offline } from '../components/Offline';
import { AppIntro } from '../components/AppIntro';

// Keep the native splash until the in-app intro (same logo) is on screen.
SplashScreen.preventAutoHideAsync().catch(() => {});
import { colors } from '../theme';

const stackHeader = (title: string, subtitle?: string) => ({
  headerShown: true,
  header: () => <AppHeader title={title} subtitle={subtitle} back bell={false} />,
});

function RootStack() {
  const { ready, token, user, bootError } = useAuth();
  if (!ready) return <Loading />;
  if (token && !user) return bootError ? <Offline /> : <Loading />;
  const isAdmin = !!user?.isAdmin;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.surface } }}>
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" />
      </Stack.Protected>

      <Stack.Protected guard={!!token && isAdmin}>
        <Stack.Screen name="admin" />
        <Stack.Screen name="stock" options={stackHeader('Manage Stock', 'Central inventory')} />
        <Stack.Screen name="sell" options={stackHeader('Sell Kits', 'Record a customer sale')} />
        <Stack.Screen name="holders" options={stackHeader('Holders & Sellers')} />
      </Stack.Protected>

      <Stack.Protected guard={!!token && !isAdmin}>
        <Stack.Screen name="user" />
      </Stack.Protected>

      <Stack.Protected guard={!!token}>
        <Stack.Screen name="notifications" options={stackHeader('Notifications')} />
        <Stack.Screen name="wallet" options={stackHeader('Wallet', 'Money from sales & transfers')} />
      </Stack.Protected>

      <Stack.Screen name="index" />
    </Stack>
  );
}

function Intro({ fontsReady }: { fontsReady: boolean }) {
  const { ready } = useAuth();
  const [done, setDone] = useState(false);
  const finish = useCallback(() => setDone(true), []);
  if (done) return null;
  return <AppIntro ready={fontsReady && ready} onDone={finish} />;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const fontsReady = Boolean(fontsLoaded || fontError);
  return (
    <SafeAreaProvider>
      <FeedbackProvider>
        <AuthProvider>
          <StatusBar style="light" />
          {fontsReady ? <RootStack /> : <Loading />}
          <Intro fontsReady={fontsReady} />
        </AuthProvider>
      </FeedbackProvider>
    </SafeAreaProvider>
  );
}
