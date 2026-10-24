import { Alert } from 'react-native';

import { creditLeaves, currentCrate, resetRewards } from '@/lib/rewards';

/**
 * Hidden demo tools for the leaf economy: long-press any leaf pill (Trail, Rewards, Profile).
 * "Fill the crate" tops the counter up to exactly the next crate, so the toss is one tap away.
 */
export function openLeafDevMenu() {
  const crate = currentCrate();
  const fill = crate.full ? 0 : crate.toGo;
  Alert.alert('Demo tools', `${crate.balance} leaves · crate is ${crate.size}`, [
    ...(fill > 0 ? [{ text: `Fill the crate (+${fill})`, onPress: () => creditLeaves(fill) }] : []),
    { text: '+50 tea leaves', onPress: () => creditLeaves(50) },
    { text: '+200 tea leaves', onPress: () => creditLeaves(200) },
    { text: 'Reset rewards', style: 'destructive' as const, onPress: resetRewards },
    { text: 'Cancel', style: 'cancel' as const },
  ]);
}
