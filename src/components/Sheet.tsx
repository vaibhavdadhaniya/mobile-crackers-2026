import type { ComponentRef } from 'react';
import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius } from '../theme';
import { Text } from './Text';
import { FeedbackHost } from './Feedback';
import { FocusScrollContext, useKeyboardTop } from './KeyboardAware';

// Bottom sheet modal that clears the home indicator and sits above the keyboard.
// Drag the grey bar / title area down (or flick it) to close; a short drag springs back.
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
  const rootRef = useRef<ComponentRef<typeof View>>(null);
  const [lift, setLift] = useState(0);

  // Drag-to-close. onClose may decline (e.g. while busy): then the sheet springs back.
  const drag = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    if (visible) drag.setValue(0);
  }, [visible, drag]);
  const pan = useMemo(() => {
    const back = () => Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => g.dy > 4 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_e, g) => drag.setValue(Math.max(0, g.dy)),
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 90 || g.vy > 0.9) {
          Animated.timing(drag, { toValue: 900, duration: 180, useNativeDriver: true }).start(() => {
            onCloseRef.current();
            setTimeout(() => visibleRef.current && back(), 250);
          });
        } else {
          back();
        }
      },
      onPanResponderTerminate: back,
    });
  }, [drag]);

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
        <Animated.View
          style={[
            s.sheet,
            { transform: [{ translateY: drag }] },
            {
              marginBottom: lift,
              paddingBottom: (lift > 0 ? 12 : Math.max(insets.bottom, 14)) + 6,
              paddingLeft: 18 + insets.left,
              paddingRight: 18 + insets.right,
            },
          ]}
        >
          <View {...pan.panHandlers} style={s.handle}>
            <View style={s.grabber} />
            {title ? <Text style={s.title}>{title}</Text> : null}
            {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
          </View>
          <FocusScrollContext.Provider value={() => {}}>
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} bounces={false}>
              {children}
            </ScrollView>
          </FocusScrollContext.Provider>
        </Animated.View>
        <FeedbackHost />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(28,25,23,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, paddingTop: 8, maxHeight: '88%' },
  // Whole header (grey bar + title) is the drag area; extra top padding makes the bar easy to grab.
  handle: { marginTop: -8, paddingTop: 10 },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: '#D6D3D1', marginBottom: 12 },
  title: { fontSize: 17, fontWeight: '700' },
  subtitle: { color: colors.muted, marginTop: 3, marginBottom: 16, fontSize: 13 },
});
