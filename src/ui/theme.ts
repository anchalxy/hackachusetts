// Tea Party design tokens live in design/tokens/theme.ts (the handoff); this re-exports them
// with the font family names we register in the root layout. The app is light-only: app.json
// sets userInterfaceStyle "light" and the root layout forces it at runtime too.
import { StyleSheet } from 'react-native';

import { theme } from '../../design/tokens/theme';

export const t = theme;
export const space = theme.space;
export const radius = theme.radius;

export type Palette = typeof theme.color;
export type Scheme = 'light' | 'dark';

/** Always 'light'. Kept so callers that branch on the scheme keep compiling. */
export function useScheme(): Scheme {
  return 'light';
}

/** The app palette (light). */
export function useColors(): Palette {
  return theme.color;
}

/**
 * StyleSheet.create with the palette passed in. Define styles at module level as
 * `const useStyles = makeStyles((color) => ({ ... }))` and call `useStyles()` in the component.
 * The second argument is always false.
 */
export function makeStyles<T extends Parameters<typeof StyleSheet.create>[0]>(build: (color: Palette, dark: boolean) => T) {
  const styles = StyleSheet.create(build(theme.color, false));
  return function useStyles(): Readonly<T> {
    return styles;
  };
}

export const font = {
  heading: 'Bricolage-700',
  headingHeavy: 'Bricolage-800',
  body: 'DMSans-400',
  bodyMedium: 'DMSans-500',
  bodySemibold: 'DMSans-600',
  bodyBold: 'DMSans-700',
} as const;

/** Pass to useFonts() once, at the root. */
export const fontFiles = {
  [font.heading]: require('@/assets/fonts/bricolage-grotesque-700.ttf'),
  [font.headingHeavy]: require('@/assets/fonts/bricolage-grotesque-800.ttf'),
  [font.body]: require('@/assets/fonts/dm-sans-400.ttf'),
  [font.bodyMedium]: require('@/assets/fonts/dm-sans-500.ttf'),
  [font.bodySemibold]: require('@/assets/fonts/dm-sans-600.ttf'),
  [font.bodyBold]: require('@/assets/fonts/dm-sans-700.ttf'),
};

/** Report lifecycle (DESIGN.md 6c): Submitted → In review → Approved → Fixed, plus Not approved. */
export type ReportStatus = keyof typeof theme.color.status;

export const STATUS_LABEL: Record<ReportStatus, string> = {
  submitted: 'Submitted',
  inReview: 'In review',
  approved: 'Approved',
  fixed: 'Fixed',
  notApproved: 'Not approved',
};

export const LIFECYCLE: ReportStatus[] = ['submitted', 'inReview', 'approved', 'fixed'];
