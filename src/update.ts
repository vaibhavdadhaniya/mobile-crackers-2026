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

// currentBuild = this install's build number (android versionCode / iOS build).
export function decideUpdate(s: AppSettings | null | undefined, platform: 'android' | 'ios', currentBuild: number): UpdateDecision {
  if (!s || !currentBuild) return 'none';
  const latest = Number(platform === 'android' ? s.androidBuildNumber : s.iosBuildNumber) || 0;
  if (latest <= currentBuild) return 'none';
  if (platform === 'android' && !s.androidDownloadUrl) return 'none'; // nowhere to send the user
  return s.forceUpdate ? 'force' : 'optional';
}

// Maintenance blocks everyone except kit admins (so they can switch it off again).
export function inMaintenance(s: AppSettings | null | undefined, isAdmin: boolean): boolean {
  return Boolean(s?.is_maintenance) && !isAdmin;
}
