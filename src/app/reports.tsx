import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, MyTransfersReport, ReportZone, TeamReport } from '../api';
import { useApi } from '../hooks';
import { Button, Card, Empty, IconName, IconTile, Screen, SectionTitle, tap, Text, tones } from '../components/ui';
import { Sheet } from '../components/Sheet';
import { useFeedback } from '../components/Feedback';
import { saveViewToGallery, shareMyTransfersExcel, shareTeamReportExcel } from '../reportExport';
import { colors, radius } from '../theme';
import { num } from '../format';

type Shown = { kind: 'zone'; data: TeamReport } | { kind: 'mine'; data: MyTransfersReport };

// Kit management reports, as one list. Zone Report: pick a zone (with its kit count), then one
// or more of its teams, then download as image or Excel. My Transfer Report: only the kits I sent. The generated report is
// shown on the page too (the image download is a screenshot of it).
export default function Reports() {
  const fb = useFeedback();
  const zones = useApi<ReportZone[]>('/admin/reports/zones');
  const [picking, setPicking] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);
  const [shown, setShown] = useState<Shown | null>(null);
  const [options, setOptions] = useState(false);
  const [busy, setBusy] = useState<'image' | 'excel' | null>(null);
  const sheetRef = useRef<View>(null);
  // Zone Report step 2: the zone's teams, pick one or more.
  const [zoneAll, setZoneAll] = useState<TeamReport | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [teamKeys, setTeamKeys] = useState<string[] | undefined>(undefined);

  const openZone = async (z: ReportZone) => {
    setLoading(z.id);
    try {
      const data = await api.get<TeamReport>(`/admin/reports/teams?zoneId=${encodeURIComponent(z.id)}`);
      setZoneAll(data);
      setPicked(new Set(data.rows.map((r) => r.key)));
    } catch (e) {
      fb.error('Could not load teams', (e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const toggle = (key: string) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const generateZone = async () => {
    if (!zoneAll || !picked.size) return;
    const all = picked.size === zoneAll.rows.length;
    const keys = all ? undefined : zoneAll.rows.map((r) => r.key).filter((k) => picked.has(k));
    setLoading('generate');
    try {
      const data = all
        ? zoneAll
        : await api.get<TeamReport>(
            `/admin/reports/teams?zoneId=${encodeURIComponent(zoneAll.zone.id)}&teams=${encodeURIComponent(keys!.join(','))}`
          );
      setShown({ kind: 'zone', data });
      setTeamKeys(keys);
      setPicking(false);
      setZoneAll(null);
      setOptions(true);
    } catch (e) {
      fb.error('Could not generate report', (e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const openMine = async () => {
    setLoading('mine');
    try {
      setShown({ kind: 'mine', data: await api.get<MyTransfersReport>('/admin/reports/my-transfers') });
      setOptions(true);
    } catch (e) {
      fb.error('Could not generate report', (e as Error).message);
    } finally {
      setLoading(null);
    }
  };

  const download = async (kind: 'image' | 'excel') => {
    if (!shown) return;
    setBusy(kind);
    try {
      if (kind === 'image') {
        if (!sheetRef.current) return;
        await saveViewToGallery(sheetRef.current);
        fb.success('Image saved', 'The report is in your gallery.');
      } else if (shown.kind === 'zone') {
        await shareTeamReportExcel(shown.data.zone.id, shown.data.zone.name, teamKeys);
      } else {
        await shareMyTransfersExcel();
      }
      setOptions(false);
    } catch (e) {
      fb.error(kind === 'image' ? 'Could not save image' : 'Could not download Excel', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const title = shown?.kind === 'zone' ? `${shown.data.zone.name} report` : 'My Transfer Report';

  return (
    <Screen onRefresh={() => zones.reload()}>
      <ReportRow
        icon="map-outline"
        tone="primary"
        title="Zone Report"
        sub="Sabha, team, kits holding and sold · choose a zone"
        loading={false}
        onPress={() => {
          zones.reload();
          setZoneAll(null);
          setPicking(true);
        }}
      />
      <ReportRow
        icon="swap-horizontal"
        tone="info"
        title="My Transfer Report"
        sub="Kits you sent, person-wise with every entry"
        loading={loading === 'mine'}
        onPress={openMine}
      />

      {shown ? (
        <>
          <SectionTitle right={<Button title="Download" icon="download-outline" small onPress={() => setOptions(true)} />}>Preview</SectionTitle>
          {/* Captured as-is for the image download: self-contained, white background. */}
          <View ref={sheetRef} collapsable={false} style={s.sheet}>
            {shown.kind === 'zone' ? <ZoneTable r={shown.data} /> : <MineTable r={shown.data} />}
          </View>
        </>
      ) : null}

      <Sheet
        visible={picking}
        onClose={() => {
          setPicking(false);
          setZoneAll(null);
        }}
        title={zoneAll ? 'Select teams' : 'Select zone'}
        subtitle={
          zoneAll
            ? `${zoneAll.zone.name} · ${picked.size} of ${zoneAll.rows.length} teams selected`
            : "Kits held now by each zone's members"
        }
      >
        {zoneAll ? (
          <>
            <View style={s.pickBar}>
              <Pressable onPress={() => setZoneAll(null)} hitSlop={8} style={s.pickLink}>
                <Ionicons name="chevron-back" size={16} color={colors.primary} />
                <Text style={s.link}>Zones</Text>
              </Pressable>
              <Pressable
                onPress={() => setPicked(picked.size === zoneAll.rows.length ? new Set() : new Set(zoneAll.rows.map((r) => r.key)))}
                hitSlop={8}
              >
                <Text style={s.link}>{picked.size === zoneAll.rows.length ? 'Clear all' : 'Select all'}</Text>
              </Pressable>
            </View>
            {zoneAll.rows.length === 0 ? <Empty icon="people-outline" text="No teams in this zone" /> : null}
            {zoneAll.rows.map((r, i) => {
              const on = picked.has(r.key);
              return (
                <Pressable
                  key={r.key}
                  onPress={() => {
                    tap();
                    toggle(r.key);
                  }}
                  style={({ pressed }) => [s.teamRow, i > 0 && s.divider, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.primary : colors.faint} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.teamName} numberOfLines={1}>
                      {r.team}
                    </Text>
                    <Text style={s.muted} numberOfLines={1}>
                      {r.sabha} · {r.kind === 'admin' ? r.adminRole ?? 'Sabha Admin' : `Team · ${r.members} member${r.members === 1 ? '' : 's'}`}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.teamKits}>{num(r.holding)}</Text>
                    <Text style={s.muted}>{num(r.sold)} sold</Text>
                  </View>
                </Pressable>
              );
            })}
            <Button
              title={picked.size ? `Generate report (${picked.size} team${picked.size === 1 ? '' : 's'})` : 'Select at least one team'}
              icon="bar-chart-outline"
              onPress={generateZone}
              loading={loading === 'generate'}
              disabled={!picked.size || !!loading}
              style={{ marginTop: 14 }}
            />
          </>
        ) : null}
        {!zoneAll && !zones.data ? <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} /> : null}
        {!zoneAll && zones.data?.length === 0 ? <Empty icon="map-outline" text="No zones" /> : null}
        {!zoneAll && zones.data?.map((z, i) => (
          <Pressable
            key={z.id}
            disabled={!!loading}
            onPress={() => {
              tap();
              openZone(z);
            }}
            style={({ pressed }) => [s.zoneRow, i > 0 && s.divider, pressed && { opacity: 0.6 }]}
          >
            <View style={{ flex: 1 }}>
              <Text style={s.zoneName}>{z.name}</Text>
              <Text style={s.muted}>{num(z.sold)} sold</Text>
            </View>
            <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
              <Text style={s.zoneKits}>{num(z.kits)}</Text>
              <Text style={s.muted}>kits</Text>
            </View>
            {loading === z.id ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
          </Pressable>
        ))}
      </Sheet>

      <Sheet visible={options} onClose={() => !busy && setOptions(false)} title={title} subtitle="Download as">
        <View style={{ gap: 10, marginTop: 12 }}>
          <Button title="Download image" icon="image-outline" variant="outline" onPress={() => download('image')} loading={busy === 'image'} disabled={!!busy} />
          <Button title="Download Excel" icon="document-text-outline" onPress={() => download('excel')} loading={busy === 'excel'} disabled={!!busy} />
          <Button title="Just view" variant="ghost" onPress={() => setOptions(false)} disabled={!!busy} />
        </View>
      </Sheet>
    </Screen>
  );
}

function ReportRow({ icon, tone, title, sub, loading, onPress }: { icon: IconName; tone: keyof typeof tones; title: string; sub: string; loading: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={loading}
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <Card style={s.report}>
        <IconTile icon={icon} tone={tone} size={40} />
        <View style={{ flex: 1 }}>
          <Text style={s.reportTitle}>{title}</Text>
          <Text style={s.muted}>{sub}</Text>
        </View>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
      </Card>
    </Pressable>
  );
}

function ZoneTable({ r }: { r: TeamReport }) {
  return (
    <>
      <View style={s.titleBar}>
        <Text style={s.title}>Zone: {r.zone.name}</Text>
        {r.zoneAdmins?.length ? (
          <Text style={s.zoneAdminLine}>
            Zone Admin: {r.zoneAdmins.map((a) => (a.holding ? `${a.name} (${num(a.holding)} kits)` : a.name)).join(', ')}
          </Text>
        ) : null}
        <Text style={s.sub}>
          Kit holding and sales{r.filtered ? ` · ${r.rows.length} selected team${r.rows.length === 1 ? '' : 's'}` : ''} · {r.generatedAt}
        </Text>
      </View>
      <View style={[s.tr, s.thead]}>
        <Text style={[s.th, s.c1]}>Sabha Name</Text>
        <Text style={[s.th, s.c1]}>Team Name</Text>
        <Text style={[s.th, s.cNum]}>Holding Kit Count</Text>
        <Text style={[s.th, s.cNum]}>Sell Count</Text>
      </View>
      {r.rows.length === 0 ? <Empty icon="document-outline" text="No members in this zone" /> : null}
      {r.rows.map((x, i) => {
        const first = i === 0 || r.rows[i - 1].sabha !== x.sabha;
        return (
          <View key={`${x.sabha}|${x.team}`} style={[s.tr, first && i > 0 && s.groupTop]}>
            <Text style={[s.td, s.c1, s.semi]} numberOfLines={2}>
              {first ? x.sabha : ''}
            </Text>
            {/* Sabha Admin row (first in its sabha): name + role tag. Teams: team lead's name. */}
            <View style={s.c1}>
              <Text style={s.td} numberOfLines={2}>
                {x.team}
              </Text>
              {x.kind === 'admin' ? <Text style={s.roleTag}>{x.adminRole ?? 'Sabha Admin'}</Text> : null}
            </View>
            <Text style={[s.td, s.cNum]}>{num(x.holding)}</Text>
            <Text style={[s.td, s.cNum, s.sold]}>{num(x.sold)}</Text>
          </View>
        );
      })}
      <View style={[s.tr, s.total]}>
        <Text style={[s.td, s.c1, s.bold]}>Total</Text>
        <Text style={[s.td, s.c1]} />
        <Text style={[s.td, s.cNum, s.bold]}>{num(r.totals.holding)}</Text>
        <Text style={[s.td, s.cNum, s.bold]}>{num(r.totals.sold)}</Text>
      </View>
    </>
  );
}

function MineTable({ r }: { r: MyTransfersReport }) {
  return (
    <>
      <View style={s.titleBar}>
        <Text style={s.title}>Kits transferred by {r.sender.name}</Text>
        <Text style={s.sub}>
          Sent {num(r.totals.kits)} in {num(r.totals.transfers)} transfers · returned {num(r.totals.returned)} · net {num(r.totals.net)} · {num(r.totals.people)} people ·{' '}
          {r.generatedAt}
        </Text>
      </View>
      <View style={[s.tr, s.thead]}>
        <Text style={[s.th, s.c2]}>Transferred to</Text>
        <Text style={[s.th, s.cNum]}>Sent</Text>
        <Text style={[s.th, s.cNum]}>Returned</Text>
        <Text style={[s.th, s.cNum]}>Net</Text>
      </View>
      {r.receivers.length === 0 ? <Empty icon="swap-horizontal" text="You have not transferred any kits yet" /> : null}
      {r.receivers.map((p) => (
        <View key={p.id}>
          <View style={[s.tr, s.person]}>
            <View style={s.c2}>
              <Text style={[s.td, s.bold]} numberOfLines={1}>
                {p.name}
              </Text>
              <Text style={s.meta} numberOfLines={1}>
                {[p.phone, p.sabha].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <View style={s.cNumBox}>
              <Text style={[s.td, s.bold, s.right]}>{num(p.total)}</Text>
              <Text style={[s.meta, s.right]}>
                {p.count} transfer{p.count === 1 ? '' : 's'}
              </Text>
            </View>
            <View style={s.cNumBox}>
              <Text style={[s.td, s.bold, s.right, p.returned > 0 && s.ret]}>{p.returned ? num(p.returned) : '-'}</Text>
              {p.returnCount ? (
                <Text style={[s.meta, s.right]}>
                  {p.returnCount} return{p.returnCount === 1 ? '' : 's'}
                </Text>
              ) : null}
            </View>
            <Text style={[s.td, s.cNum, s.bold]}>{num(p.net)}</Text>
          </View>
          {p.entries.map((e) => {
            const back = e.direction === 'returned';
            return (
              <View key={e.no} style={[s.tr, s.entry]}>
                <View style={s.c2}>
                  <Text style={[s.entryText, back && s.ret]} numberOfLines={1}>
                    #{e.no}  {e.at}
                  </Text>
                  <Text style={[s.meta, back && s.ret]} numberOfLines={1}>
                    {e.how}
                    {e.note ? ` · ${e.note}` : ''}
                  </Text>
                </View>
                <Text style={[s.td, s.cNum]}>{back ? '' : num(e.quantity)}</Text>
                <Text style={[s.td, s.cNum, s.ret]}>{back ? `−${num(e.quantity)}` : ''}</Text>
                <Text style={[s.td, s.cNum]} />
              </View>
            );
          })}
        </View>
      ))}
      <View style={[s.tr, s.total]}>
        <View style={s.c2}>
          <Text style={[s.td, s.bold]}>Total</Text>
          <Text style={s.meta}>
            {num(r.totals.transfers)} transfers · {num(r.totals.returns)} returns
          </Text>
        </View>
        <Text style={[s.td, s.cNum, s.bold]}>{num(r.totals.kits)}</Text>
        <Text style={[s.td, s.cNum, s.bold, r.totals.returned > 0 && s.ret]}>{num(r.totals.returned)}</Text>
        <Text style={[s.td, s.cNum, s.bold]}>{num(r.totals.net)}</Text>
      </View>
    </>
  );
}

const s = StyleSheet.create({
  report: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reportTitle: { fontSize: 15, fontWeight: '600' },
  zoneRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  pickBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  pickLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  link: { color: colors.primary, fontWeight: '600', fontSize: 13.5 },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  teamName: { fontSize: 14.5, fontWeight: '600' },
  teamKits: { fontSize: 15, fontWeight: '700', color: colors.primary },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  zoneName: { fontSize: 15, fontWeight: '600' },
  zoneKits: { fontSize: 17, fontWeight: '700', color: colors.primary },
  sheet: { backgroundColor: '#fff', borderRadius: radius.lg, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border, marginBottom: 16 },
  titleBar: { backgroundColor: colors.primary, paddingVertical: 12, paddingHorizontal: 12 },
  title: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 },
  zoneAdminLine: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
  roleTag: { fontSize: 10.5, color: colors.muted, marginTop: 1 },
  tr: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
  thead: { backgroundColor: '#FFF7ED', borderBottomWidth: 1.5, borderBottomColor: colors.primary },
  groupTop: { borderTopWidth: 1, borderTopColor: '#D6D3D1' },
  person: { backgroundColor: '#F5F5F4' },
  entry: { paddingLeft: 22, paddingVertical: 6 },
  th: { fontSize: 11, fontWeight: '700', color: '#9A3412' },
  td: { fontSize: 12.5, color: colors.text },
  meta: { fontSize: 11, color: colors.muted, marginTop: 1 },
  entryText: { fontSize: 12, color: colors.text },
  c1: { flex: 1.3, paddingRight: 6 },
  c2: { flex: 2.4, paddingRight: 6 },
  cCount: { flex: 0.8, textAlign: 'right' },
  cNum: { flex: 0.9, textAlign: 'right' },
  cNumBox: { flex: 0.9 },
  right: { textAlign: 'right' },
  ret: { color: colors.danger },
  semi: { fontWeight: '600' },
  sold: { color: colors.success, fontWeight: '600' },
  muted: { color: colors.muted, fontSize: 12 },
  bold: { fontWeight: '700' },
  total: { backgroundColor: '#FAFAF9', borderBottomWidth: 0, borderTopWidth: 1.5, borderTopColor: colors.primary },
});
