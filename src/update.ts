// Pure app update / maintenance helpers (unit tested).
// Settings come from Firestore AppConfig/GlobalSettings (same field names).
export type AppSettings = {
  androidVersion?: string;
  androidBuildNumber?: number;
  androidDownloadUrl?: string;
  iosVersion?: string;
  iosBuildNumber?: number;
  forceUpdate?: boolean;
  UpdateLog?: string;
  is_maintenance?: boolean;
  maintenance_title?: string;
  maintenance_message?: string;
};

export type UpdateDecision = 'none' | 'optional' | 'force';

type FsValue = { stringValue?: string; integerValue?: string; doubleValue?: number; booleanValue?: boolean; nullValue?: null };

// Firestore REST returns typed values: { fields: { androidBuildNumber: { integerValue: "2" }, ... } }
export function parseFirestoreDoc(doc: { fields?: Record<string, FsValue> } | null | undefined): AppSettings {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(doc?.fields ?? {})) {
    if (v.stringValue !== undefined) out[k] = v.stringValue;
    else if (v.integerValue !== undefined) out[k] = Number(v.integerValue);
    else if (v.doubleValue !== undefined) out[k] = Number(v.doubleValue);
    else if (v.booleanValue !== undefined) out[k] = v.booleanValue;
    else out[k] = null;
  }
  return out as AppSettings;
}

// Where users get a new build. Kept in JS (not app.json extra) so already-installed builds pick
// changes up from the bundle instead of needing a native rebuild.
export type UpdateLinks = { ios?: string; android?: string };
export const UPDATE_LINKS: UpdateLinks = {
  ios: 'https://testflight.apple.com/join/5kggRDWG',
  android: 'https://drive.google.com/drive/folders/1cW5_bG5ZVrOKcY3omjWxC3CkOcrLWzJR?usp=sharing',
};

// Where "Update now" goes. Android: the admin-set APK link wins over the default.
export function updateUrl(s: AppSettings | null | undefined, platform: 'android' | 'ios', links: UpdateLinks = {}): string | null {
  const url = platform === 'android' ? s?.androidDownloadUrl?.trim() || links.android : links.ios;
  return url?.trim() || null;
}

// Compare dotted versions numerically ("1.0" == "1.0.0" < "1.0.1" < "1.10"). <0, 0 or >0.
export function compareVersions(a: string, b: string): number {
  const pa = a.trim().split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.trim().split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

// currentBuild = this install's build number (android versionCode / iOS build);
// currentVersion = its version (iOS CFBundleShortVersionString).
// Android: versionCode always grows, so the build number alone decides.
// iOS: usually only the build number is bumped, but a new version may restart it, so the
// version decides first and the build number only within the same version.
export function decideUpdate(
  s: AppSettings | null | undefined,
  platform: 'android' | 'ios',
  currentBuild: number,
  links: UpdateLinks = {},
  currentVersion = ''
): UpdateDecision {
  if (!s || !currentBuild) return 'none';
  const latest = Number(platform === 'android' ? s.androidBuildNumber : s.iosBuildNumber) || 0;
  if (!latest) return 'none'; // not published for this platform
  const latestVersion = platform === 'ios' ? s.iosVersion?.trim() : '';
  const byVersion = latestVersion && currentVersion ? compareVersions(latestVersion, currentVersion) : 0;
  if (byVersion < 0 || (byVersion === 0 && latest <= currentBuild)) return 'none';
  if (!updateUrl(s, platform, links)) return 'none'; // nowhere to send the user
  return s.forceUpdate ? 'force' : 'optional';
}

// Maintenance blocks everyone except kit admins (so they can switch it off again).
export function inMaintenance(s: AppSettings | null | undefined, isAdmin: boolean): boolean {
  return Boolean(s?.is_maintenance) && !isAdmin;
}
