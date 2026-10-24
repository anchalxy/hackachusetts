import { Image } from 'expo-image';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import Colonist from '../../../design/assets/avatars/colonist.svg';
import { dayNumber, stamp, timelineDates } from '@/components/report/format';
import { topicInfo } from '@/constants/report-topics';
import { getMyReport, type MyReport } from '@/lib/my-reports';
import { photoSource } from '@/lib/report-photo';
import { Badge, StatusGlyph, Timeline } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, LIFECYCLE, radius, space, STATUS_LABEL, type ReportStatus } from '@/ui/theme';

const PHOTO_HEIGHT = 300;

// The status card is the only tinted card on the page (DESIGN.md 6c).
const STATUS_CARD: Record<ReportStatus, { bg: string; border: string }> = {
  submitted: { bg: '#F4F5FB', border: '#DCE0F2' },
  inReview: { bg: '#FBF5E6', border: '#F0E2BF' },
  approved: { bg: '#EEF5F3', border: '#CFE3DE' },
  fixed: { bg: '#EFF1F5', border: '#D6DBE4' },
  notApproved: { bg: '#FBEEEA', border: '#F1CFC6' },
};

function statusSentence(report: MyReport): string {
  const who = report.team ?? topicInfo(report.topic).shortDepartment;
  switch (report.status) {
    case 'submitted':
      return `Boston 311 has it. Next, ${topicInfo(report.topic).shortDepartment} takes a look.`;
    case 'inReview':
      return `${who} is checking it.`;
    case 'approved':
      return `${who} is on it.`;
    case 'fixed':
      return `Fixed by ${who}.`;
    case 'notApproved':
      return report.reason ?? 'The city closed it without action.';
  }
}

function leafNote(status: ReportStatus): string {
  if (status === 'submitted' || status === 'inReview') return 'You’ll earn tea leaves when it’s approved';
  if (status === 'notApproved') return 'No tea leaves lost';
  return 'Tea leaves are on the way';
}

export default function ReportPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<MyReport | null>(null);

  useFocusEffect(
    useCallback(() => {
      getMyReport(id).then((r) => setReport(r ?? null));
    }, [id]),
  );

  if (!report) return <View style={styles.container} />;

  const info = topicInfo(report.topic);
  const photo = photoSource(report.photoUri);
  const card = STATUS_CARD[report.status];
  const final = report.status === 'fixed' || report.status === 'notApproved';
  const nextStep = final ? null : LIFECYCLE[LIFECYCLE.indexOf(report.status) + 1];
  const edited = report.aiDraft !== '' && report.description.trim() !== report.aiDraft.trim();

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <View style={styles.photo}>
          {photo ? (
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <View style={styles.photoFallback}>
              <Icon name={info.icon} size={120} />
            </View>
          )}
          <View style={[styles.photoScrim, { height: insets.top + 60 }]} />
        </View>

        <View style={styles.sheet}>
          <Txt variant="display">{report.title}</Txt>
          <Txt variant="secondary" style={styles.address}>
            {report.address}
          </Txt>

          <View style={[styles.statusCard, { backgroundColor: card.bg, borderColor: card.border }]}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusIcon, { backgroundColor: color.status[report.status].ring }]}>
                <StatusGlyph status={report.status} size={16} />
              </View>
              <View style={styles.statusText}>
                <View style={styles.statusTitleRow}>
                  <Txt variant="hero" style={{ color: color.status[report.status].fg }}>
                    {STATUS_LABEL[report.status]}
                  </Txt>
                  {!final && (
                    <Txt variant="badge" style={{ color: color.status[report.status].fg }}>
                      Day {dayNumber(report.createdAt)}
                      {info.typicalDays ? ` of ~${info.typicalDays}` : ''}
                    </Txt>
                  )}
                </View>
                <Txt variant="secondary" style={styles.statusSentence}>
                  {statusSentence(report)}
                </Txt>
              </View>
            </View>
            <Timeline status={report.status} dates={timelineDates(report)} />
            <View style={[styles.leafNote, { borderTopColor: card.border }]}>
              <Icon name="leafySmall" size={18} />
              <Txt variant="badge" style={styles.leafText}>
                {leafNote(report.status)}
              </Txt>
            </View>
          </View>

          <Txt variant="section" style={styles.sectionTitle}>
            Updates
          </Txt>
          <View style={styles.card}>
            {report.updates.map((update, i) => {
              const last = i === report.updates.length - 1;
              return (
                <View key={i} style={styles.update}>
                  <View style={styles.updateRail}>
                    {update.kind === 'you' ? (
                      <View style={styles.avatar}>
                        <Colonist width={36} height={36} />
                      </View>
                    ) : (
                      <View style={[styles.avatar, styles.cityAvatar]}>
                        <Icon name="cityhall" size={22} />
                      </View>
                    )}
                    {/* Solid lines only between avatars; dashed into the "Next" placeholder. */}
                    {(!last || nextStep) && <View style={[styles.connector, last && styles.connectorDashed]} />}
                  </View>
                  <View style={styles.updateBody}>
                    <View style={styles.updateHead}>
                      <Txt variant="rowLead" style={styles.updateWho}>
                        {update.who}
                      </Txt>
                      <Txt variant="meta">{stamp(update.at)}</Txt>
                    </View>
                    <Txt variant="row" style={styles.updateText}>
                      {update.text}
                    </Txt>
                  </View>
                </View>
              );
            })}
            {nextStep && (
              <View style={styles.update}>
                <View style={styles.updateRail}>
                  <View style={[styles.avatar, styles.nextAvatar]} />
                </View>
                <View style={styles.updateBody}>
                  <Txt variant="row" style={styles.nextTitle}>
                    Next: {STATUS_LABEL[nextStep]}
                  </Txt>
                  <Txt variant="meta">You’ll get a notification</Txt>
                </View>
              </View>
            )}
          </View>

          <View style={styles.sentHeader}>
            <Txt variant="section">Sent to 311</Txt>
            {report.aiDraft !== '' && (
              <Badge
                label={edited ? 'Edited by you' : 'Written by AI'}
                bg={color.status.submitted.bg}
                fg={color.status.submitted.fg}
              />
            )}
          </View>
          <View style={styles.card}>
            <Txt variant="body">{report.description}</Txt>
            <Txt variant="secondary" style={styles.category}>
              <Txt variant="secondary" style={styles.bold}>
                {report.topic}
              </Txt>{' '}
              · {report.urgency} urgency
            </Txt>
            {edited && (
              <>
                <View style={styles.divider} />
                <Txt variant="meta">AI draft</Txt>
                <Txt variant="secondary">“{report.aiDraft}”</Txt>
              </>
            )}
          </View>

          <Txt variant="meta" style={styles.metaLine}>
            Report #{report.number} · Sent {stamp(report.createdAt)}
          </Txt>
        </View>
      </ScrollView>

      <Pressable onPress={() => router.back()} style={[styles.back, { top: insets.top + 8 }]} hitSlop={8}>
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M15 5l-7 7 7 7" stroke={color.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  photo: {
    height: PHOTO_HEIGHT,
    backgroundColor: color.tile,
  },
  photoFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: 'rgba(30,42,58,0.35)',
  },
  sheet: {
    marginTop: -24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: color.bg,
    paddingHorizontal: space.gutter,
    paddingTop: 24,
  },
  address: {
    marginTop: 2,
  },
  statusCard: {
    marginTop: 20,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: space.cardPadding,
    gap: 18,
  },
  statusHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  statusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  statusText: {
    flex: 1,
  },
  statusTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  statusSentence: {
    color: color.slate,
    marginTop: 2,
  },
  leafNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12,
  },
  leafText: {
    color: color.leaf.dark,
    fontSize: 14,
  },
  sectionTitle: {
    marginTop: space.sectionGap,
    marginBottom: 12,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.cardPadding,
  },
  update: {
    flexDirection: 'row',
    gap: 12,
  },
  updateRail: {
    alignItems: 'center',
    width: 36,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1.2,
    borderColor: '#E3DBCB',
    backgroundColor: color.surface,
  },
  cityAvatar: {
    backgroundColor: color.panel,
    borderColor: color.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextAvatar: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#D9CDB4',
    backgroundColor: 'transparent',
  },
  connector: {
    flex: 1,
    width: 1.5,
    minHeight: 14,
    marginVertical: 4,
    backgroundColor: '#E3DBCB',
  },
  connectorDashed: {
    backgroundColor: 'transparent',
    borderLeftWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D9CDB4',
  },
  updateBody: {
    flex: 1,
    paddingBottom: 18,
  },
  updateHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  updateWho: {
    flexShrink: 1,
  },
  updateText: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 21,
  },
  nextTitle: {
    color: color.mute,
    fontFamily: font.bodySemibold,
  },
  sentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: space.sectionGap,
    marginBottom: 12,
  },
  category: {
    marginTop: 14,
  },
  bold: {
    fontFamily: font.bodyBold,
    color: color.ink,
  },
  divider: {
    height: 1,
    backgroundColor: color.border,
    marginVertical: 14,
  },
  metaLine: {
    textAlign: 'center',
    marginTop: 16,
  },
  back: {
    position: 'absolute',
    left: space.gutter,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.ink,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
});
