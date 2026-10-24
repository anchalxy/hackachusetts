import { Group, InfoRow, InnerPage, SectionLabel } from '@/components/menu/menu-ui';

// TODO(legal): plain-language summary only. Replace with real terms + privacy policy before launch.
export default function TermsPage() {
  return (
    <InnerPage icon="doc" title="Terms & privacy" intro={'The short version. The full legal\ntext comes before launch.'}>
      <SectionLabel first>Using Tea Party</SectionLabel>
      <Group padBottom>
        <InfoRow icon="shield" title="Report what’s real" body={'Only things you can see, on public\nstreets, parks and buildings.'} />
        <InfoRow icon="ballot" title="Keep it civil" body={'Challenge answers can be seen by\nvoters. Be kind.'} />
        <InfoRow icon="gift" title="Deals can change" body={'Offers come from local spots and\nmay end without notice.'} last />
      </Group>

      <SectionLabel>Your data</SectionLabel>
      <Group padBottom>
        <InfoRow icon="lock" title="Anonymous reports" body={'311 gets the photo, location and\ndescription. Never your name.'} />
        <InfoRow icon="person" title="Never sold" body="We don’t sell or share your info." last />
      </Group>
    </InnerPage>
  );
}
