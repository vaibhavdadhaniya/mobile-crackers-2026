import { useEffect, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import * as Application from 'expo-application';
import { api, AppConfigResponse } from '../api';
import { useApi } from '../hooks';
import { Banner, Button, Field, Text } from './ui';
import { useFeedback } from './Feedback';
import { colors, radius } from '../theme';
import { digitsOnly, dateTime } from '../format';

function Toggle({ title, sub, value, onChange, danger }: { title: string; sub: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <View style={s.switchRow}>
      <View style={{ flex: 1 }}>
        <Text style={s.switchTitle}>{title}</Text>
        <Text style={s.switchSub}>{sub}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: danger ? colors.danger : colors.primary, false: '#E7E5E4' }} thumbColor="#fff" />
    </View>
  );
}

// Super admin form for Firestore AppConfig/GlobalSettings (app update + maintenance).
export function AppUpdateForm() {
  const fb = useFeedback();
  const { data, error, reload } = useApi<AppConfigResponse>('/admin/app-update');
  const [androidVersion, setAndroidVersion] = useState('');
  const [androidBuild, setAndroidBuild] = useState('');
  const [androidUrl, setAndroidUrl] = useState('');
  const [iosVersion, setIosVersion] = useState('');
  const [iosBuild, setIosBuild] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [updateLog, setUpdateLog] = useState('');
  const [maintenance, setMaintenance] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mMessage, setMMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = data?.settings;
    if (!v) return;
    setAndroidVersion(v.androidVersion ?? '');
    setAndroidBuild(v.androidBuildNumber ? String(v.androidBuildNumber) : '');
    setAndroidUrl(v.androidDownloadUrl ?? '');
    setIosVersion(v.iosVersion ?? '');
    setIosBuild(v.iosBuildNumber ? String(v.iosBuildNumber) : '');
    setForceUpdate(!!v.forceUpdate);
    setUpdateLog(v.UpdateLog ?? '');
    setMaintenance(!!v.is_maintenance);
    setMTitle(v.maintenance_title ?? '');
    setMMessage(v.maintenance_message ?? '');
  }, [data]);

  const save = async () => {
    const ok = await fb.confirm({
      title: 'Publish app settings?',
      message: maintenance
        ? 'Maintenance is ON: members will be blocked from using the app until you turn it off.'
        : forceUpdate
          ? 'Force update is ON: older Android builds must update before they can be used.'
          : 'Older builds will see an "Update available" message.',
      details: [
        { label: 'Android', value: androidVersion ? `${androidVersion} (build ${androidBuild || 0})` : 'Not set' },
        { label: 'Force update', value: forceUpdate ? 'On' : 'Off' },
        { label: 'Maintenance', value: maintenance ? 'On' : 'Off' },
      ],
      destructive: maintenance,
      confirmText: 'Publish',
      icon: 'cloud-upload-outline',
    });
    if (!ok) return;
    setBusy(true);
    try {
      const r = await api.put<{ message: string }>('/admin/app-update', {
        androidVersion: androidVersion.trim(),
        androidBuildNumber: androidBuild === '' ? 0 : Number(androidBuild),
        androidDownloadUrl: androidUrl.trim(),
        iosVersion: iosVersion.trim(),
        iosBuildNumber: iosBuild === '' ? 0 : Number(iosBuild),
        forceUpdate,
        UpdateLog: updateLog,
        is_maintenance: maintenance,
        maintenance_title: mTitle,
        maintenance_message: mMessage,
      });
      fb.success('App settings published', r.message);
      reload();
    } catch (e) {
      fb.error('Not saved', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <View style={s.current}>
        <Text style={s.currentText}>
          This app: version {Application.nativeApplicationVersion ?? '-'} (build {Application.nativeBuildVersion ?? '-'})
        </Text>
        {data?.settings?.updatedAt ? (
          <Text style={s.currentText}>
            Last published {dateTime(data.settings.updatedAt)}
            {data.settings.updatedBy ? ` by ${data.settings.updatedBy}` : ''}
          </Text>
        ) : null}
      </View>
      {error ? <Banner text={error} /> : null}

      <Text style={s.subhead}>Android</Text>
      <Field label="Android version" icon="pricetag-outline" placeholder="e.g. 1.0.1" value={androidVersion} onChangeText={setAndroidVersion} autoCapitalize="none" />
      <Field
        label="Android build number"
        icon="git-commit-outline"
        placeholder="e.g. 2"
        keyboardType="number-pad"
        value={androidBuild}
        onChangeText={(v) => setAndroidBuild(digitsOnly(v))}
        hint="versionCode of the new APK; phones with a lower build see the update"
      />
      <Field label="APK download link" icon="link-outline" placeholder="https://..." value={androidUrl} onChangeText={setAndroidUrl} autoCapitalize="none" autoCorrect={false} keyboardType="url" />

      <Text style={s.subhead}>iOS</Text>
      <Field label="iOS version" icon="pricetag-outline" placeholder="e.g. 1.0.1" value={iosVersion} onChangeText={setIosVersion} autoCapitalize="none" />
      <Field label="iOS build number" icon="git-commit-outline" placeholder="e.g. 2" keyboardType="number-pad" value={iosBuild} onChangeText={(v) => setIosBuild(digitsOnly(v))} />

      <Text style={s.subhead}>Update</Text>
      <Toggle title="Force update" sub="Older builds must update before they can be used" value={forceUpdate} onChange={setForceUpdate} />
      <Field label="Update log (what's new)" icon="document-text-outline" placeholder="e.g. Faster loading and bug fixes" value={updateLog} onChangeText={setUpdateLog} multiline />

      <Text style={s.subhead}>Maintenance</Text>
      <Toggle title="Maintenance mode" sub="Blocks members; admins can still use the app" value={maintenance} onChange={setMaintenance} danger />
      <Field label="Maintenance title" icon="construct-outline" placeholder="e.g. Back soon" value={mTitle} onChangeText={setMTitle} />
      <Field label="Maintenance message" icon="chatbox-ellipses-outline" placeholder="e.g. Server upgrade till 6 PM" value={mMessage} onChangeText={setMMessage} multiline />

      <Button title="Publish app settings" icon="cloud-upload-outline" onPress={save} loading={busy} />
    </View>
  );
}

const s = StyleSheet.create({
  current: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 10, marginBottom: 14, gap: 2 },
  currentText: { color: colors.muted, fontSize: 12.5 },
  subhead: { fontWeight: '600', color: colors.muted, marginBottom: 10, marginTop: 4, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  switchTitle: { fontWeight: '600', fontSize: 14 },
  switchSub: { color: colors.muted, fontSize: 12, marginTop: 1 },
});
