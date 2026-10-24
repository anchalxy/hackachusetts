import { Image } from 'expo-image';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { clock, day, sentLabel, timelineDates } from '@/components/report/format';
import { topicInfo } from '@/constants/report-topics';
import type { MyReport } from '@/lib/my-reports';
import { photoSource } from '@/lib/report-photo';
import { Button, IconTile, Timeline } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius, useColors } from '@/ui/theme';

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
  const styles = useStyles();
  const latest = [...report.updates].reverse().find((u) => u.kind === 'city');
  const photo = photoSource(report.photoUri);
  return (
    <View>
      <View style={styles.header}>
        {photo ? (
          <Image source={{ uri: photo }} style={styles.photo} contentFit="cover" />
        ) : (
          <IconTile icon={topicInfo(report.topic).icon} size={64} />
        )}
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

      <View style={styles.timeline}>
        <Timeline status={report.status} dates={timelineDates(report)} />
      </View>

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

      <Button label="View report" onPress={onViewReport} style={styles.button} />
    </View>
  );
}

export function CloseButton({ onPress, light, size = 32 }: { onPress: () => void; light?: boolean; size?: number }) {
  const styles = useStyles();
  const color = useColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      style={[styles.close, { width: size, height: size, borderRadius: size / 2 }, light && styles.closeLight]}>
      <Svg width={14} height={14} viewBox="0 0 14 14">
        <Path d="M2 2l10 10M12 2L2 12" stroke={light ? '#FFFFFF' : color.ink} strokeWidth={2} strokeLinecap="round" />
      </Svg>
    </Pressable>
  );
}

const useStyles = makeStyles((color) => ({
  header: {
    flexDirection: 'row',
    gap: 16,
  },
  photo: {
    width: 64,
    height: 64,
    borderRadius: radius.heroTile,
    backgroundColor: color.tile,
  },
  timeline: {
    marginTop: 26,
  },
  button: {
    marginTop: 14,
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
    marginTop: 14,
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
}));
