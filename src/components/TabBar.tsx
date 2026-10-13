import { ComponentProps, useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow, TAB_BAR_HEIGHT } from '../theme';
import { tap } from './ui';
import { Text } from './Text';

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type Icon = keyof typeof Ionicons.glyphMap;

export const TAB_ICONS: Record<string, [Icon, Icon]> = {
  index: ['home', 'home-outline'],
  transfer: ['swap-horizontal', 'swap-horizontal-outline'],
  requests: ['file-tray-full', 'file-tray-full-outline'],
  request: ['file-tray-full', 'file-tray-full-outline'],
  activity: ['time', 'time-outline'],
  settings: ['settings', 'settings-outline'],
  sell: ['cart', 'cart-outline'],
};

// Floating tab bar that respects the home indicator and hides with the keyboard.
export function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setHidden(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setHidden(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (hidden) return null;

  return (
    <View pointerEvents="box-none" style={[s.wrap, { bottom: Math.max(insets.bottom, 10), left: 12 + insets.left, right: 12 + insets.right }]}>
      <View style={s.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label = (options.tabBarLabel as string) ?? options.title ?? route.name;
          const [on, off] = TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const badge = options.tabBarBadge;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              tap();
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              style={s.item}
            >
              <View style={[s.icon, focused && s.iconOn]}>
                <Ionicons name={focused ? on : off} size={20} color={focused ? colors.primary : colors.faint} />
                {badge ? (
                  <View style={s.badge}>
                    <Text style={s.badgeText}>{badge}</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[s.label, focused && s.labelOn]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute' },
  bar: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    backgroundColor: '#fff',
    borderRadius: radius.xl,
    paddingHorizontal: 4,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...shadow(3),
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { width: 44, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.primarySoft },
  label: { fontSize: 10.5, fontWeight: '500', color: colors.faint },
  labelOn: { color: colors.primaryDark, fontWeight: '600' },
  badge: {
    position: 'absolute',
    top: -3,
    right: 4,
    backgroundColor: colors.danger,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#fff',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },
});
