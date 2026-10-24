import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { topicInfo } from '@/constants/report-topics';
import type { MyReport } from '@/lib/my-reports';
import { StatusGlyph } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { color } from '@/ui/theme';

const SIZE = 62;

/**
 * Your report on the map (DESIGN.md 6c): the photo inside a white gap and a status-colored
 * ring, a short tail, a soft ground shadow, and a status dot with a white glyph at 1–2 o'clock.
 * Reports without a photo (seeded / followed cases) show their category icon instead.
 */
export function ReportPin({
  report,
  selected,
  dimmed,
  onPress,
}: {
  report: MyReport;
  selected: boolean;
  dimmed: boolean;
  onPress: () => void;
}) {
  const ring = color.status[report.status].ring;
  // Custom marker views are snapshotted; keep tracking until the photo/SVG for this look has drawn.
  const look = `${report.status}|${report.photoUri}|${selected}|${dimmed}`;
  const [drawnLook, setDrawnLook] = useState<string | null>(null);
  const tracks = drawnLook !== look;
  useEffect(() => {
    const timer = setTimeout(() => setDrawnLook(look), 800);
    return () => clearTimeout(timer);
  }, [look]);

  const scale = selected ? 1.25 : 1;
  return (
    <Marker
      coordinate={{ latitude: report.latitude, longitude: report.longitude }}
      anchor={{ x: 0.5, y: 1 }}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}
      tracksViewChanges={tracks}
      zIndex={selected ? 10 : 1}>
      <View style={[styles.wrap, { transform: [{ scale }] }, dimmed && styles.dimmed]}>
        <View style={[styles.ring, { borderColor: ring }]}>
          <View style={styles.inner}>
            {report.photoUri ? (
              <Image source={{ uri: report.photoUri }} style={styles.photo} contentFit="cover" />
            ) : (
              <View style={styles.iconFill}>
                <Icon name={topicInfo(report.topic).icon} size={34} />
              </View>
            )}
          </View>
        </View>
        <View style={[styles.tail, { borderTopColor: ring }]} />
        <View style={styles.shadow} />
        <View style={[styles.statusDot, { backgroundColor: ring }]}>
          <StatusGlyph status={report.status} size={12} />
        </View>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE + 12,
    height: SIZE + 22,
    alignItems: 'center',
    paddingTop: 6,
  },
  dimmed: {
    opacity: 0.45,
  },
  ring: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 4,
    backgroundColor: color.surface,
    padding: 3,
  },
  inner: {
    flex: 1,
    borderRadius: SIZE / 2,
    overflow: 'hidden',
  },
  photo: {
    flex: 1,
  },
  iconFill: {
    flex: 1,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tail: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 7,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  shadow: {
    width: 22,
    height: 6,
    borderRadius: 3,
    marginTop: 2,
    backgroundColor: 'rgba(30,42,58,0.16)',
  },
  statusDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
    borderColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
