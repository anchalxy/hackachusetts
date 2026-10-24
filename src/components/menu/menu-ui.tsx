import { router, useLocalSearchParams, type Href } from 'expo-router';
import { type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius, space, useColors } from '@/ui/theme';

// Menu sheet + inner pages (DESIGN.md 6b, design/screens/menu). Measurements are from the SVGs.

export const APP_VERSION = '0.1';

/** iOS page sheets start below the status bar, but useSafeAreaInsets still reports the window's top. */
export function useSheetTopInset() {
  const insets = useSafeAreaInsets();
  return Platform.OS === 'ios' ? 0 : insets.top;
}

const ROW_PRESSED = '#F7F4EE';

export function Chevron({ size = 18, stroke }: { size?: number; stroke?: string }) {
  const color = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 5l7 7-7 7" fill="none" stroke={stroke ?? color.mute} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Bricolage 16 section heading, 2px in from the cards. */
export function SectionLabel({ children, first }: { children: string; first?: boolean }) {
  const styles = useStyles();
  return (
    <Txt variant="section" style={[styles.sectionLabel, first && styles.sectionLabelFirst]}>
      {children}
    </Txt>
  );
}

/** A grouped white card. `padBottom` adds the extra 8px the inner-page info cards have. */
export function Group({ children, padBottom, style }: { children: ReactNode; padBottom?: boolean; style?: StyleProp<ViewStyle> }) {
  const styles = useStyles();
  return <View style={[styles.group, padBottom && styles.groupPadBottom, style]}>{children}</View>;
}

/** Small mute text under a card ("Used to boost leaves…", footnotes). */
export function Caption({ children }: { children: string }) {
  const styles = useStyles();
  return (
    <Txt variant="meta" style={styles.caption}>
      {children}
    </Txt>
  );
}

/**
 * Menu row: 44px icon tile, title (15/600) with an optional value or problem under it, and only
 * a chevron on the right. Rows without `onPress` (Age) are locked: no chevron, not tappable.
 */
export function MenuRow({
  icon,
  title,
  value,
  problem,
  onPress,
  last,
  testID,
}: {
  icon: IconName;
  title: string;
  value?: string;
  /** Shown in brick instead of a value ("Camera access is off"). */
  problem?: string;
  onPress?: () => void;
  last?: boolean;
  testID?: string;
}) {
  const styles = useStyles();
  const subtitle = problem ?? value;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      testID={testID}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      style={({ pressed }) => [styles.menuRow, pressed && styles.rowPressed]}>
      <View style={styles.tile}>
        <Icon name={icon} size={32} />
      </View>
      <View style={[styles.menuRowBody, !last && styles.divider]}>
        <View style={styles.rowText}>
          <Txt style={styles.rowTitle}>{title}</Txt>
          {subtitle ? <Txt style={[styles.rowSubtitle, problem ? styles.problem : null]}>{subtitle}</Txt> : null}
        </View>
        {onPress ? (
          <View style={styles.chevron}>
            <Chevron />
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

/** Inner-page row: tile (icon or step number), title and body, no chevron. `trailing` is a toggle or button. */
export function InfoRow({
  icon,
  step,
  title,
  body,
  trailing,
  last,
}: {
  icon?: IconName;
  step?: number;
  title: string;
  body?: string;
  trailing?: ReactNode;
  last?: boolean;
}) {
  const styles = useStyles();
  return (
    <View style={styles.infoRow}>
      <View style={styles.tile}>
        {step != null ? <Txt style={styles.step}>{step}</Txt> : icon ? <Icon name={icon} size={32} /> : null}
      </View>
      <View style={[styles.infoRowBody, !last && styles.divider]}>
        <View style={styles.rowText}>
          <Txt style={styles.rowTitle}>{title}</Txt>
          {body ? <Txt style={styles.infoBody}>{body}</Txt> : null}
        </View>
        {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>
    </View>
  );
}

/** Centered single-action card (Log out, Delete account). Inert until accounts exist. */
export function SoloCard({ label, testID }: { label: string; testID?: string }) {
  const styles = useStyles();
  return (
    <View style={styles.solo} testID={testID}>
      <Txt style={styles.soloText}>{label}</Txt>
    </View>
  );
}

/** Push an inner page, telling it what to call its back button ("‹ Settings"). */
export function openPage(pathname: Href, from: string) {
  router.push({ pathname, params: { from } } as never);
}

/**
 * Back chevron with no centered title. Pushed from Settings it reads "‹ Settings" and pops; opened
 * straight from somewhere else (e.g. the report flow's "What can I report?") it reads "‹ Back" and
 * closes the sheet, since it's then the first page in the sheet's stack.
 */
function BackButton() {
  const styles = useStyles();
  const color = useColors();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const label = from ?? 'Back';

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/account');
  };

  return (
    <Pressable
      onPress={goBack}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={from ? `Back to ${from}` : 'Back'}
      testID="menu-back"
      style={({ pressed }) => [styles.back, pressed && styles.pressedText]}>
      <Svg width={25} height={25} viewBox="0 0 24 24">
        <Path d="M15 5l-7 7 7 7" fill="none" stroke={color.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      <Txt style={styles.backLabel}>{label}</Txt>
    </Pressable>
  );
}

/** Inner page: back chevron, hero (72px tile, Bricolage 26, 2-line intro), then sections. */
export function InnerPage({
  icon,
  iconSize = 46,
  hero,
  title,
  intro,
  children,
  footer,
}: {
  icon?: IconName;
  iconSize?: number;
  /** Replaces the icon tile (Edit profile shows the photo). */
  hero?: ReactNode;
  title: string;
  intro: string;
  children: ReactNode;
  /** Pinned under the scroll view (input pages keep their main button at the bottom). */
  footer?: ReactNode;
}) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const top = useSheetTopInset();
  return (
    <View style={styles.screen}>
      <ScrollView alwaysBounceVertical={false}
        // Room above the back chevron: in the iOS page sheet `top` is 0, so this is all the gap there is.
        contentContainerStyle={[styles.innerContent, { paddingTop: top + 22, paddingBottom: footer ? 24 : insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <BackButton />
        {hero ?? (
          <View style={styles.heroTile}>{icon ? <Icon name={icon} size={iconSize} /> : null}</View>
        )}
        <Txt variant="display" style={styles.heroTitle} accessibilityRole="header">
          {title}
        </Txt>
        <Txt style={styles.intro}>{intro}</Txt>
        {children}
      </ScrollView>
      {footer ? <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>{footer}</View> : null}
    </View>
  );
}

const useStyles = makeStyles((color, dark) => ({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  innerContent: {
    paddingHorizontal: space.gutter,
  },
  sectionLabel: {
    fontSize: 16,
    lineHeight: 20,
    letterSpacing: 0,
    marginLeft: 2,
    marginTop: 27,
    marginBottom: 7,
  },
  sectionLabelFirst: {
    marginTop: 29,
  },
  group: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  groupPadBottom: {
    paddingBottom: 8,
  },
  caption: {
    fontFamily: font.body,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 7,
    marginHorizontal: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingLeft: 14,
  },
  rowPressed: {
    backgroundColor: dark ? color.tile : ROW_PRESSED,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowBody: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontFamily: font.bodySemibold,
    fontSize: 15,
    lineHeight: 20,
    color: color.ink,
  },
  rowSubtitle: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
    marginTop: 1,
  },
  problem: {
    color: color.brick,
  },
  chevron: {
    marginLeft: 8,
    marginRight: 9,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: 14,
    paddingTop: 10,
  },
  infoRowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginLeft: 14,
    paddingTop: 3,
    paddingBottom: 15,
    paddingRight: 16,
    minHeight: 56,
  },
  infoBody: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
  },
  step: {
    fontFamily: font.heading,
    fontSize: 20,
    lineHeight: 24,
    color: color.primary,
  },
  trailing: {
    marginLeft: 12,
  },
  solo: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soloText: {
    fontFamily: font.bodySemibold,
    fontSize: 15,
    color: color.brick,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 1,
    marginLeft: -4,
    height: 25,
  },
  backLabel: {
    fontFamily: font.bodyMedium,
    fontSize: 15,
    lineHeight: 20,
    color: color.ink,
  },
  pressedText: {
    opacity: 0.5,
  },
  heroTile: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 23,
  },
  heroTitle: {
    marginTop: 12,
    letterSpacing: -0.4,
  },
  intro: {
    fontFamily: font.body,
    fontSize: 14,
    lineHeight: 20,
    color: color.slate,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    backgroundColor: color.bg,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
}));
