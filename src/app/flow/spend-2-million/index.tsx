import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View, type LayoutChangeEvent } from 'react-native';
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { CheckDot, FlowHeader, SectionLabel, selectionHaptic } from '@/components/challenge-flow/flow';
import {
  ballotRules,
  BUDGET,
  fullMoney,
  PROJECT_BY_ID,
  PROJECTS,
  setBallotDraft,
  shortMoney,
  type Cut,
  type Project,
  type Rule,
} from '@/components/challenge-flow/spend-2-million/ballot';
import { BallotScreen, ProjectIcon } from '@/components/challenge-flow/spend-2-million/parts';
import { Badge, Button, StatusGlyph } from '@/ui/components';
import { Txt } from '@/ui/text';
import { font, makeStyles, radius, space, useColors, useScheme } from '@/ui/theme';

/** Step 1 of 2: build a ballot from real projects under the four rules. */
export default function BuildBallot() {
  const styles = useStyles();
  // Ids in the order they were added. Nothing is pre-selected.
  const [selected, setSelected] = useState<string[]>([]);
  // Every removal, in order: what the city wants to learn is what people cut first.
  const [cuts, setCuts] = useState<Cut[]>([]);
  const { total, rules, ok } = ballotRules(selected);

  const add = (id: string) => {
    selectionHaptic();
    setSelected((ids) => (ids.includes(id) ? ids : [...ids, id]));
  };

  const remove = (id: string) => {
    selectionHaptic();
    const p = PROJECT_BY_ID[id];
    setCuts((c) => [...c, { id, name: p.name, amount: p.amount, overBudget: total > BUDGET, at: Date.now() }]);
    setSelected((ids) => ids.filter((x) => x !== id));
  };

  const review = () => {
    setBallotDraft({ ids: selected, cuts });
    router.push('/flow/spend-2-million/review');
  };

  return (
    <>
      <FlowHeader title="Your ballot" step={1} of={2} close />
      <BallotScreen
        stickyHeaderIndices={[0]}
        footnote="Went over? We note what you cut first. That’s what the city wants to learn."
        action={{ label: 'Review ballot', onPress: review, disabled: !ok }}>
        <View style={styles.sticky}>
          <SummaryCard total={total} rules={rules} />
        </View>
        <SectionLabel>Projects from the 1,300 ideas</SectionLabel>
        <View>
          {PROJECTS.map((p, i) => (
            <ProjectRow
              key={p.id}
              project={p}
              added={selected.includes(p.id)}
              last={i === PROJECTS.length - 1}
              onAdd={() => add(p.id)}
              onRemove={() => remove(p.id)}
            />
          ))}
        </View>
      </BallotScreen>
    </>
  );
}

function SummaryCard({ total, rules }: { total: number; rules: Rule[] }) {
  const styles = useStyles();
  const color = useColors();
  const over = total > BUDGET;
  const [trackWidth, setTrackWidth] = useState(0);
  const fill = useSharedValue(0);

  useEffect(() => {
    fill.value = withTiming(Math.min(total / BUDGET, 1) * trackWidth, { duration: 260 });
  }, [fill, total, trackWidth]);

  const fillStyle = useAnimatedStyle(() => ({ width: fill.value }));

  return (
    <View style={styles.card}>
      <View style={styles.spentRow}>
        <Txt variant="body" style={styles.spentLabel}>
          Spent
        </Txt>
        <Txt style={styles.spentValue}>
          <Txt style={[styles.spentAmount, over && styles.overText]}>{fullMoney(total)}</Txt>
          <Txt variant="body" style={styles.spentOf}>
            {' '}
            of $2M
          </Txt>
        </Txt>
      </View>
      <View
        style={styles.track}
        onLayout={(e: LayoutChangeEvent) => setTrackWidth(e.nativeEvent.layout.width)}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: BUDGET, now: total }}>
        <Animated.View style={[styles.fill, { backgroundColor: over ? color.brick : color.primary }, fillStyle]} />
      </View>
      <View style={styles.rules}>
        {rules.map((rule) => (
          <RuleItem key={rule.label} rule={rule} />
        ))}
      </View>
    </View>
  );
}

function RuleItem({ rule }: { rule: Rule }) {
  const styles = useStyles();
  const color = useColors();
  const dark = useScheme() === 'dark';
  const tone = rule.met ? color.badge.approved.fg : rule.broken ? color.brick : color.slate;
  return (
    <View
      style={styles.rule}
      accessible
      accessibilityLabel={`${rule.label}: ${rule.met ? 'done' : rule.broken ? 'broken' : 'not yet'}`}>
      {rule.met ? (
        <CheckDot size={20} />
      ) : (
        <View style={[styles.ruleX, { backgroundColor: rule.broken ? color.brick : dark ? '#4A5360' : '#C9CED6' }]}>
          <StatusGlyph status="notApproved" size={10} />
        </View>
      )}
      <Txt variant="badge" style={[styles.ruleText, { color: tone }]}>
        {rule.label}
      </Txt>
    </View>
  );
}

/**
 * One project. Add with the teal button; an added row shows the "Added" badge (never tappable
 * itself). To take it off: tap the row, or swipe left for Remove, like Mail.
 */
function ProjectRow({
  project,
  added,
  last,
  onAdd,
  onRemove,
}: {
  project: Project;
  added: boolean;
  last: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const styles = useStyles();
  const color = useColors();
  const swipeable = useRef<SwipeableMethods>(null);
  return (
    <ReanimatedSwipeable
      ref={swipeable}
      enabled={added}
      friction={1.6}
      rightThreshold={40}
      overshootRight={false}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            swipeable.current?.close();
            onRemove();
          }}
          style={({ pressed }) => [styles.removeAction, pressed && styles.pressed]}>
          <Txt variant="button" style={styles.removeText}>
            Remove
          </Txt>
        </Pressable>
      )}>
      <Pressable
        onPress={added ? onRemove : onAdd}
        accessibilityRole="button"
        accessibilityLabel={`${project.name}, ${project.category}, ${shortMoney(project.amount)}`}
        accessibilityState={{ selected: added }}
        accessibilityHint={added ? 'Removes it from your ballot' : 'Adds it to your ballot'}
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}>
        <ProjectIcon icon={project.icon} />
        <View style={[styles.rowBody, !last && styles.divider]}>
          <View style={styles.rowText}>
            <Txt variant="rowLead">{project.name}</Txt>
            <Txt variant="secondary">
              {project.category} · {shortMoney(project.amount)}
            </Txt>
          </View>
          {added ? (
            <Badge label="Added" bg={color.badge.approved.bg} fg={color.badge.approved.fg} />
          ) : (
            <Button label="Add" size="sm" onPress={onAdd} />
          )}
        </View>
      </Pressable>
    </ReanimatedSwipeable>
  );
}

const useStyles = makeStyles((color, dark) => ({
  sticky: {
    backgroundColor: color.bg,
    paddingBottom: 6,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.cardPadding,
    gap: 14,
  },
  spentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  spentLabel: {
    color: color.slate,
  },
  spentValue: {
    flexShrink: 1,
  },
  spentAmount: {
    fontFamily: font.heading,
    fontSize: 24,
    letterSpacing: -0.4,
    color: color.ink,
    fontVariant: ['tabular-nums'],
  },
  overText: {
    color: color.brick,
  },
  spentOf: {
    color: color.slate,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: color.tile,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: 4,
  },
  rules: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 10,
  },
  rule: {
    width: '50%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingRight: 6,
  },
  ruleX: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ruleText: {
    flex: 1,
    fontSize: 13.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: color.bg,
  },
  rowPressed: {
    backgroundColor: color.panel,
  },
  rowBody: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  removeAction: {
    width: 96,
    // Dark mode's brick is lightened for text; the swipe fill keeps the deeper one so white reads.
    backgroundColor: dark ? '#C2533F' : color.brick,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    fontSize: 14,
    // White on the brick swipe action in both schemes (the button variant's onPrimary is for teal).
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.8,
  },
}));
