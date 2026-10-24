import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { CheckDot, OptionRow, selectionHaptic } from '@/components/challenge-flow/flow';
import { formatSeconds, OBSTACLES, type Obstacle } from '@/components/cummins-walk-audit/audit';
import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, font, radius } from '@/ui/theme';

// ─── Walk signal stopwatch ──────────────────────────────────────────────────────────────

type Phase = 'idle' | 'running' | 'done';

/**
 * "WALK SIGNAL" card: a big stopwatch and a round teal Start / Stop button. Start when the walk
 * sign comes on, stop when it starts flashing. Reports the final time in seconds.
 */
export function WalkSignalTimer({ onTimed }: { onTimed: (seconds: number | null) => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    if (phase !== 'running') return;
    const id = setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 100);
    return () => clearInterval(id);
  }, [phase]);

  const press = () => {
    if (phase === 'running') {
      const seconds = (Date.now() - startedAt.current) / 1000;
      setElapsed(seconds);
      setPhase('done');
      onTimed(Math.round(seconds * 10) / 10);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      startedAt.current = Date.now();
      setElapsed(0);
      setPhase('running');
      onTimed(null);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    }
  };

  const label = phase === 'running' ? 'Stop' : phase === 'done' ? 'Redo' : 'Start';

  return (
    <View style={styles.card}>
      <Txt variant="meta" style={styles.cardLabel}>
        WALK SIGNAL
      </Txt>
      <View style={styles.timerRow}>
        <Txt
          style={styles.timer}
          accessibilityRole="timer"
          accessibilityLabel={`${Math.floor(elapsed)} seconds`}>
          {formatSeconds(elapsed)}
        </Txt>
        <TimerButton label={label} running={phase === 'running'} onPress={press} />
      </View>
      <Txt variant="secondary">Tap when the walk sign comes on, and again when it starts flashing.</Txt>
    </View>
  );
}

function TimerButton({ label, running, onPress }: { label: string; running: boolean; onPress: () => void }) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (running && !reduceMotion) {
      pulse.value = withRepeat(withTiming(1.12, { duration: 700, easing: Easing.inOut(Easing.quad) }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = withTiming(1, { duration: 200 });
    }
  }, [running, reduceMotion, pulse]);

  const haloStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label === 'Stop' ? 'Stop timer' : label === 'Redo' ? 'Time it again' : 'Start timer'}
      style={({ pressed }) => [styles.timerButtonWrap, pressed && styles.pressed]}>
      <Animated.View style={[styles.timerHalo, haloStyle]} />
      <View style={styles.timerButton}>
        <Txt variant="button" style={styles.timerButtonText}>
          {label}
        </Txt>
      </View>
    </Pressable>
  );
}

// ─── Anything in the way? ───────────────────────────────────────────────────────────────

/** 2×2 leading-radio grid. Multi-select, except "Nothing" clears the rest. */
export function ObstacleGrid({ value, onChange }: { value: Obstacle[]; onChange: (next: Obstacle[]) => void }) {
  const toggle = (id: Obstacle) => {
    if (id === 'nothing') return onChange(value.includes('nothing') ? [] : ['nothing']);
    const rest = value.filter((o) => o !== 'nothing');
    onChange(rest.includes(id) ? rest.filter((o) => o !== id) : [...rest, id]);
  };

  return (
    <View style={styles.grid}>
      {OBSTACLES.map((o) => {
        const selected = value.includes(o.id);
        return (
          <View key={o.id} style={styles.gridCell}>
            <OptionRow
              control="leading"
              selected={selected}
              onPress={() => toggle(o.id)}
              title={
                <Txt variant={selected ? 'rowLead' : 'body'} numberOfLines={1}>
                  {o.label}
                </Txt>
              }
            />
          </View>
        );
      })}
    </View>
  );
}

// ─── 1–5 rating row ─────────────────────────────────────────────────────────────────────

export function RatingRow({
  icon,
  label,
  value,
  onChange,
  last,
}: {
  icon: IconName;
  label: string;
  value: number;
  onChange: (value: number) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.ratingRow, !last && styles.ratingDivider]}>
      <View style={styles.ratingIcon}>
        <Icon name={icon} size={26} />
      </View>
      <Txt variant="rowLead" style={styles.ratingLabel} numberOfLines={2}>
        {label}
      </Txt>
      <View style={styles.dots} accessibilityRole="adjustable" accessibilityLabel={`${label}, ${value || 'not rated'} of 5`}>
        {[1, 2, 3, 4, 5].map((n) => {
          const on = n <= value;
          return (
            <Pressable
              key={n}
              hitSlop={{ top: 10, bottom: 10, left: 2, right: 2 }}
              onPress={() => {
                if (n !== value) selectionHaptic();
                onChange(n);
              }}
              accessibilityLabel={`${n} of 5`}
              style={[styles.dot, on ? styles.dotOn : styles.dotOff]}>
              <Txt style={[styles.dotText, on ? styles.dotTextOn : styles.dotTextOff]}>{n}</Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Best / worst spot photo ────────────────────────────────────────────────────────────

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', quality: 0.7 };

async function fromLibrary() {
  const res = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return res.canceled ? null : res.assets[0].uri;
}

/** Camera first; the library when the camera is denied or missing (Simulator). */
async function takePhoto(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return fromLibrary();
    const res = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
    return res.canceled ? null : res.assets[0].uri;
  } catch {
    return fromLibrary();
  }
}

export function PhotoSlot({
  label,
  uri,
  onChange,
}: {
  label: string;
  uri: string | null;
  onChange: (uri: string | null) => void;
}) {
  const pick = async (source: 'camera' | 'library') => {
    try {
      const next = source === 'camera' ? await takePhoto() : await fromLibrary();
      if (next) {
        selectionHaptic();
        onChange(next);
      }
    } catch {
      Alert.alert('Couldn’t add the photo', 'Check camera and photo access in Settings, then try again.');
    }
  };

  const onPress = () => {
    if (!uri) return pick('camera');
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: label,
          options: ['Retake photo', 'Choose from library', 'Remove photo', 'Cancel'],
          destructiveButtonIndex: 2,
          cancelButtonIndex: 3,
        },
        (i) => {
          if (i === 0) pick('camera');
          else if (i === 1) pick('library');
          else if (i === 2) onChange(null);
        },
      );
    } else {
      pick('camera');
    }
  };

  return (
    <View style={styles.photoCell}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={uri ? `${label} photo, change` : `Add ${label.toLowerCase()} photo`}
        style={({ pressed }) => [styles.photo, !uri && styles.photoEmpty, pressed && styles.pressed]}>
        {uri ? (
          <>
            <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            <View style={styles.photoCheck}>
              <CheckDot size={22} />
            </View>
          </>
        ) : (
          <View style={styles.photoPrompt}>
            <SymbolView name="camera" size={22} tintColor={color.primary} />
            <Txt variant="badge" style={styles.photoPromptText}>
              Add photo
            </Txt>
          </View>
        )}
      </Pressable>
      <Txt variant="secondary" style={styles.photoLabel}>
        {label}
      </Txt>
    </View>
  );
}

/** Approved badge: "✓ Both photos are on Cummins Hwy". */
export function CheckedBadge({ label }: { label: string }) {
  return (
    <View style={styles.badge}>
      <SymbolView name="checkmark" size={11} weight="bold" tintColor={color.badge.approved.fg} />
      <Txt variant="badge" style={{ color: color.badge.approved.fg }}>
        {label}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    gap: 6,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  cardLabel: {
    fontFamily: font.bodySemibold,
    letterSpacing: 0.4,
    color: color.mute,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timer: {
    fontFamily: font.headingHeavy,
    fontSize: 60,
    lineHeight: 70,
    letterSpacing: -1.5,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  timerButtonWrap: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerHalo: {
    position: 'absolute',
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: color.tealTint,
  },
  timerButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: color.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButtonText: {
    fontFamily: font.bodyBold,
  },
  pressed: {
    opacity: 0.8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  gridCell: {
    flexBasis: '47%',
    flexGrow: 1,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
  },
  ratingDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  ratingIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingLabel: {
    flex: 1,
    fontSize: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: {
    backgroundColor: color.primary,
  },
  dotOff: {
    borderWidth: 1,
    borderColor: '#DCD5C8',
    backgroundColor: color.surface,
  },
  dotText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  dotTextOn: {
    color: color.surface,
  },
  dotTextOff: {
    fontFamily: font.bodyMedium,
    color: color.mute,
  },
  photoCell: {
    flex: 1,
    gap: 6,
  },
  photo: {
    aspectRatio: 1.8,
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.panel,
  },
  photoEmpty: {
    borderStyle: 'dashed',
    borderWidth: 1.5,
    borderColor: '#D9D1C1',
  },
  photoPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  photoPromptText: {
    color: color.primary,
  },
  photoCheck: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: color.surface,
  },
  photoLabel: {
    fontFamily: font.bodySemibold,
  },
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: color.badge.approved.bg,
  },
});
