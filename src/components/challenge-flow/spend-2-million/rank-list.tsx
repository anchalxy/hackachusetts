import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Badge } from '@/ui/components';
import { Txt } from '@/ui/text';
import { color, font } from '@/ui/theme';

import { fullMoney, PROJECT_BY_ID, shortMoney } from './ballot';

const ROW_H = 54;
const SPRING = { damping: 22, stiffness: 260, mass: 0.8 };

type Positions = Record<string, number>;

function pickup() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
function drop() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}
function tick() {
  Haptics.selectionAsync().catch(() => {});
}

/**
 * The ranked ballot card: long-press a row to lift it, drag to reorder (haptics on pickup, each
 * slot crossed, and drop), then the Total row. `order` is the current ranking; `onChange` gets the
 * new one live while dragging, so rank numbers and the "Top pick" badge follow the finger.
 */
export function RankList({
  order,
  onChange,
  onDragChange,
}: {
  order: string[];
  onChange: (order: string[]) => void;
  /** True while a row is lifted (the screen turns scrolling off). */
  onDragChange: (dragging: boolean) => void;
}) {
  // Rows are mounted in a stable order and positioned absolutely, so React never reorders
  // native views under a moving finger. Positions are the source of truth on the UI thread.
  const [ids] = useState(order);
  const positions = useSharedValue<Positions>(Object.fromEntries(order.map((id, i) => [id, i])));
  const total = order.reduce((sum, id) => sum + PROJECT_BY_ID[id].amount, 0);

  const moveTo = (id: string, to: number) => {
    const next = reorder(positions.get(), ids, id, to);
    positions.set(next);
    onChange(orderOf(next, ids));
  };

  return (
    <View style={styles.card}>
      <View style={{ height: ids.length * ROW_H }}>
        {ids.map((id) => (
          <RankRow
            key={id}
            id={id}
            ids={ids}
            rank={order.indexOf(id) + 1}
            positions={positions}
            onChange={onChange}
            onDragChange={onDragChange}
            onMoveTo={moveTo}
          />
        ))}
      </View>
      <View style={styles.totalRow}>
        <Txt variant="rowLead">Total</Txt>
        <Txt variant="rowLead" style={styles.amount}>
          {fullMoney(total)}
        </Txt>
      </View>
    </View>
  );
}

function reorder(positions: Positions, ids: string[], id: string, to: number): Positions {
  'worklet';
  const from = positions[id];
  const next: Positions = {};
  for (const other of ids) {
    const p = positions[other];
    if (other === id) next[other] = to;
    else if (from < to && p > from && p <= to) next[other] = p - 1;
    else if (from > to && p < from && p >= to) next[other] = p + 1;
    else next[other] = p;
  }
  return next;
}

function orderOf(positions: Positions, ids: string[]): string[] {
  'worklet';
  const out = ids.slice();
  for (const id of ids) out[positions[id]] = id;
  return out;
}

function RankRow({
  id,
  ids,
  rank,
  positions,
  onChange,
  onDragChange,
  onMoveTo,
}: {
  id: string;
  ids: string[];
  rank: number;
  positions: SharedValue<Positions>;
  onChange: (order: string[]) => void;
  onDragChange: (dragging: boolean) => void;
  onMoveTo: (id: string, to: number) => void;
}) {
  const project = PROJECT_BY_ID[id];
  const count = ids.length;
  const top = useSharedValue((rank - 1) * ROW_H);
  const startTop = useSharedValue(0);
  const active = useSharedValue(false);
  const lift = useSharedValue(0);

  // Slide into place when another row takes this one's slot (or after an accessibility move).
  useAnimatedReaction(
    () => positions.get()[id],
    (slot, prev) => {
      if (slot !== prev && !active.get()) top.set(withSpring(slot * ROW_H, SPRING));
    },
  );

  const pan = usePanGesture({
    activateAfterLongPress: 220,
    onActivate: () => {
      'worklet';
      active.set(true);
      startTop.set(top.get());
      lift.set(withSpring(1, SPRING));
      scheduleOnRN(pickup);
      scheduleOnRN(onDragChange, true);
    },
    onUpdate: (e) => {
      'worklet';
      const y = Math.min(Math.max(startTop.get() + e.translationY, 0), (count - 1) * ROW_H);
      top.set(y);
      const to = Math.round(y / ROW_H);
      if (to !== positions.get()[id]) {
        const next = reorder(positions.get(), ids, id, to);
        positions.set(next);
        scheduleOnRN(tick);
        scheduleOnRN(onChange, orderOf(next, ids));
      }
    },
    onFinalize: () => {
      'worklet';
      if (!active.get()) return;
      active.set(false);
      top.set(withSpring(positions.get()[id] * ROW_H, SPRING));
      lift.set(withSpring(0, SPRING));
      scheduleOnRN(drop);
      scheduleOnRN(onDragChange, false);
    },
  });

  const rowStyle = useAnimatedStyle(() => ({
    top: top.get(),
    zIndex: active.get() ? 10 : 0,
    transform: [{ scale: 1 + lift.get() * 0.03 }],
    shadowOpacity: lift.get() * 0.14,
    borderRadius: lift.get() * 12,
  }));
  const dividerStyle = useAnimatedStyle(() => ({ opacity: 1 - lift.get() }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[styles.row, rowStyle]}
        accessible
        accessibilityLabel={`${rank}. ${project.name}, ${shortMoney(project.amount)}${rank === 1 ? ', top pick' : ''}`}
        accessibilityHint="Long-press and drag to change its rank"
        accessibilityActions={[
          { name: 'moveUp', label: 'Move up' },
          { name: 'moveDown', label: 'Move down' },
        ]}
        onAccessibilityAction={(e) => {
          const slot = rank - 1;
          if (e.nativeEvent.actionName === 'moveUp' && slot > 0) onMoveTo(id, slot - 1);
          if (e.nativeEvent.actionName === 'moveDown' && slot < count - 1) onMoveTo(id, slot + 1);
        }}>
        <Txt variant="badge" style={styles.rank}>
          {rank}
        </Txt>
        <Txt variant="row" numberOfLines={2} style={[styles.name, rank === 1 && styles.nameTop]}>
          {project.name}
        </Txt>
        {rank === 1 ? <Badge label="Top pick" bg={color.badge.reward.bg} fg={color.badge.reward.fg} /> : null}
        <Txt variant="rowLead" style={styles.amount}>
          {shortMoney(project.amount)}
        </Txt>
        <Animated.View style={[styles.divider, dividerStyle]} />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: 14,
    paddingTop: 4,
  },
  row: {
    position: 'absolute',
    left: -6,
    right: -6,
    height: ROW_H,
    paddingHorizontal: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: color.surface,
    shadowColor: color.ink,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
  },
  divider: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 0,
    height: 1,
    backgroundColor: color.border,
  },
  rank: {
    width: 18,
    color: color.mute,
    fontSize: 14,
  },
  name: {
    flex: 1,
    fontSize: 15,
    lineHeight: 19,
  },
  nameTop: {
    fontFamily: font.bodyBold,
  },
  amount: {
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  totalRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
