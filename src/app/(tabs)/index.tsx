import { useIsFocused } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DriftingLeaves } from '@/components/trail/ambient';
import { BAND_COUNT, BAND_H, MAP_W } from '@/components/trail/layout';
import { TrailMotionContext, type TrailMotion } from '@/components/trail/motion';
import { TrailHeader } from '@/components/trail/trail-header';
import { TrailMap } from '@/components/trail/trail-map';
import { BottomTabInset } from '@/constants/theme';
import { leafBalance, streak, useChallengeProgress } from '@/lib/challenge-progress';
import { getCurrentWeek, loadCurrentWeek, trailOrder } from '@/lib/challenge-week';
import { areaSlug, getProfile, SEED_PROFILE } from '@/lib/profile';

/** Ground color of the map, so overscroll and the tab-bar padding blend in. */
const GROUND = '#F2F0E2';
/** Keep motion running a little beyond the viewport (map units) so it's already moving on arrival. */
const MOTION_MARGIN = 300;

export default function ChallengesScreen() {
  const [week, setWeek] = useState(getCurrentWeek);
  const [baseLeaves, setBaseLeaves] = useState(SEED_PROFILE.leaves);
  const progress = useChallengeProgress();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const focused = useIsFocused();
  const reduced = useReducedMotion();

  // Live mode swaps in the latest generated week for the user's area; demo mode keeps the seed.
  useEffect(() => {
    let active = true;
    getProfile()
      .then((profile) => {
        if (active) setBaseLeaves(profile.leaves);
        return loadCurrentWeek(areaSlug(profile));
      })
      .then((loaded) => active && setWeek(loaded))
      .catch(() => {}); // keep showing what we have
    return () => {
      active = false;
    };
  }, []);

  const challenges = useMemo(() => trailOrder(week), [week]);
  const k = width / MAP_W;

  // Only animate the bands of the map near the viewport, and nothing while another tab is up.
  const [viewportHeight, setViewportHeight] = useState(0);
  const bandsKey = useRef('');
  const [activeBands, setActiveBands] = useState<boolean[]>(() => Array.from({ length: BAND_COUNT }, (_, i) => i === 0));

  const updateBands = useCallback(
    (scrollY: number, height: number) => {
      const top = scrollY / k - MOTION_MARGIN;
      const bottom = (scrollY + height) / k + MOTION_MARGIN;
      const next = Array.from({ length: BAND_COUNT }, (_, i) => i * BAND_H < bottom && (i + 1) * BAND_H > top);
      const key = next.join();
      if (key !== bandsKey.current) {
        bandsKey.current = key;
        setActiveBands(next);
      }
    },
    [k],
  );

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement } = e.nativeEvent;
    updateBands(contentOffset.y, layoutMeasurement.height);
  };

  const onLayout = (e: LayoutChangeEvent) => {
    const { height } = e.nativeEvent.layout;
    setViewportHeight(height);
    updateBands(0, height);
  };

  const motion = useMemo<TrailMotion>(
    () => ({ reduced, activeBands: focused ? activeBands : activeBands.map(() => false) }),
    [reduced, focused, activeBands],
  );

  return (
    <View style={styles.screen}>
      <TrailHeader balance={leafBalance(progress, baseLeaves)} streak={streak(progress)} />
      <TrailMotionContext.Provider value={motion}>
        <View style={styles.body} onLayout={onLayout}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={{ paddingBottom: BottomTabInset + insets.bottom + 24 }}
            onScroll={onScroll}
            scrollEventThrottle={100}
            // The map starts at the forest; nothing is drawn above it, so don't rubber-band past it.
            bounces={false}
            overScrollMode="never"
            showsVerticalScrollIndicator={false}>
            <TrailMap k={k} challenges={challenges} progress={progress} focused={focused} />
          </ScrollView>
          <DriftingLeaves width={width} height={viewportHeight} reduced={reduced} />
        </View>
      </TrailMotionContext.Provider>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: GROUND,
  },
  body: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: GROUND,
  },
});
