import { StyleSheet, View } from 'react-native';

import { APP_VERSION, Caption, Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';

export default function AboutPage() {
  return (
    <InnerPage icon="teacup" title="About Tea Party" intro={'Small ways to shape your city,\nfor the people who live in it.'}>
      <SectionLabel first>How it works</SectionLabel>
      <Group padBottom>
        <InfoRow
          icon="flag"
          title="Challenges from real agendas"
          body={'Each week we read city agendas in Boston,\nCambridge, Somerville and Brookline.'}
        />
        <InfoRow icon="camera" title="Reports go to 311" body={'Straight into the city’s own queue,\nanonymously.'} />
        <InfoRow icon="cityhall" title="Real people fix things" body="When it’s done, you see who did it." last />
      </Group>
      <View style={styles.version}>
        <Caption>{`Tea Party ${APP_VERSION} · Made in Cambridge`}</Caption>
      </View>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  version: {
    marginTop: 7,
  },
});
