import { router } from 'expo-router';
import { Pressable, TextInput, View } from 'react-native';

import { FlowHeader, FlowScreen, SectionLabel, selectionHaptic } from '@/components/challenge-flow/flow';
import { ParkMap } from '@/components/urban-wild/park-map';
import {
  CHANGES,
  getWild,
  MAX_CHANGES,
  movePlacement,
  setWhy,
  toggleChange,
  useUrbanWild,
} from '@/components/urban-wild/store';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius, useColors } from '@/ui/theme';

/** Your design 3 of 3: place up to 5 changes on the park map and say why. */
export default function Build() {
  const styles = useStyles();
  const color = useColors();
  const { wild: wildId, placements, why } = useUrbanWild();
  const wild = getWild(wildId);
  const full = placements.length >= MAX_CHANGES;

  return (
    <FlowScreen
      footnote={placements.length ? 'Drag a pin to move it. Tap a change again to remove it.' : undefined}
      action={{
        label: 'Send design',
        onPress: () => router.push('/flow/urban-wild/sent'),
        disabled: placements.length === 0,
      }}>
      <FlowHeader title="Your design" step={3} of={3} />

      <ParkMap wild={wild} placements={placements} onMove={movePlacement} />

      <SectionLabel
        right={
          <Txt variant="secondary">
            <Txt variant="secondary" style={styles.count}>
              {placements.length}
            </Txt>
            {` of ${MAX_CHANGES} placed`}
          </Txt>
        }>
        Add a change
      </SectionLabel>
      <View style={styles.grid}>
        {CHANGES.map((change) => {
          const placed = placements.some((p) => p.kind === change.kind);
          const disabled = full && !placed;
          return (
            <Pressable
              key={change.kind}
              disabled={disabled}
              onPress={() => {
                selectionHaptic();
                toggleChange(change.kind);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: placed, disabled }}
              style={({ pressed }) => [
                styles.tile,
                placed && styles.tilePlaced,
                disabled && styles.tileDisabled,
                pressed && styles.pressed,
              ]}>
              <Icon name={change.icon} size={30} />
              <Txt variant="rowLead" style={styles.tileLabel}>
                {change.label}
              </Txt>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel>Why these changes?</SectionLabel>
      <TextInput
        value={why}
        onChangeText={setWhy}
        multiline
        placeholder={`Who is ${wild.name} for, and what would get them there?`}
        placeholderTextColor={color.mute}
        selectionColor={color.primary}
        style={styles.input}
      />
    </FlowScreen>
  );
}

const useStyles = makeStyles((color) => ({
  count: {
    fontFamily: font.bodyBold,
    color: color.ink,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: -4,
  },
  tile: {
    width: '23%',
    flexGrow: 0,
    minHeight: 72,
    paddingVertical: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
  },
  tilePlaced: {
    borderWidth: 2,
    borderColor: color.primary,
  },
  tileDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.8,
  },
  tileLabel: {
    fontSize: 12.5,
    lineHeight: 15,
    textAlign: 'center',
  },
  input: {
    minHeight: 120,
    marginTop: -4,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: radius.card - 4,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
    color: color.ink,
    textAlignVertical: 'top',
  },
}));
