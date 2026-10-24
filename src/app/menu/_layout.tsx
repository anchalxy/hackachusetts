import { Stack } from 'expo-router';

import { color } from '@/ui/theme';

// The menu sheet's own stack: Settings, then inner pages pushed inside the sheet.
// No anchor on purpose: the report flow opens /menu/reporting-guidelines on its own, and its back
// button then closes the sheet instead of landing on Settings.
export default function MenuLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.bg } }} />;
}
