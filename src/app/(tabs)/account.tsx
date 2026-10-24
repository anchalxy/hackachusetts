import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { timelineDates } from '@/components/report/format';
import { openLeafDevMenu } from '@/components/rewards/leaf-dev-menu';
import { topicInfo } from '@/constants/report-topics';
import { useChallengeProgress } from '@/lib/challenge-progress';
import { challengeUpdateFeed, updateAgo, type ChallengeUpdateItem } from '@/lib/challenge-update-feed';
import { getCurrentWeek } from '@/lib/challenge-week';
import { getMyReports, refreshMyReportsFrom311, type MyReport } from '@/lib/my-reports';
import { buildInbox, getSeenAt, markSeen, type AppNotification, type FixedHero, type Trailing } from '@/lib/notifications';
import { areaLabel, getProfile, SEED_PROFILE, type Profile } from '@/lib/profile';
import { creditApprovedReports } from '@/lib/report-leaves';
import { photoSource } from '@/lib/report-photo';
import { useLeafBalance } from '@/lib/rewards';
import { seedFrom311Once } from '@/lib/seed-311';
import { Badge, Button, IconTile, StatusBadge, Timeline } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { BottomTabInset, font, makeStyles, radius, space, useColors } from '@/ui/theme';


const PHOTO = require('../../../design/assets/avatars/ishaan-photo.jpg');

export default function ProfileScreen() {
  const styles = useStyles();
  const color = useColors();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);
  const [synced, setSynced] = useState<{ reports: MyReport[]; seenAt: number } | null>(null);
  // Live, so finishing a challenge updates the streak and challenge rows right away.
  const progress = useChallengeProgress();
  const inbox = synced ? buildInbox({ ...synced, week: getCurrentWeek(), progress }) : null;
  // Real counts, so they match where they link: every report you filed or followed, and every
  // trail stop finished (earlier weeks from the profile, plus this week's).
  const reportCount = synced?.reports.length ?? profile.reportCount;
  const challengeCount = profile.challengeCount + Object.keys(progress.stops).length;
  const balance = useLeafBalance();
  // What the city did after challenges you finished (data/challenges/updates.json, checked weekly).
  const updates = challengeUpdateFeed(progress);
  const [now] = useState(() => Date.now());

  // Reload on focus: Edit profile and Neighborhood in the menu sheet change it.
  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile);
    }, []),
  );

  // The inbox: seed real 311 cases once, sync every report with 311, pay leaves for new
  // approvals, then rank what's worth telling the user. Leaving the screen marks it all seen.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      const build = async (reports: MyReport[]) => {
        const seenAt = await getSeenAt();
        if (active) setSynced({ reports, seenAt });
      };
      (async () => {
        await build(await getMyReports());
        const reports = (await seedFrom311Once().catch(() => null)) ?? (await refreshMyReportsFrom311().catch(getMyReports));
        await creditApprovedReports(reports);
        await build(reports);
      })();
      return () => {
        active = false;
        markSeen();
      };
    }, []),
  );

  return (
    <View style={styles.screen}>
      {/* Fixed bar lined up with the Challenges tab's floating pills (insets.top + 8, 36 tall,
          20 from the right). Same color as the page, so there's no box; it only keeps the
          scrolling inbox from running under the pills. */}
      <View style={[styles.bar, { paddingTop: insets.top }]}>
        <View style={styles.topBar}>
          {/* Username ⌄ opens Edit profile (DESIGN.md 6b: it no longer switches accounts). */}
          <View style={styles.usernameSlot} pointerEvents="box-none">
            <Pressable
              onPress={() => router.push('/menu/edit-profile')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`${profile.username}. Edit profile`}
              testID="profile-username"
              style={({ pressed }) => [styles.usernameButton, pressed && styles.pressed]}>
              <Txt variant="rowLead" style={styles.username} numberOfLines={1}>
                {profile.username}
              </Txt>
              <Svg width={17} height={17} viewBox="0 0 24 24">
                <Path d="M7 10l5 5 5-5" fill="none" stroke={color.ink} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
              </Svg>
            </Pressable>
          </View>
          <View style={styles.topBarRight}>
            <Pressable
              onPress={() => router.navigate('/rewards')}
              onLongPress={openLeafDevMenu}
              delayLongPress={600}
              accessibilityRole="button"
              accessibilityLabel={`${balance.toLocaleString()} tea leaves`}
              style={({ pressed }) => [styles.leafPill, pressed && styles.pressed]}>
              <Icon name="leafy" size={22} />
              <Txt variant="rowLead" style={styles.leafAmount}>
                {balance.toLocaleString()}
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => router.navigate('/menu')}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
              testID="profile-menu"
              style={({ pressed }) => [styles.menuButton, pressed && styles.pressed]}>
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke={color.ink} strokeWidth={2} strokeLinecap="round" />
              </Svg>
            </Pressable>
          </View>
        </View>
      </View>
      <ScrollView
        alwaysBounceVertical={false}
        contentContainerStyle={[styles.content, { paddingBottom: BottomTabInset + insets.bottom + 32 }]}>
        <View style={styles.header}>
          <View style={styles.photoFrame}>
            <Image source={PHOTO} style={styles.photo} contentFit="cover" />
          </View>
          <View style={styles.headerText}>
            <Txt variant="title">{profile.name}</Txt>
            <Txt variant="secondary" style={styles.area}>
              {areaLabel(profile)}, MA
            </Txt>
            <Txt variant="secondary" style={styles.counts}>
              <Txt variant="secondary" style={styles.count} onPress={() => router.navigate('/report')}>
                {reportCount}
              </Txt>
              {reportCount === 1 ? ' report · ' : ' reports · '}
              <Txt variant="secondary" style={styles.count} onPress={() => router.navigate('/')}>
                {challengeCount}
              </Txt>
              {challengeCount === 1 ? ' challenge' : ' challenges'}
            </Txt>
          </View>
        </View>

        {inbox?.hero ? (
          <>
            <View style={styles.sectionHeader}>
              <Txt variant="section">New</Txt>
              {inbox.unread > 0 ? <Txt variant="secondary">{inbox.unread} unread</Txt> : null}
            </View>
            <FixedCard hero={inbox.hero} />
          </>
        ) : null}

        <View style={[styles.sectionHeader, styles.earlier]}>
          <Txt variant="section">{inbox?.hero ? 'Earlier' : 'Notifications'}</Txt>
          {!inbox?.hero && inbox && inbox.unread > 0 ? <Txt variant="secondary">{inbox.unread} unread</Txt> : null}
        </View>
        {updates.map((u, i) => (
          <ChallengeUpdateRow key={u.id} update={u} now={now} last={i === updates.length - 1 && !inbox?.rows.length} />
        ))}
        {inbox?.rows.map((n, i) => (
          <NotificationRow key={n.id} notification={n} last={i === inbox.rows.length - 1} />
        ))}
      </ScrollView>
    </View>
  );
}

/** "Your pothole got fixed!": the newest real fix, with the report's photo and who fixed it. */
function FixedCard({ hero }: { hero: FixedHero }) {
  const styles = useStyles();
  const { report } = hero;
  const photo = photoSource(report.photoUri);
  return (
    <Pressable
      onPress={() => router.push(`/report/${report.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`${hero.headline} ${report.address}. Fixed by ${hero.fixedBy}.`}
      testID="profile-fixed-card"
      style={({ pressed }) => [styles.fixedCard, pressed && styles.cardPressed]}>
      <View style={styles.fixedHead}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.fixedPhoto} contentFit="cover" />
        ) : (
          <IconTile icon={topicInfo(report.topic).icon} size={64} />
        )}
        <View style={styles.fixedTitle}>
          <Txt variant="hero">{hero.headline}</Txt>
          <Txt variant="secondary" numberOfLines={1}>
            {report.address}
          </Txt>
        </View>
        {hero.unread ? <View style={styles.unreadDot} /> : null}
      </View>
      <Timeline status="fixed" dates={timelineDates(report)} />
      <View style={styles.crew}>
        <View style={styles.crewIcon}>
          <Icon name="cityhall" size={26} />
        </View>
        <View style={styles.crewText}>
          <Txt variant="rowLead" style={styles.crewName} numberOfLines={1}>
            Fixed by {hero.fixedBy}
          </Txt>
          <View style={styles.leafLine}>
            <Icon name="leafySmall" size={16} />
            <Txt variant="badge" style={styles.leafText}>
              +{hero.leaves} tea leaves
            </Txt>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function NotificationRow({ notification: n, last }: { notification: AppNotification; last: boolean }) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={() => router.push(n.href)}
      accessibilityRole="button"
      testID={`notif-${n.id}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <RowLead icon={n.icon} photo={n.photo} />
      <View style={[styles.rowBody, !last && styles.rowDivider]}>
        <View style={styles.rowText}>
          <Txt variant="row" numberOfLines={1}>
            <Txt variant="row" style={styles.rowLead}>
              {n.lead}
            </Txt>
            {n.rest ? ` ${n.rest}` : ''}
          </Txt>
          <Txt variant="row" numberOfLines={1} style={styles.rowDetail}>
            {n.detail}
            {n.ago ? <Txt variant="meta">{` · ${n.ago}`}</Txt> : null}
          </Txt>
        </View>
        {/* Badges hug the top by default; every trailing element sits on the row's center line. */}
        <View style={styles.trailing}>
          <RowTrailing trailing={n.trailing} />
        </View>
      </View>
    </Pressable>
  );
}

/** "Update on Rat patrol: Docket #1804 was referred…" with where it came from, so users can check it. */
function ChallengeUpdateRow({ update: u, now, last }: { update: ChallengeUpdateItem; now: number; last: boolean }) {
  const styles = useStyles();
  return (
    <View style={styles.row}>
      <IconTile icon={u.icon} />
      <View style={[styles.rowBody, !last && styles.rowDivider]}>
        <View style={styles.rowText}>
          <Txt variant="row" numberOfLines={2}>
            <Txt variant="row" style={styles.rowLead}>
              {u.lead}
            </Txt>
            {u.text ? ` ${u.text}` : ''}
          </Txt>
          <Txt variant="meta" numberOfLines={1}>
            {`${u.detail} · ${updateAgo(u.date, now)}`}
          </Txt>
        </View>
        {u.url ? <Button size="sm" label="View" onPress={() => WebBrowser.openBrowserAsync(u.url)} /> : null}
      </View>
    </View>
  );
}

/** The report's own photo when there is one (the actual broken light), else the topic icon. */
function RowLead({ icon, photo }: { icon: AppNotification['icon']; photo?: string }) {
  const styles = useStyles();
  const uri = photoSource(photo);
  if (!uri) return <IconTile icon={icon} />;
  return <Image source={{ uri }} style={styles.rowPhoto} contentFit="cover" accessibilityIgnoresInvertColors />;
}

function RowTrailing({ trailing }: { trailing: Trailing }) {
  const styles = useStyles();
  const color = useColors();
  switch (trailing.kind) {
    case 'status':
      return <StatusBadge status={trailing.status} />;
    case 'urgent':
      return <Badge label={trailing.label} bg={color.badge.urgent.bg} fg={color.badge.urgent.fg} />;
    case 'leaves':
      return (
        <View style={styles.leafBadge}>
          <Icon name="leafySmall" size={16} />
          <Txt variant="badge" style={styles.leafText}>
            +{trailing.amount}
          </Txt>
        </View>
      );
    case 'button':
      return <Button size="sm" label={trailing.label} onPress={() => router.push(trailing.href)} />;
  }
}

const PHOTO_SIZE = 104;
const FRAME = 5;

const useStyles = makeStyles((color, dark) => ({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    paddingBottom: BottomTabInset + 32,
  },
  bar: {
    backgroundColor: color.bg,
    paddingHorizontal: space.gutter,
    paddingBottom: 8,
    zIndex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingTop: 8,
    height: 44,
  },
  // Centered on the screen, kept clear of the pill + menu on the right.
  usernameSlot: {
    position: 'absolute',
    left: 110,
    right: 110,
    top: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  usernameButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    maxWidth: '100%',
  },
  username: {
    fontFamily: font.bodyBold,
    fontSize: 20,
    lineHeight: 25,
    flexShrink: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  leafPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 36,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: 999,
    backgroundColor: color.leaf.tint,
  },
  leafAmount: {
    color: color.leaf.dark,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  menuButton: {
    marginRight: -3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 20,
    marginBottom: space.sectionGap,
  },
  photoFrame: {
    width: PHOTO_SIZE + FRAME * 2,
    height: PHOTO_SIZE + FRAME * 2,
    borderRadius: (PHOTO_SIZE + FRAME * 2) / 2,
    padding: FRAME - 1.2,
    backgroundColor: color.surface,
    borderWidth: 1.2,
    borderColor: dark ? color.border : '#E3DBCB',
  },
  photo: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: PHOTO_SIZE / 2,
  },
  headerText: {
    flex: 1,
  },
  area: {
    marginTop: 4,
    fontSize: 15,
  },
  counts: {
    marginTop: 6,
    fontSize: 15,
  },
  count: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: color.ink,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  fixedCard: {
    gap: 22,
    marginBottom: space.cardGap,
    padding: space.cardPadding,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  cardPressed: {
    backgroundColor: dark ? color.panel : '#FBFAF7',
  },
  fixedPhoto: {
    width: 64,
    height: 64,
    borderRadius: radius.heroTile,
    backgroundColor: color.tile,
  },
  crewIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
    borderWidth: 1.2,
    borderColor: dark ? color.border : '#E3DBCB',
  },
  rowPhoto: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
  },
  trailing: {
    alignSelf: 'center',
    alignItems: 'flex-end',
  },
  fixedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  fixedTitle: {
    flex: 1,
    gap: 2,
  },
  unreadDot: {
    alignSelf: 'flex-start',
    marginTop: 8,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: color.brick,
  },
  crew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 16,
    backgroundColor: color.panel,
  },
  crewText: {
    flex: 1,
    gap: 2,
  },
  crewName: {
    fontSize: 14,
  },
  leafLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leafText: {
    color: color.leaf.dark,
  },
  pressed: {
    opacity: 0.75,
  },
  earlier: {
    marginTop: space.sectionGap,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  rowBody: {
    flex: 1,
    minHeight: 68,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLead: {
    fontFamily: font.bodyBold,
  },
  rowDetail: {
    color: color.slate,
  },
  leafBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: radius.badge,
    backgroundColor: color.badge.reward.bg,
  },
}));
