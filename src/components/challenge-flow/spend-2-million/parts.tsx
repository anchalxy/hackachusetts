import { type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, radius, space } from '@/ui/theme';

import Pumpkin from '../../../../design/assets/trail/scenery/pumpkin.svg';
import type { Project } from './ballot';

/** Icon tile for a project row (the mockup uses the trail pumpkin for fresh food). */
export function ProjectIcon({ icon, size = 40 }: { icon: Project['icon']; size?: number }) {
  const glyph = Math.round(size * 0.66);
  return (
    <View style={[styles.tile, { width: size, height: size }]}>
      {icon === 'pumpkin' ? <Pumpkin width={glyph} height={glyph} /> : <Icon name={icon} size={glyph} />}
    </View>
  );
}

/**
 * Same look as FlowScreen (scroll + bottom-pinned button + footnote), plus what this flow needs:
 * a sticky summary card and turning scrolling off while a ranked row is being dragged.
 */
export function BallotScreen({
  children,
  action,
  footnote,
  stickyHeaderIndices,
  scrollEnabled = true,
}: {
  children: ReactNode;
  action: { label: string; onPress: () => void; disabled?: boolean };
  footnote?: string;
  stickyHeaderIndices?: number[];
  scrollEnabled?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        stickyHeaderIndices={stickyHeaderIndices}
        scrollEnabled={scrollEnabled}
        contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {footnote ? (
          <Txt variant="meta" style={styles.footnote}>
            {footnote}
          </Txt>
        ) : null}
        <Button label={action.label} onPress={action.onPress} disabled={action.disabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    borderRadius: radius.tile,
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  content: {
    paddingHorizontal: space.gutter,
    paddingTop: 8,
    paddingBottom: 24,
    gap: space.cardGap,
  },
  footer: {
    paddingHorizontal: space.gutter,
    paddingTop: 10,
    gap: 10,
    backgroundColor: color.bg,
  },
  footnote: {
    textAlign: 'center',
  },
});
