import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, View } from 'react-native';
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
  success: { icon: 'checkmark-circle' as const, color: colors.success, bg: colors.successSoft },
  error: { icon: 'alert-circle' as const, color: colors.danger, bg: colors.dangerSoft },
  info: { icon: 'information-circle' as const, color: colors.info, bg: colors.infoSoft },
};

// In-app toasts and confirm dialogs, used instead of the system Alert box.
export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
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
        setDialog({ ...opts, resolve });
      }),
    []
  );

  const close = (v: boolean) => {
    dialog?.resolve(v);
    setDialog(null);
  };

  const api: FeedbackApi = {
    success: (t, m) => show('success', t, m),
    error: (t, m) => show('error', t, m),
    info: (t, m) => show('info', t, m),
    confirm,
  };

  return (
    <FeedbackContext.Provider value={api}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDone={() => setToast((t) => (t?.id === toast.id ? null : t))} />}
      <Modal visible={!!dialog} transparent animationType="fade" onRequestClose={() => close(false)} statusBarTranslucent navigationBarTranslucent>
        <View style={s.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close(false)} />
          {dialog && (
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
                <Pressable style={({ pressed }) => [s.dBtn, s.dCancel, pressed && { opacity: 0.7 }]} onPress={() => close(false)}>
                  <Text style={s.dCancelText}>{dialog.cancelText ?? 'Cancel'}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [s.dBtn, { backgroundColor: dialog.destructive ? colors.danger : colors.primary }, pressed && { opacity: 0.85 }]}
                  onPress={() => close(true)}
                >
                  <Text style={s.dOkText}>{dialog.confirmText ?? 'Confirm'}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </FeedbackContext.Provider>
  );
}

function ToastView({ toast, onDone }: { toast: Toast; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const y = useRef(new Animated.Value(-120)).current;
  const k = KIND[toast.kind];

  useEffect(() => {
    Animated.spring(y, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    const t = setTimeout(hide, toast.kind === 'error' ? 4000 : 2600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hide() {
    Animated.timing(y, { toValue: -140, duration: 200, useNativeDriver: true }).start(onDone);
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[s.toastWrap, { top: insets.top + 8, left: 16 + insets.left, right: 16 + insets.right, transform: [{ translateY: y }] }]}
    >
      <Pressable onPress={hide} style={[s.toast, { borderLeftColor: k.color }]}>
        <View style={[s.tIcon, { backgroundColor: k.bg }]}>
          <Ionicons name={k.icon} size={20} color={k.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.tTitle}>{toast.title}</Text>
          {toast.message ? <Text style={s.tMsg}>{toast.message}</Text> : null}
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
  toastWrap: { position: 'absolute', zIndex: 1000, elevation: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 12,
    borderLeftWidth: 4,
    ...shadow(3),
  },
  tIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tTitle: { fontWeight: '700', fontSize: 14 },
  tMsg: { color: colors.muted, fontSize: 13, marginTop: 1 },
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.5)', justifyContent: 'center', padding: 28 },
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
