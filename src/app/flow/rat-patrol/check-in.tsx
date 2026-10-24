import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  backToTrail,
  CheckDot,
  FlowHeader,
  FlowHeading,
  FlowScreen,
  OptionRow,
} from '@/components/challenge-flow/flow';
import {
  CHECK_IN_OPTIONS,
  FALLBACK_SPOT,
  FALLBACK_TICKET,
  RAT_PATROL_ID,
  takeSpotPhoto,
} from '@/components/challenge-flow/rat-patrol';
import { completeStop, useChallengeProgress } from '@/lib/challenge-progress';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

type CheckIn = { outcome: string; photo?: string };

export default function RatPatrolCheckIn() {
  // Pushed from Sent ("Preview the day-7 check-in") it gets a back chevron; opened from the
  // challenge sheet it's the first screen, so it closes instead.
  const { from } = useLocalSearchParams<{ from?: string }>();
  const stop = useChallengeProgress().stops[RAT_PATROL_ID];
  const data = stop?.data ?? {};
  const street = typeof data.street === 'string' && data.street ? data.street : FALLBACK_SPOT.street;
  const ticket = typeof data.ticket === 'string' && data.ticket ? data.ticket : FALLBACK_TICKET;
  const reportedOn = typeof data.reportedOn === 'string' ? data.reportedOn : 'Oct 26';
  const saved = stop && !stop.pendingCheckIn ? (data.checkIn as CheckIn | undefined) : undefined;

  const [outcome, setOutcome] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const selected = saved?.outcome ?? outcome;
  const shownPhoto = saved ? (saved.photo ?? null) : photo;

  async function addPhoto() {
    const asset = await takeSpotPhoto();
    if (asset) setPhoto(asset.uri);
  }

  function send() {
    if (!outcome || saved) return;
    const checkIn: CheckIn = photo ? { outcome, photo } : { outcome };
    completeStop(RAT_PATROL_ID, 10, { pendingCheckIn: false, data: { checkIn } });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    backToTrail();
  }

  return (
    <FlowScreen
      action={
        saved
          ? { label: 'Back to the trail', onPress: backToTrail }
          : { label: 'Send update · +10 tea leaves', onPress: send, disabled: !outcome }
      }
      footnote={saved ? 'Update sent. You earned all 40 tea leaves for this stop.' : undefined}>
      <FlowHeader title="Day 7" close={from !== 'sent'} />
      <FlowHeading title={`What happened on ${street}?`} subtitle={`Ticket #${ticket} · reported ${reportedOn}`} />

      <View style={styles.options}>
        {CHECK_IN_OPTIONS.map((option) => {
          const isSelected = selected === option.id;
          return (
            <OptionRow
              key={option.id}
              control="leading"
              selected={isSelected}
              onPress={saved ? undefined : () => setOutcome(option.id)}
              title={
                <Txt variant={isSelected ? 'rowLead' : 'body'} style={styles.optionLabel}>
                  {option.label}
                </Txt>
              }
            />
          );
        })}
      </View>

      {saved && !shownPhoto ? null : (
        <View style={styles.photoBlock}>
          <Pressable
            onPress={saved ? undefined : addPhoto}
            disabled={!!saved}
            accessibilityRole="button"
            accessibilityLabel={photo ? 'Retake photo' : 'Add photo'}
            style={({ pressed }) => [styles.photo, !shownPhoto && styles.photoEmpty, pressed && styles.pressed]}>
            {shownPhoto ? (
              <>
                <Image source={{ uri: shownPhoto }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                <View style={styles.photoCheck}>
                  <CheckDot size={22} />
                </View>
              </>
            ) : (
              <>
                <Icon name="camera" size={30} />
                <Txt variant="rowLead" style={styles.addPhoto}>
                  Add photo
                </Txt>
              </>
            )}
          </Pressable>
          <Txt variant="meta" style={styles.photoLabel}>
            {saved ? 'Photo at day 7' : 'Photo now (optional)'}
          </Txt>
        </View>
      )}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  options: {
    gap: 10,
  },
  optionLabel: {
    paddingVertical: 4,
  },
  photoBlock: {
    gap: 8,
    marginTop: 6,
  },
  photo: {
    width: 176,
    height: 96,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoEmpty: {
    borderStyle: 'dashed',
    borderColor: '#D9D1C2',
    backgroundColor: color.surface,
  },
  addPhoto: {
    color: color.primary,
    fontSize: 14,
  },
  photoCheck: {
    position: 'absolute',
    top: 7,
    right: 7,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: color.surface,
  },
  photoLabel: {
    fontFamily: font.bodySemibold,
    fontSize: 13,
    color: color.slate,
  },
  pressed: {
    opacity: 0.8,
  },
});
