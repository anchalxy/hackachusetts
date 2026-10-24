import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { FlowHeader, FlowHeading, FlowScreen } from '@/components/challenge-flow/flow';
import {
  auditMode,
  MODES,
  RATINGS,
  saveRatings,
  type AuditPhotos,
  type RatingKey,
} from '@/components/cummins-walk-audit/audit';
import { CheckedBadge, PhotoSlot, RatingRow } from '@/components/cummins-walk-audit/parts';

/** Walk audit 3 of 3: score four things for your mode, then a best-spot and worst-spot photo. */
export default function RateStep() {
  const mode = MODES.find((m) => m.id === auditMode()) ?? MODES[0];
  const [ratings, setRatings] = useState<Partial<Record<RatingKey, number>>>({});
  const [photos, setPhotos] = useState<AuditPhotos>({ best: null, worst: null });

  const rated = RATINGS.every((r) => ratings[r.id]);
  const bothPhotos = !!photos.best && !!photos.worst;
  const missing = !rated
    ? 'Rate all four to send'
    : !bothPhotos
      ? 'Add a best and a worst spot photo to send'
      : undefined;

  return (
    <FlowScreen
      footnote={missing}
      action={{
        label: 'Send audit',
        disabled: !rated || !bothPhotos,
        onPress: () => {
          saveRatings(ratings, photos);
          router.push('/flow/cummins-walk-audit/sent');
        },
      }}>
      <FlowHeader title="Rate it" step={3} of={3} />
      <FlowHeading title={mode.rateQuestion} subtitle="1 is unusable, 5 is great." />
      <View>
        {RATINGS.map((r, i) => (
          <RatingRow
            key={r.id}
            icon={r.icon}
            label={r.label}
            value={ratings[r.id] ?? 0}
            onChange={(v) => setRatings((prev) => ({ ...prev, [r.id]: v }))}
            last={i === RATINGS.length - 1}
          />
        ))}
      </View>
      <View style={styles.photos}>
        <PhotoSlot label="Best spot" uri={photos.best} onChange={(best) => setPhotos((p) => ({ ...p, best }))} />
        <PhotoSlot label="Worst spot" uri={photos.worst} onChange={(worst) => setPhotos((p) => ({ ...p, worst }))} />
      </View>
      {/* The location check is faked for the demo; the real one reads each photo's GPS. */}
      {bothPhotos ? <CheckedBadge label="Both photos are on Cummins Hwy" /> : null}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  photos: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
