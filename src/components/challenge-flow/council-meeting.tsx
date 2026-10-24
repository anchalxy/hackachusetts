import { Host, Picker, Text } from '@expo/ui/swift-ui';
import { controlSize, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import { TextInput, type TextInputProps } from 'react-native';

import { selectionHaptic } from '@/components/challenge-flow/flow';
import type { IconName } from '@/ui/icon';
import { font, makeStyles, useColors, useScheme } from '@/ui/theme';

/** Council meeting flow: the Oct 28 meeting, its featured dockets and the shared controls. */

export const COUNCIL_CHALLENGE_ID = 'demo-council-oct-28';

export const LIVESTREAM_URL = 'https://www.boston.gov/departments/city-council/watch-boston-city-council';

export type CouncilMode = 'inPerson' | 'livestream';

export const MODE_LEAVES: Record<CouncilMode, number> = { inPerson: 80, livestream: 60 };

export type Docket = {
  id: string;
  number: string;
  title: string;
  summary: string;
  sponsor: string;
  /** How the Sent screen names the sponsor's office ("Council President Breadon"). */
  sponsorShort: string;
  icon: IconName;
  argumentsPlaceholder: string;
  takePlaceholder: string;
};

// Featured dockets from data/challenges/demo-week.json (extras), filed Oct 21.
export const DOCKETS: Docket[] = [
  {
    id: '1958',
    number: '#1958',
    title: 'Bad Landlords List',
    summary: 'An official list of chronic code violators',
    sponsor: 'Council President Liz Breadon',
    sponsorShort: 'Council President Breadon',
    icon: 'notes',
    argumentsPlaceholder:
      'Breadon (for): fines alone haven’t stopped repeat violators; a public list adds pressure.\nTwo councilors (questions): how does a landlord get off the list?',
    takePlaceholder:
      'A list would help renters before they sign a lease. It needs a clear way off the list, or it won’t hold up.',
  },
  {
    id: '1968',
    number: '#1968',
    title: 'Blue Hill Ave bus lanes',
    summary: 'Asks the MBTA general manager to testify',
    sponsor: 'Councilor Miniard Culpepper',
    sponsorShort: 'Councilor Culpepper',
    icon: 'signpost',
    argumentsPlaceholder:
      'Culpepper (for): residents need answers on the redesign before work starts.\nMBTA (response): what the center lanes change for riders and drivers.',
    takePlaceholder: 'What the redesign gets right for riders on Blue Hill Ave, and what it still needs to answer.',
  },
];

export function findDocket(id: string | undefined): Docket {
  return DOCKETS.find((d) => d.id === id) ?? DOCKETS[0];
}

export const OUTCOMES = ['Passed', 'Referred', 'Amended', 'Tabled'] as const;
export type Outcome = (typeof OUTCOMES)[number];

/**
 * Native SwiftUI segmented control. Segmented pickers stretch to the width they're given, so the
 * Host takes its width from React Native and only matches the content's height.
 */
export function SegmentedPicker<T extends string>({
  options,
  selection,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  selection: T | null;
  onChange: (value: T) => void;
  label: string;
}) {
  const styles = useStyles();
  const scheme = useScheme();
  return (
    <Host matchContents={{ vertical: true }} colorScheme={scheme} style={styles.host}>
      <Picker
        label={label}
        selection={selection}
        onSelectionChange={(value: T | null) => {
          if (value == null) return;
          selectionHaptic();
          onChange(value);
        }}
        modifiers={[pickerStyle('segmented'), controlSize('large')]}>
        {options.map((option) => (
          <Text key={option.value} modifiers={[tag(option.value)]}>
            {option.label}
          </Text>
        ))}
      </Picker>
    </Host>
  );
}

/** Multiline white card for notes. */
export function NotesInput(props: TextInputProps) {
  const styles = useStyles();
  const color = useColors();
  return (
    <TextInput
      multiline
      scrollEnabled={false}
      textAlignVertical="top"
      placeholderTextColor={color.mute}
      selectionColor={color.primary}
      {...props}
      style={[styles.input, props.style]}
    />
  );
}

const useStyles = makeStyles((color) => ({
  host: {
    alignSelf: 'stretch',
  },
  input: {
    minHeight: 112,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface,
    fontFamily: font.body,
    fontSize: 15,
    lineHeight: 21,
    color: color.ink,
  },
}));
