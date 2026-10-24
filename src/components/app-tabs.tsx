import { NativeTabs } from 'expo-router/native-tabs';

import { font, useColors } from '@/ui/theme';

// The real iOS tab bar (Liquid Glass, native gestures and haptics), dressed in our design
// (design/screens/challenges/0-trail.png): every icon in full color, selected or not, so they're
// drawn with renderingMode "original"; the selected label is bold teal, the rest semibold slate.
// Icons are PNG renders of the design SVGs (assets/images/tabIcons, @1x/@2x/@3x).
const ICON = {
  challenges: require('@/assets/images/tabIcons/challenges.png'),
  report: require('@/assets/images/tabIcons/report.png'),
  rewards: require('@/assets/images/tabIcons/rewards.png'),
  profile: require('@/assets/images/tabIcons/profile.png'),
  profileSelected: require('@/assets/images/tabIcons/profile-selected.png'),
};

export default function AppTabs() {
  const color = useColors();
  return (
    <NativeTabs
      tintColor={color.primary}
      backgroundColor={color.surface}
      indicatorColor={color.tealTint}
      labelStyle={{
        default: { fontFamily: font.bodySemibold, fontSize: 11, color: color.slate },
        selected: { fontFamily: font.bodyBold, fontSize: 11, color: color.primary },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Challenges</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={ICON.challenges} renderingMode="original" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="report">
        <NativeTabs.Trigger.Label>Report</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={ICON.report} renderingMode="original" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="rewards">
        <NativeTabs.Trigger.Label>Rewards</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={ICON.rewards} renderingMode="original" />
      </NativeTabs.Trigger>

      {/* Profile is the user's photo in a white frame; the frame turns teal when selected. */}
      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon src={{ default: ICON.profile, selected: ICON.profileSelected }} renderingMode="original" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
