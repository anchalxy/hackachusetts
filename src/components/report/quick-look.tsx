import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { clock, day, sentLabel, timelineDates } from '@/components/report/format';
import { topicInfo } from '@/constants/report-topics';
import type { MyReport } from '@/lib/my-reports';
import { Button, IconTile, Timeline } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

/** Tap a pin → this replaces the peek content (DESIGN.md 6c "Quick look"). */
export function QuickLook({
  report,
  onClose,
  onViewReport,
}: {
  report: MyReport;
  onClose: () => void;
  onViewReport: () => void;
}) {
  const latest = [...report.updates].reverse().find((u) => u.kind === 'city');
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconTile icon={topicInfo(report.topic).icon} size={64} />
        <View style={styles.headerText}>
          <Txt variant="title" numberOfLines={2}>
            {report.title}
          </Txt>
          <Txt variant="secondary" numberOfLines={1}>
            {report.address}
          </Txt>
          <Txt variant="secondary" style={styles.mute}>
            {sentLabel(report.createdAt)}
          </Txt>
        </View>
        <CloseButton onPress={onClose} />
      </View>

      <Timeline status={report.status} dates={timelineDates(report)} />

      {latest && (
        <View style={styles.update}>
          <View style={styles.updateIcon}>
            <Icon name="cityhall" size={22} />
          </View>
          <View style={styles.updateText}>
            <Txt variant="row" numberOfLines={1}>
              <Txt variant="row" style={styles.bold}>
                {latest.who}
              </Txt>
              <Txt variant="row" style={styles.mute}>
                {' '}
                · {day(latest.at) === 'Today' ? clock(latest.at) : day(latest.at)}
              </Txt>
            </Txt>
            <Txt variant="row" numberOfLines={2} style={styles.slate}>
              {latest.text}
            </Txt>
          </View>
        </View>
      )}

      <Button label="View report" onPress={onViewReport} />
    </View>
  );
}

export function CloseButton({ onPress, light }: { onPress: () => void; light?: boolean }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={[styles.close, light && styles.closeLight]}>
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Path d="M2 2l10 10M12 2L2 12" stroke={light ? '#FFFFFF' : color.ink} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 2,
    paddingTop: 2,
  },
  mute: {
    color: color.mute,
  },
  slate: {
    color: color.slate,
  },
  bold: {
    fontFamily: font.bodyBold,
  },
  update: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    backgroundColor: color.panel,
    borderRadius: 16,
    padding: 14,
  },
  updateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateText: {
    flex: 1,
    gap: 2,
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLight: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
