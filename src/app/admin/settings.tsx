import { ReactNode, useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api, Settings } from '../../api';
import { useAuth } from '../../auth';
import { useApi } from '../../hooks';
import { Avatar, Banner, Button, Card, Field, IconName, IconTile, Screen, Segmented, tap, Text, tones } from '../../components/ui';
import { useFeedback } from '../../components/Feedback';
import { DatePicker } from '../../components/DatePicker';
import { ResetData } from '../../components/ResetData';
import { AdminsManager } from '../../components/AdminsManager';
import { AppUpdateForm } from '../../components/AppUpdateForm';
import { colors, radius } from '../../theme';
import { dateLabel, digitsOnly, money, num, rupees } from '../../format';

export default function AdminSettings() {
  const { me, logout, refreshMe } = useAuth();
  const fb = useFeedback();
  const { data, error, refreshing, refresh, setData } = useApi<Settings>('/admin/settings');

  const [price, setPrice] = useState('');
  const [target, setTarget] = useState('');
  const [deadline, setDeadline] = useState<string | null>(null);
  const [otpMode, setOtpMode] = useState<Settings['otpMode']>('static');
  const [staticOtp, setStaticOtp] = useState('');
  const [authKey, setAuthKey] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [country, setCountry] = useState('91');
  const [waNumber, setWaNumber] = useState('');
  const [waTemplate, setWaTemplate] = useState('login_otp');
  const [waLanguage, setWaLanguage] = useState('en');
  const [waNamespace, setWaNamespace] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setPrice(String(data.kitPrice ?? ''));
    setTarget(String(data.sellTarget ?? ''));
    setDeadline(data.sellDeadline);
    setOtpMode(data.otpMode);
    setStaticOtp(data.staticOtp);
    setTemplateId(data.msg91TemplateId ?? '');
    setCountry(data.msg91CountryCode);
    setWaNumber(data.msg91WaNumber ?? '');
    setWaTemplate(data.msg91WaTemplate ?? 'login_otp');
    setWaLanguage(data.msg91WaLanguage ?? 'en');
    setWaNamespace(data.msg91WaNamespace ?? '');
  }, [data]);

  const save = async (section: string, body: Record<string, unknown>) => {
    setSaving(section);
    try {
      const r = await api.put<Settings>('/admin/settings', body);
      setData(r);
      setAuthKey('');
      refreshMe();
      fb.success('Settings saved');
    } catch (e) {
      fb.error('Settings not saved', (e as Error).message);
      refresh();
    } finally {
      setSaving(null);
    }
  };

  const testOtp = async (channel: 'msg91' | 'whatsapp') => {
    setSaving(`test-${channel}`);
    try {
      const r = await api.post<{ message: string }>('/admin/settings/test-otp', { phone: testPhone || me?.user.phone, channel });
      fb.success('Test OTP sent', r.message);
    } catch (e) {
      fb.error(channel === 'whatsapp' ? 'WhatsApp test failed' : 'SMS test failed', (e as Error).message);
    } finally {
      setSaving(null);
    }
  };

  const targetRevenue = Number(price || 0) * Number(target || 0);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      {error ? <Banner text={error} /> : null}

      <Card style={s.profile}>
        <Avatar name={me?.user.name ?? ''} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={s.profileName}>{me?.user.name}</Text>
          <Text style={s.profileMeta}>+91 {me?.user.phone}</Text>
          <View style={s.rolePill}>
            <Ionicons name="shield-checkmark-outline" size={11} color={colors.primaryDark} />
            <Text style={s.roleText}>{me?.user.role === 'super_admin' ? 'Super Admin' : 'Kit management access'}</Text>
          </View>
        </View>
      </Card>

      <Section
        icon="flag-outline"
        tone="primary"
        title="Kit & selling target"
        sub={data ? [`${money(data.kitPrice)} per kit`, data.sellTarget ? `target ${num(data.sellTarget)}` : null, data.sellDeadline ? `by ${dateLabel(data.sellDeadline)}` : null].filter(Boolean).join(' · ') : 'Price, target and last selling date'}
      >
        <Field
          label="Price per kit (₹)"
          icon="pricetag-outline"
          keyboardType="decimal-pad"
          value={price}
          onChangeText={(v) => setPrice(v.replace(/[^\d.]/g, ''))}
          placeholder="e.g. 1500"
        />
        <Field
          label="Target kits to sell"
          icon="trending-up-outline"
          keyboardType="number-pad"
          value={target}
          onChangeText={(v) => setTarget(digitsOnly(v))}
          placeholder="e.g. 5000"
          hint={targetRevenue ? `Target revenue: ${money(targetRevenue)}` : undefined}
        />
        <DatePicker label="Last date to sell" value={deadline} onChange={setDeadline} />
        <Button
          title="Save target"
          icon="save-outline"
          loading={saving === 'target'}
          onPress={() => save('target', { kitPrice: price || 0, sellTarget: target || 0, sellDeadline: deadline })}
        />
      </Section>

      <Section
        icon="key-outline"
        tone="info"
        title="OTP login"
        sub={
          data?.otpMode === 'whatsapp'
            ? 'WhatsApp OTP is active'
            : data?.otpMode === 'msg91'
              ? 'SMS OTP is active'
              : `Static OTP is active${data?.msg91AuthKeySet ? ' · MSG91 saved' : ''}`
        }
      >
        <Segmented
          options={[
            { key: 'static', label: 'Static' },
            { key: 'msg91', label: 'SMS' },
            { key: 'whatsapp', label: 'WhatsApp' },
          ]}
          value={otpMode}
          onChange={setOtpMode}
        />
        {otpMode === 'static' ? (
          <Field
            label="Static OTP"
            icon="keypad-outline"
            keyboardType="number-pad"
            maxLength={8}
            value={staticOtp}
            onChangeText={(v) => setStaticOtp(digitsOnly(v))}
          />
        ) : (
          <View style={s.warn}>
            <Ionicons name="information-circle" size={16} color={colors.info} />
            <Text style={s.warnText}>
              Send a test OTP below before saving {otpMode === 'whatsapp' ? 'WhatsApp' : 'SMS'} mode, so nobody gets locked out.
            </Text>
          </View>
        )}

        <Text style={s.subhead}>MSG91 credentials</Text>
        <Field
          label="Auth key"
          icon="lock-closed-outline"
          value={authKey}
          onChangeText={setAuthKey}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          placeholder={data?.msg91AuthKeySet ? `Saved ${data.msg91AuthKeyMasked} · type to replace` : 'Paste MSG91 auth key'}
        />
        <Field label="Country code" icon="globe-outline" keyboardType="number-pad" maxLength={4} value={country} onChangeText={(v) => setCountry(digitsOnly(v))} />

        <Text style={s.subhead}>SMS OTP</Text>
        <Field
          label="SMS OTP template ID"
          icon="chatbox-outline"
          value={templateId}
          onChangeText={setTemplateId}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="MSG91 SMS OTP template id"
        />

        <Text style={s.subhead}>WhatsApp OTP</Text>
        <Field
          label="WhatsApp number (integrated in MSG91)"
          icon="logo-whatsapp"
          keyboardType="number-pad"
          value={waNumber}
          onChangeText={(v) => setWaNumber(digitsOnly(v))}
          placeholder="With country code, e.g. 919876543210"
        />
        <Field label="Template name" icon="document-text-outline" value={waTemplate} onChangeText={setWaTemplate} autoCapitalize="none" autoCorrect={false} placeholder="login_otp" />
        <Field label="Template language" icon="language-outline" value={waLanguage} onChangeText={setWaLanguage} autoCapitalize="none" autoCorrect={false} placeholder="en" />
        <Field
          label="Template namespace (optional)"
          icon="code-outline"
          value={waNamespace}
          onChangeText={setWaNamespace}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Leave blank if not shown in MSG91"
        />

        <Button
          title="Save OTP settings"
          icon="save-outline"
          loading={saving === 'otp'}
          onPress={() =>
            save('otp', {
              otpMode,
              staticOtp: staticOtp || '123456',
              msg91AuthKey: authKey || undefined,
              msg91TemplateId: templateId,
              msg91CountryCode: country || '91',
              msg91WaNumber: waNumber,
              msg91WaTemplate: waTemplate.trim() || 'login_otp',
              msg91WaLanguage: waLanguage.trim() || 'en',
              msg91WaNamespace: waNamespace,
            })
          }
        />
        <View style={s.divider} />
        <Field
          label="Send a test OTP to"
          icon="call-outline"
          keyboardType="number-pad"
          maxLength={10}
          value={testPhone}
          onChangeText={(v) => setTestPhone(digitsOnly(v))}
          placeholder={me?.user.phone}
          hint="Save the settings first. Tests work even while static mode is on."
        />
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Test SMS"
            variant="outline"
            icon="chatbox-outline"
            style={{ flex: 1 }}
            loading={saving === 'test-msg91'}
            onPress={() => testOtp('msg91')}
            disabled={!data?.msg91AuthKeySet || !data?.msg91TemplateId}
          />
          <Button
            title="Test WhatsApp"
            variant="outline"
            icon="logo-whatsapp"
            style={{ flex: 1 }}
            loading={saving === 'test-whatsapp'}
            onPress={() => testOtp('whatsapp')}
            disabled={!data?.msg91AuthKeySet || !data?.msg91WaNumber}
          />
        </View>
      </Section>

      <Section icon="cloud-download-outline" tone="info" title="App update & maintenance" sub="Version, force update and maintenance mode">
        <AppUpdateForm />
      </Section>

      <Section icon="shield-checkmark-outline" tone="warning" title="Kit management access" sub="Give members full app access without changing their role">
        <AdminsManager />
      </Section>

      <Card style={{ paddingVertical: 6 }}>
        <LinkRow icon="archive" tone="primary" label="Manage stock" sub={`Central stock: ${num(me?.balance)}`} onPress={() => router.push('/stock')} />
        <LinkRow icon="people" tone="warning" label="Holders & sellers" onPress={() => router.push('/holders')} />
        <LinkRow icon="cart" tone="success" label="Sell kits" onPress={() => router.push('/sell')} />
        <LinkRow icon="wallet" tone="primary" label="My wallet" sub={rupees(me?.walletBalance)} onPress={() => router.push('/wallet')} />
        <LinkRow icon="notifications" tone="info" label="Notifications" onPress={() => router.push('/notifications')} last />
      </Card>

      <ResetData />

      <Button
        title="Sign out"
        variant="danger"
        icon="log-out-outline"
        onPress={async () => {
          if (await fb.confirm({ title: 'Sign out?', message: 'You will need an OTP to sign in again.', confirmText: 'Sign out', destructive: true, icon: 'log-out-outline' })) {
            logout();
          }
        }}
      />
    </Screen>
  );
}

// Collapsible settings group; closed by default, the subtitle summarises current values.
function Section({ icon, tone, title, sub, children }: { icon: IconName; tone: keyof typeof tones; title: string; sub: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={{ paddingVertical: 0 }}>
      <Pressable
        onPress={() => {
          tap();
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen((o) => !o);
        }}
        style={[s.header, { paddingVertical: 14, marginBottom: 0 }]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <IconTile icon={icon} tone={tone} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={s.headerTitle}>{title}</Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {sub}
          </Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.faint} />
      </Pressable>
      {open ? <View style={s.sectionBody}>{children}</View> : null}
    </Card>
  );
}

function LinkRow({
  icon,
  tone,
  label,
  sub,
  onPress,
  last,
}: {
  icon: IconName;
  tone: keyof typeof tones;
  label: string;
  sub?: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [s.link, !last && s.linkBorder, pressed && { opacity: 0.7 }]}
    >
      <IconTile icon={icon} tone={tone} size={32} />
      <View style={{ flex: 1 }}>
        <Text style={s.linkText}>{label}</Text>
        {sub ? <Text style={s.headerSub}>{sub}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const s = StyleSheet.create({
  profile: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  profileName: { fontWeight: '700', fontSize: 16, color: colors.text },
  profileMeta: { color: colors.muted, marginTop: 2 },
  rolePill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginTop: 6 },
  roleText: { color: colors.primaryDark, fontWeight: '600', fontSize: 11 },
  sectionBody: { paddingTop: 14, paddingBottom: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 18 },
  headerTitle: { fontWeight: '700', fontSize: 15, color: colors.text },
  headerSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
  subhead: { fontWeight: '600', color: colors.muted, marginBottom: 12, marginTop: 4, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  warn: { flexDirection: 'row', gap: 8, backgroundColor: colors.infoSoft, padding: 12, borderRadius: radius.md, marginBottom: 16 },
  warnText: { color: colors.info, fontSize: 12.5, flex: 1, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: 18 },
  link: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  linkBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  linkText: { fontWeight: '700', color: colors.text, fontSize: 15 },
});
