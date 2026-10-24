import * as Location from 'expo-location';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useBoston311 } from '@/hooks/use-boston-311';
import type { Case311 } from '@/lib/boston-311';
import { getMyReports, type MyReport, type ReportStatus } from '@/lib/my-reports';

const BOSTON: Region = {
  latitude: 42.3601,
  longitude: -71.0589,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  submitted: '#E5484D',
  inReview: '#F5C518',
  inProgress: '#30A46C',
  rejected: '#8B8D98',
};

const LEGEND: { status: ReportStatus; label: string }[] = [
  { status: 'submitted', label: 'Not reviewed' },
  { status: 'inReview', label: 'In review' },
  { status: 'inProgress', label: 'In progress' },
  { status: 'rejected', label: 'Rejected' },
];

function summarize(cases: Case311[]) {
  const counts = new Map<string, number>();
  for (const c of cases) counts.set(c.case_topic, (counts.get(c.case_topic) ?? 0) + 1);
  const [topTopic] = [...counts].sort((a, b) => b[1] - a[1])[0] ?? [];
  const inProgress = cases.filter((c) => c.case_status === 'In progress').length;
  return `Boston 311 today: ${inProgress} of ${cases.length} latest cases in progress · most common: ${topTopic}`;
}

export default function ReportScreen() {
  const { data: city } = useBoston311();
  const cityStat = city && city.cases.length > 0 ? summarize(city.cases) : null;
  const mapRef = useRef<MapView>(null);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const granted = permission?.granted ?? false;
  const [reports, setReports] = useState<MyReport[]>([]);

  // Reload when coming back from the new-report flow.
  useFocusEffect(
    useCallback(() => {
      getMyReports().then(setReports);
    }, []),
  );

  // Ask once on first visit; after that the user can retry from the banner.
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain && permission.status === 'undetermined') {
      requestPermission();
    }
  }, [permission, requestPermission]);

  useEffect(() => {
    if (granted) centerOnUser();
  }, [granted]);

  async function centerOnUser() {
    const position =
      (await Location.getLastKnownPositionAsync()) ?? (await Location.getCurrentPositionAsync());
    mapRef.current?.animateToRegion({
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
  }

  async function onLocatePress() {
    if (granted) return centerOnUser();
    if (permission?.canAskAgain) return requestPermission();
    Linking.openSettings();
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={BOSTON}
        showsUserLocation={granted}
        showsMyLocationButton={false}>
        {reports.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            title={report.topic}
            description={report.description}
            pinColor={STATUS_COLORS[report.status]}
          />
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <ThemedView type="backgroundElement" style={styles.legend}>
          <View style={styles.legendRow}>
            {LEGEND.map(({ status, label }) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
                <ThemedText type="small">{label}</ThemedText>
              </View>
            ))}
          </View>
          {cityStat && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.cityStat}>
              {cityStat}
            </ThemedText>
          )}
        </ThemedView>

        {permission && !granted && (
          <Pressable onPress={onLocatePress}>
            <ThemedView type="backgroundElement" style={styles.banner}>
              <ThemedText type="small">
                {permission.canAskAgain
                  ? 'Turn on location to report issues near you.'
                  : 'Location is off. Tap to open Settings.'}
              </ThemedText>
            </ThemedView>
          </Pressable>
        )}
      </SafeAreaView>

      <Pressable
        style={({ pressed }) => [styles.locate, pressed && styles.pressed]}
        onPress={onLocatePress}>
        <ThemedView type="backgroundElement" style={styles.locateInner}>
          <ThemedText>➤</ThemedText>
        </ThemedView>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
        onPress={() => router.push('/new-report')}>
        <ThemedText type="smallBold" style={styles.fabText}>
          + Report
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  legend: {
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
  },
  cityStat: {
    textAlign: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  banner: {
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  locate: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four + 64,
  },
  locateInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: BottomTabInset + Spacing.four,
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
  },
  fabText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.7,
  },
});
