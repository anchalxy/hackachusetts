import { Pressable, StyleSheet, View } from 'react-native';

import { ago } from '@/components/report/format';
import { topicInfo } from '@/constants/report-topics';
import type { MyReport } from '@/lib/my-reports';
import { IconTile, StatusBadge } from '@/ui/components';
import { Txt } from '@/ui/text';
import { color, space } from '@/ui/theme';

/**
 * Standard list row (DESIGN.md §5): 44px icon tile, bold title, "Street · 2h" under it
 * (or the reason, when not approved), status badge on the right, divider inset to the text.
 */
export function ReportRow({ report, onPress, divider }: { report: MyReport; onPress: () => void; divider: boolean }) {
  const subtitle =
    report.status === 'notApproved' && report.reason ? report.reason : `${report.address} · ${ago(report.createdAt)}`;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <IconTile icon={topicInfo(report.topic).icon} />
      <View style={styles.text}>
        <Txt variant="rowLead" numberOfLines={1}>
          {report.title}
        </Txt>
        <Txt variant="secondary" numberOfLines={1}>
          {subtitle}
        </Txt>
      </View>
      <StatusBadge status={report.status} />
      {divider && <View style={styles.divider} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: space.rowHeight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  pressed: {
    opacity: 0.6,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  divider: {
    position: 'absolute',
    left: space.rowTextInset,
    right: 0,
    bottom: 0,
    height: 1,
    backgroundColor: color.border,
  },
});
