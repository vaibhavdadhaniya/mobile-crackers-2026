import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, RadialGradient, Stop } from 'react-native-svg';

// Deterministic pseudo-random so bursts look organic but never change between renders.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Ray = { x1: number; y1: number; x2: number; y2: number; head: number; droop: number };

function buildRays(seed: number, count: number, inner: number, outer: number, spread: number): Ray[] {
  const r = rng(seed);
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + (r() - 0.5) * 0.12;
    const len = outer * (spread + (1 - spread) * r());
    const cos = Math.cos(a);
    const sin = Math.sin(a);
    return {
      x1: 100 + cos * inner,
      y1: 100 + sin * inner,
      x2: 100 + cos * len,
      y2: 100 + sin * len,
      head: 1.2 + r() * 1.4,
      droop: 3 + r() * 5, // gravity on falling sparks
    };
  });
}

/** Realistic firework burst: tapered streaks that fade toward the centre, spark heads and falling embers. */
export function FireworkBurst({
  size,
  seed = 1,
  color = '#FFFFFF',
  accent = '#FFE2B0',
  rays = 28,
}: {
  size: number;
  seed?: number;
  color?: string;
  accent?: string;
  rays?: number;
}) {
  const outerRays = useMemo(() => buildRays(seed, rays, 16, 96, 0.72), [seed, rays]);
  const innerRays = useMemo(() => buildRays(seed + 7, Math.round(rays * 0.6), 10, 58, 0.65), [seed, rays]);
  const id = `fw${seed}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id={`${id}-streak`} cx="100" cy="100" r="100" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={color} stopOpacity="0" />
          <Stop offset="0.35" stopColor={color} stopOpacity="0.15" />
          <Stop offset="0.85" stopColor={color} stopOpacity="1" />
          <Stop offset="1" stopColor={color} stopOpacity="0.6" />
        </RadialGradient>
        <RadialGradient id={`${id}-inner`} cx="100" cy="100" r="62" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={accent} stopOpacity="0" />
          <Stop offset="0.5" stopColor={accent} stopOpacity="0.25" />
          <Stop offset="1" stopColor={accent} stopOpacity="1" />
        </RadialGradient>
        <RadialGradient id={`${id}-glow`} cx="100" cy="100" r="40" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor={accent} stopOpacity="0.9" />
          <Stop offset="1" stopColor={accent} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="100" cy="100" r="40" fill={`url(#${id}-glow)`} />
      <G>
        {outerRays.map((r, i) => (
          <G key={`o${i}`}>
            <Line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={`url(#${id}-streak)`} strokeWidth={1.6} strokeLinecap="round" />
            <Circle cx={r.x2} cy={r.y2} r={r.head} fill={color} />
            <Circle cx={r.x2} cy={r.y2 + r.droop} r={r.head * 0.55} fill={color} opacity={0.6} />
            <Circle cx={r.x2} cy={r.y2 + r.droop * 2} r={r.head * 0.35} fill={color} opacity={0.3} />
          </G>
        ))}
        {innerRays.map((r, i) => (
          <G key={`i${i}`}>
            <Line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={`url(#${id}-inner)`} strokeWidth={1.2} strokeLinecap="round" />
            <Circle cx={r.x2} cy={r.y2} r={r.head * 0.7} fill={accent} />
          </G>
        ))}
      </G>
      <Circle cx="100" cy="100" r="3" fill={color} />
    </Svg>
  );
}

/** Rising rocket trail that fades out toward the ground. */
export function FireworkTrail({ width, height, color = '#FFFFFF' }: { width: number; height: number; color?: string }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 40 200">
      <Defs>
        <LinearGradient id="trail" x1="0" y1="1" x2="0" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="0" />
          <Stop offset="1" stopColor={color} stopOpacity="0.9" />
        </LinearGradient>
      </Defs>
      <Path d="M22 200 C 18 140, 26 80, 20 6" stroke="url(#trail)" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Circle cx="20" cy="6" r="2.4" fill={color} />
    </Svg>
  );
}

function Twinkle({ style, children, base, delay, duration }: { style: ViewStyle; children: React.ReactNode; base: number; delay: number; duration: number }) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [v, delay, duration]);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 1], outputRange: [base * 0.55, base] }),
          transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.03] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Low-opacity animated fireworks for an orange backdrop. Place inside a relatively positioned container. */
export function FireworksBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Twinkle style={{ position: 'absolute', top: -40, right: -70 }} base={0.28} delay={0} duration={2600}>
        <FireworkBurst size={280} seed={11} rays={34} />
      </Twinkle>
      <Twinkle style={{ position: 'absolute', top: 110, left: -60 }} base={0.2} delay={700} duration={3000}>
        <FireworkBurst size={190} seed={23} rays={26} accent="#FFD38A" />
      </Twinkle>
      <Twinkle style={{ position: 'absolute', top: 30, left: 70 }} base={0.18} delay={1300} duration={2200}>
        <FireworkBurst size={96} seed={37} rays={18} />
      </Twinkle>
      <Twinkle style={{ position: 'absolute', top: 200, right: 34 }} base={0.22} delay={400} duration={2400}>
        <FireworkBurst size={120} seed={51} rays={22} accent="#FFF1D6" />
      </Twinkle>
      <View style={{ position: 'absolute', top: 278, right: 86, opacity: 0.22 }}>
        <FireworkTrail width={14} height={110} />
      </View>
      <View style={{ position: 'absolute', top: 222, left: 30, opacity: 0.16 }}>
        <FireworkTrail width={12} height={90} />
      </View>
      {SPARKS.map((p, i) => (
        <Twinkle key={i} style={{ position: 'absolute', top: p[0], left: `${p[1]}%`, width: p[2], height: p[2], borderRadius: p[2], backgroundColor: '#FFF4E0' }} base={0.55} delay={i * 230} duration={1400 + (i % 4) * 300}>
          {null}
        </Twinkle>
      ))}
    </View>
  );
}

// [top, left %, size]
const SPARKS: [number, number, number][] = [
  [60, 12, 3], [96, 48, 2], [150, 88, 3], [40, 64, 2], [238, 58, 2], [180, 20, 2], [300, 10, 3], [270, 44, 2], [20, 36, 2],
];

/** App mark: multicolour firework burst on a white badge. */
export function FireworkLogo({ size = 72 }: { size?: number }) {
  const rays = useMemo(() => buildRays(5, 18, 30, 84, 0.9), []);
  const colorsArr = ['#F97316', '#F59E0B', '#DC2626'];
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200">
      <Defs>
        <RadialGradient id="logo-core" cx="100" cy="100" r="34" gradientUnits="userSpaceOnUse">
          <Stop offset="0" stopColor="#FDE68A" />
          <Stop offset="1" stopColor="#F97316" />
        </RadialGradient>
      </Defs>
      {rays.map((r, i) => {
        const c = colorsArr[i % 3];
        return (
          <G key={i}>
            <Line x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2} stroke={c} strokeWidth={10} strokeLinecap="round" opacity={0.95} />
            <Circle cx={100 + (r.x2 - 100) * 1.16} cy={100 + (r.y2 - 100) * 1.16} r={6} fill={c} />
          </G>
        );
      })}
      <Circle cx="100" cy="100" r="26" fill="url(#logo-core)" />
      <Circle cx="93" cy="93" r="6" fill="#FFFFFF" opacity={0.7} />
    </Svg>
  );
}

/** Subtle fireworks for the orange dashboard header (low opacity, slow twinkle). */
export function HeaderFireworks() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Twinkle style={{ position: 'absolute', top: -46, right: -40 }} base={0.22} delay={0} duration={2800}>
        <FireworkBurst size={170} seed={61} rays={28} />
      </Twinkle>
      <Twinkle style={{ position: 'absolute', top: 6, right: 118 }} base={0.16} delay={900} duration={2400}>
        <FireworkBurst size={70} seed={73} rays={16} accent="#FFE7C2" />
      </Twinkle>
      <Twinkle style={{ position: 'absolute', bottom: -38, left: -30 }} base={0.14} delay={500} duration={3200}>
        <FireworkBurst size={120} seed={87} rays={22} accent="#FFD38A" />
      </Twinkle>
      <Twinkle style={{ position: 'absolute', top: 18, left: '46%', width: 3, height: 3, borderRadius: 3, backgroundColor: '#FFF4E0' }} base={0.6} delay={300} duration={1500}>
        {null}
      </Twinkle>
      <Twinkle style={{ position: 'absolute', bottom: 12, right: '34%', width: 2, height: 2, borderRadius: 2, backgroundColor: '#FFF4E0' }} base={0.6} delay={1100} duration={1700}>
        {null}
      </Twinkle>
    </View>
  );
}
