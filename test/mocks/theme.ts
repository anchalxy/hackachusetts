/**
 * Minimal theme stub: just the `points` tokens that rewards.ts reads at runtime.
 * Mirrors design/tokens/tokens.json so crate math matches production.
 */
export const t = {
  points: {
    leavesPerPoint: 10,
    crateThresholds: [50, 100, 150],
    thenEvery: 150,
  },
} as const;
