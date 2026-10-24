import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { Linking, Platform, StyleSheet, View } from 'react-native';

import { Caption, Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import { useDevicePermissions, type Permission } from '@/lib/settings';
import { Button } from '@/ui/components';

function statusLine(status: Permission | undefined, on: string): string {
  if (status === 'granted') return on;
  if (status === 'denied') return 'Off. Turn it on in Settings.';
  return 'We’ll ask the first time you report.';
}

export default function PermissionsPage() {
  const { permissions, refresh } = useDevicePermissions();

  // Ask while iOS still shows the prompt; after a "Don't allow" the only fix is Settings.
  const fix = async (kind: 'camera' | 'location') => {
    const canAsk = kind === 'camera' ? permissions?.canAskCamera : permissions?.canAskLocation;
    if (canAsk) {
      if (kind === 'camera') await Camera.requestCameraPermissionsAsync();
      else await Location.requestForegroundPermissionsAsync();
      refresh();
    } else {
      Linking.openSettings();
    }
  };

  const action = (kind: 'camera' | 'location') => {
    const status = permissions?.[kind];
    const canAsk = kind === 'camera' ? permissions?.canAskCamera : permissions?.canAskLocation;
    if (!permissions || status === 'granted') return undefined;
    // There's no app Settings page to send people to on web.
    if (!canAsk && Platform.OS === 'web') return undefined;
    return (
      <View style={styles.action}>
        <Button size="sm" label={canAsk ? 'Allow' : 'Open Settings'} onPress={() => fix(kind)} />
      </View>
    );
  };

  return (
    <InnerPage icon="camera" title="Location & camera" intro={'Reports use a live photo and where\nyou’re standing when you take it.'}>
      <SectionLabel first>Access</SectionLabel>
      <Group padBottom>
        <InfoRow
          icon="camera"
          title="Camera"
          body={statusLine(permissions?.camera, 'On. Only used for report photos.')}
          trailing={action('camera')}
        />
        <InfoRow
          icon="route"
          title="Location"
          body={statusLine(permissions?.location, 'On. Only while you use the app.')}
          trailing={action('location')}
          last
        />
      </Group>
      <View style={styles.footnote}>
        <Caption>{'We read your location at the moment you take a\nreport photo. Never in the background.'}</Caption>
      </View>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  action: {
    marginTop: 6,
  },
  footnote: {
    marginTop: 7,
  },
});
