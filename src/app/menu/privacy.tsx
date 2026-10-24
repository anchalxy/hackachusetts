import { StyleSheet, View } from 'react-native';

import { Group, InfoRow, InnerPage, SectionLabel, SoloCard } from '@/components/menu/menu-ui';

// Reports go to 311 anonymously (DESIGN.md 6b): photo, location and description only.
export default function PrivacyPage() {
  return (
    <InnerPage icon="lock" title="Privacy" intro={'Reports go to 311 anonymously.\nYour name never leaves the app.'}>
      <SectionLabel first>What the city gets</SectionLabel>
      <Group padBottom>
        <InfoRow icon="camera" title="Your photo" body="Taken live, just for that report." />
        <InfoRow icon="route" title="Where you took it" body="The spot you stood, at that moment." />
        <InfoRow icon="notes" title="Your description" body="The words you checked before sending." last />
      </Group>

      <SectionLabel>What stays with us</SectionLabel>
      <Group padBottom>
        <InfoRow icon="person" title="Your name and username" body="Never sent with a report." />
        <InfoRow icon="idcard" title="Neighborhood and age" body={'Only used to boost your leaves.\nNever shown to anyone.'} last />
      </Group>

      {/* TODO(account): no accounts yet (welcome page + seed user only), so this is inert for now. */}
      <View style={styles.delete}>
        <SoloCard label="Delete account" testID="privacy-delete" />
      </View>
    </InnerPage>
  );
}

const styles = StyleSheet.create({
  delete: {
    marginTop: 26,
  },
});
