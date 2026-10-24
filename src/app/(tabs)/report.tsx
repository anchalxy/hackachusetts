import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, { type Region } from 'react-native-maps';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { QuickLook } from '@/components/report/quick-look';
import { ReportPin } from '@/components/report/report-pin';
import { ReportRow } from '@/components/report/report-row';
import { BottomTabInset } from '@/constants/theme';
import { resetReports, seedInProgressCases } from '@/lib/dev-seed';
import { getMyReports, isOnMap, isOpen, refreshMyReportsFrom311, type MyReport } from '@/lib/my-reports';
import { getProfile, SEED_PROFILE } from '@/lib/profile';
import { LeafPill } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, space } from '@/ui/theme';

const BOSTON: Region = { latitude: 42.3601, longitude: -71.0589, latitudeDelta: 0.08, longitudeDelta: 0.08 };

type Mode = 'peek' | 'quick' | 'full';
const SPRING = { damping: 22, stiffness: 220, mass: 0.9 }; // ≈ tokens.motion.sheetSpringMs (350ms)

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(BOSTON);

  const [reports, setReports] = useState<MyReport[]>([]);
  const [leaves, setLeaves] = useState(SEED_PROFILE.leaves);
  const [mode, setMode] = useState<Mode>('peek');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const granted = permission?.granted ?? false;

  // The panel runs under the floating tab bar, so its content is padded above it.
  const tabSpace = BottomTabInset + insets.bottom + 12;
  const panelHeight = screenHeight - insets.top - 24;
  const offsets: Record<Mode, number> = {
    peek: panelHeight - (158 + tabSpace),
    quick: panelHeight - (420 + tabSpace),
    full: 0,
  };
  const translateY = useSharedValue(offsets.peek);

  function snapTo(next: Mode) {
    translateY.set(withSpring(offsets[next], SPRING));
    setMode(next);
    if (next !== 'quick') setSelectedId(null);
  }

  // Show saved reports right away, then pull fresh statuses from 311 (every time the tab opens).
  useFocusEffect(
    useCallback(() => {
      let active = true;
      getMyReports().then((saved) => active && setReports(saved));
      getProfile().then((p) => active && setLeaves(p.leaves));
      refreshMyReportsFrom311()
        .then((fresh) => active && setReports(fresh))
        .catch(() => {}); // offline: keep last known statuses
      return () => {
        active = false;
      };
    }, []),
  );

  async function centerOnUser() {
    const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync());
    mapRef.current?.animateToRegion({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  }

  // Ask for location once on first visit; afterwards the locate button handles it.
  useEffect(() => {
    if (permission?.status === 'undetermined' && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  useEffect(() => {
    if (granted) centerOnUser();
  }, [granted]);

  function onLocatePress() {
    if (granted) return centerOnUser();
    if (permission?.canAskAgain) return requestPermission();
    Linking.openSettings();
  }

  function onPinPress(report: MyReport) {
    setSelectedId(report.id);
    snapTo('quick');
    // Keep the pin visible above the raised panel.
    const region = regionRef.current;
    mapRef.current?.animateToRegion({
      ...region,
      latitude: report.latitude - region.latitudeDelta * 0.22,
      longitude: report.longitude,
    });
  }

  const openReport = (id: string) => router.push({ pathname: '/report/[id]', params: { id } });

  // Hidden dev menu for the demo (DESIGN.md 6b): long-press the leaf pill.
  function devMenu() {
    if (!__DEV__) return;
    Alert.alert('Dev menu', undefined, [
      {
        text: 'Follow 3 live 311 cases',
        onPress: async () => {
          const seeded = await seedInProgressCases();
          setReports(await getMyReports());
          mapRef.current?.fitToCoordinates(seeded, {
            edgePadding: { top: 140, right: 60, bottom: 260, left: 60 },
            animated: true,
          });
          // Saved as Submitted; the sync should move them to Approved.
          setTimeout(async () => setReports(await refreshMyReportsFrom311()), 1500);
        },
      },
      { text: 'Sync with 311 now', onPress: async () => setReports(await refreshMyReportsFrom311()) },
      {
        text: 'Reset my reports',
        style: 'destructive',
        onPress: async () => {
          await resetReports();
          setReports([]);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const pins = reports.filter((r) => isOnMap(r));
  const open = reports.filter(isOpen);
  const done = reports.filter((r) => !isOpen(r));
  const fixedCount = reports.filter((r) => r.status === 'fixed').length;
  const selected = reports.find((r) => r.id === selectedId);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={BOSTON}
        mapType="mutedStandard"
        showsPointsOfInterests={false}
        showsUserLocation={granted}
        showsMyLocationButton={false}
        showsCompass={false}
        onRegionChangeComplete={(region) => (regionRef.current = region)}
        onPress={() => mode === 'quick' && snapTo('peek')}>
        {pins.map((report) => (
          <ReportPin
            key={report.id}
            report={report}
            selected={report.id === selectedId}
            dimmed={mode === 'quick' && report.id !== selectedId}
            onPress={() => onPinPress(report)}
          />
        ))}
      </MapView>

      <Scrim translateY={translateY} from={offsets.peek} active={mode === 'full'} onPress={() => snapTo('peek')} />

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <LeafPill amount={leaves} onLongPress={devMenu} />
      </View>

      <FloatingActions
        translateY={translateY}
        peekOffset={offsets.peek}
        bottom={158 + tabSpace + 14}
        onReport={() => router.push('/new-report')}
        onLocate={onLocatePress}
      />

      <Panel height={panelHeight} translateY={translateY} offsets={offsets} mode={mode} onSnap={snapTo}>
        {mode === 'quick' && selected ? (
          <QuickLook report={selected} onClose={() => snapTo('peek')} onViewReport={() => openReport(selected.id)} />
        ) : mode === 'full' ? (
          <ScrollView contentContainerStyle={{ paddingBottom: tabSpace + 24 }} showsVerticalScrollIndicator={false}>
            <Txt variant="title" style={styles.fullTitle}>
              Your reports
            </Txt>
            <Txt variant="secondary">
              <Txt variant="secondary" style={styles.count}>{open.length}</Txt> open ·{' '}
              <Txt variant="secondary" style={styles.count}>{fixedCount}</Txt> fixed ·{' '}
              <Txt variant="secondary" style={styles.count}>{reports.length}</Txt> all time
            </Txt>
            {reports.length === 0 && <EmptyState />}
            {open.length > 0 && <Section title="Open" reports={open} onOpen={openReport} />}
            {done.length > 0 && <Section title="Done" reports={done} onOpen={openReport} />}
          </ScrollView>
        ) : (
          <View>
            <Pressable style={styles.peekHeader} onPress={() => snapTo('full')}>
              <Txt variant="title">Your reports</Txt>
              <Txt variant="body" style={styles.slate}>
                <Txt variant="body" style={styles.count}>{open.length}</Txt> open ·{' '}
                <Txt variant="body" style={styles.count}>{fixedCount}</Txt> fixed
              </Txt>
            </Pressable>
            <View style={styles.peekDivider} />
            {reports[0] ? (
              <ReportRow report={reports[0]} onPress={() => openReport(reports[0].id)} divider={false} />
            ) : (
              <EmptyState />
            )}
          </View>
        )}
      </Panel>
    </View>
  );
}

function Section({ title, reports, onOpen }: { title: string; reports: MyReport[]; onOpen: (id: string) => void }) {
  return (
    <View style={styles.section}>
      <Txt variant="section" style={styles.sectionTitle}>
        {title}
      </Txt>
      {reports.map((report, i) => (
        <ReportRow key={report.id} report={report} onPress={() => onOpen(report.id)} divider={i < reports.length - 1} />
      ))}
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Txt variant="rowLead">No reports yet</Txt>
      <Txt variant="secondary">Snap a pothole, a broken light or a faded crosswalk and we’ll send it to 311.</Txt>
    </View>
  );
}

/** Bottom panel: drag the handle between peek and the full list; a pin tap opens the quick look. */
function Panel({
  height,
  translateY,
  offsets,
  mode,
  onSnap,
  children,
}: {
  height: number;
  translateY: SharedValue<number>;
  offsets: Record<Mode, number>;
  mode: Mode;
  onSnap: (mode: Mode) => void;
  children: ReactNode;
}) {
  const start = useSharedValue(0);
  const pan = Gesture.Pan()
    .onStart(() => {
      start.set(translateY.get());
    })
    .onUpdate((e) => {
      translateY.set(Math.min(offsets.peek + 40, Math.max(0, start.get() + e.translationY)));
    })
    .onEnd((e) => {
      const projected = translateY.get() + e.velocityY * 0.12;
      const candidates: Mode[] = mode === 'quick' ? ['peek', 'quick', 'full'] : ['peek', 'full'];
      let target: Mode = candidates[0];
      for (const c of candidates) {
        if (Math.abs(offsets[c] - projected) < Math.abs(offsets[target] - projected)) target = c;
      }
      runOnJS(onSnap)(target);
    });

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  return (
    <Animated.View style={[styles.panel, { height }, style]}>
      <GestureDetector gesture={pan}>
        <View style={styles.handleArea}>
          <View style={styles.handle} />
        </View>
      </GestureDetector>
      <View style={styles.panelBody}>{children}</View>
    </Animated.View>
  );
}

/** "Report an issue" + locate float above the peek panel and slide away when it rises. */
function FloatingActions({
  translateY,
  peekOffset,
  bottom,
  onReport,
  onLocate,
}: {
  translateY: SharedValue<number>;
  peekOffset: number;
  bottom: number;
  onReport: () => void;
  onLocate: () => void;
}) {
  const style = useAnimatedStyle(() => {
    const progress = interpolate(translateY.get(), [peekOffset - 120, peekOffset], [0, 1], 'clamp');
    return { opacity: progress, transform: [{ translateY: (1 - progress) * 40 }] };
  });
  return (
    <Animated.View style={[styles.actions, { bottom }, style]} pointerEvents="box-none">
      <Pressable onPress={onReport} style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}>
        <View style={styles.reportIcon}>
          <Icon name="camera" size={26} />
        </View>
        <Txt variant="button" style={styles.reportLabel}>
          Report an issue
        </Txt>
      </Pressable>
      <Pressable onPress={onLocate} style={({ pressed }) => [styles.locate, pressed && styles.pressed]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M3 11l18-8-8 18-2-8-8-2z" fill={color.primary} stroke={color.primary} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </Animated.View>
  );
}

/** 14% ink over the map while the full list is up; tapping it lowers the panel. */
function Scrim({
  translateY,
  from,
  active,
  onPress,
}: {
  translateY: SharedValue<number>;
  from: number;
  active: boolean;
  onPress: () => void;
}) {
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, from], [0.14, 0], 'clamp'),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, style]} pointerEvents={active ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  topBar: {
    position: 'absolute',
    left: space.gutter,
  },
  scrim: {
    backgroundColor: color.ink,
  },
  actions: {
    position: 'absolute',
    left: space.gutter,
    right: space.gutter,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    height: 54,
    paddingLeft: 7,
    paddingRight: 24,
    borderRadius: 27,
    backgroundColor: color.primary,
    shadowColor: color.ink,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportLabel: {
    fontSize: 17,
  },
  locate: {
    position: 'absolute',
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.surface,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: color.ink,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  pressed: {
    opacity: 0.85,
  },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: color.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    // Soft layered shadow, never a hard band (DESIGN.md 6c).
    shadowColor: color.ink,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
  },
  handleArea: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 14,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DCD3C2',
  },
  panelBody: {
    flex: 1,
    paddingHorizontal: space.gutter,
  },
  peekHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  peekDivider: {
    height: 1,
    backgroundColor: color.border,
  },
  count: {
    color: color.ink,
    fontFamily: font.bodyBold,
  },
  slate: {
    color: color.slate,
  },
  fullTitle: {
    fontSize: 28,
    lineHeight: 34,
    marginBottom: 4,
  },
  section: {
    marginTop: space.sectionGap,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  empty: {
    gap: 4,
    paddingVertical: 16,
  },
});
