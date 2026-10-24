import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { APP_VERSION, Caption, Chevron, Group, MenuRow, SectionLabel, SoloCard } from '@/components/menu/menu-ui';
import { getProfile, neighborhoodLabel, SEED_PROFILE, type Profile } from '@/lib/profile';
import { permissionProblem, useDevicePermissions } from '@/lib/settings';
import { Txt } from '@/ui/text';
import { color, font, radius, space } from '@/ui/theme';

const PHOTO = require('../../../design/assets/avatars/ishaan-photo.jpg');

// Left out on purpose (DESIGN.md 6b): anything already on the Profile screen, and friends.
export default function SettingsSheet() {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);
  const { permissions } = useDevicePermissions();

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile);
    }, []),
  );

  // Settings is the first screen in the sheet's stack, so going back closes the sheet.
  const close = () => router.back();

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top, paddingBottom: insets.bottom + 24 }]}
      showsVerticalScrollIndicator={false}>
      {/* The native page sheet has no grabber of its own; it's there to say "swipe me down". */}
      {Platform.OS === 'ios' ? <View style={styles.grabber} /> : <View style={styles.grabberSpace} />}

      <View style={styles.header}>
        <Txt variant="display" style={styles.title} accessibilityRole="header">
          Settings
        </Txt>
        <Pressable
          onPress={close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close settings"
          testID="menu-close"
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6L6 18" fill="none" stroke={color.slate} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
      </View>

      <Pressable
        onPress={() => router.push('/menu/edit-profile')}
        accessibilityRole="button"
        accessibilityLabel={`${profile.name}, @${profile.username}. Edit profile`}
        testID="menu-profile"
        style={({ pressed }) => [styles.profileCard, pressed && styles.profilePressed]}>
        <View style={styles.avatarFrame}>
          <Image source={PHOTO} style={styles.avatar} contentFit="cover" />
          <View style={styles.avatarRing} />
        </View>
        <View style={styles.profileText}>
          <Txt variant="hero" style={styles.profileName} numberOfLines={1}>
            {profile.name}
          </Txt>
          <Txt style={styles.handle} numberOfLines={1}>
            @{profile.username}
          </Txt>
        </View>
        <View style={styles.profileChevron}>
          <Chevron />
        </View>
      </Pressable>

      <SectionLabel>Your info</SectionLabel>
      <Group>
        <MenuRow
          icon="house"
          title="Neighborhood"
          value={neighborhoodLabel(profile)}
          onPress={() => router.push('/menu/neighborhood')}
          testID="menu-neighborhood"
        />
        {/* Locked: set at sign-up from a birth date, so it has no chevron and isn't tappable. */}
        <MenuRow icon="idcard" title="Age" value={String(profile.age)} last testID="menu-age" />
      </Group>
      <Caption>{'Used to boost leaves when the city needs to\nhear from people like you.'}</Caption>

      <SectionLabel>How it works</SectionLabel>
      <Group>
        <MenuRow icon="leafy" title="Tea leaves" onPress={() => router.push('/menu/tea-leaves')} testID="menu-tea-leaves" />
        <MenuRow
          icon="shield"
          title="Reporting guidelines"
          onPress={() => router.push('/menu/reporting-guidelines')}
          last
          testID="menu-guidelines"
        />
      </Group>

      <SectionLabel>Preferences</SectionLabel>
      <Group>
        <MenuRow icon="bell" title="Notifications" onPress={() => router.push('/menu/notifications')} testID="menu-notifications" />
        <MenuRow
          icon="camera"
          title="Location & camera"
          problem={permissionProblem(permissions)}
          onPress={() => router.push('/menu/permissions')}
          testID="menu-permissions"
        />
        <MenuRow icon="lock" title="Privacy" onPress={() => router.push('/menu/privacy')} last testID="menu-privacy" />
      </Group>

      <Group style={styles.support}>
        <MenuRow icon="help" title="Help" onPress={() => router.push('/menu/help')} testID="menu-help" />
        <MenuRow icon="teacup" title="About Tea Party" onPress={() => router.push('/menu/about')} testID="menu-about" />
        <MenuRow icon="doc" title="Terms" onPress={() => router.push('/menu/terms')} last testID="menu-terms" />
      </Group>

      {/* TODO(account): there's no sign-in, only the welcome page + seed user, so Log out is inert for now. */}
      <View style={styles.logOut}>
        <SoloCard label="Log out" testID="menu-logout" />
      </View>
      <Txt variant="meta" style={styles.version}>
        Tea Party {APP_VERSION} · Made in Cambridge
      </Txt>
    </ScrollView>
  );
}

const AVATAR = 48;
const FRAME = 54;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
  },
  grabber: {
    alignSelf: 'center',
    width: 36,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#D9D3C7',
    marginTop: 7,
  },
  grabberSpace: {
    height: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 19,
  },
  title: {
    letterSpacing: -0.4,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0ECE3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closePressed: {
    opacity: 0.6,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 84,
    marginTop: 21,
    paddingLeft: 15,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  profilePressed: {
    backgroundColor: '#F7F4EE',
  },
  avatarFrame: {
    width: FRAME,
    height: FRAME,
    borderRadius: FRAME / 2,
    borderWidth: 1.2,
    borderColor: '#E3DBCB',
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
  },
  avatarRing: {
    position: 'absolute',
    width: AVATAR - 1,
    height: AVATAR - 1,
    borderRadius: (AVATAR - 1) / 2,
    borderWidth: 1,
    borderColor: 'rgba(30, 42, 58, 0.12)',
  },
  profileText: {
    flex: 1,
    marginLeft: 15,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  handle: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 17,
    color: color.slate,
  },
  profileChevron: {
    marginLeft: 8,
    marginRight: 9,
  },
  support: {
    marginTop: 26,
  },
  logOut: {
    marginTop: 16,
  },
  version: {
    fontFamily: font.body,
    textAlign: 'center',
    marginTop: 10,
  },
});
