import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Caption, Group, InnerPage, SectionLabel } from '@/components/menu/menu-ui';
import { BOSTON_NEIGHBORHOODS, CITIES, type BostonNeighborhood, type City } from '@/constants/areas';
import { getProfile, NEIGHBORHOOD_LOCK_DAYS, neighborhoodLockedUntil, saveProfile, SEED_PROFILE, type Profile } from '@/lib/profile';
import { Button } from '@/ui/components';
import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

type Area = { city: City; neighborhood: BostonNeighborhood | null };

const sameArea = (a: Area, b: Area) => a.city === b.city && a.neighborhood === b.neighborhood;
const areaName = (a: Area) => a.neighborhood ?? a.city;

// Boston is picked by neighborhood; the other cities count as one area each (Plan.md).
const OTHER_CITIES = CITIES.filter((c) => c !== 'Boston').map((city): Area => ({ city, neighborhood: null }));
const BOSTON = BOSTON_NEIGHBORHOODS.map((neighborhood): Area => ({ city: 'Boston', neighborhood }));

const formatDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export default function NeighborhoodPage() {
  const [profile, setProfile] = useState<Profile>(SEED_PROFILE);
  const [picked, setPicked] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getProfile().then(setProfile);
    }, []),
  );

  const lockedUntil = neighborhoodLockedUntil(profile);
  const current: Area = { city: profile.city, neighborhood: profile.neighborhood };
  const selected = picked ?? current;
  const pending = picked && !sameArea(picked, current) ? picked : null;

  const save = async () => {
    if (!pending || lockedUntil || saving) return;
    setSaving(true);
    const latest = await getProfile();
    await saveProfile({
      ...latest,
      city: pending.city,
      neighborhood: pending.neighborhood,
      // Wards are only known for the area you signed up in.
      ward: null,
      neighborhoodChangedAt: Date.now(),
    });
    router.back();
  };

  const renderRows = (areas: Area[]) =>
    areas.map((area, i) => (
      <AreaRow
        key={areaName(area)}
        label={areaName(area)}
        selected={sameArea(area, selected)}
        disabled={!!lockedUntil}
        last={i === areas.length - 1}
        onPress={() => setPicked(area)}
      />
    ));

  return (
    <InnerPage
      icon="house"
      title="Neighborhood"
      intro={'Where you live decides which agendas,\nchallenges and bounties you see.'}
      footer={
        pending ? (
          <Button label={saving ? 'Saving…' : `Move to ${areaName(pending)}`} onPress={save} disabled={saving} />
        ) : undefined
      }>
      <View style={[styles.note, lockedUntil && styles.noteLocked]} testID="neighborhood-note">
        <Txt style={[styles.noteText, lockedUntil && styles.noteTextLocked]}>
          {lockedUntil
            ? `You moved recently. You can change this again on ${formatDay(lockedUntil)}.`
            : `You can change this once every ${NEIGHBORHOOD_LOCK_DAYS} days.`}
        </Txt>
      </View>

      <SectionLabel>Cities</SectionLabel>
      <Group>{renderRows(OTHER_CITIES)}</Group>

      <SectionLabel>Boston neighborhoods</SectionLabel>
      <Group>{renderRows(BOSTON)}</Group>
      <Caption>Used to boost leaves when the city needs to hear from people like you.</Caption>
    </InnerPage>
  );
}

function AreaRow({
  label,
  selected,
  disabled,
  last,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  last: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || selected}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
      <View style={[styles.rowBody, !last && styles.divider]}>
        <Txt style={[styles.rowLabel, disabled && !selected && styles.rowLabelDisabled]}>{label}</Txt>
        {selected ? (
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color.primary} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  note: {
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: color.panel,
  },
  noteLocked: {
    backgroundColor: color.badge.inReview.bg,
  },
  noteText: {
    fontFamily: font.bodySemibold,
    fontSize: 12.5,
    lineHeight: 17,
    color: color.slate,
  },
  noteTextLocked: {
    color: color.badge.inReview.fg,
  },
  row: {
    paddingLeft: 16,
  },
  rowPressed: {
    backgroundColor: '#F7F4EE',
  },
  rowBody: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowLabel: {
    fontFamily: font.bodySemibold,
    fontSize: 15,
    color: color.ink,
  },
  rowLabelDisabled: {
    color: color.mute,
  },
});
