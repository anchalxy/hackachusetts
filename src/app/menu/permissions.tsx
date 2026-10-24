import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Linking, Platform, Switch, View } from 'react-native';

import { Caption, Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import { useDevicePermissions, type DevicePermissions } from '@/lib/settings';
import { makeStyles, useColors, useScheme } from '@/ui/theme';

type Kind = 'camera' | 'location';

const ROWS: { kind: Kind; icon: 'camera' | 'route'; title: string; body: string }[] = [
  { kind: 'camera', icon: 'camera', title: 'Camera', body: 'Only used for report photos.' },
  { kind: 'location', icon: 'route', title: 'Location', body: 'Only while you use the app.' },
];

/** What to say under the row when the toggle alone doesn't explain it. */
function hint(p: DevicePermissions | null, kind: Kind): string | null {
  if (!p) return null;
  const canAsk = kind === 'camera' ? p.canAskCamera : p.canAskLocation;
  if (p[kind] === 'denied' && !canAsk) return 'Blocked. Switch it on in iOS Settings.';
  return null;
}

export default function PermissionsPage() {
  const styles = useStyles();
  const color = useColors();
  const dark = useScheme() === 'dark';
  // Off track: warm cream in light, a lifted slate in dark so it reads on the card.
  const trackOff = dark ? '#3A424D' : '#E7E1D5';
  const { permissions, refresh } = useDevicePermissions();

  // The switch shows the real iOS permission. Apps can ask once; after a "Don't allow", and to
  // turn a permission off, iOS only allows it in Settings. We re-read it when you come back.
  const toggle = async (kind: Kind, on: boolean) => {
    const canAsk = kind === 'camera' ? permissions?.canAskCamera : permissions?.canAskLocation;
    if (on && canAsk) {
      if (kind === 'camera') await Camera.requestCameraPermissionsAsync();
      else await Location.requestForegroundPermissionsAsync();
      refresh();
      return;
    }
    if (Platform.OS !== 'web') Linking.openSettings();
  };

  return (
    <InnerPage icon="camera" title="Location & camera" intro={'Reports use a live photo and where\nyou’re standing when you take it.'}>
      <SectionLabel first>Access</SectionLabel>
      <Group padBottom>
        {ROWS.map((row, i) => {
          const granted = permissions?.[row.kind] === 'granted';
          const extra = hint(permissions, row.kind);
          return (
            <InfoRow
              key={row.kind}
              icon={row.icon}
              title={row.title}
              body={extra ? `${row.body}\n${extra}` : row.body}
              last={i === ROWS.length - 1}
              trailing={
                <View style={styles.switch}>
                  <Switch
                    value={granted}
                    disabled={!permissions || (Platform.OS === 'web' && !granted && permissions[row.kind] === 'denied')}
                    onValueChange={(on) => toggle(row.kind, on)}
                    trackColor={{ false: trackOff, true: color.primary }}
                    ios_backgroundColor={trackOff}
                    thumbColor={dark ? '#FFFFFF' : color.surface}
                    accessibilityLabel={`${row.title} access`}
                    testID={`perm-${row.kind}`}
                  />
                </View>
              }
            />
          );
        })}
      </Group>
      <View style={styles.footnote}>
        <Caption>{'We read your location at the moment you take a\nreport photo. Never in the background.'}</Caption>
      </View>
    </InnerPage>
  );
}

const useStyles = makeStyles(() => ({
  switch: {
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  footnote: {
    marginTop: 7,
  },
}));
