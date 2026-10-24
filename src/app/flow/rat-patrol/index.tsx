import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import {
  CheckDot,
  ChoiceTile,
  FlowHeader,
  FlowHeading,
  FlowScreen,
  TileGrid,
} from '@/components/challenge-flow/flow';
import { locateSpot, SIGN_TYPES, takeSpotPhoto } from '@/components/challenge-flow/rat-patrol';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { makeStyles, useColors } from '@/ui/theme';

type Spot = { street: string; neighborhood: string };

export default function RatPatrolSpot() {
  const styles = useStyles();
  const color = useColors();
  const [type, setType] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [locating, setLocating] = useState(false);

  async function addPhoto() {
    const asset = await takeSpotPhoto();
    if (!asset) return;
    setPhoto(asset.uri);
    setSpot(null);
    setLocating(true);
    setSpot(await locateSpot(asset));
    setLocating(false);
  }

  function next() {
    if (!type || !photo) return;
    router.push({
      pathname: '/flow/rat-patrol/report',
      params: {
        type,
        photo,
        street: spot?.street ?? '',
        neighborhood: spot?.neighborhood ?? '',
      },
    });
  }

  const place = spot ? [spot.street, spot.neighborhood].filter(Boolean).join(', ') : null;

  return (
    <FlowScreen action={{ label: 'Next: report to 311', onPress: next, disabled: !type || !photo || locating }}>
      <FlowHeader title="Rat patrol" step={1} of={2} close />
      <FlowHeading
        title="What did you find?"
        subtitle="Anything in public space counts: sidewalks, parks, alleys."
      />
      <TileGrid>
        {SIGN_TYPES.map((sign) => (
          <ChoiceTile
            key={sign.id}
            icon={sign.icon}
            label={sign.label}
            selected={type === sign.id}
            onPress={() => setType(sign.id)}
          />
        ))}
      </TileGrid>

      <View style={styles.photoRow}>
        <Pressable
          onPress={addPhoto}
          accessibilityRole="button"
          accessibilityLabel={photo ? 'Retake photo' : 'Take a photo'}
          style={({ pressed }) => [styles.photo, !photo && styles.photoEmpty, pressed && styles.pressed]}>
          {photo ? (
            <>
              <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
              <View style={styles.photoCheck}>
                <CheckDot size={22} />
              </View>
            </>
          ) : (
            <>
              <Icon name="camera" size={30} />
              <Txt variant="rowLead" style={styles.addPhoto}>
                Take photo
              </Txt>
            </>
          )}
        </Pressable>
        <View style={styles.photoText}>
          {photo ? (
            locating ? (
              <View style={styles.locating}>
                <ActivityIndicator color={color.slate} />
                <Txt variant="secondary">Finding the block…</Txt>
              </View>
            ) : (
              <>
                <Txt variant="rowLead">{place}</Txt>
                <Txt variant="secondary">From your photo’s location. Only the block is shared.</Txt>
              </>
            )
          ) : (
            <>
              <Txt variant="rowLead">Add one photo</Txt>
              <Txt variant="secondary">We use its location to find the block. Only the block is shared.</Txt>
            </>
          )}
        </View>
      </View>
    </FlowScreen>
  );
}

const useStyles = makeStyles((color, dark) => ({
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 6,
  },
  photo: {
    width: 146,
    height: 114,
    borderRadius: 14,
    borderCurve: 'continuous',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoEmpty: {
    borderStyle: 'dashed',
    borderColor: dark ? '#3A434F' : '#D9D1C2',
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
  photoText: {
    flex: 1,
    gap: 4,
  },
  locating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.8,
  },
}));
