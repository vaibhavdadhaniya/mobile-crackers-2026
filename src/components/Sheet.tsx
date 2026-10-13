import { ReactNode, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Text } from './Text';
import { FocusScrollContext, useKeyboardTop } from './KeyboardAware';

// Bottom sheet modal that clears the home indicator and sits above the keyboard.
export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const kbTop = useKeyboardTop();
  const rootRef = useRef<View>(null);
  const [lift, setLift] = useState(0);

  useEffect(() => {
    if (kbTop == null) {
      setLift(0);
      return;
    }
    rootRef.current?.measureInWindow((_x, y, _w, h) => setLift(Math.max(0, y + h - kbTop)));
  }, [kbTop]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View ref={rootRef} style={s.backdrop} collapsable={false}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View
          style={[
            s.sheet,
            {
              marginBottom: lift,
              paddingBottom: (lift > 0 ? 12 : Math.max(insets.bottom, 14)) + 6,
              paddingLeft: 18 + insets.left,
              paddingRight: 18 + insets.right,
            },
          ]}
        >
          <View style={s.grabber} />
          <FocusScrollContext.Provider value={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              {title ? <Text style={s.title}>{title}</Text> : null}
              {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
              {children}
            </ScrollView>
          </FocusScrollContext.Provider>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 8, maxHeight: '88%' },
  grabber: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, backgroundColor: '#E2DED9', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.muted, marginTop: 3, marginBottom: 16, fontSize: 13 },
});
