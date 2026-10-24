import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Card, Screen, SectionTitle } from '@/components/screen';
import { ThemedText } from '@/components/themed-text';
import { BottomTabInset, Spacing } from '@/constants/theme';

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

const MOCK_REPORTS: { id: string; title: string; place: string; status: Status }[] = [
  { id: '1', title: 'Pothole', place: 'Mass Ave & Columbus Ave', status: 'inProgress' },
  { id: '2', title: 'Graffiti', place: 'Dudley St', status: 'inReview' },
  { id: '3', title: 'Broken streetlight', place: 'Tremont St', status: 'submitted' },
];

export default function ReportScreen() {
  return (
    <Screen
      title="Report"
      subtitle="Your reports around Boston"
      overlay={
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.pressed]}
          onPress={() => Alert.alert('Coming soon', 'Describe, snap a photo, submit.')}>
          <ThemedText type="smallBold" style={styles.fabText}>
            + Report
          </ThemedText>
        </Pressable>
      }>
      <Card style={styles.map}>
        <ThemedText themeColor="textSecondary">Map of Boston</ThemedText>
      </Card>

      <View style={styles.legend}>
        {LEGEND.map(({ status, label }) => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
            <ThemedText type="small" themeColor="textSecondary">
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <SectionTitle>My reports</SectionTitle>
      {MOCK_REPORTS.map((report) => (
        <Card key={report.id} style={styles.row}>
          <View style={[styles.dot, { backgroundColor: STATUS_COLORS[report.status] }]} />
          <View>
            <ThemedText>{report.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {report.place}
            </ThemedText>
          </View>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  map: {
    height: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
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
