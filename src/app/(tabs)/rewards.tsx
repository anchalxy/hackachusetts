import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { HarborHero } from '@/components/rewards/harbor-hero';
import { openLeafDevMenu } from '@/components/rewards/leaf-dev-menu';
import { BottomTabInset } from '@/constants/theme';
import {
  dealBadge,
  dealStatus,
  partner,
  sortedDeals,
  useCrate,
  useRewards,
  type Deal,
} from '@/lib/rewards';
import { Badge, Button } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius, space, useColors, useScheme, type Palette } from '@/ui/theme';

function badgeColors(color: Palette, dark: boolean) {
  return {
    ok: color.badge.approved,
    urgent: color.badge.urgent,
    done: { bg: dark ? color.tile : '#EFEDE9', fg: color.mute },
  };
}

/** Rewards tab v2 (DESIGN.md 6e, design/screens/rewards/1, 2, 2b). */
export default function RewardsScreen() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const crate = useCrate();
  const { deals } = useRewards();
  // Badges count days left, so re-read the clock whenever the tab comes back into view.
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => setNow(Date.now()), []));
  const toUse = deals.filter((d) => dealStatus(d, now).kind === 'active').length;
  const heroWidth = width - space.gutter * 2 - 2;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + 24 }]}>
        <View style={styles.header}>
          <Txt style={styles.title} accessibilityRole="header" onLongPress={openLeafDevMenu}>
            Rewards
          </Txt>
          <Pressable
            onLongPress={openLeafDevMenu}
            delayLongPress={600}
            accessibilityLabel={`${crate.balance.toLocaleString()} tea leaves`}
            style={styles.leafPill}>
            <Icon name="leafy" size={22} />
            <Txt variant="rowLead" style={styles.leafAmount}>
              {crate.balance.toLocaleString()}
            </Txt>
          </Pressable>
        </View>

        <View style={styles.hero}>
          <HarborHero width={heroWidth} filled={crate.filled} size={crate.size} moreReady={crate.ready - 1} />
          <View style={styles.panel}>
            {crate.full ? (
              <>
                <Txt style={styles.fullTitle}>Your crate is full!</Txt>
                <Txt variant="secondary" style={styles.fullBody}>
                  {crate.ready > 1
                    ? `You have enough for ${crate.ready}. Open them one at a time.`
                    : 'A surprise deal is waiting inside'}
                </Txt>
                <Button label="Toss it in the harbor!" onPress={() => router.push('/crate')} style={styles.toss} />
              </>
            ) : (
              <>
                <View style={styles.progressHead}>
                  <Txt style={styles.progressText}>
                    <Txt style={styles.progressBold}>{crate.filled}</Txt>
                    {` of ${crate.size} leaves`}
                  </Txt>
                  <Txt style={styles.toGo}>{crate.toGo} to go</Txt>
                </View>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${(crate.filled / crate.size) * 100}%` }]} />
                </View>
                <Txt style={styles.hint}>Fill the crate and Paul tosses it into the harbor.</Txt>
              </>
            )}
          </View>
        </View>

        <View style={styles.sectionHead}>
          <Txt variant="section">My Deals</Txt>
          {deals.length > 0 && <Txt style={styles.toUse}>{toUse} to use</Txt>}
        </View>
        {deals.length === 0 ? (
          <Txt variant="secondary">Fill your first crate to find a deal.</Txt>
        ) : (
          sortedDeals(deals, now).map((deal, i, all) => (
            <DealRow key={deal.id} deal={deal} now={now} last={i === all.length - 1} />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DealRow({ deal, now, last }: { deal: Deal; now: number; last: boolean }) {
  const styles = useStyles();
  const color = useColors();
  const BADGE = badgeColors(color, useScheme() === 'dark');
  const p = partner(deal.partnerId);
  const status = dealStatus(deal, now);
  const badge = dealBadge(status);
  const done = status.kind !== 'active';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/deal/[id]', params: { id: deal.id } })}
      accessibilityRole="button"
      accessibilityLabel={`${p.name}, ${p.offer}, ${badge.label}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.tile}>
        <View style={done && styles.faded}>
          <Icon name={p.icon} size={30} />
        </View>
      </View>
      <View style={[styles.rowBody, !last && styles.divider]}>
        <View style={styles.rowText}>
          <Txt variant="rowLead" style={[styles.rowName, done && styles.mutedText]} numberOfLines={1}>
            {p.name}
          </Txt>
          <Txt variant="secondary" style={done && styles.mutedText} numberOfLines={1}>
            {p.offer}
          </Txt>
        </View>
        <Badge label={badge.label} {...BADGE[badge.tone]} style={styles.badge} />
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M9 5l7 7-7 7" fill="none" stroke={color.mute} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </Pressable>
  );
}

const useStyles = makeStyles((color, dark) => ({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    paddingBottom: BottomTabInset + 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 16,
  },
  title: {
    fontFamily: font.heading,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.5,
    color: color.ink,
  },
  leafPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 32,
    paddingLeft: 6,
    paddingRight: 11,
    borderRadius: 16,
    backgroundColor: color.leaf.tint,
  },
  leafAmount: {
    color: color.leaf.dark,
    fontSize: 13.5,
    fontVariant: ['tabular-nums'],
  },
  hero: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  panel: {
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingHorizontal: space.cardPadding,
    paddingTop: 16,
    paddingBottom: 18,
  },
  progressHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  progressText: {
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 20,
    color: color.slate,
  },
  progressBold: {
    fontFamily: font.bodyBold,
    color: color.ink,
  },
  toGo: {
    fontFamily: font.bodyBold,
    fontSize: 13.5,
    color: color.leaf.dark,
  },
  track: {
    height: 12,
    borderRadius: 6,
    backgroundColor: dark ? color.leaf.tint : '#E7EFE8',
    marginTop: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 6,
    backgroundColor: color.leaf.base,
  },
  hint: {
    fontFamily: font.body,
    fontSize: 13,
    lineHeight: 18,
    color: color.slate,
    marginTop: 12,
  },
  fullTitle: {
    fontFamily: font.heading,
    fontSize: 20,
    lineHeight: 25,
    letterSpacing: -0.3,
    color: color.ink,
  },
  fullBody: {
    marginTop: 2,
  },
  toss: {
    marginTop: 14,
    height: 50,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: space.sectionGap + 4,
    marginBottom: 8,
  },
  toUse: {
    fontFamily: font.bodySemibold,
    fontSize: 13,
    color: color.slate,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    height: space.rowHeight,
  },
  pressed: {
    opacity: 0.7,
  },
  tile: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faded: {
    opacity: 0.4,
  },
  rowBody: {
    flex: 1,
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 14,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowText: {
    flex: 1,
    gap: 1,
  },
  rowName: {
    fontSize: 14,
  },
  mutedText: {
    color: color.mute,
  },
  badge: {
    alignSelf: 'center',
    minWidth: 86,
  },
}));
