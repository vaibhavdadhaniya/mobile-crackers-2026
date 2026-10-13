import { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { HeaderBell } from './HeaderBell';
import { tap } from './ui';
import { Text } from './Text';
import { HeaderFireworks } from './Fireworks';
import { colors } from '../theme';

// Header that extends under the status bar / notch / Dynamic Island.
export function AppHeader({
  title,
  subtitle,
  back,
  bell = true,
  children,
  fireworks,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  bell?: boolean;
  children?: ReactNode;
  fireworks?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.wrap, { paddingTop: insets.top + 8, paddingLeft: 16 + insets.left, paddingRight: 16 + insets.right }]}>
      <StatusBar style="light" />
      {fireworks ? <HeaderFireworks /> : null}
      <View style={s.row}>
        {back && (
          <Pressable
            onPress={() => {
              tap();
              if (router.canGoBack()) router.back();
            }}
            style={s.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
        )}
        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
        {bell && <HeaderBell />}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.primary, paddingBottom: 14, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 40 },
  title: { color: '#fff', fontSize: 19, fontWeight: '700' },
  subtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 12.5, marginTop: 1 },
  iconBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
});
