import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Alert, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, { type LatLng, type Region } from 'react-native-maps';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedRef,
  useAnimatedScrollHandler,
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
import { exampleCenter, resetReports, seedExampleReports, seedExamplesOnce, seedInProgressCases } from '@/lib/dev-seed';
import {
  getMyReports,
  isOnMap,
  onMyReportsChange,
  refreshMyReportsFrom311,
  sortReports,
  type MyReport,
} from '@/lib/my-reports';
import { useLeafBalance } from '@/lib/rewards';
import { LeafPill } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { BottomTabInset, font, makeStyles, space, useColors } from '@/ui/theme';

const BOSTON: Region = { latitude: 42.3601, longitude: -71.0589, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const NEARBY = { latitudeDelta: 0.02, longitudeDelta: 0.02 };

type Mode = 'peek' | 'quick' | 'full';
const SPRING = { damping: 22, stiffness: 220, mass: 0.9 }; // ≈ tokens.motion.sheetSpringMs (350ms)
const HANDLE_HEIGHT = 29;
/** Space between the panel's content and the top of the tab bar. */
const CONTENT_BOTTOM = 12;
/** "Open" / "Done" title rows, a fixed height so the peek height can be worked out. */
const SECTION_TITLE = 40;
/** A report saved this recently is "the one you just sent": the map pans to it. */
const JUST_SENT_MS = 5 * 60 * 1000;

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const { height: screenHeight } = useWindowDimensions();
  const mapRef = useRef<MapView>(null);
  const regionRef = useRef<Region>(BOSTON);
  const newestSeen = useRef<string | null | undefined>(undefined);
  const centered = useRef(false);

  const [reports, setReports] = useState<MyReport[]>([]);
  const leaves = useLeafBalance();
  const [mode, setMode] = useState<Mode>('peek');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  // Measured heights, so the panel always fits what it shows.
  const [measured, setMeasured] = useState({ header: 52, quick: 330, empty: 80 });
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const granted = permission?.granted ?? false;

  const { open, done } = sortReports(reports);
  const sections = [
    { title: 'Open', reports: open },
    { title: 'Done', reports: done },
  ].filter((s) => s.reports.length > 0);

  // The panel runs under the tab bar, so its content sits above it.
  const tabSpace = BottomTabInset + insets.bottom;
  // Fully up, the panel leaves a strip of map showing under the status bar (design: ~150pt).
  const panelHeight = screenHeight - insets.top - 88;
  // Peek shows the summary and your latest report (DESIGN.md 6c); drag up for the rest.
  const peekList = reports.length === 0 ? measured.empty : SECTION_TITLE + space.rowHeight;
  const visible = {
    peek: HANDLE_HEIGHT + measured.header + peekList + CONTENT_BOTTOM + tabSpace,
    quick: HANDLE_HEIGHT + measured.quick + CONTENT_BOTTOM + tabSpace,
  };
  const offsets: Record<Mode, number> = {
    peek: Math.max(0, panelHeight - visible.peek),
    quick: Math.max(0, panelHeight - visible.quick),
    full: 0,
  };
  const translateY = useSharedValue(offsets.peek);
  const scrollY = useSharedValue(0);
  const listRef = useAnimatedRef<Animated.ScrollView>();

  function snapTo(next: Mode) {
    translateY.set(withSpring(offsets[next], SPRING));
    setMode(next);
    if (next !== 'quick') setSelectedId(null);
    // Below full the list can't scroll, so it always shows from the top (latest report first).
    if (next !== 'full') {
      listRef.current?.scrollTo({ y: 0, animated: false });
      scrollY.set(0);
    }
  }

  // Re-target when the current mode's content changes size (reports added, quick look measured).
  const target = offsets[mode];
  useEffect(() => {
    translateY.set(withSpring(target, SPRING));
  }, [target, translateY]);

  const measure = (key: keyof typeof measured) => (height: number) =>
    setMeasured((current) => (Math.abs(current[key] - height) < 1 ? current : { ...current, [key]: height }));

  const showReports = useCallback((saved: MyReport[]) => {
    setReports(saved);
    // Just sent one: show it on the map.
    const newest = saved.reduce<MyReport | undefined>((a, r) => (!a || r.createdAt > a.createdAt ? r : a), undefined);
    const justSent = newest && newest.id !== newestSeen.current && Date.now() - newest.createdAt < JUST_SENT_MS;
    if (newestSeen.current !== undefined && justSent) {
      mapRef.current?.animateToRegion({ latitude: newest.latitude, longitude: newest.longitude, ...NEARBY });
    }
    newestSeen.current = newest?.id ?? null;
  }, []);

  // Any save anywhere (sending a report, a 311 sync on another tab) updates the list right away.
  useEffect(() => onMyReportsChange(() => getMyReports().then(showReports)), [showReports]);

  // Every time the tab opens: show saved reports, then pull fresh statuses from 311.
  useFocusEffect(
    useCallback(() => {
      (async () => {
        await seedExamplesOnce().catch(() => false);
        showReports(await getMyReports());
        await refreshMyReportsFrom311().catch(() => null); // offline: keep the last known statuses
      })();
    }, [showReports]),
  );

  // Ask for location once on first visit, then start the map on the user (the system blue dot).
  useEffect(() => {
    if (permission?.status === 'undetermined' && permission.canAskAgain) requestPermission();
  }, [permission, requestPermission]);

  function centerOn(coords: LatLng) {
    if (centered.current) return;
    centered.current = true;
    mapRef.current?.animateToRegion({ latitude: coords.latitude, longitude: coords.longitude, ...NEARBY });
  }

  // The map ignores camera moves until it's ready, so wait for both the map and a location.
  useEffect(() => {
    if (!granted || !mapReady) return;
    (async () => {
      const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync());
      centerOn(position.coords);
    })().catch(() => {});
  }, [granted, mapReady]);

  /** The locate button: back to where you are (asks for location first if it hasn't been allowed). */
  async function locate() {
    if (!granted) {
      const result = await requestPermission();
      if (!result.granted) return;
    }
    const position = (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync());
    mapRef.current?.animateToRegion({ latitude: position.coords.latitude, longitude: position.coords.longitude, ...NEARBY });
  }

  function onPinPress(report: MyReport) {
    setSelectedId(report.id);
    snapTo('quick');
    // Only pan if the raised panel would cover the pin; then center it in the map that's left.
    const region = regionRef.current;
    const pinY = (0.5 - (report.latitude - region.latitude) / region.latitudeDelta) * screenHeight;
    const panelTop = screenHeight - visible.quick;
    const pinHeight = 90;
    if (pinY < panelTop - 16 && pinY - pinHeight > insets.top + 50) return;
    const wantY = (insets.top + 50 + panelTop) / 2 + pinHeight / 2;
    mapRef.current?.animateToRegion({
      ...region,
      latitude: report.latitude - (0.5 - wantY / screenHeight) * region.latitudeDelta,
      longitude: report.longitude,
    });
  }

  const openReport = (id: string) => router.push({ pathname: '/report/[id]', params: { id } });

  // Hidden dev menu for the demo (DESIGN.md 6b): long-press the leaf pill.
  function devMenu() {
    if (!__DEV__) return;
    Alert.alert('Dev menu', undefined, [
      {
        text: 'Add example reports (every stage)',
        onPress: async () => {
          const seeded = await seedExampleReports(await exampleCenter());
          mapRef.current?.fitToCoordinates(seeded, {
            edgePadding: { top: 140, right: 60, bottom: 300, left: 60 },
            animated: true,
          });
        },
      },
      {
        text: 'Follow 3 live 311 cases',
        onPress: async () => {
          const seeded = await seedInProgressCases();
          mapRef.current?.fitToCoordinates(seeded, {
            edgePadding: { top: 140, right: 60, bottom: 260, left: 60 },
            animated: true,
          });
          // Saved as Submitted; the sync should move them to Approved.
          setTimeout(() => refreshMyReportsFrom311().catch(() => null), 1500);
        },
      },
      { text: 'Sync with 311 now', onPress: () => refreshMyReportsFrom311().catch(() => null) },
      {
        text: 'Reset my reports',
        style: 'destructive',
        onPress: async () => {
          await resetReports();
          setReports([]);
          snapTo('peek');
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const pins = reports.filter((r) => isOnMap(r));
  const fixedCount = reports.filter((r) => r.status === 'fixed').length;
  const selected = reports.find((r) => r.id === selectedId);
  const quick = mode === 'quick' && selected;

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={BOSTON}
        mapType="mutedStandard"
        userInterfaceStyle="light"
        showsPointsOfInterests={false}
        showsUserLocation={granted}
        showsMyLocationButton={false}
        showsCompass={false}
        onMapReady={() => setMapReady(true)}
        onUserLocationChange={(e) => e.nativeEvent.coordinate && centerOn(e.nativeEvent.coordinate)}
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

      {/* Always shown, never faded: when the panel rises it simply slides over them. */}
      <MapActions
        bottom={visible.peek + 14}
        onReport={() => router.push('/new-report')}
        onLocate={() => locate().catch(() => {})}
      />

      <Scrim translateY={translateY} from={offsets.peek} active={mode === 'full'} onPress={() => snapTo('peek')} />

      {/* Top right, like the leaf pill on the other tabs. */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <LeafPill amount={leaves} onPress={() => router.navigate('/rewards')} onLongPress={devMenu} />
      </View>

      <Panel
        height={panelHeight}
        translateY={translateY}
        scrollY={scrollY}
        listRef={listRef}
        offsets={offsets}
        mode={mode}
        onSnap={snapTo}
        listBottom={tabSpace + 24}
        header={
          !quick && (
            <Pressable
              style={styles.header}
              onPress={() => snapTo(mode === 'full' ? 'peek' : 'full')}
              onLayout={(e) => measure('header')(e.nativeEvent.layout.height)}>
              <View style={styles.titleRow}>
                <Txt variant="title">Your reports</Txt>
                <Txt variant="body" style={styles.slate}>
                  <Txt variant="body" style={styles.count}>{open.length}</Txt> open ·{' '}
                  <Txt variant="body" style={styles.count}>{fixedCount}</Txt> fixed
                </Txt>
              </View>
              <View style={styles.divider} />
            </Pressable>
          )
        }
        list={
          reports.length === 0 ? (
            <View onLayout={(e) => measure('empty')(e.nativeEvent.layout.height)}>
              <EmptyState />
            </View>
          ) : (
            sections.map((section, i) => (
              <View key={section.title} style={i > 0 && styles.sectionGap}>
                <View style={styles.sectionTitle}>
                  <Txt variant="section">{section.title}</Txt>
                </View>
                {section.reports.map((report, j) => (
                  <ReportRow
                    key={report.id}
                    report={report}
                    onPress={() => openReport(report.id)}
                    divider={j < section.reports.length - 1}
                  />
                ))}
              </View>
            ))
          )
        }>
        {quick && (
          <View key={selected.id} onLayout={(e) => measure('quick')(e.nativeEvent.layout.height)}>
            <QuickLook report={selected} onClose={() => snapTo('peek')} onViewReport={() => openReport(selected.id)} />
          </View>
        )}
      </Panel>
    </View>
  );
}

function EmptyState() {
  const styles = useStyles();
  return (
    <View style={styles.empty}>
      <Txt variant="rowLead">No reports yet</Txt>
      <Txt variant="secondary">Snap a pothole, a broken light or a faded crosswalk and we’ll send it to 311.</Txt>
    </View>
  );
}

/**
 * Bottom panel, dragged from anywhere on it (Apple Maps style). In peek the list moves with the
 * panel; fully up, the list scrolls, and dragging down from its top lowers the panel again.
 * Every drag ends on a snap point, so the panel never rests halfway.
 * A pin tap swaps the list for the quick look (`children`).
 */
function Panel({
  height,
  translateY,
  scrollY,
  listRef,
  offsets,
  mode,
  onSnap,
  listBottom,
  header,
  list,
  children,
}: {
  height: number;
  translateY: SharedValue<number>;
  scrollY: SharedValue<number>;
  listRef: ReturnType<typeof useAnimatedRef<Animated.ScrollView>>;
  offsets: Record<Mode, number>;
  mode: Mode;
  onSnap: (mode: Mode) => void;
  listBottom: number;
  header: ReactNode;
  list: ReactNode;
  children: ReactNode;
}) {
  const styles = useStyles();
  const start = useSharedValue(0);
  // Fully up, a drag that starts on a scrolled list belongs to the list until it's back at the top.
  const listOwns = useSharedValue(false);
  const scroll = Gesture.Native();
  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .simultaneousWithExternalGesture(scroll)
    .onStart((e) => {
      start.set(translateY.get());
      listOwns.set(mode === 'full' && scrollY.get() > 0 && e.y > HANDLE_HEIGHT + 60);
    })
    .onUpdate((e) => {
      if (listOwns.get() && scrollY.get() > 0) {
        // Keep the panel where it is while the list scrolls; pick up from here once it hits the top.
        start.set(translateY.get() - e.translationY);
        return;
      }
      translateY.set(Math.min(offsets.peek + 40, Math.max(0, start.get() + e.translationY)));
    })
    .onEnd((e) => {
      if (listOwns.get() && scrollY.get() > 0) {
        runOnJS(onSnap)('full');
        return;
      }
      const projected = translateY.get() + e.velocityY * 0.12;
      const candidates: Mode[] = mode === 'quick' ? ['peek', 'quick', 'full'] : ['peek', 'full'];
      let snap: Mode = candidates[0];
      for (const c of candidates) {
        if (Math.abs(offsets[c] - projected) < Math.abs(offsets[snap] - projected)) snap = c;
      }
      runOnJS(onSnap)(snap);
    });

  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.set(e.contentOffset.y);
  });
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.get() }] }));

  return (
    <Animated.View style={[styles.panel, { height }, style]}>
      <GestureDetector gesture={pan}>
        <View style={styles.flex}>
          <View style={styles.handleArea}>
            <View style={styles.handle} />
          </View>
          {header}
          {mode === 'quick' ? (
            <View style={styles.panelBody}>{children}</View>
          ) : (
            <GestureDetector gesture={scroll}>
              <Animated.ScrollView
                ref={listRef}
                style={styles.flex}
                contentContainerStyle={[styles.panelBody, { paddingBottom: listBottom }]}
                scrollEnabled={mode === 'full'}
                bounces={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}>
                {list}
              </Animated.ScrollView>
            </GestureDetector>
          )}
        </View>
      </GestureDetector>
    </Animated.View>
  );
}

/**
 * "Report an issue" and the locate button, on one row above the peek panel (DESIGN.md 6c). They
 * sit under the panel, so raising it covers them and lowering it shows them again; no fading.
 */
function MapActions({ bottom, onReport, onLocate }: { bottom: number; onReport: () => void; onLocate: () => void }) {
  const styles = useStyles();
  const color = useColors();
  return (
    <View style={[styles.actions, { bottom }]} pointerEvents="box-none">
      <Pressable onPress={onReport} style={({ pressed }) => [styles.reportButton, pressed && styles.pressed]}>
        <View style={styles.reportIcon}>
          <Icon name="camera" size={26} />
        </View>
        <Txt variant="button" style={styles.reportLabel}>
          Report an issue
        </Txt>
      </Pressable>
      <Pressable
        onPress={onLocate}
        accessibilityRole="button"
        accessibilityLabel="Show my location"
        style={({ pressed }) => [styles.locate, pressed && styles.pressed]}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M20.5 3.5 3.6 10.6c-.8.3-.7 1.5.1 1.7l6.6 1.4 1.4 6.6c.2.8 1.4.9 1.7.1z" fill={color.primary} />
        </Svg>
      </Pressable>
    </View>
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
  const styles = useStyles();
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(translateY.get(), [0, from], [0.14, 0], 'clamp'),
  }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, style]} pointerEvents={active ? 'auto' : 'none'}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onPress} />
    </Animated.View>
  );
}

// Shadows and the scrim are navy ink in light; in dark the ink is light, so they go black.
const useStyles = makeStyles((color, dark) => ({
  container: {
    flex: 1,
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    position: 'absolute',
    right: space.gutter,
  },
  scrim: {
    backgroundColor: dark ? '#000000' : color.ink,
  },
  // The report button is centered; the locate button sits at the right edge of the same row.
  actions: {
    position: 'absolute',
    left: space.gutter,
    right: space.gutter,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: dark ? '#000000' : color.ink,
    shadowOpacity: dark ? 0.35 : 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
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
    shadowColor: dark ? '#000000' : color.ink,
    shadowOpacity: dark ? 0.4 : 0.18,
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
    shadowColor: dark ? '#000000' : color.ink,
    shadowOpacity: dark ? 0.3 : 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
  },
  handleArea: {
    height: HANDLE_HEIGHT,
    alignItems: 'center',
    paddingTop: 10,
  },
  handle: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: dark ? '#3A434F' : '#DCD3C2',
  },
  panelBody: {
    paddingHorizontal: space.gutter,
  },
  header: {
    paddingHorizontal: space.gutter,
    paddingTop: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingBottom: 14,
  },
  divider: {
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
  sectionTitle: {
    height: SECTION_TITLE,
    justifyContent: 'flex-end',
    paddingBottom: 2,
  },
  sectionGap: {
    marginTop: space.sectionGap - 10,
  },
  empty: {
    gap: 4,
    paddingVertical: 16,
  },
}));
