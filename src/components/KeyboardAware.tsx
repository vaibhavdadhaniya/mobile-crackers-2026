import type { ComponentRef } from 'react';
import { createContext, forwardRef, ReactNode, useCallback, useContext, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  ScrollViewProps,
  TextInput,
  View,
} from 'react-native';

// Keyboard top edge in window coordinates, or null when hidden.
export function useKeyboardTop() {
  const [top, setTop] = useState<number | null>(null);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: KeyboardEvent) => setTop(e.endCoordinates.screenY);
    const subs = [
      Keyboard.addListener(showEvt, onShow),
      Keyboard.addListener(hideEvt, () => setTop(null)),
      ...(Platform.OS === 'ios' ? [Keyboard.addListener('keyboardWillChangeFrame', onShow)] : []),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return top;
}

// Lets inputs ask the nearest scroll view to bring them above the keyboard.
export type ScrollMode = 'visible' | 'top';
export const FocusScrollContext = createContext<(mode?: ScrollMode) => void>(() => {});
export const useScrollToFocused = () => useContext(FocusScrollContext);

const GAP = 24;

/**
 * ScrollView that keeps the focused TextInput visible above the keyboard on
 * iOS and edge-to-edge Android (where the window does not resize).
 */
export const KeyboardAwareScrollView = forwardRef<ComponentRef<typeof ScrollView>, ScrollViewProps & { children?: ReactNode }>(
  function KeyboardAwareScrollView({ children, onScroll, ...props }, ref) {
    const scrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
    const wrapRef = useRef<ComponentRef<typeof View>>(null);
    const offsetY = useRef(0);
    const kbTop = useKeyboardTop();
    const kbTopRef = useRef<number | null>(null);
    kbTopRef.current = kbTop;
    const [pad, setPad] = useState(0);

    useImperativeHandle(ref, () => scrollRef.current as ComponentRef<typeof ScrollView>);

    const ensureVisible = useCallback((mode: ScrollMode = 'visible') => {
      const top = kbTopRef.current;
      const input = TextInput.State.currentlyFocusedInput();
      if (top == null || !input || !wrapRef.current) return;
      wrapRef.current.measureInWindow((_wx, wy) => {
        input.measureInWindow((_x, y, _w, h) => {
          const bottomLimit = top - GAP;
          const topLimit = wy + GAP;
          let delta = 0;
          if (mode === 'top' && y > topLimit) delta = y - topLimit;
          else if (y + h > bottomLimit) delta = y + h - bottomLimit;
          else if (y < topLimit) delta = y - topLimit;
          if (delta !== 0) scrollRef.current?.scrollTo({ y: Math.max(0, offsetY.current + delta), animated: true });
        });
      });
    }, []);

    // Extra bottom space = how much of this view the keyboard covers.
    useEffect(() => {
      if (kbTop == null) {
        setPad(0);
        return;
      }
      wrapRef.current?.measureInWindow((_x, y, _w, h) => {
        setPad(Math.max(0, y + h - kbTop));
        setTimeout(() => ensureVisible(), Platform.OS === 'ios' ? 60 : 120);
      });
    }, [kbTop, ensureVisible]);

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      offsetY.current = e.nativeEvent.contentOffset.y;
      onScroll?.(e);
    };

    return (
      <View ref={wrapRef} style={{ flex: 1 }} collapsable={false}>
        <FocusScrollContext.Provider value={(mode) => setTimeout(() => ensureVisible(mode), 80)}>
          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            scrollEventThrottle={16}
            onScroll={handleScroll}
            {...props}
          >
            {children}
            <View style={{ height: pad }} />
          </ScrollView>
        </FocusScrollContext.Provider>
      </View>
    );
  }
);

// Render inside a dropdown: when it appears, scroll its input near the top so results stay above the keyboard.
export function ScrollFocusedToTop() {
  const scroll = useScrollToFocused();
  useEffect(() => {
    scroll('top');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Keyboard height (0 when hidden). Height is reliable on every platform/edge-to-edge setup,
// unlike the keyboard's screen position.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const subs = [
      Keyboard.addListener(showEvt, (e) => setHeight(e.endCoordinates.height)),
      Keyboard.addListener(hideEvt, () => setHeight(0)),
    ];
    return () => subs.forEach((s) => s.remove());
  }, []);
  return height;
}
