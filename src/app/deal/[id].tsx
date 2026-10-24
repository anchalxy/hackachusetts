import { router, useLocalSearchParams } from 'expo-router';
import QRCode from 'qrcode';
import { useMemo } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';

import { dealBadge, dealStatus, mapsUrl, markDealUsed, partner, useRewards } from '@/lib/rewards';
import { Badge } from '@/ui/components';
import { Icon } from '@/ui/icon';
import { Txt } from '@/ui/text';
import { font, makeStyles, space, useColors, useScheme, type Palette } from '@/ui/theme';

const QR_SIZE = 220;
/** QR modules stay dark navy on the white plate in both schemes so scanners read it. */
const QR_INK = '#1E2A3A';
function badgeColors(color: Palette, dark: boolean) {
  return { ok: color.badge.approved, urgent: color.badge.urgent, done: { bg: dark ? color.tile : '#EFEDE9', fg: color.mute } };
}

/** Rewards step 7 (design/screens/rewards/7-deal-qr.png): the single-use QR for one deal. */
export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const styles = useStyles();
  const color = useColors();
  const { deals } = useRewards();
  const deal = deals.find((d) => d.id === id);

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/rewards'))}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Back to Rewards"
        style={styles.back}>
        <Svg width={22} height={22} viewBox="0 0 24 24">
          <Path d="M15 5l-7 7 7 7" fill="none" stroke={color.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Txt style={styles.backText}>Rewards</Txt>
      </Pressable>
      {deal ? <DealCard id={deal.id} /> : <Txt variant="secondary" style={styles.missing}>This deal isn’t in your list any more.</Txt>}
    </SafeAreaView>
  );
}

function DealCard({ id }: { id: string }) {
  const styles = useStyles();
  const color = useColors();
  const BADGE = badgeColors(color, useScheme() === 'dark');
  const deal = useRewards().deals.find((d) => d.id === id)!;
  const p = partner(deal.partnerId);
  const status = dealStatus(deal);
  const badge = dealBadge(status);
  const active = status.kind === 'active';

  // Hidden demo tool: the business scans it, so long-press stands in for the scan.
  const simulateScan = () =>
    Alert.alert('Demo tools', undefined, [
      { text: 'Simulate the scan', onPress: () => markDealUsed(deal.id) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <ScrollView alwaysBounceVertical={false} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Txt style={styles.place}>{p.name}</Txt>
        <Txt variant="secondary" style={styles.center}>
          {p.address}
        </Txt>
        <Pressable onPress={() => Linking.openURL(mapsUrl(p))} hitSlop={8} style={({ pressed }) => [styles.maps, pressed && styles.pressed]}>
          <Svg width={16} height={16} viewBox="0 0 24 24">
            <Path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" fill={color.primary} />
            <Path d="M12 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" fill={color.onPrimary} />
          </Svg>
          <Txt style={styles.mapsText}>Open in Google Maps</Txt>
          <Svg width={12} height={12} viewBox="0 0 24 24">
            <Path d="M7 17L17 7M9 7h8v8" fill="none" stroke={color.primary} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Pressable>
        <View style={styles.divider} />
        <Txt style={styles.offer}>{p.offer}</Txt>
        <Pressable onLongPress={active ? simulateScan : undefined} delayLongPress={800} style={[styles.qrBox, !active && styles.qrUsed]}>
          <Qr value={`teaparty://deal/${deal.code}`} />
          <View style={styles.qrLeaf}>
            <Icon name="leafy" size={30} />
          </View>
        </Pressable>
        <Txt style={styles.show}>{active ? 'Show this at the counter' : status.kind === 'used' ? 'Already used' : 'This code expired'}</Txt>
        {!active && (
          <Txt variant="secondary" style={styles.center}>
            Fill another crate for a new deal.
          </Txt>
        )}
        <Badge label={badge.label} {...BADGE[badge.tone]} style={styles.badge} />
      </View>
    </ScrollView>
  );
}

/** QR drawn as one path; the middle stays clear for Leafy (error correction H covers it). */
function Qr({ value }: { value: string }) {
  const { d, n } = useMemo(() => {
    const qr = QRCode.create(value, { errorCorrectionLevel: 'H' });
    const size = qr.modules.size;
    const clear = Math.ceil(size * 0.22);
    const lo = Math.floor((size - clear) / 2);
    let path = '';
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const inCenter = x >= lo && x < lo + clear && y >= lo && y < lo + clear;
        if (qr.modules.get(x, y) && !inCenter) path += `M${x} ${y}h1v1h-1z`;
      }
    return { d: path, n: size };
  }, [value]);
  return (
    <Svg width={QR_SIZE} height={QR_SIZE} viewBox={`-1 -1 ${n + 2} ${n + 2}`}>
      <Rect x={-1} y={-1} width={n + 2} height={n + 2} fill="#FFFFFF" />
      <Path d={d} fill={QR_INK} />
    </Svg>
  );
}

const useStyles = makeStyles((color) => ({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: space.gutter - 4,
    height: 44,
    alignSelf: 'flex-start',
  },
  backText: {
    fontFamily: font.bodyMedium,
    fontSize: 16,
    color: color.ink,
  },
  missing: {
    padding: space.gutter,
  },
  content: {
    paddingHorizontal: space.gutter,
    paddingTop: 12,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: color.surface,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: color.border,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: 'center',
  },
  place: {
    fontFamily: font.heading,
    fontSize: 23,
    lineHeight: 28,
    letterSpacing: -0.3,
    color: color.ink,
    textAlign: 'center',
    marginBottom: 4,
  },
  center: {
    textAlign: 'center',
  },
  maps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.6,
  },
  mapsText: {
    fontFamily: font.bodySemibold,
    fontSize: 14,
    color: color.primary,
  },
  divider: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: color.border,
    marginVertical: 16,
  },
  offer: {
    fontFamily: font.bodyBold,
    fontSize: 17,
    lineHeight: 22,
    color: color.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  qrBox: {
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrUsed: {
    opacity: 0.3,
  },
  qrLeaf: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  show: {
    fontFamily: font.bodyBold,
    fontSize: 14.5,
    color: color.ink,
    marginTop: 22,
    marginBottom: 2,
  },
  badge: {
    alignSelf: 'center',
    minWidth: 112,
    height: 28,
    marginTop: 14,
  },
}));
