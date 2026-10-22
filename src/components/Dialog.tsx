import { ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow } from '../theme';
import { Text } from './Text';
import { FocusScrollContext, useKeyboardTop } from './KeyboardAware';

// Centered popup (forms such as Edit sale). Stays above the keyboard: when it opens, the popup
// is centred in the space left above it. Tap outside or back to close.
export function Dialog({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const kbTop = useKeyboardTop();
  const below = kbTop != null ? Math.max(0, height - kbTop) : insets.bottom;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={[s.backdrop, { paddingTop: insets.top + 16, paddingBottom: below + 16 }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[s.card, { maxHeight: height - insets.top - below - 32 }]}>
          <Text style={s.title}>{title}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          <FocusScrollContext.Provider value={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              {children}
            </ScrollView>
          </FocusScrollContext.Provider>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.5)', justifyContent: 'center', paddingHorizontal: 22 },
  card: { backgroundColor: '#fff', borderRadius: radius.xl, padding: 20, ...shadow(3) },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.muted, fontSize: 13, marginTop: 3, marginBottom: 14 },
});
