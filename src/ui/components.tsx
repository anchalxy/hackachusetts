import { type ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Icon, type IconName } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { color, LIFECYCLE, radius, space, STATUS_LABEL, type ReportStatus } from '@/ui/theme';

/** Teal means tappable (DESIGN.md §3). `lg` is the 54px full-width action; `sm` the 32px row button. */
export function Button({
  label,
  onPress,
  size = 'lg',
  disabled,
  leading,
  style,
}: {
  label: string;
  onPress: () => void;
  size?: 'sm' | 'lg';
  disabled?: boolean;
  leading?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' ? styles.buttonSm : styles.buttonLg,
        (pressed || disabled) && styles.pressed,
        style,
      ]}>
      {leading}
      <Txt variant="button" style={size === 'sm' && styles.buttonSmText}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Secondary action: teal text, no border (ghost buttons next to badges are banned). */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
      <Txt variant="badge" style={styles.linkText}>
        {label}
      </Txt>
    </Pressable>
  );
}

/** Badges: tinted rectangle, radius 8, colored text, no dot, no border. Never tappable. */
export function Badge({ label, bg, fg }: { label: string; bg: string; fg: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Txt variant="badge" style={{ color: fg }}>
        {label}
      </Txt>
    </View>
  );
}

export function StatusBadge({ status }: { status: ReportStatus }) {
  const { bg, fg } = color.status[status];
  return <Badge label={STATUS_LABEL[status]} bg={bg} fg={fg} />;
}

/** Leaf balance pill: Leafy + amount in leafDark, top-left of the map. */
export function LeafPill({ amount, onLongPress }: { amount: number; onLongPress?: () => void }) {
  return (
    <Pressable onLongPress={onLongPress} delayLongPress={600} style={styles.leafPill}>
      <Icon name="leafy" size={24} />
      <Txt variant="rowLead" style={styles.leafText}>
        {amount.toLocaleString()}
      </Txt>
    </Pressable>
  );
}

/** 44px tile with a list icon, the standard row lead (DESIGN.md §5). */
export function IconTile({ icon, size = 44 }: { icon: IconName; size?: number }) {
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: size >= 64 ? radius.heroTile : radius.tile }]}>
      <Icon name={icon} size={Math.round(size * 0.66)} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** White glyph for a status dot, so status isn't shown by color alone. */
export function StatusGlyph({ status, size = 12 }: { status: ReportStatus; size?: number }) {
  const stroke = { stroke: '#FFFFFF', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {status === 'submitted' && (
        <>
          <Circle cx="12" cy="12" r="8.5" {...stroke} />
          <Path d="M12 7.5V12l3 2" {...stroke} />
        </>
      )}
      {status === 'inReview' && (
        <>
          <Path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" {...stroke} />
          <Circle cx="12" cy="12" r="3" fill="#FFFFFF" />
        </>
      )}
      {status === 'approved' && (
        <Path d="M7 21H4a1 1 0 01-1-1v-8a1 1 0 011-1h3m0 10V11m0 10h10.3a2 2 0 002-1.7l1.2-7A2 2 0 0018.5 10H14V5.5A2.5 2.5 0 0011.5 3L7 11" fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.6} strokeLinejoin="round" />
      )}
      {status === 'fixed' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} strokeWidth={3} />}
      {status === 'notApproved' && <Path d="M7 7l10 10M17 7L7 17" {...stroke} strokeWidth={3} />}
    </Svg>
  );
}

/**
 * The 4-step dot timeline: checked dots on a teal line, label + date under each step.
 * `dates` has one entry per lifecycle step ('' when unknown or not reached).
 */
export function Timeline({ status, dates }: { status: ReportStatus; dates: string[] }) {
  const reached = status === 'notApproved' ? 1 : LIFECYCLE.indexOf(status);
  return (
    <View>
      <View style={styles.timelineTrack}>
        {LIFECYCLE.map((step, i) => (
          <View key={step} style={styles.timelineStep}>
            {i > 0 && <View style={[styles.timelineLine, styles.lineLeft, i <= reached && styles.lineDone]} />}
            {i < LIFECYCLE.length - 1 && (
              <View style={[styles.timelineLine, styles.lineRight, i < reached && styles.lineDone]} />
            )}
            {i <= reached ? (
              <View style={[styles.dot, styles.dotDone]}>
                <StatusGlyph status="fixed" size={12} />
              </View>
            ) : (
              <View style={[styles.dot, styles.dotOpen]} />
            )}
          </View>
        ))}
      </View>
      <View style={styles.timelineLabels}>
        {LIFECYCLE.map((step, i) => (
          <View key={step} style={styles.timelineLabel}>
            <Txt variant="badge" style={{ color: i <= reached ? color.ink : color.mute }}>
              {STATUS_LABEL[step]}
            </Txt>
            {i <= reached && dates[i] ? <Txt variant="meta">{dates[i]}</Txt> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.cardGap,
    backgroundColor: color.primary,
    borderRadius: 999,
  },
  buttonLg: {
    height: 54,
    paddingHorizontal: 24,
  },
  buttonSm: {
    height: 32,
    paddingHorizontal: 14,
  },
  buttonSmText: {
    fontSize: 13.5,
  },
  pressed: {
    opacity: 0.75,
  },
  link: {
    alignSelf: 'center',
    paddingVertical: 6,
  },
  linkText: {
    color: color.primary,
    fontSize: 14,
  },
  badge: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.badge,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  leafPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingLeft: 8,
    paddingRight: 14,
    height: 40,
    borderRadius: 999,
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
  },
  leafText: {
    color: color.leaf.dark,
    fontSize: 16,
  },
  tile: {
    backgroundColor: color.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: space.cardPadding,
  },
  timelineTrack: {
    flexDirection: 'row',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
  },
  timelineLine: {
    position: 'absolute',
    height: 3,
    top: 9.5,
    backgroundColor: '#ECE3D2',
  },
  lineLeft: {
    left: 0,
    right: '50%',
  },
  lineRight: {
    left: '50%',
    right: 0,
  },
  lineDone: {
    backgroundColor: color.primary,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: color.primary,
  },
  dotOpen: {
    backgroundColor: color.surface,
    borderWidth: 2.5,
    borderColor: '#E7DCC6',
  },
  timelineLabels: {
    flexDirection: 'row',
    marginTop: 8,
  },
  timelineLabel: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
});
