import * as Device from 'expo-device';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckDot, FlowHeader, FlowHeading, FlowScreen, InfoPanel } from '@/components/challenge-flow/flow';
import { PhotoArt } from '@/components/urban-wild/photo-art';
import { getWild, setPhoto, useUrbanWild, type PhotoSlot } from '@/components/urban-wild/store';
import { Badge, TextLink } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, radius } from '@/ui/theme';

const SLOTS: { slot: PhotoSlot; label: string }[] = [
  { slot: 'entrance', label: 'Entrance' },
  { slot: 'best', label: 'Best spot' },
  { slot: 'worst', label: 'Worst spot' },
];

/** "2:14 p.m." */
function clockTime(ms: number) {
  const d = new Date(ms);
  const h = d.getHours() % 12 || 12;
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${h}:${m} ${d.getHours() < 12 ? 'a.m.' : 'p.m.'}`;
}

/** Opens the camera; falls back to the photo library on the simulator or without camera access. */
async function pickPhoto(): Promise<string | null> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.7 };
  let result: ImagePicker.ImagePickerResult | null = null;
  if (Device.isDevice) {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.granted) {
      try {
        result = await ImagePicker.launchCameraAsync(options);
      } catch {
        result = null;
      }
    }
  }
  result ??= await ImagePicker.launchImageLibraryAsync(options);
  return result.canceled ? null : (result.assets[0]?.uri ?? null);
}

/** <wild> 2 of 3: check in at the entrance and take three photos. */
export default function Visit() {
  const { wild: wildId, photos } = useUrbanWild();
  const wild = getWild(wildId);
  const [checkedInAt, setCheckedInAt] = useState(() => Date.now());

  // Check in with a real fix when the user allows location; otherwise the card stands on its own.
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        let permission = await Location.getForegroundPermissionsAsync();
        if (!permission.granted && permission.canAskAgain) {
          permission = await Location.requestForegroundPermissionsAsync();
        }
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (live) setCheckedInAt(position.timestamp);
      } catch {
        // Location off or unavailable: keep the time we opened the screen.
      }
    })();
    return () => {
      live = false;
    };
  }, []);

  const taken = SLOTS.filter(({ slot }) => photos[slot]).length;

  const take = async (slot: PhotoSlot) => {
    const uri = await pickPhoto();
    if (uri) {
      setPhoto(slot, { uri });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  };

  const skip = () => {
    for (const { slot } of SLOTS) if (!photos[slot]) setPhoto(slot, 'sample');
    Haptics.selectionAsync().catch(() => {});
  };

  return (
    <FlowScreen
      action={{
        label: 'Next: plan changes',
        onPress: () => router.push('/flow/urban-wild/build'),
        disabled: taken < SLOTS.length,
      }}>
      <FlowHeader title={wild.name} step={2} of={3} />

      <View style={styles.checkIn}>
        <View style={styles.iconTile}>
          <Icon name="pin" size={28} />
        </View>
        <View style={styles.flex}>
          <Txt variant="rowLead">{`You’re at ${wild.name}`}</Txt>
          <Txt variant="secondary">{`Checked in at the ${wild.entrance} · ${clockTime(checkedInAt)}`}</Txt>
        </View>
        <Badge label="Here" bg={color.badge.approved.bg} fg={color.badge.approved.fg} />
      </View>

      <View style={styles.section}>
        <FlowHeading
          title="Take 3 photos"
          subtitle="Parks sees every problem spot on a map, so the worst one matters most."
        />
      </View>

      <View style={styles.slots}>
        {SLOTS.map(({ slot, label }) => {
          const photo = photos[slot];
          return (
            <View key={slot} style={styles.slotColumn}>
              <Pressable
                onPress={() => take(slot)}
                accessibilityRole="button"
                accessibilityLabel={photo ? `Retake ${label} photo` : `Take ${label} photo`}
                style={({ pressed }) => [styles.slot, !photo && styles.slotEmpty, pressed && styles.pressed]}>
                {photo === 'sample' ? <PhotoArt slot={slot} /> : null}
                {photo && photo !== 'sample' ? (
                  <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                ) : null}
                {photo ? (
                  <View style={styles.check}>
                    <CheckDot size={22} />
                  </View>
                ) : (
                  <View style={styles.empty}>
                    <Icon name="camera" size={30} />
                    <Txt variant="meta">Tap to take</Txt>
                  </View>
                )}
              </Pressable>
              <Txt variant="badge" style={styles.slotLabel}>
                {label}
              </Txt>
            </View>
          );
        })}
      </View>

      <InfoPanel
        icon="camera"
        title="Photos stay in your design"
        body="Faces and license plates are blurred before anyone else sees them."
      />

      {taken < SLOTS.length ? (
        <View style={styles.skip}>
          <TextLink label="Skip for now" onPress={skip} />
        </View>
      ) : null}
    </FlowScreen>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    gap: 2,
  },
  checkIn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    marginTop: 10,
  },
  slots: {
    flexDirection: 'row',
    gap: 10,
  },
  slotColumn: {
    flex: 1,
    gap: 6,
  },
  slot: {
    aspectRatio: 1.08,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    overflow: 'hidden',
  },
  slotEmpty: {
    borderStyle: 'dashed',
    borderColor: '#D9D1C1',
    backgroundColor: color.panel,
  },
  pressed: {
    opacity: 0.8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: color.surface,
  },
  slotLabel: {
    fontFamily: font.bodySemibold,
    fontSize: 13,
    color: color.slate,
  },
  skip: {
    alignItems: 'center',
    paddingTop: 4,
  },
});
