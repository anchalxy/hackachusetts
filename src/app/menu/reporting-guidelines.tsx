import { View } from 'react-native';

import { Caption, Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles } from '@/ui/theme';

// design/screens/menu/reporting-guidelines.png. Also opened from the report flow's
// "What can I report?" links, so it works as the first page in the sheet too.
const REPORTABLE: { icon: IconName; label: string }[] = [
  { icon: 'pothole', label: 'Potholes' },
  { icon: 'streetlight', label: 'Lights out' },
  { icon: 'graffiti', label: 'Graffiti' },
  { icon: 'trash', label: 'Trash' },
  { icon: 'sidewalk', label: 'Sidewalks' },
  { icon: 'traffic', label: 'Signals' },
  { icon: 'water', label: 'Leaks' },
  { icon: 'tree', label: 'Trees' },
];

export default function ReportingGuidelinesPage() {
  const styles = useStyles();
  return (
    <InnerPage
      icon="shield"
      title="Reporting guidelines"
      intro={'Clear reports get approved faster,\nand that’s when you earn leaves.'}>
      <SectionLabel first>What you can report</SectionLabel>
      <Group style={styles.grid}>
        {REPORTABLE.map((item) => (
          <View key={item.label} style={styles.cell}>
            <View style={styles.cellTile}>
              <Icon name={item.icon} size={34} />
            </View>
            <Txt style={styles.cellLabel}>{item.label}</Txt>
          </View>
        ))}
      </Group>

      <SectionLabel>Tips for a good report</SectionLabel>
      <Group padBottom>
        <InfoRow step={1} title="Get it all in frame" body={'Step back so the city can see the\nproblem and what’s around it.'} />
        <InfoRow step={2} title="Snap it where it is" body={'Photos are taken live, so the location\ncomes from where you’re standing.'} />
        <InfoRow step={3} title="Say what’s wrong" body={'A few words is enough, like\n“pothole near the bus stop”.'} last />
      </Group>

      <SectionLabel>Not for Tea Party</SectionLabel>
      <Group padBottom>
        <InfoRow icon="siren" title="Emergencies" body="Call 911 instead." />
        <InfoRow icon="house" title="Private property" body="Only public streets, parks and buildings." />
        <InfoRow icon="person" title="People or noise" body="We can’t act on complaints about people." last />
      </Group>

      <View style={styles.footnote}>
        <Caption>
          {'If a report isn’t approved, we’ll tell you why.\nReports go to 311 anonymously: just the\nphoto, location and description.'}
        </Caption>
      </View>
    </InnerPage>
  );
}

const useStyles = makeStyles((color) => ({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 8,
    paddingTop: 20,
    paddingBottom: 12,
    rowGap: 16,
  },
  cell: {
    width: '25%',
    alignItems: 'center',
  },
  cellTile: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellLabel: {
    fontFamily: font.bodySemibold,
    fontSize: 12.5,
    lineHeight: 16,
    color: color.ink,
    marginTop: 8,
  },
  footnote: {
    marginTop: 14,
  },
}));
