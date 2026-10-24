import { useEffect, useState } from 'react';
import { Image, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { topicInfo } from '@/constants/report-topics';
import type { MyReport } from '@/lib/my-reports';
import { photoSource } from '@/lib/report-photo';
import { StatusGlyph } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { makeStyles, useColors, useScheme } from '@/ui/theme';

const SIZE = 62;

/**
 * Your report on the map (DESIGN.md 6c): the photo inside a white gap and a status-colored
 * ring, a short tail, a soft ground shadow, and a status dot with a white glyph at 1–2 o'clock.
 * Reports without a photo (seeded / followed cases) show their category icon instead.
 * The photo is a plain RN Image: map annotations snapshot their view, and RN Image reliably
 * reports when it has drawn so we can stop tracking.
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
  const styles = useStyles();
  const color = useColors();
  const scheme = useScheme();
  const ring = color.status[report.status].ring;
  const photo = photoSource(report.photoUri);
  const [photoFailed, setPhotoFailed] = useState(false);
  const showPhoto = Boolean(photo) && !photoFailed;

  // Custom marker views are snapshotted: keep tracking until this look (and its photo) has drawn.
  const look = `${report.status}|${photo}|${selected}|${dimmed}|${photoFailed}|${scheme}`;
  const [drawnLook, setDrawnLook] = useState<string | null>(null);
  const [loadedPhoto, setLoadedPhoto] = useState<string | null>(null);
  const ready = !showPhoto || loadedPhoto === photo;
  const tracks = drawnLook !== look;
  useEffect(() => {
    if (!ready) return;
    // A beat after the last change so the redraw lands in the snapshot.
    const timer = setTimeout(() => setDrawnLook(look), 300);
    return () => clearTimeout(timer);
  }, [look, ready]);

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
            {showPhoto ? (
              <Image
                source={{ uri: photo }}
                style={styles.photo}
                resizeMode="cover"
                onLoad={() => setLoadedPhoto(photo ?? null)}
                onError={() => setPhotoFailed(true)}
              />
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

const useStyles = makeStyles((color, dark) => ({
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
    backgroundColor: dark ? 'rgba(0,0,0,0.4)' : 'rgba(30,42,58,0.16)',
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
}));
