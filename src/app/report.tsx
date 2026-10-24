import * as Location from 'expo-location';
import { useEffect, useRef } from 'react';
import { Alert, Linking, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';

const BOSTON: Region = {
  latitude: 42.3601,
  longitude: -71.0589,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const STATUS_COLORS = {
  submitted: '#E5484D',
  inReview: '#F5C518',
  inProgress: '#30A46C',
  rejected: '#8B8D98',
} as const;

type Status = keyof typeof STATUS_COLORS;

const LEGEND: { status: Status; label: string }[] = [
  { status: 'submitted', label: 'Not reviewed' },
  { status: 'inReview', label: 'In review' },
  { status: 'inProgress', label: 'In progress' },
  { status: 'rejected', label: 'Rejected' },
];

const MOCK_REPORTS: {
  id: string;
  title: string;
  place: string;
  status: Status;
  latitude: number;
  longitude: number;
}[] = [
  { id: '1', title: 'Pothole', place: 'Mass Ave & Columbus Ave', status: 'inProgress', latitude: 42.3396, longitude: -71.0812 },
  { id: '2', title: 'Graffiti', place: 'Dudley St', status: 'inReview', latitude: 42.3296, longitude: -71.0837 },
  { id: '3', title: 'Broken streetlight', place: 'Tremont St', status: 'submitted', latitude: 42.3555, longitude: -71.0626 },
];

export default function ReportScreen() {
  const mapRef = useRef<MapView>(null);
  const [permission, requestPermission] = Location.useForegroundPermissions();
  const granted = permission?.granted ?? false;

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
        {MOCK_REPORTS.map((report) => (
          <Marker
            key={report.id}
            coordinate={{ latitude: report.latitude, longitude: report.longitude }}
            title={report.title}
            description={report.place}
            pinColor={STATUS_COLORS[report.status]}
          />
        ))}
      </MapView>

      <SafeAreaView style={styles.overlay} edges={['top']} pointerEvents="box-none">
        <ThemedView type="backgroundElement" style={styles.legend}>
          {LEGEND.map(({ status, label }) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
              <ThemedText type="small">{label}</ThemedText>
            </View>
          ))}
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
        onPress={() => Alert.alert('Coming soon', 'Describe, snap a photo, submit.')}>
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
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
