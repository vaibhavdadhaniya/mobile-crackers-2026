import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow } from '../theme';
import { Text } from './Text';

type ToastKind = 'success' | 'error' | 'info';
type Toast = { id: number; kind: ToastKind; title: string; message?: string };

type ConfirmOptions = {
  title: string;
  message?: string;
  details?: { label: string; value: string }[];
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
};

type FeedbackApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackApi | null>(null);

const KIND = {
  success: { icon: 'checkmark-circle' as const, dot: '#4ADE80' },
  error: { icon: 'alert-circle' as const, dot: '#F87171' },
  info: { icon: 'information-circle' as const, dot: '#FDBA74' },
};

// In-app toasts and confirm dialogs, used instead of the system Alert box.
// They draw in the topmost FeedbackHost: the root one, or the one inside an open Dialog / Sheet.
// iOS shows only one Modal at a time, so a confirm in its own Modal would stay hidden behind a
// popup (and an awaited confirm() would never resolve).
type Dialog = ConfirmOptions & { resolve: (v: boolean) => void };
type Hosts = {
  register: (id: number, root: boolean) => () => void;
  top: number | null;
  toast: Toast | null;
  dialog: Dialog | null;
  dropToast: (id: number) => void;
  close: (v: boolean) => void;
};
const HostsContext = createContext<Hosts | null>(null);
let hostSeq = 0;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [hosts, setHosts] = useState<number[]>([]);
  const seq = useRef(0);

  const show = useCallback((kind: ToastKind, title: string, message?: string) => {
    Haptics.notificationAsync(
      kind === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
    ).catch(() => {});
    setToast({ id: ++seq.current, kind, title, message });
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        Haptics.selectionAsync().catch(() => {});
        Keyboard.dismiss(); // the keyboard would cover the buttons
        setDialog({ ...opts, resolve });
      }),
    []
  );

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  // The root host stays at the bottom; popups stack above it in the order they open.
  const register = useCallback((id: number, root: boolean) => {
    setHosts((h) => (root ? [id, ...h] : [...h, id]));
    return () => setHosts((h) => h.filter((x) => x !== id));
  }, []);

  const api: FeedbackApi = {
    success: (t, m) => show('success', t, m),
    error: (t, m) => show('error', t, m),
    info: (t, m) => show('info', t, m),
    confirm,
  };

  return (
    <FeedbackContext.Provider value={api}>
      <HostsContext.Provider
        value={{
          register,
          top: hosts[hosts.length - 1] ?? null,
          toast,
          dialog,
          dropToast: (id) => setToast((t) => (t?.id === id ? null : t)),
          close,
        }}
      >
        {children}
        <FeedbackHost root />
      </HostsContext.Provider>
    </FeedbackContext.Provider>
  );
}

// Place as the last child of a Modal's root view (Dialog and Sheet do) so feedback shows above it.
export function FeedbackHost({ root = false }: { root?: boolean }) {
  const h = useContext(HostsContext);
  const id = useRef(0);
  if (!id.current) id.current = ++hostSeq;
  const register = h?.register;
  useEffect(() => register?.(id.current, root), [register, root]);

  // Android back closes the confirm (inside a Modal, the Modal gets the back press instead).
  const open = !!h?.dialog && h.top === id.current;
  const close = h?.close;
  useEffect(() => {
    if (!open || !root || !close) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(false);
      return true;
    });
    return () => sub.remove();
  }, [open, root, close]);

  if (!h || h.top !== id.current) return null;
  const { toast, dialog } = h;
  return (
    <>
      {dialog && (
        <View style={[StyleSheet.absoluteFill, s.backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => h.close(false)} />
          <View style={s.dialog}>
            <View style={[s.dIcon, { backgroundColor: dialog.destructive ? colors.dangerSoft : colors.primarySoft }]}>
              <Ionicons
                name={dialog.icon ?? (dialog.destructive ? 'warning-outline' : 'help-circle-outline')}
                size={24}
                color={dialog.destructive ? colors.danger : colors.primary}
              />
            </View>
            <Text style={s.dTitle}>{dialog.title}</Text>
            {dialog.message ? <Text style={s.dMsg}>{dialog.message}</Text> : null}
            {dialog.details?.length ? (
              <View style={s.details}>
                {dialog.details.map((d) => (
                  <View key={d.label} style={s.detailRow}>
                    <Text style={s.detailLabel}>{d.label}</Text>
                    <Text style={s.detailValue} numberOfLines={1}>
                      {d.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
            <View style={s.dActions}>
              <Pressable style={({ pressed }) => [s.dBtn, s.dCancel, pressed && { opacity: 0.7 }]} onPress={() => h.close(false)}>
                <Text style={s.dCancelText}>{dialog.cancelText ?? 'Cancel'}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.dBtn, { backgroundColor: dialog.destructive ? colors.danger : colors.primary }, pressed && { opacity: 0.85 }]}
                onPress={() => h.close(true)}
              >
                <Text style={s.dOkText}>{dialog.confirmText ?? 'Confirm'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      {toast && <ToastView key={toast.id} toast={toast} onDone={() => h.dropToast(toast.id)} />}
    </>
  );
}

// Minimal dark pill at the top: coloured icon, one-line title, optional short message. Tap to dismiss.
function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;
  const k = KIND[toast.kind];

  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const t = setTimeout(hide, toast.kind === 'info' ? 5000 : toast.kind === 'error' ? 3600 : 2400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hide() {
    Animated.timing(anim, { toValue: 0, duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(onDone);
  }

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[s.toastWrap, { top: insets.top + 10, left: 16 + insets.left, right: 16 + insets.right, opacity: anim, transform: [{ translateY }] }]}
    >
      <Pressable onPress={hide} style={s.toast} accessibilityRole="alert">
        <Ionicons name={k.icon} size={18} color={k.dot} />
        <View style={{ flexShrink: 1 }}>
          <Text style={s.tTitle} numberOfLines={1}>
            {toast.title}
          </Text>
          {toast.message ? (
            <Text style={s.tMsg} numberOfLines={toast.kind === 'info' ? 4 : 2}>
              {toast.message}
            </Text>
          ) : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx) throw new Error('useFeedback outside FeedbackProvider');
  return ctx;
}

const s = StyleSheet.create({
  toastWrap: { position: 'absolute', zIndex: 1000, elevation: 1000, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    maxWidth: 420,
    backgroundColor: '#1F1A17',
    borderRadius: 14,
    paddingVertical: 11,
    paddingLeft: 14,
    paddingRight: 18,
    ...shadow(3),
  },
  tTitle: { color: '#fff', fontWeight: '600', fontSize: 14 },
  tMsg: { color: 'rgba(255,255,255,0.72)', fontSize: 12.5, marginTop: 1, lineHeight: 17 },
  backdrop: { zIndex: 999, elevation: 999, backgroundColor: 'rgba(28,25,23,0.5)', justifyContent: 'center', padding: 28 },
  dialog: { backgroundColor: '#fff', borderRadius: radius.xl, padding: 22, ...shadow(3) },
  dIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  dTitle: { fontSize: 18, fontWeight: '700' },
  dMsg: { color: colors.muted, fontSize: 14, marginTop: 6, lineHeight: 20 },
  details: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 12, marginTop: 14, gap: 8 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailLabel: { color: colors.muted, fontSize: 13 },
  detailValue: { fontWeight: '600', fontSize: 13, flexShrink: 1, textAlign: 'right' },
  dActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  dBtn: { flex: 1, height: 46, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  dCancel: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  dCancelText: { fontWeight: '600', color: colors.text },
  dOkText: { fontWeight: '700', color: '#fff' },
});
