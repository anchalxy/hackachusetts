import { StyleSheet, Text, type TextProps } from 'react-native';

import { color, font } from '@/ui/theme';

// Type scale from DESIGN.md §4. Headings are Bricolage Grotesque, everything else DM Sans.
const VARIANTS = StyleSheet.create({
  display: { fontFamily: font.heading, fontSize: 26, lineHeight: 31, letterSpacing: -0.5, color: color.ink },
  title: { fontFamily: font.heading, fontSize: 24, lineHeight: 29, letterSpacing: -0.4, color: color.ink },
  hero: { fontFamily: font.heading, fontSize: 20, lineHeight: 25, letterSpacing: -0.3, color: color.ink },
  section: { fontFamily: font.heading, fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: color.ink },
  rowLead: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 20, color: color.ink },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.ink },
  row: { fontFamily: font.body, fontSize: 14, lineHeight: 19, color: color.ink },
  secondary: { fontFamily: font.body, fontSize: 13.5, lineHeight: 18, color: color.slate },
  button: { fontFamily: font.bodySemibold, fontSize: 15, lineHeight: 20, color: color.surface },
  badge: { fontFamily: font.bodySemibold, fontSize: 12.5, lineHeight: 16, color: color.ink },
  meta: { fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 16, color: color.mute },
});

export type TxtVariant = keyof typeof VARIANTS;

export function Txt({ variant = 'body', style, ...rest }: TextProps & { variant?: TxtVariant }) {
  return <Text style={[VARIANTS[variant], style]} {...rest} />;
}
