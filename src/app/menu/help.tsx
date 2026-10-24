import { router } from 'expo-router';

import { Group, InfoRow, InnerPage, MenuRow, SectionLabel } from '@/components/menu/menu-ui';

export default function HelpPage() {
  return (
    <InnerPage icon="help" title="Help" intro={'Quick answers to the things\npeople ask most.'}>
      <SectionLabel first>Guides</SectionLabel>
      <Group>
        <MenuRow icon="leafy" title="How tea leaves work" onPress={() => router.push('/menu/tea-leaves')} testID="help-tea-leaves" />
        <MenuRow
          icon="shield"
          title="Reporting guidelines"
          onPress={() => router.push('/menu/reporting-guidelines')}
          last
          testID="help-guidelines"
        />
      </Group>

      <SectionLabel>Common questions</SectionLabel>
      <Group padBottom>
        <InfoRow
          icon="pothole"
          title="My report wasn’t approved"
          body={'The report page says why. You don’t\nlose any leaves for it.'}
        />
        <InfoRow
          icon="leafy"
          title="When do my leaves land?"
          body={'Reports pay once the city approves them.\nChallenges pay when you finish.'}
        />
        <InfoRow icon="gift" title="Where’s my deal?" body={'Rewards → My deals. Each code works\nonce, within 7 days.'} />
        <InfoRow icon="siren" title="It’s an emergency" body={'Call 911. Nobody watches Tea Party\nin real time.'} last />
      </Group>
    </InnerPage>
  );
}
