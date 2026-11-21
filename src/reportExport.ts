// Saving reports from the app: the Excel file comes from the backend (styled .xlsx) and is opened
// in the share sheet (Save to device, Drive, WhatsApp ...); the image is a screenshot of the
// on-screen table saved to the phone gallery.
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library/legacy';
import { captureRef } from 'react-native-view-shot';
import { ensureFreshSession, getBaseUrl, getToken, refreshSession } from './api';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Download a file from the API with the login token, refreshing it once on 401.
// Uses `fetch` (expo/fetch) rather than FileSystem.downloadAsync: only fetch's URL session trusts
// the server's self-signed cert (plugins/withServerCert.js); downloadAsync's own session rejects it.
async function downloadAuthed(path: string, fileName: string): Promise<string> {
  await ensureFreshSession();
  const get = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 60000);
    try {
      return await fetch(`${getBaseUrl()}/api${path}`, {
        headers: { Authorization: `Bearer ${getToken() ?? ''}` },
        signal: controller.signal,
      });
    } catch {
      throw new Error('Cannot connect right now. Check your internet connection and try again.');
    } finally {
      clearTimeout(timer);
    }
  };
  let res = await get();
  if (res.status === 401 && (await refreshSession()) === 'ok') res = await get();
  if (res.status !== 200) {
    // The body is the JSON error; read it for a useful message.
    let msg = `Download failed (${res.status})`;
    try {
      msg = ((await res.json()) as { error?: string }).error || msg;
    } catch {
      // not JSON
    }
    throw new Error(msg);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const file = new File(Paths.cache, fileName);
  if (file.exists) file.delete();
  file.create();
  await file.write(bytes);
  return file.uri;
}

// Download an Excel report from the API and open the share sheet (save / Drive / WhatsApp).
export async function shareExcel(path: string, fileName: string, title: string) {
  const uri = await downloadAuthed(path, fileName);
  if (!(await Sharing.isAvailableAsync())) throw new Error('Sharing is not available on this device');
  await Sharing.shareAsync(uri, { mimeType: XLSX_MIME, dialogTitle: title, UTI: 'org.openxmlformats.spreadsheetml.sheet' });
}

export async function shareTeamReportExcel(zoneId: string, zoneName: string, teamKeys?: string[]) {
  const safe = zoneName.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'zone';
  await shareExcel(`/admin/reports/teams.xlsx?zoneId=${encodeURIComponent(zoneId)}${teamKeys?.length ? `&teams=${encodeURIComponent(teamKeys.join(','))}` : ''}`, `Kit-Report-${safe}.xlsx`, `Kit report · ${zoneName}`);
}

export const shareMyTransfersExcel = () => shareExcel('/admin/reports/my-transfers.xlsx', 'My-Transfers.xlsx', 'My transfers');

// Screenshot the given view (the report table) and save it to the gallery.
export async function saveViewToGallery(view: Parameters<typeof captureRef>[0]) {
  const perm = await MediaLibrary.requestPermissionsAsync(true);
  if (!perm.granted) throw new Error('Allow photo access to save the report image');
  const uri = await captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });
  await MediaLibrary.saveToLibraryAsync(uri);
}
