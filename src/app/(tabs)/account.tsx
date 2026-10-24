import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { BottomTabInset } from '@/constants/theme';
import { areaLabel, getProfile, SEED_PROFILE, type Profile } from '@/lib/profile';
import { Badge, Button, Card, IconTile, Timeline } from '@/ui/components';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, radius, space } from '@/ui/theme';

import Dana from '../../../design/assets/avatars/dana.svg';

const PHOTO = require('../../../design/assets/avatars/ishaan-photo.jpg');

type Trailing =
  | { kind: 'badge'; label: string; tone: 'urgent' | 'inReview' | 'approved' }
  | { kind: 'leaves'; amount: number }
  | { kind: 'button'; label: string; onPress: () => void };

type Notification = {
  id: string;
  icon: IconName;
  /** Bold subject, then the rest of the sentence (DESIGN.md §4 copy style). */
  lead: string;
  rest?: string;
  detail: string;
  ago?: string;
  trailing: Trailing;
};

// Mocked until notifications are built; copy is from design/screens/profile/profile.png.
// Start, RSVP and Take survey go to Challenges, where meetings and surveys live for now.
const toChallenges = () => router.navigate('/');

const EARLIER: Notification[] = [
  {
    id: 'streak',
    icon: 'flame',
    lead: 'Your 5-week streak',
    detail: 'Do a challenge to keep it',
    trailing: { kind: 'badge', label: '1 day left', tone: 'urgent' },
  },
  {
    id: 'challenge',
    icon: 'flag',
    lead: 'New challenge:',
    rest: 'redesign',
    detail: 'Starlight Square',
    ago: '1d',
    trailing: { kind: 'button', label: 'Start', onPress: toChallenges },
  },
  {
    id: 'crosswalk',
    icon: 'crosswalk',
    lead: 'The city is reviewing',
    detail: 'your Inman Sq crosswalk',
    ago: '1d',
    trailing: { kind: 'badge', label: 'In review', tone: 'inReview' },
  },
  {
    id: 'council',
    icon: 'calendar',
    lead: 'City Council',
    rest: 'meets Mon 5:30',
    detail: 'Take notes for 3x leaves',
    trailing: { kind: 'button', label: 'RSVP', onPress: toChallenges },
  },
  {
    id: 'graffiti',
    icon: 'graffiti',
    lead: 'DPW approved',
    rest: 'your graffiti',
    detail: 'report on Broadway',
    ago: '2d',
    trailing: { kind: 'badge', label: 'Approved', tone: 'approved' },
  },
  {
    id: 'votes',
    icon: 'ballot',
    lead: 'Your park design',
    rest: 'got 48 votes',
    detail: 'Starlight Square',
    ago: '3d',
    trailing: { kind: 'leaves', amount: 30 },
  },
];

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <Icon name="teacup" size={36} />
          <Txt variant="rowLead" style={styles.username}>
            {profile.username}
          </Txt>
          <Pressable onPress={() => router.navigate('/rewards')} style={styles.leafPill}>
            <Icon name="leafy" size={22} />
            <Txt variant="rowLead" style={styles.leafAmount}>
              {profile.leaves.toLocaleString()}
            </Txt>
          </Pressable>
        </View>

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
                {profile.reportCount}
              </Txt>
              {' reports · '}
              <Txt variant="secondary" style={styles.count} onPress={() => router.navigate('/')}>
                {profile.challengeCount}
              </Txt>
              {' challenges'}
            </Txt>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Txt variant="section">New</Txt>
          <Txt variant="secondary">3 unread</Txt>
        </View>

        <Card style={styles.fixedCard}>
          <View style={styles.fixedHead}>
            <IconTile icon="pothole" size={64} />
            <View style={styles.fixedTitle}>
              <Txt variant="hero">Your pothole got fixed!</Txt>
              <Txt variant="secondary">Mass Ave & Prospect St</Txt>
            </View>
            <View style={styles.unreadDot} />
          </View>
          <Timeline status="fixed" dates={['Oct 12', 'Oct 15', 'Oct 16', 'Today']} />
          <View style={styles.crew}>
            <View style={styles.crewAvatar}>
              <Dana width={40} height={40} />
            </View>
            <View style={styles.crewText}>
              <Txt variant="rowLead" style={styles.crewName}>
                Fixed by Dana R., DPW
              </Txt>
              <View style={styles.leafLine}>
                <Icon name="leafySmall" size={16} />
                <Txt variant="badge" style={styles.leafText}>
                  +50 tea leaves
                </Txt>
              </View>
            </View>
            {thanked ? (
              <Badge label="Thanked" bg={color.badge.approved.bg} fg={color.badge.approved.fg} />
            ) : (
              <Button size="sm" label="Say thanks" onPress={() => setThanked(true)} />
            )}
          </View>
        </Card>

        <View style={styles.bounty}>
          <Waves />
          <Txt variant="hero" style={styles.bountyTitle}>
            How do you get to Central Sq?
          </Txt>
          <Txt variant="secondary" style={styles.bountyBody}>
            The city is redrawing the bike lanes and wants to hear from renters like you.
          </Txt>
          <View style={styles.bountyFooter}>
            <View style={styles.bountyLeafy}>
              <Icon name="leafy" size={22} />
            </View>
            <View style={styles.bountyBoost}>
              <Txt variant="rowLead" style={styles.bountyBoostTitle}>
                Double tea leaves
              </Txt>
              <Txt variant="meta" style={styles.bountyMeta}>
                Ends Friday
              </Txt>
            </View>
            <Pressable onPress={toChallenges} style={({ pressed }) => [styles.bountyButton, pressed && styles.pressed]}>
              <Txt variant="button" style={styles.bountyButtonText}>
                Take survey
              </Txt>
            </Pressable>
          </View>
        </View>

        <Txt variant="section" style={styles.earlier}>
          Earlier
        </Txt>
        {EARLIER.map((n, i) => (
          <NotificationRow key={n.id} notification={n} last={i === EARLIER.length - 1} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function NotificationRow({ notification: n, last }: { notification: Notification; last: boolean }) {
  return (
    <View style={styles.row}>
      <IconTile icon={n.icon} />
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
        <RowTrailing trailing={n.trailing} />
      </View>
    </View>
  );
}

function RowTrailing({ trailing }: { trailing: Trailing }) {
  switch (trailing.kind) {
    case 'badge': {
      const { bg, fg } = color.badge[trailing.tone];
      return <Badge label={trailing.label} bg={bg} fg={fg} />;
    }
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
      return <Button size="sm" label={trailing.label} onPress={trailing.onPress} />;
  }
}

/** Faint harbor waves along the bounty card's bottom edge (DESIGN.md §3). */
function Waves() {
  const wave = 'M0 6c12 0 12-6 24-6s12 6 24 6 12-6 24-6 12 6 24 6 12-6 24-6 12 6 24 6 12-6 24-6 12 6 24 6';
  return (
    <Svg width={192} height={30} viewBox="0 0 192 30" style={styles.waves} pointerEvents="none">
      <Path d={wave} stroke="#FFFFFF" strokeWidth={2} fill="none" transform="translate(0 6)" />
      <Path d={wave} stroke="#FFFFFF" strokeWidth={2} fill="none" transform="translate(12 18)" />
    </Svg>
  );
}

const PHOTO_SIZE = 104;
const FRAME = 5;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    paddingBottom: BottomTabInset + 32,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  username: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 17,
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginTop: 12,
    marginBottom: space.sectionGap,
  },
  photoFrame: {
    width: PHOTO_SIZE + FRAME * 2,
    height: PHOTO_SIZE + FRAME * 2,
    borderRadius: (PHOTO_SIZE + FRAME * 2) / 2,
    padding: FRAME - 1.2,
    backgroundColor: color.surface,
    borderWidth: 1.2,
    borderColor: '#E3DBCB',
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
  crewAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    padding: 3,
    backgroundColor: color.surface,
    borderWidth: 1.2,
    borderColor: '#E3DBCB',
    overflow: 'hidden',
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
  bounty: {
    overflow: 'hidden',
    padding: 20,
    paddingBottom: 18,
    borderRadius: radius.card,
    backgroundColor: color.highlightCard.bg,
    gap: 6,
  },
  waves: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    opacity: color.highlightCard.waveOpacity,
  },
  bountyTitle: {
    color: color.highlightCard.title,
  },
  bountyBody: {
    color: color.highlightCard.body,
  },
  bountyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 12,
  },
  bountyLeafy: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.leaf.tint,
  },
  bountyBoost: {
    flex: 1,
  },
  bountyBoostTitle: {
    color: color.highlightCard.title,
    fontSize: 14,
  },
  bountyMeta: {
    color: color.highlightCard.meta,
  },
  bountyButton: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  bountyButtonText: {
    color: color.primary,
    fontSize: 14,
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
});
