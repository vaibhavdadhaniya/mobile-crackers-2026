import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '../theme';
import { Text } from './Text';

// The native splash is plain white (assets/splash-blank.png), so this is the ONLY logo
// animation: the logo fades/scales in on white, then the title and loading bar follow.
const LOGO = require('../../assets/shc-badge.png'); // same badge as the login screen
const LOGO_W = 150;
const LOGO_RATIO = 1;
const MIN_SHOW_MS = 1700;

export function AppIntro({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const logoIn = useRef(new Animated.Value(0)).current;
  const textIn = useRef(new Animated.Value(0)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;
  const [minDone, setMinDone] = useState(false);
  const started = useRef(Date.now());

  // White native splash -> white intro (no visible hand-off), then the single logo animation.
  const onLayout = () => {
    SplashScreen.hideAsync().catch(() => {});
    Animated.parallel([
      Animated.timing(logoIn, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(textIn, { toValue: 1, duration: 520, delay: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bar, { toValue: 0.85, duration: MIN_SHOW_MS, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]).start();
    setTimeout(() => setMinDone(true), Math.max(0, MIN_SHOW_MS - (Date.now() - started.current)));
  };

  useEffect(() => {
    if (!ready || !minDone) return;
    Animated.sequence([
      Animated.timing(bar, { toValue: 1, duration: 180, useNativeDriver: false }),
      Animated.timing(fadeOut, { toValue: 0, duration: 320, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(onDone);
  }, [ready, minDone, bar, fadeOut, onDone]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, s.wrap, { opacity: fadeOut }]} onLayout={onLayout} pointerEvents="none">
      <Animated.View
        style={{
          opacity: logoIn,
          transform: [{ scale: logoIn.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) }],
        }}
      >
        <Image source={LOGO} style={{ width: LOGO_W, height: LOGO_W * LOGO_RATIO, borderRadius: 30 }} resizeMode="contain" />
      </Animated.View>
      <Animated.View
        style={{ alignItems: 'center', marginTop: 26, opacity: textIn, transform: [{ translateY: textIn.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}
      >
        <Text style={s.title}>Harimay Yuvak Mandal</Text>
        <Text style={s.sub}>FIREWORKS MANAGEMENT</Text>
      </Animated.View>
      <View style={s.track}>
        <Animated.View style={[s.fill, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', zIndex: 2000, elevation: 2000 },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  sub: { fontSize: 11, fontWeight: '600', color: colors.primaryDark, letterSpacing: 2.4, marginTop: 6 },
  track: { position: 'absolute', bottom: '14%', width: 120, height: 3, borderRadius: 2, backgroundColor: colors.primarySoft, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary, borderRadius: 2 },
});
