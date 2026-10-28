import { StyleSheet, Text as RNText, TextInput as RNTextInput, TextInputProps, TextProps } from 'react-native';
import { ComponentRef, forwardRef } from 'react';
import { colors, fonts } from '../theme';

const FAMILY: Record<string, string> = {
  '100': fonts.regular,
  '200': fonts.regular,
  '300': fonts.regular,
  '400': fonts.regular,
  normal: fonts.regular,
  '500': fonts.medium,
  '600': fonts.semibold,
  '700': fonts.bold,
  bold: fonts.bold,
  '800': fonts.extrabold,
  '900': fonts.extrabold,
};

// Custom fonts need an explicit family per weight; map fontWeight -> Inter family.
function withFont(style: TextProps['style']) {
  const flat = StyleSheet.flatten(style) ?? {};
  const family = FAMILY[String(flat.fontWeight ?? '400')] ?? fonts.regular;
  return [style, { fontFamily: family, fontWeight: 'normal' as const }];
}

export function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[{ color: colors.text }, ...withFont(style)]} />;
}

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(function TextInput({ style, ...props }, ref) {
  return <RNTextInput ref={ref} {...props} style={withFont([{ fontWeight: '500' }, style])} />;
});
