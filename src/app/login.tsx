import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, Pressable, ScrollView, StyleSheet, TextInput as RNTextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { api, User } from '../api';
import { useAuth } from '../auth';
import { Button, tap } from '../components/ui';
import { Text, TextInput } from '../components/Text';
import { LinearGradient } from 'expo-linear-gradient';
import { FireworksBackdrop } from '../components/Fireworks';
import { useFeedback } from '../components/Feedback';
import { useKeyboardHeight } from '../components/KeyboardAware';
import { colors, radius, shadow } from '../theme';
import { digitsOnly } from '../format';
import { normalizeMobile } from '../customer';

const OTP_LEN = 6;

export default function Login() {
  const { login } = useAuth();
  const fb = useFeedback();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'static' | 'msg91' | 'whatsapp'>('static');
  const [cooldown, setCooldown] = useState(0);
  const otpRef = useRef<RNTextInput>(null);
  const scrollRef = useRef<ScrollView>(null);
  const kbHeight = useKeyboardHeight();
  // If the window itself shrank for the keyboard (some Android setups), only add what is still covered.
  const [viewH, setViewH] = useState(0);
  const baseH = useRef(0);
  if (kbHeight === 0 && viewH > baseH.current) baseH.current = viewH;
  const shrunk = kbHeight > 0 && baseH.current ? Math.max(0, baseH.current - viewH) : 0;
  const kbSpace = Math.max(0, kbHeight - shrunk);
  // Bring the whole form above the keyboard: add the keyboard height as space and scroll to the end.
  const revealForm = () => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), Platform.OS === 'ios' ? 50 : 150);

  useEffect(() => {
    if (kbHeight > 0) revealForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kbHeight, step]);
  const shake = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const doShake = () =>
    Animated.sequence([8, -8, 6, -6, 0].map((v) => Animated.timing(shake, { toValue: v, duration: 50, useNativeDriver: true }))).start();

  const sendOtp = async () => {
    if (!/^\d{10}$/.test(phone)) return fb.error('Invalid number', 'Enter your 10 digit mobile number.');
    setBusy(true);
    try {
      const r = await api.post<{ mode: 'static' | 'msg91' | 'whatsapp' }>('/auth/send-otp', { phone });
      setMode(r.mode);
      setOtp('');
      setCooldown(30);
      setStep('otp');
      fb.success('OTP sent', r.mode === 'whatsapp' ? `Check WhatsApp on +91 ${phone}` : `Code sent to +91 ${phone}`);
      setTimeout(() => otpRef.current?.focus(), 300);
    } catch (e) {
      fb.error('Could not send OTP', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (code = otp) => {
    if (code.length < 4) return;
    setBusy(true);
    try {
      const r = await api.post<{ token: string; refreshToken: string; user: User }>('/auth/verify-otp', { phone, otp: code });
      await login({ token: r.token, refreshToken: r.refreshToken }, r.user);
    } catch (e) {
      doShake();
      setOtp('');
      fb.error('Login failed', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <LinearGradient colors={['#FB923C', '#F97316', '#C2410C']} locations={[0, 0.45, 1]} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={{ flex: 1 }}>
      <StatusBar style="light" />
      <FireworksBackdrop />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onLayout={(e) => setViewH(e.nativeEvent.layout.height)}
      >
        <View style={[s.hero, { paddingTop: insets.top + 48, minHeight: Math.max(320, height * 0.46), paddingLeft: 24 + insets.left, paddingRight: 24 + insets.right }]}>
          <View style={s.logoRing}>
            <Image source={require('../../assets/shc-badge.png')} style={s.logo} />
          </View>
          <Text style={s.org}>Harimay Yuvak Mandal</Text>
          <View style={s.orgSubRow}>
            <View style={s.rule} />
            <Text style={s.orgSub}>FIREWORKS MANAGEMENT</Text>
            <View style={s.rule} />
          </View>
        </View>

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 16, paddingLeft: 24 + insets.left, paddingRight: 24 + insets.right }]}>
          {step === 'phone' ? (
            <>
              <Text style={s.h1}>Sign in</Text>
              <Text style={s.p}>Use your registered mobile number. We'll send a one-time password.</Text>
              <PhoneInput value={phone} onChange={setPhone} onSubmit={sendOtp} onFocus={revealForm} />
              <Button title="Continue" onPress={sendOtp} loading={busy} disabled={phone.length !== 10} style={{ marginTop: 18 }} />
              <View style={s.secure}>
                <Ionicons name="lock-closed-outline" size={13} color={colors.faint} />
                <Text style={s.secureText}>Only registered members can sign in</Text>
              </View>
            </>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  tap();
                  setStep('phone');
                }}
                style={s.back}
                hitSlop={8}
              >
                <Ionicons name="arrow-back" size={16} color={colors.text} />
                <Text style={s.backText}>Back</Text>
              </Pressable>
              <Text style={s.h1}>Enter OTP</Text>
              <Text style={s.p}>
                {mode === 'whatsapp' ? 'Sent on WhatsApp to ' : 'Sent to '}<Text style={{ fontWeight: '600' }}>+91 {phone}</Text>
              </Text>
              {mode === 'static' && (
                <View style={s.note}>
                  <Ionicons name="information-circle-outline" size={15} color={colors.primaryDark} />
                  <Text style={s.noteText}>Test mode is on. Use the static OTP (default 123456).</Text>
                </View>
              )}

              <Animated.View style={{ transform: [{ translateX: shake }] }}>
                <OtpBoxes value={otp} onPress={() => otpRef.current?.focus()} />
                <TextInput
                  ref={otpRef}
                  value={otp}
                  onChangeText={(v) => {
                    const d = digitsOnly(v).slice(0, OTP_LEN);
                    setOtp(d);
                    if (d.length === OTP_LEN) verify(d);
                  }}
                  keyboardType="number-pad"
                  maxLength={OTP_LEN}
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  style={s.hiddenInput}
                  caretHidden
                />
              </Animated.View>

              <Button title="Verify & sign in" onPress={() => verify()} loading={busy} disabled={otp.length < 4} style={{ marginTop: 18 }} />
              <View style={s.resendRow}>
                <Text style={{ color: colors.muted, fontSize: 13 }}>Didn't receive it? </Text>
                <Pressable disabled={cooldown > 0 || busy} onPress={sendOtp} hitSlop={8}>
                  <Text style={{ color: cooldown > 0 ? colors.faint : colors.primary, fontWeight: '600', fontSize: 13 }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
        <View style={{ height: kbSpace, backgroundColor: '#fff' }} />
      </ScrollView>
    </LinearGradient>
  );
}

function PhoneInput({ value, onChange, onSubmit, onFocus }: { value: string; onChange: (v: string) => void; onSubmit: () => void; onFocus: () => void }) {
  const [focus, setFocus] = useState(false);
  return (
    <>
      <Text style={s.label}>Mobile number</Text>
      <View style={[s.phoneWrap, focus && { borderColor: colors.primary }]}>
        <Text style={s.cc}>+91</Text>
        <View style={s.ccDivider} />
        <TextInput
          style={s.phoneInput}
          placeholder="10 digit number"
          placeholderTextColor={colors.faint}
          keyboardType="phone-pad"
          maxLength={16}
          value={value}
          onChangeText={(v) => onChange(normalizeMobile(v))}
          onSubmitEditing={onSubmit}
          onFocus={() => {
            setFocus(true);
            onFocus();
          }}
          onBlur={() => setFocus(false)}
          selectionColor={colors.primary}
          textContentType="telephoneNumber"
          autoComplete="tel"
        />
        {value.length === 10 && <Ionicons name="checkmark-circle" size={18} color={colors.success} />}
      </View>
    </>
  );
}

function OtpBoxes({ value, onPress }: { value: string; onPress: () => void }) {
  return (
    <Pressable style={s.otpRow} onPress={onPress}>
      {Array.from({ length: OTP_LEN }).map((_, i) => {
        const ch = value[i];
        const active = i === value.length;
        return (
          <View key={i} style={[s.otpBox, active && s.otpActive, ch ? s.otpFilled : null]}>
            <Text style={s.otpChar}>{ch ?? ''}</Text>
          </View>
        );
      })}
    </Pressable>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', justifyContent: 'center', paddingBottom: 44 },
  logoRing: { padding: 6, borderRadius: 30, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', marginBottom: 18 },
  logo: { width: 108, height: 108, borderRadius: 24 },
  org: { color: '#fff', fontSize: 25, fontWeight: '700', textAlign: 'center', letterSpacing: 0.2, textShadowColor: 'rgba(124,45,18,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6 },
  orgSubRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  rule: { width: 22, height: 1, backgroundColor: 'rgba(255,255,255,0.6)' },
  orgSub: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '600', letterSpacing: 2.4 },
  sheet: { flexGrow: 1, backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 30, ...shadow(3) },
  h1: { fontSize: 22, fontWeight: '700' },
  p: { color: colors.muted, fontSize: 14, marginTop: 4, marginBottom: 20, lineHeight: 20 },
  label: { fontSize: 12.5, fontWeight: '600', color: colors.muted, marginBottom: 6 },
  phoneWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, height: 50, paddingHorizontal: 14, gap: 10 },
  cc: { fontWeight: '600', fontSize: 15 },
  ccDivider: { width: 1, height: 22, backgroundColor: colors.border },
  phoneInput: { flex: 1, fontSize: 16, color: colors.text, letterSpacing: 0.5 },
  secure: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
  secureText: { color: colors.faint, fontSize: 12 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginBottom: 14 },
  backText: { fontWeight: '600', fontSize: 14 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, padding: 10, borderRadius: radius.md, marginTop: -6, marginBottom: 16 },
  noteText: { color: colors.primaryDark, fontSize: 12.5, flex: 1 },
  otpRow: { flexDirection: 'row', gap: 8 },
  otpBox: { flex: 1, height: 52, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  otpActive: { borderColor: colors.primary, borderWidth: 1.5 },
  otpFilled: { backgroundColor: colors.surface },
  otpChar: { fontSize: 20, fontWeight: '600' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  resendRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 18 },
});
